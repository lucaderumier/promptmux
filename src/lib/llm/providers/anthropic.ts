/**
 * Anthropic provider implementation using Vercel AI SDK
 */

import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import type { ProviderInstance, CreateProviderOptions, GenerateResult } from './base';

export function createAnthropicProvider(options: CreateProviderOptions): ProviderInstance {
	const anthropic = createAnthropic({
		apiKey: options.apiKey
	});

	// Helper to format usage
	const formatUsage = (usage: { promptTokens: number; completionTokens: number } | undefined) =>
		usage
			? {
					promptTokens: usage.promptTokens,
					completionTokens: usage.completionTokens
				}
			: undefined;

	return {
		provider: 'anthropic',

		// Single-turn text generation
		generateText: async ({ model, prompt, system, maxTokens, temperature }): Promise<GenerateResult> => {
			const result = await generateText({
				model: anthropic(model),
				prompt,
				system,
				maxTokens: maxTokens ?? 4096,
				temperature
			});

			return {
				text: result.text,
				usage: formatUsage(result.usage)
			};
		},

		// Multi-turn conversation generation
		generateTextMultiTurn: async ({ model, messages, system, maxTokens, temperature }): Promise<GenerateResult> => {
			const result = await generateText({
				model: anthropic(model),
				messages: messages.map((m) => ({
					role: m.role,
					content: m.content
				})),
				system,
				maxTokens: maxTokens ?? 4096,
				temperature
			});

			return {
				text: result.text,
				usage: formatUsage(result.usage)
			};
		}
	};
}
