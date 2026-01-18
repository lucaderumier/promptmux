/**
 * Mistral provider implementation using Vercel AI SDK
 */

import { createMistral } from '@ai-sdk/mistral';
import { generateText } from 'ai';
import type { ProviderInstance, CreateProviderOptions, GenerateResult } from './base';
import { formatUsage } from './base';

export function createMistralProvider(options: CreateProviderOptions): ProviderInstance {
	const mistral = createMistral({
		apiKey: options.apiKey
	});

	return {
		provider: 'mistral',

		// Single-turn text generation
		generateText: async ({ model, prompt, system, maxTokens, temperature }): Promise<GenerateResult> => {
			const result = await generateText({
				model: mistral(model),
				prompt,
				system,
				maxOutputTokens: maxTokens,
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
				model: mistral(model),
				messages: messages.map((m) => ({
					role: m.role,
					content: m.content
				})),
				system,
				maxOutputTokens: maxTokens,
				temperature
			});

			return {
				text: result.text,
				usage: formatUsage(result.usage)
			};
		}
	};
}
