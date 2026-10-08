<?php

namespace App\Services\AI\Data;

final readonly class RetrievedChunk
{
    public function __construct(
        public int $id,
        public int $parentId,
        public string $title,
        public string $content,
        public string $category,
        public string $locale,
        public float $score,
    ) {}

    public static function fromRow(object $row): self
    {
        return new self(
            (int) $row->id,
            (int) $row->parent_id,
            $row->title,
            $row->content,
            $row->category,
            $row->locale,
            round((float) $row->score, 4),
        );
    }

    /** @return array{document_id: int, title: string, score: float} */
    public function toSource(): array
    {
        return ['document_id' => $this->parentId, 'title' => $this->title, 'score' => $this->score];
    }
}
