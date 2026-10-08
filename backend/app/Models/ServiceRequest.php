<?php

namespace App\Models;

use App\Domain\Inquiry\Enums\BudgetRange;
use App\Domain\Inquiry\Enums\RequestSource;
use App\Domain\Inquiry\Enums\RequestStatus;
use App\Domain\Inquiry\Enums\Timeline;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ServiceRequest extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'reference',
        'client_name',
        'client_email',
        'client_phone',
        'company',
        'service_id',
        'chat_session_id',
        'budget_range',
        'timeline',
        'requirements',
        'status',
        'source',
        'estimate',
        'metadata',
    ];

    protected $attributes = [
        'status' => 'new',
        'source' => 'web_form',
        'metadata' => '{}',
    ];

    protected function casts(): array
    {
        return [
            'budget_range' => BudgetRange::class,
            'timeline' => Timeline::class,
            'status' => RequestStatus::class,
            'source' => RequestSource::class,
            'estimate' => 'array',
            'metadata' => 'array',
        ];
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function chatSession(): BelongsTo
    {
        return $this->belongsTo(ChatSession::class);
    }

    /**
     * Change status and append an audit entry to metadata.history.
     */
    public function transitionTo(RequestStatus $status, ?User $by = null, ?string $note = null): void
    {
        $metadata = $this->metadata ?? [];
        $metadata['history'][] = [
            'from' => $this->status?->value,
            'to' => $status->value,
            'by' => $by?->email,
            'note' => $note,
            'at' => now()->toIso8601String(),
        ];

        $this->forceFill(['status' => $status, 'metadata' => $metadata])->save();
    }

    public function wasNotifiedToN8n(): bool
    {
        return filled(data_get($this->metadata, 'n8n.notified_at'));
    }
}
