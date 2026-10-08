<?php

namespace App\Services\AI\Exceptions;

use RuntimeException;

/** PromptGuard blocked a message or a response (maps to 422 PROMPT_REJECTED). */
class PromptRejectedException extends RuntimeException {}
