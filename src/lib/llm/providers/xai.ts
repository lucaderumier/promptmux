/**
 * xAI (Grok) provider implementation using Vercel AI SDK
 */

import { createXai } from '@ai-sdk/xai';
import { generateText } from 'ai';
import type { ProviderInstance, CreateProviderOptions, GenerateResult } from './base';
import { formatUsage } from './base';

export function createXAIProvider(options: CreateProviderOptions): ProviderInstance {
	const xai = createXai({
		apiKey: options.apiKey
	});

	return {
		provider: 'xai',

		// Single-turn text generation
		generateText: async ({ model, prompt, system, maxTokens, temperature }): Promise<GenerateResult> => {
			const result = await generateText({
				model: xai(model),
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
				model: xai(model),
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
