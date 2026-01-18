/**
 * DeepSeek provider implementation using Vercel AI SDK
 */

import { createDeepSeek } from '@ai-sdk/deepseek';
import { generateText } from 'ai';
import type { ProviderInstance, CreateProviderOptions, GenerateResult } from './base';
import { formatUsage } from './base';

export function createDeepSeekProvider(options: CreateProviderOptions): ProviderInstance {
	const deepseek = createDeepSeek({
		apiKey: options.apiKey
	});

	return {
		provider: 'deepseek',

		// Single-turn text generation
		generateText: async ({ model, prompt, system, maxTokens, temperature }): Promise<GenerateResult> => {
			const result = await generateText({
				model: deepseek(model),
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
				model: deepseek(model),
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
