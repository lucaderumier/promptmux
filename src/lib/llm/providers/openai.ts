/**
 * OpenAI provider implementation using Vercel AI SDK
 */

import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import type { ProviderInstance, CreateProviderOptions, GenerateResult } from './base';

export function createOpenAIProvider(options: CreateProviderOptions): ProviderInstance {
	const openai = createOpenAI({
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
		provider: 'openai',

		// Single-turn text generation
		generateText: async ({ model, prompt, system, maxTokens, temperature }): Promise<GenerateResult> => {
			const result = await generateText({
				model: openai(model),
				prompt,
				system,
				maxTokens,
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
				model: openai(model),
				messages: messages.map((m) => ({
					role: m.role,
					content: m.content
				})),
				system,
				maxTokens,
				temperature
			});

			return {
				text: result.text,
				usage: formatUsage(result.usage)
			};
		}
	};
}
