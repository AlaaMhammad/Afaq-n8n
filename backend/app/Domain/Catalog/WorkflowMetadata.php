<?php

namespace App\Domain\Catalog;

use Illuminate\Validation\ValidationException;

/**
 * Normalises and validates projects.workflow_metadata (schema: docs/01_architecture/database_schema.md §4.1).
 */
final class WorkflowMetadata
{
    public const NODE_KINDS = ['trigger', 'router', 'action', 'ai', 'storage'];

    /** `main` = data connection; `ai` = an AI sub-node (model, memory, tool) attached to its agent/chain. */
    public const EDGE_TYPES = ['main', 'ai'];

    private const DEFAULT_CAMERA = ['position' => [0, 2.5, 9], 'target' => [0, 0, 0]];

    /**
     * Cast numeric strings coming from form inputs, drop empty optionals, keep list shapes.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public static function normalize(array $data): array
    {
        $vec = fn ($v): array => array_map(fn ($n) => (float) $n, array_values(array_pad((array) ($v ?? []), 3, 0)));

        $nodes = array_map(fn (array $node) => array_filter([
            'id' => trim((string) ($node['id'] ?? '')),
            'kind' => $node['kind'] ?? 'action',
            'label' => ['ar' => (string) data_get($node, 'label.ar', ''), 'en' => (string) data_get($node, 'label.en', '')],
            'n8nType' => trim((string) ($node['n8nType'] ?? '')),
            'position' => $vec($node['position'] ?? null),
            'exploded' => $vec($node['exploded'] ?? null),
            'color' => $node['color'] ?? null,
            'stats' => filled(data_get($node, 'stats.avgMs')) || filled(data_get($node, 'stats.executions'))
                ? ['avgMs' => (int) data_get($node, 'stats.avgMs', 0), 'executions' => (int) data_get($node, 'stats.executions', 0)]
                : null,
        ], fn ($v) => $v !== null && $v !== ''), array_values($data['nodes'] ?? []));

        $edges = array_map(fn (array $edge) => array_filter([
            'from' => $edge['from'] ?? null,
            'to' => $edge['to'] ?? null,
            'fromPort' => filled($edge['fromPort'] ?? null) ? $edge['fromPort'] : null,
            // Only stored when it isn't the default, so existing workflows stay unchanged.
            'type' => filled($edge['type'] ?? null) && $edge['type'] !== 'main' ? $edge['type'] : null,
            'label' => filled(data_get($edge, 'label.ar')) || filled(data_get($edge, 'label.en'))
                ? ['ar' => (string) data_get($edge, 'label.ar', ''), 'en' => (string) data_get($edge, 'label.en', '')]
                : null,
            'animated' => (bool) ($edge['animated'] ?? true),
        ], fn ($v) => $v !== null), array_values($data['edges'] ?? []));

        return [
            'version' => 1,
            'camera' => [
                'position' => $vec(data_get($data, 'camera.position', self::DEFAULT_CAMERA['position'])),
                'target' => $vec(data_get($data, 'camera.target', self::DEFAULT_CAMERA['target'])),
            ],
            'nodes' => $nodes,
            'edges' => $edges,
        ];
    }

    /**
     * @param  array<string, mixed>  $data  normalised metadata
     * @return list<string> human-readable problems (empty when valid)
     */
    public static function errors(array $data): array
    {
        $errors = [];
        $ids = array_column($data['nodes'] ?? [], 'id');

        if (count($ids) === 0) {
            $errors[] = 'A workflow needs at least one node.';
        }
        if (count($ids) !== count(array_unique($ids))) {
            $errors[] = 'Node ids must be unique.';
        }
        foreach ($data['nodes'] ?? [] as $node) {
            if (! preg_match('/^[a-z0-9][a-z0-9_-]*$/', $node['id'] ?? '')) {
                $errors[] = "Node id \"{$node['id']}\" must be lowercase letters, digits, - or _.";
            }
            if (! in_array($node['kind'] ?? null, self::NODE_KINDS, true)) {
                $errors[] = "Node \"{$node['id']}\" has an unknown kind.";
            }
            if (blank(data_get($node, 'label.ar')) || blank(data_get($node, 'label.en'))) {
                $errors[] = "Node \"{$node['id']}\" needs both Arabic and English labels.";
            }
        }
        foreach ($data['edges'] ?? [] as $i => $edge) {
            if (isset($edge['type']) && ! in_array($edge['type'], self::EDGE_TYPES, true)) {
                $errors[] = 'Edge #'.($i + 1).' has an unknown type "'.$edge['type'].'".';
            }
            foreach (['from', 'to'] as $end) {
                if (! in_array($edge[$end] ?? null, $ids, true)) {
                    $errors[] = 'Edge #'.($i + 1).' points to unknown node "'.($edge[$end] ?? '').'".';
                }
            }
        }

        return $errors;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed> normalised, valid metadata
     *
     * @throws ValidationException
     */
    public static function validated(array $data, string $field = 'workflow_metadata'): array
    {
        $normalized = self::normalize($data);

        if ($errors = self::errors($normalized)) {
            throw ValidationException::withMessages(["data.{$field}" => $errors]);
        }

        return $normalized;
    }
}
