/**
 * API endpoint to generate LLM responses
 * Accepts a prompt (single-turn) or messages array (multi-turn) and list of models
 * Returns responses from each model
 * API keys are fetched server-side from Supabase (more secure)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Provider, ModelConfig, ModelResponse } from '$lib/llm/types';
import { calculateCostCents } from '$lib/llm/types';
import { createOpenAIProvider, createAnthropicProvider, createGoogleProvider } from '$lib/llm/providers';
import type { ProviderInstance, ChatMessage } from '$lib/llm/providers';
import { decrypt } from '$lib/server/encryption';

// Request format - supports both single-turn and multi-turn
interface GenerateRequest {
	prompt?: string; // Single-turn: just a prompt
	messages?: ChatMessage[]; // Multi-turn: conversation history
	models: ModelConfig[];
	systemPrompt?: string;
}

export const POST: RequestHandler = async ({ request, locals }) => {
	const session = locals.session;
	const supabase = locals.supabase;

	if (!session) {
		throw error(401, 'Unauthorized');
	}

	const body = await request.json();
	const { prompt, messages, models, systemPrompt } = body as GenerateRequest;

	// Validate: need either prompt (single-turn) or messages (multi-turn)
	const isMultiTurn = Array.isArray(messages) && messages.length > 0;
	const isSingleTurn = typeof prompt === 'string' && prompt.trim().length > 0;

	if (!isSingleTurn && !isMultiTurn) {
		throw error(400, 'Missing prompt or messages');
	}

	if (!models || models.length === 0) {
		throw error(400, 'Missing models');
	}

	// Fetch user's API keys from database
	const { data: apiKeysData, error: keysError } = await supabase
		.from('api_keys')
		.select('provider, encrypted_key')
		.eq('user_id', session.user.id);

	if (keysError) {
		throw error(500, 'Failed to fetch API keys');
	}

	// Decrypt API keys
	const apiKeys: Record<string, string> = {};
	for (const keyData of (apiKeysData || []) as { provider: string; encrypted_key: string }[]) {
		try {
			apiKeys[keyData.provider] = decrypt(keyData.encrypted_key);
		} catch (e) {
			console.error(`Failed to decrypt key for provider ${keyData.provider}:`, e);
		}
	}

	// Create provider instances for each unique provider needed
	const providers = new Map<Provider, ProviderInstance>();

	for (const model of models) {
		if (!providers.has(model.provider)) {
			const apiKey = apiKeys[model.provider];
			if (!apiKey) {
				throw error(400, `Missing API key for provider: ${model.provider}. Please add your API key in Settings.`);
			}

			const provider = createProvider(model.provider, apiKey);
			if (provider) {
				providers.set(model.provider, provider);
			}
		}
	}

	// Generate responses in parallel
	const responsePromises = models.map(async (model): Promise<ModelResponse> => {
		const provider = providers.get(model.provider);
		if (!provider) {
			return {
				modelId: model.id,
				provider: model.provider,
				response: '',
				latencyMs: 0,
				error: `Provider not configured: ${model.provider}`
			};
		}

		const startTime = Date.now();

		try {
			// Use appropriate generation method based on request type
			const result = isMultiTurn
				? await provider.generateTextMultiTurn({
						model: model.id,
						messages: messages!,
						system: systemPrompt,
						maxTokens: model.maxTokens,
						temperature: model.temperature
					})
				: await provider.generateText({
						model: model.id,
						prompt: prompt!,
						system: systemPrompt,
						maxTokens: model.maxTokens,
						temperature: model.temperature
					});

			// Extract token usage and calculate estimated cost
			let promptTokens: number | undefined;
			let completionTokens: number | undefined;
			let costCents: number | undefined;

			if (result.usage) {
				promptTokens = result.usage.promptTokens;
				completionTokens = result.usage.completionTokens;

				const cost = calculateCostCents(model.id, promptTokens, completionTokens);
				if (cost !== null) {
					costCents = cost;
				}
			}

			return {
				modelId: model.id,
				provider: model.provider,
				response: result.text,
				latencyMs: Date.now() - startTime,
				promptTokens,
				completionTokens,
				costCents
			};
		} catch (err) {
			return {
				modelId: model.id,
				provider: model.provider,
				response: '',
				latencyMs: Date.now() - startTime,
				error: err instanceof Error ? err.message : 'Unknown error'
			};
		}
	});

	const responses = await Promise.all(responsePromises);

	return json({ responses });
};

function createProvider(provider: Provider, apiKey: string): ProviderInstance | null {
	switch (provider) {
		case 'openai':
			return createOpenAIProvider({ apiKey });
		case 'anthropic':
			return createAnthropicProvider({ apiKey });
		case 'google':
			return createGoogleProvider({ apiKey });
		// Add more providers as needed
		default:
			return null;
	}
}
