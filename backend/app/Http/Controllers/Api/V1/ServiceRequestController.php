<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Inquiry\CreateServiceRequest;
use App\Domain\Inquiry\Enums\BudgetRange;
use App\Domain\Inquiry\Enums\Timeline;
use App\Domain\Inquiry\EstimateCalculator;
use App\Domain\Inquiry\ReferenceGenerator;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreServiceRequestRequest;
use App\Models\Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

/** Public booking form: create a lead, or compute a live indicative estimate. */
class ServiceRequestController extends Controller
{
    public function store(StoreServiceRequestRequest $request, CreateServiceRequest $create, ReferenceGenerator $references): JsonResponse
    {
        if ($request->isSpam()) {
            // Honeypot filled: pretend success so bots learn nothing; nothing is stored.
            Log::info('Booking honeypot triggered', ['ip_hash' => hash('sha256', $request->ip().config('app.key'))]);

            return response()->json(['data' => ['reference' => $references->generate(), 'status' => 'new', 'estimate' => null]], 201);
        }

        $serviceRequest = $create($request->toData());

        return response()->json(['data' => [
            'reference' => $serviceRequest->reference,
            'status' => $serviceRequest->status->value,
            'estimate' => $serviceRequest->estimate,
        ]], 201);
    }

    public function estimate(Request $request, EstimateCalculator $calculator): JsonResponse
    {
        $data = $request->validate([
            'service_slug' => ['nullable', 'string', Rule::exists('services', 'slug')],
            'timeline' => ['nullable', Rule::enum(Timeline::class)],
            'complexity' => ['nullable', 'integer', 'between:1,5'],
            'budget_range' => ['nullable', Rule::enum(BudgetRange::class)],
        ]);

        $service = isset($data['service_slug']) ? Service::firstWhere('slug', $data['service_slug']) : null;
        $estimate = $calculator->estimate(
            $service,
            isset($data['timeline']) ? Timeline::from($data['timeline']) : null,
            $data['complexity'] ?? null,
        );

        $ceiling = isset($data['budget_range']) ? BudgetRange::from($data['budget_range'])->ceiling() : null;

        return response()->json(['data' => [
            ...$estimate,
            'exceeds_budget' => $ceiling !== null && $estimate['min'] > $ceiling,
        ]]);
    }
}
