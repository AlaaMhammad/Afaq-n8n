<?php

namespace App\Services\AI\Exceptions;

use RuntimeException;

/** An AI turn exceeded config('ai.agent.max_seconds') (maps to 504 AI_TIMEOUT). */
class AiTimeoutException extends RuntimeException {}
