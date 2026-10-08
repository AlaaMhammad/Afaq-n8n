<?php

use App\Domain\Inquiry\Enums\RequestSource;
use App\Jobs\NotifyN8nOfInquiry;
use App\Models\ServiceRequest;
use App\Services\AI\Data\TextDelta;
use App\Services\AI\Data\ToolCall;
use App\Services\AI\Data\ToolCallEvent;
use App\Services\AI\Data\TurnEnd;
use App\Services\AI\Drivers\Llm\FakeLlmDriver;
use Database\Seeders\ProjectSeeder;
use Database\Seeders\ServiceSeeder;
use Illuminate\Support\Facades\Queue;

beforeEach(function () {
    $this->seed([ServiceSeeder::class, ProjectSeeder::class]);
    Queue::fake();
});

function toolTurn(string $name, array $args, string $id = 'call_1'): array
{
    return [new ToolCallEvent(new ToolCall($id, $name, $args, ['thoughtSignature' => 'sig'])), new TurnEnd(10, 2, 'tool_calls')];
}

function ask(string $message, ?string $sessionId = null): array
{
    return test()->sseEvents(test()->postJson('/api/v1/ai/chat', array_filter([
        'message' => $message, 'locale' => 'ar', 'session_id' => $sessionId,
    ])));
}

it('explodes a 3D workflow and feeds the result back to the model', function () {
    FakeLlmDriver::script(
        toolTurn('trigger_3d_workflow', ['project_slug' => 'autonomous-invoice-extractor', 'mode' => 'exploded']),
        [new TextDelta('هذا هو المسار مفككاً.'), new TurnEnd],
    );

    $events = ask('اعرض مشروع الفواتير مفككاً');

    expect(array_column($events, 'event'))->toBe(['session', 'sources', 'tool_call', 'action', 'tool_result', 'token', 'done'])
        ->and($events[3]['data'])->toBe(['id' => 'call_1_0', 'type' => 'trigger_3d_workflow', 'payload' => ['projectSlug' => 'autonomous-invoice-extractor', 'mode' => 'exploded']]);

    // second model round received the tool call (with its signature) and the localized node list
    $turns = FakeLlmDriver::requests()[1]->turns;
    expect($turns[1]->toolCalls[0]->providerMeta)->toBe(['thoughtSignature' => 'sig'])
        ->and($turns[2]->toolResult['nodes_in_order'])->toBe(['مشغّل البريد', 'عقدة OCR', 'حفظ في Postgres', 'تنبيه واتساب']);
});

it('reports invalid tool arguments back to the model instead of acting', function () {
    FakeLlmDriver::script(
        toolTurn('trigger_3d_workflow', ['project_slug' => 'ghost-project', 'mode' => 'exploded']),
        toolTurn('delete_database', [], 'call_2'),
        [new TextDelta('Sorry.'), new TurnEnd],
    );

    $events = ask('show ghost project');

    expect(collect($events)->where('event', 'action'))->toBeEmpty()
        ->and(collect($events)->where('event', 'tool_result')->pluck('data.ok')->all())->toBe([false, false])
        ->and(FakeLlmDriver::requests()[1]->turns[2]->toolResult['validation_errors'])->toHaveKey('project_slug')
        ->and(FakeLlmDriver::requests()[2]->turns[4]->toolResult['error'])->toContain('Unknown tool');
});

it('books a service request only after the user typed the email and confirmed', function () {
    $inquiry = ['name' => 'سارة', 'email' => 'sara@clinic.example', 'service_type' => 'whatsapp-business-automation', 'budget' => '5k_15k', 'notes' => 'تذكير المرضى بالمواعيد في 3 فروع'];

    // Turn 1: details given, model tries to submit without confirmation → refused
    FakeLlmDriver::script(toolTurn('submit_service_inquiry', $inquiry), [new TextDelta('هل تؤكدين؟'), new TurnEnd]);
    $events = ask('أريد خدمة واتساب، بريدي sara@clinic.example وميزانيتي 5-15 ألف');
    $session = $events[0]['data']['session_id'];
    expect(ServiceRequest::count())->toBe(0)
        ->and(FakeLlmDriver::requests()[1]->turns[2]->toolResult['error'])->toContain('not confirmed');

    // Turn 2: a fabricated email is rejected even after confirmation
    FakeLlmDriver::script(toolTurn('submit_service_inquiry', [...$inquiry, 'email' => 'attacker@evil.example']), [new TextDelta('…'), new TurnEnd]);
    ask('نعم أؤكد', $session);
    expect(ServiceRequest::count())->toBe(0);

    // Turn 3: confirmed with the email the user typed → created, linked, n8n notified
    FakeLlmDriver::script(toolTurn('submit_service_inquiry', $inquiry), [new TextDelta('تم!'), new TurnEnd]);
    $events = ask('نعم، أرسل الطلب', $session);

    $request = ServiceRequest::sole();
    expect($request->source)->toBe(RequestSource::AiAgent)
        ->and($request->chat_session_id)->toBe($session)
        ->and($request->service->slug)->toBe('whatsapp-business-automation')
        ->and($request->estimate)->toHaveKeys(['min', 'max'])
        ->and(collect($events)->firstWhere('event', 'action')['data']['payload'])->toBe(['reference' => $request->reference, 'serviceType' => 'whatsapp-business-automation']);
    Queue::assertPushed(NotifyN8nOfInquiry::class, fn ($job) => $job->serviceRequestId === $request->id);

    // Turn 4: a repeat returns the existing reference instead of a duplicate lead
    FakeLlmDriver::script(toolTurn('submit_service_inquiry', $inquiry), [new TextDelta('سبق تسجيله'), new TurnEnd]);
    ask('نعم أرسله مرة أخرى', $session);
    expect(ServiceRequest::count())->toBe(1)
        ->and(FakeLlmDriver::requests()[1]->turns[count(FakeLlmDriver::requests()[1]->turns) - 1]->toolResult)
        ->toMatchArray(['already_submitted' => true, 'reference' => $request->reference]);
});

it('stops offering tools after the iteration cap and still answers', function () {
    $turns = array_map(fn ($i) => toolTurn('navigate_to', ['section_id' => 'team'], "c{$i}"), range(1, 4));
    $turns[] = [new TextDelta('Done.'), new TurnEnd];
    FakeLlmDriver::script(...$turns);

    $events = ask('loop');

    $requests = FakeLlmDriver::requests();
    expect($requests)->toHaveCount(5)
        ->and($requests[3]->tools)->not->toBeEmpty()
        ->and($requests[4]->tools)->toBeEmpty()
        ->and(end($events)['event'])->toBe('done');
});
