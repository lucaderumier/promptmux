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
import {
	createOpenAIProvider,
	createAnthropicProvider,
	createGoogleProvider,
	createDeepSeekProvider,
	createXAIProvider,
	createMistralProvider
} from '$lib/llm/providers';
import type { ProviderInstance, ChatMessage } from '$lib/llm/providers';
import { decrypt } from '$lib/server/encryption';
import { validateGenerateRequest } from '$lib/server/validation';
import { checkRateLimit, createRateLimitKey, RATE_LIMITS } from '$lib/server/rate-limit';

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

	// Rate limiting
	const rateLimitKey = createRateLimitKey(session.user.id, 'llm-generate');
	const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.LLM_GENERATE);
	if (!rateLimit.allowed) {
		throw error(429, 'Too many requests. Please wait before trying again.');
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

	// Validate input lengths to prevent DoS
	const validationError = validateGenerateRequest(body);
	if (validationError) {
		throw error(400, validationError.message);
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
			// Log without exposing provider details in production
			console.error('Failed to decrypt API key for user:', session.user.id);
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
				error: 'Provider not configured. Please check your API key settings.'
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
			// Sanitize error messages to avoid leaking sensitive provider details
			const sanitizedError = sanitizeErrorMessage(err);
			return {
				modelId: model.id,
				provider: model.provider,
				response: '',
				latencyMs: Date.now() - startTime,
				error: sanitizedError
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
		case 'deepseek':
			return createDeepSeekProvider({ apiKey });
		case 'xai':
			return createXAIProvider({ apiKey });
		case 'mistral':
			return createMistralProvider({ apiKey });
		default:
			return null;
	}
}

/**
 * Sanitize error messages to avoid leaking sensitive provider implementation details.
 * Maps known error patterns to user-friendly messages.
 */
function sanitizeErrorMessage(err: unknown): string {
	const message = err instanceof Error ? err.message.toLowerCase() : '';

	// Rate limiting
	if (message.includes('rate limit') || message.includes('too many requests') || message.includes('429')) {
		return 'Rate limit exceeded. Please wait a moment and try again.';
	}

	// Authentication errors
	if (message.includes('unauthorized') || message.includes('invalid api key') || message.includes('401') || message.includes('authentication')) {
		return 'Authentication failed. Please check your API key.';
	}

	// Quota/billing errors
	if (message.includes('quota') || message.includes('insufficient') || message.includes('billing') || message.includes('402')) {
		return 'API quota exceeded or billing issue. Please check your account.';
	}

	// Model not found
	if (message.includes('model not found') || message.includes('does not exist') || message.includes('404')) {
		return 'Model not available. It may have been deprecated or you may not have access.';
	}

	// Content policy
	if (message.includes('content policy') || message.includes('safety') || message.includes('blocked')) {
		return 'Request blocked due to content policy.';
	}

	// Timeout
	if (message.includes('timeout') || message.includes('timed out')) {
		return 'Request timed out. Please try again.';
	}

	// Network errors
	if (message.includes('network') || message.includes('connection') || message.includes('econnrefused')) {
		return 'Network error. Please check your connection and try again.';
	}

	// Context length
	if (message.includes('context length') || message.includes('too long') || message.includes('token limit')) {
		return 'Input too long. Please reduce the prompt length.';
	}

	// Generic fallback - don't expose original message
	return 'An error occurred while generating the response. Please try again.';
}
