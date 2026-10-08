<?php

namespace App\Services\AI\Contracts;

enum EmbeddingTask: string
{
    case Query = 'query';
    case Document = 'document';
}
