<?php

use App\Domain\Catalog\WorkflowMetadata;

function validWorkflow(): array
{
    return [
        'nodes' => [
            ['id' => 'webhook', 'kind' => 'trigger', 'label' => ['ar' => 'استقبال', 'en' => 'Webhook'], 'n8nType' => 'n8n-nodes-base.webhook', 'position' => ['-1.5', '0', 0], 'exploded' => [0, '1', 0]],
            ['id' => 'crm', 'kind' => 'action', 'label' => ['ar' => 'CRM', 'en' => 'CRM'], 'n8nType' => 'n8n-nodes-base.hubspot', 'position' => [1.5, 0, 0], 'exploded' => [0, -1, 0]],
        ],
        'edges' => [['from' => 'webhook', 'to' => 'crm', 'fromPort' => '', 'label' => ['ar' => null, 'en' => null]]],
    ];
}

it('normalises form input into the documented shape', function () {
    $normalized = WorkflowMetadata::normalize(validWorkflow());

    expect($normalized['version'])->toBe(1)
        ->and($normalized['camera'])->toBe(['position' => [0.0, 2.5, 9.0], 'target' => [0.0, 0.0, 0.0]])
        ->and($normalized['nodes'][0]['position'])->toBe([-1.5, 0.0, 0.0])
        ->and($normalized['nodes'][0])->not->toHaveKeys(['color', 'stats'])
        ->and($normalized['edges'][0])->toBe(['from' => 'webhook', 'to' => 'crm', 'animated' => true])
        ->and(WorkflowMetadata::errors($normalized))->toBe([]);
});

it('reports graph problems', function (Closure $mutate, string $expected) {
    $data = validWorkflow();
    $mutate($data);

    expect(implode(' ', WorkflowMetadata::errors(WorkflowMetadata::normalize($data))))->toContain($expected);
})->with([
    'duplicate ids' => [function (&$d) {
        $d['nodes'][1]['id'] = 'webhook';
    }, 'unique'],
    'dangling edge' => [function (&$d) {
        $d['edges'][0]['to'] = 'ghost';
    }, 'unknown node "ghost"'],
    'missing arabic label' => [function (&$d) {
        $d['nodes'][0]['label']['ar'] = '';
    }, 'Arabic and English'],
    'bad kind' => [function (&$d) {
        $d['nodes'][0]['kind'] = 'blob';
    }, 'unknown kind'],
    'bad edge type' => [function (&$d) {
        $d['edges'][0]['type'] = 'magic';
    }, 'unknown type "magic"'],
    'bad id' => [function (&$d) {
        $d['nodes'][0]['id'] = 'Web Hook';
        $d['edges'] = [];
    }, 'lowercase'],
]);

it('keeps AI sub-node connections and drops the default edge type', function () {
    $data = validWorkflow();
    $data['edges'][] = ['from' => 'crm', 'to' => 'webhook', 'type' => 'ai'];
    $data['edges'][0]['type'] = 'main';

    $normalized = WorkflowMetadata::normalize($data);

    expect($normalized['edges'][0])->not->toHaveKey('type')
        ->and($normalized['edges'][1]['type'])->toBe('ai')
        ->and(WorkflowMetadata::errors($normalized))->toBe([]);
});
