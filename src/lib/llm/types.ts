/**
 * Core types for LLM provider integrations
 */

export type Provider = 'openai' | 'anthropic' | 'google' | 'mistral' | 'cohere';

export interface ModelConfig {
	id: string;
	name: string;
	provider: Provider;
	maxTokens?: number;
	temperature?: number;
}

export interface PromptRequest {
	prompt: string;
	models: ModelConfig[];
	systemPrompt?: string;
}

export interface ModelResponse {
	modelId: string;
	provider: Provider;
	response: string;
	latencyMs: number;
	promptTokens?: number;
	completionTokens?: number;
	costCents?: number;
	error?: string;
}

export interface PromptMapNode {
	id: string;
	type: 'prompt' | 'model';
	position: { x: number; y: number };
	data: PromptNodeData | ModelNodeData;
}

export interface PromptNodeData {
	prompt: string;
}

export interface ModelNodeData {
	config: ModelConfig;
	response?: ModelResponse;
	rating?: number;
	notes?: string;
}

export interface PromptMapEdge {
	id: string;
	source: string;
	target: string;
}

export interface PromptMap {
	id: string;
	name: string;
	nodes: PromptMapNode[];
	edges: PromptMapEdge[];
}

/**
 * Available models per provider
 * Updated January 2026
 */
export const AVAILABLE_MODELS: Record<Provider, ModelConfig[]> = {
	openai: [
		// GPT-5 Series (Latest)
		{ id: 'gpt-5.2', name: 'GPT-5.2', provider: 'openai' },
		{ id: 'gpt-5.2-pro', name: 'GPT-5.2 Pro', provider: 'openai' },
		{ id: 'gpt-5.1', name: 'GPT-5.1', provider: 'openai' },
		{ id: 'gpt-5', name: 'GPT-5', provider: 'openai' },
		{ id: 'gpt-5-mini', name: 'GPT-5 Mini', provider: 'openai' },
		// GPT-4 Series
		{ id: 'gpt-4.1', name: 'GPT-4.1', provider: 'openai' },
		{ id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', provider: 'openai' },
		{ id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano', provider: 'openai' },
		{ id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' },
		{ id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai' },
		// Reasoning Models
		{ id: 'o4-mini', name: 'o4 Mini', provider: 'openai' },
		{ id: 'o3', name: 'o3', provider: 'openai' },
		{ id: 'o3-mini', name: 'o3 Mini', provider: 'openai' },
		{ id: 'o3-pro', name: 'o3 Pro', provider: 'openai' },
		{ id: 'o1', name: 'o1', provider: 'openai' }
	],
	anthropic: [
		// Claude 4.5 Series (Latest)
		{ id: 'claude-opus-4-5-20251101', name: 'Claude Opus 4.5', provider: 'anthropic' },
		{ id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5', provider: 'anthropic' },
		// Claude 4.1 Series
		{ id: 'claude-opus-4-1-20250805', name: 'Claude Opus 4.1', provider: 'anthropic' },
		// Claude 4 Series
		{ id: 'claude-opus-4-20250514', name: 'Claude Opus 4', provider: 'anthropic' },
		{ id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'anthropic' },
		// Claude 3.7 Series
		{ id: 'claude-3-7-sonnet-20250219', name: 'Claude Sonnet 3.7', provider: 'anthropic' },
		// Claude 3 Haiku (still available, cost-effective)
		{ id: 'claude-3-haiku-20240307', name: 'Claude Haiku 3', provider: 'anthropic' }
	],
	google: [
		// Gemini 3 Series (Latest - Preview)
		{ id: 'gemini-3-pro', name: 'Gemini 3 Pro', provider: 'google' },
		{ id: 'gemini-3-flash', name: 'Gemini 3 Flash', provider: 'google' },
		// Gemini 2.5 Series (GA)
		{ id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'google' },
		{ id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'google' },
		{ id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite', provider: 'google' },
		// Gemini 2.0 Series
		{ id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'google' },
		{ id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash-Lite', provider: 'google' }
	],
	mistral: [
		{ id: 'mistral-large-latest', name: 'Mistral Large', provider: 'mistral' },
		{ id: 'mistral-small-latest', name: 'Mistral Small', provider: 'mistral' }
	],
	cohere: [
		{ id: 'command-r-plus', name: 'Command R+', provider: 'cohere' },
		{ id: 'command-r', name: 'Command R', provider: 'cohere' }
	]
};

/**
 * Model pricing per 1M tokens (in dollars)
 * Updated January 2026 - approximate values
 */
export interface ModelPricing {
	input: number; // $ per 1M input tokens
	output: number; // $ per 1M output tokens
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
	// OpenAI GPT-5 Series
	'gpt-5.2': { input: 15, output: 60 },
	'gpt-5.2-pro': { input: 30, output: 120 },
	'gpt-5.1': { input: 12, output: 48 },
	'gpt-5': { input: 10, output: 40 },
	'gpt-5-mini': { input: 1.5, output: 6 },
	// OpenAI GPT-4 Series
	'gpt-4.1': { input: 2, output: 8 },
	'gpt-4.1-mini': { input: 0.4, output: 1.6 },
	'gpt-4.1-nano': { input: 0.1, output: 0.4 },
	'gpt-4o': { input: 2.5, output: 10 },
	'gpt-4o-mini': { input: 0.15, output: 0.6 },
	// OpenAI Reasoning Models
	'o4-mini': { input: 1.1, output: 4.4 },
	'o3': { input: 10, output: 40 },
	'o3-mini': { input: 1.1, output: 4.4 },
	'o3-pro': { input: 20, output: 80 },
	'o1': { input: 15, output: 60 },
	// Anthropic Claude 4.5 Series
	'claude-opus-4-5-20251101': { input: 15, output: 75 },
	'claude-sonnet-4-5-20250929': { input: 3, output: 15 },
	// Anthropic Claude 4.1 Series
	'claude-opus-4-1-20250805': { input: 15, output: 75 },
	// Anthropic Claude 4 Series
	'claude-opus-4-20250514': { input: 15, output: 75 },
	'claude-sonnet-4-20250514': { input: 3, output: 15 },
	// Anthropic Claude 3.7 Series
	'claude-3-7-sonnet-20250219': { input: 3, output: 15 },
	// Anthropic Claude 3 Haiku
	'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
	// Google Gemini 3 Series
	'gemini-3-pro': { input: 2.5, output: 10 },
	'gemini-3-flash': { input: 0.15, output: 0.6 },
	// Google Gemini 2.5 Series
	'gemini-2.5-pro': { input: 1.25, output: 5 },
	'gemini-2.5-flash': { input: 0.075, output: 0.3 },
	'gemini-2.5-flash-lite': { input: 0.02, output: 0.08 },
	// Google Gemini 2.0 Series
	'gemini-2.0-flash': { input: 0.075, output: 0.3 },
	'gemini-2.0-flash-lite': { input: 0.02, output: 0.08 },
	// Mistral
	'mistral-large-latest': { input: 2, output: 6 },
	'mistral-small-latest': { input: 0.2, output: 0.6 },
	// Cohere
	'command-r-plus': { input: 2.5, output: 10 },
	'command-r': { input: 0.15, output: 0.6 }
};

/**
 * Calculate cost in cents from token usage
 */
export function calculateCostCents(
	modelId: string,
	promptTokens: number,
	completionTokens: number
): number | null {
	const pricing = MODEL_PRICING[modelId];
	if (!pricing) return null;

	// Calculate cost: (tokens / 1M) * price per 1M tokens * 100 (to convert to cents)
	const inputCost = (promptTokens / 1_000_000) * pricing.input * 100;
	const outputCost = (completionTokens / 1_000_000) * pricing.output * 100;

	return inputCost + outputCost;
}
