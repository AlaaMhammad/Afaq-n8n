<?php

namespace App\Filament\Resources\Projects\Pages\Concerns;

use App\Domain\Catalog\WorkflowMetadata;
use Filament\Notifications\Notification;

/**
 * Normalises the 3D workflow before persisting and blocks saving an inconsistent graph
 * (duplicate node ids, edges pointing at missing nodes, missing labels…).
 */
trait ValidatesWorkflowMetadata
{
    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    protected function prepareWorkflowData(array $data): array
    {
        $workflow = WorkflowMetadata::normalize($data['workflow_metadata'] ?? []);

        if ($errors = WorkflowMetadata::errors($workflow)) {
            Notification::make()
                ->danger()
                ->title(__('The 3D workflow is not valid'))
                ->body(implode("\n", $errors))
                ->persistent()
                ->send();

            $this->halt();
        }

        $data['workflow_metadata'] = $workflow;
        $data['metrics'] = array_map(fn ($v) => is_numeric($v) ? $v + 0 : $v, $data['metrics'] ?? []);
        $data['metrics']['nodesCount'] = count($workflow['nodes']);

        return $data;
    }
}
