<?php

namespace App\Services\AI;

use App\Http\Problems\ProblemRenderer;
use App\Models\ChatMessage;
use App\Models\ChatSession;
use App\Services\AI\Contracts\LlmDriver;
use App\Services\AI\Data\ChatRequest;
use App\Services\AI\Data\ChatTurn;
use App\Services\AI\Data\RetrievedChunk;
use App\Services\AI\Data\TextDelta;
use App\Services\AI\Data\ToolCall;
use App\Services\AI\Data\ToolCallEvent;
use App\Services\AI\Data\TurnEnd;
use App\Services\AI\Exceptions\AiProviderException;
use App\Services\AI\Exceptions\AiTimeoutException;
use App\Services\AI\Exceptions\PromptRejectedException;
use App\Services\AI\Tools\ToolContext;
use App\Services\AI\Tools\ToolRegistry;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Sleep;
use Throwable;

/**
 * One Copilot turn: retrieve → stream the model → execute tool calls → loop → persist.
 *
 * SSE events: session, sources, token*, tool_call, action, tool_result, …, done | error
 * Spec: docs/04_features/rag_and_ai_agent.md §4 · docs/02_api_specs/endpoints.md §4
 */
final class ChatOrchestrator
{
    private const LEAK_CHECK_EVERY = 160; // chars of new output between system-prompt leak checks

    public function __construct(
        private readonly LlmDriver $llm,
        private readonly Retriever $retriever,
        private readonly PromptBuilder $prompts,
        private readonly PromptGuard $guard,
        private readonly PiiScrubber $scrubber,
        private readonly ToolRegistry $tools,
        private readonly ProblemRenderer $problems,
    ) {}

    public function handle(
        ChatSession $session,
        string $message,
        string $locale,
        ?string $activeSection,
        bool $flagged,
        Request $request,
        SseEmitter $out,
    ): void {
        $deadline = microtime(true) + (int) config('ai.agent.max_seconds', 60);
        $answer = '';
        $toolLog = [];
        $chunks = collect();
        $usage = ['input' => 0, 'output' => 0];

        $out->emit('session', ['session_id' => $session->id]);

        $history = $this->history($session);
        $userEmails = $this->rememberUserEmails($session, $message);
        $this->persist($session, 'user', $message, flagged: $flagged);

        try {
            $chunks = $this->retriever->search($message, $locale);
            $out->emit('sources', $chunks->map(fn (RetrievedChunk $c) => $c->toSource())->values()->all());

            $system = $this->prompts->build($locale, $activeSection ?? 'hero', $chunks, $flagged);
            $turns = [...$history, ChatTurn::user($this->guard->wrapUserMessage($message))];
            $context = new ToolContext($session, $locale, $message, $userEmails, $request->ip());
            $maxRounds = (int) config('ai.agent.max_tool_iterations', 4);

            for ($round = 0; $round <= $maxRounds; $round++) {
                $chatRequest = new ChatRequest(
                    system: $system,
                    turns: $turns,
                    tools: $round < $maxRounds ? $this->tools->definitions() : [], // final round must answer in text
                    temperature: (float) config('ai.agent.temperature', 0.4),
                    maxOutputTokens: (int) config('ai.agent.max_output_tokens', 1024),
                );

                $answerBeforeRound = $answer;
                for ($try = 0; ; $try++) {
                    try {
                        [$roundText, $calls] = $this->streamRound($chatRequest, $system, $deadline, $answer, $usage, $out);

                        break;
                    } catch (AiProviderException $e) {
                        if ($try >= 1 || ! $e->isRetryable()) {
                            throw $e;
                        }
                        // The provider died mid-answer: tell the client to roll back this round's text, then retry once.
                        if ($answer !== $answerBeforeRound) {
                            $answer = $answerBeforeRound;
                            $out->emit('reset', ['text' => $answer]);
                        }
                        Sleep::for(1)->second();
                    }
                }

                if ($calls === []) {
                    break;
                }

                $turns[] = ChatTurn::assistant($roundText, $calls);

                foreach ($calls as $call) {
                    $turns[] = ChatTurn::toolResult($call, $this->runTool($call, $context, $out, $toolLog));
                }
            }

            if (trim($answer) === '') {
                $answer = $this->fallbackAnswer($locale);
                $out->emit('token', ['delta' => $answer]);
            }

            $saved = $this->persist($session, 'assistant', $answer, $toolLog, $chunks, $usage);
            $out->emit('done', ['message_id' => $saved->id, 'usage' => $usage]);
        } catch (AiProviderException|AiTimeoutException|PromptRejectedException $e) {
            report($e);
            $content = match (true) {
                $e instanceof PromptRejectedException => $this->refusal($locale),
                $answer !== '' => $answer.' […]',
                default => '[no response: '.class_basename($e).']',
            };
            $this->persist($session, 'assistant', $content, $toolLog, $chunks, $usage, flagged: $e instanceof PromptRejectedException);
            $out->emit('error', $this->problems->toArray($e, $request));
        } catch (Throwable $e) {
            report($e);
            $out->emit('error', $this->problems->toArray($e, $request));
        } finally {
            $session->forceFill(['last_activity_at' => now()])->save();
        }
    }

    /**
     * Streams one model round, forwarding text as `token` events.
     *
     * @param  array{input: int, output: int}  $usage
     * @return array{0: string, 1: list<ToolCall>} round text and requested tool calls
     */
    private function streamRound(ChatRequest $request, string $system, float $deadline, string &$answer, array &$usage, SseEmitter $out): array
    {
        $roundText = '';
        $calls = [];
        $sinceLeakCheck = 0;

        foreach ($this->llm->stream($request) as $event) {
            if (microtime(true) > $deadline) {
                throw new AiTimeoutException('AI turn exceeded '.config('ai.agent.max_seconds').'s.');
            }

            if ($event instanceof TextDelta) {
                $delta = $this->guard->redactSecrets($event->text);
                $roundText .= $delta;
                $answer .= $delta;
                $out->emit('token', ['delta' => $delta]);

                if (($sinceLeakCheck += mb_strlen($delta)) >= self::LEAK_CHECK_EVERY) {
                    $sinceLeakCheck = 0;
                    $this->assertNoLeak($answer, $system);
                }
            } elseif ($event instanceof ToolCallEvent) {
                $calls[] = $event->call;
            } elseif ($event instanceof TurnEnd) {
                $usage['input'] += $event->inputTokens ?? 0;
                $usage['output'] += $event->outputTokens ?? 0;
            }
        }

        $this->assertNoLeak($answer, $system);

        return [$roundText, $calls];
    }

    /**
     * @param  list<array<string, mixed>>  $toolLog
     * @return array<string, mixed> the function response handed back to the model
     */
    private function runTool(ToolCall $call, ToolContext $context, SseEmitter $out, array &$toolLog): array
    {
        $out->emit('tool_call', ['id' => $call->id, 'name' => $call->name, 'args' => $call->args]);

        $result = $this->tools->execute($call, $context);

        foreach ($result->clientActions as $i => $action) {
            $out->emit('action', ['id' => $call->id.'_'.$i, ...$action]);
        }
        $out->emit('tool_result', ['id' => $call->id, 'ok' => $result->ok, 'summary' => $result->summary]);

        $toolLog[] = [
            'name' => $call->name,
            'args' => json_decode($this->scrubber->scrub(json_encode($call->args, JSON_UNESCAPED_UNICODE)), true),
            'ok' => $result->ok,
            'result_summary' => $result->summary,
        ];

        return $result->forModel;
    }

    /**
     * Recent text turns of this session (tool traffic is not replayed across turns).
     *
     * The database transcript is PII-scrubbed, so the model would only see "[email]" from earlier
     * turns and could not complete a booking. Each message's raw text is therefore kept in a
     * short-lived, session-scoped cache entry (see persist()) and preferred here when present.
     *
     * @return list<ChatTurn>
     */
    private function history(ChatSession $session): array
    {
        return $session->messages()
            ->whereIn('role', ['user', 'assistant'])
            ->reorder('id', 'desc')
            ->limit((int) config('ai.agent.history_window', 12))
            ->get()
            ->reverse()
            ->map(function (ChatMessage $m) use ($session) {
                $content = Cache::get(self::rawKey($session, $m->id), $m->content);

                return $m->role === 'user'
                    ? ChatTurn::user($this->guard->wrapUserMessage($content))
                    : ChatTurn::assistant($content);
            })
            ->values()
            ->all();
    }

    private static function rawKey(ChatSession $session, int $messageId): string
    {
        return "chat:{$session->id}:raw:{$messageId}";
    }

    /**
     * Emails the user typed in this session — kept raw (only in cache, 24 h) so the inquiry tool
     * can verify the address, while the persisted transcript stays scrubbed.
     *
     * @return list<string>
     */
    private function rememberUserEmails(ChatSession $session, string $message): array
    {
        $key = "chat:{$session->id}:user-emails";
        $emails = array_values(array_unique([...Cache::get($key, []), ...$this->scrubber->emails($message)]));
        Cache::put($key, $emails, now()->addDay());

        return $emails;
    }

    /**
     * @param  list<array<string, mixed>>  $toolCalls
     * @param  Collection<int, RetrievedChunk>|null  $chunks
     * @param  array{input: int, output: int}|null  $usage
     */
    private function persist(
        ChatSession $session,
        string $role,
        string $content,
        array $toolCalls = [],
        ?Collection $chunks = null,
        ?array $usage = null,
        bool $flagged = false,
    ): ChatMessage {
        $message = $session->messages()->create([
            'role' => $role,
            'content' => $this->scrubber->scrub($content),
            'tool_calls' => $toolCalls ?: null,
            'sources' => $chunks?->map(fn (RetrievedChunk $c) => ['document_id' => $c->parentId, 'chunk_id' => $c->id, 'score' => $c->score])->values()->all() ?: null,
            'tokens_in' => $usage['input'] ?? null,
            'tokens_out' => $usage['output'] ?? null,
            'flagged' => $flagged,
        ]);

        // Raw working memory for the model's next turns only; expires with the conversation.
        if ($message->content !== $content) {
            Cache::put(self::rawKey($session, $message->id), $content, now()->addDay());
        }

        return $message;
    }

    private function assertNoLeak(string $answer, string $system): void
    {
        if ($this->guard->leaksSystemPrompt($answer, $system)) {
            throw new PromptRejectedException('Response withheld: it reproduced internal instructions.');
        }
    }

    private function fallbackAnswer(string $locale): string
    {
        return $locale === 'ar'
            ? 'عذراً، لم أتمكن من صياغة إجابة مناسبة. هل يمكنك إعادة صياغة سؤالك، أو تود أن أسجل طلباً ليتواصل معك فريق أفق؟'
            : 'Sorry, I could not put together a good answer. Could you rephrase, or shall I file a request so the Afaq team can contact you?';
    }

    private function refusal(string $locale): string
    {
        return $locale === 'ar'
            ? 'لا يمكنني مشاركة ذلك، لكن يسعدني مساعدتك في أي سؤال عن خدمات الأتمتة لدى أفق.'
            : "I can't share that, but I'm happy to help with any question about Afaq's automation services.";
    }
}
