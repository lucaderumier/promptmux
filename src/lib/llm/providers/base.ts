/**
 * Base provider interface and utilities
 */

import type { Provider } from '../types';

// Message format for multi-turn conversations
export interface ChatMessage {
	role: 'user' | 'assistant';
	content: string;
}

// Result format shared by both single and multi-turn
export interface GenerateResult {
	text: string;
	usage?: {
		promptTokens: number;
		completionTokens: number;
	};
}

// Helper to format usage from AI SDK v6 format to our internal format
export function formatUsage(usage: { inputTokens?: number; outputTokens?: number } | undefined) {
	return usage?.inputTokens !== undefined && usage?.outputTokens !== undefined
		? {
				promptTokens: usage.inputTokens,
				completionTokens: usage.outputTokens
			}
		: undefined;
}

export interface ProviderInstance {
	provider: Provider;

	// Single-turn text generation (backwards compatible)
	generateText: (params: {
		model: string;
		prompt: string;
		system?: string;
		maxTokens?: number;
		temperature?: number;
	}) => Promise<GenerateResult>;

	// Multi-turn conversation generation
	generateTextMultiTurn: (params: {
		model: string;
		messages: ChatMessage[];
		system?: string;
		maxTokens?: number;
		temperature?: number;
	}) => Promise<GenerateResult>;
}

export interface CreateProviderOptions {
	apiKey: string;
}
