<script lang="ts">
	/**
	 * A model response node (right side of the canvas)
	 * Shows the model name, response preview, and rating controls
	 */
	import type { ModelConfig } from '$lib/llm/types';
	import type { ModelResponse } from '$lib/services/canvas/types/canvasTypes';

	interface Props {
		config: ModelConfig;
		response?: ModelResponse;
		onRatingChange?: (rating: number) => void;
		onNotesChange?: (notes: string) => void;
		onHover?: (isHovered: boolean) => void;
		onClick?: () => void;
	}

	let { config, response, onRatingChange, onNotesChange, onHover, onClick }: Props = $props();

	const isLoading = $derived(response?.status === 'loading');
	const hasError = $derived(response?.status === 'error');
	const isDone = $derived(response?.status === 'done');
</script>

<button
	type="button"
	class="model-node bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-700 min-w-[280px] text-left transition-all hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
	onmouseenter={() => onHover?.(true)}
	onmouseleave={() => onHover?.(false)}
	onclick={() => onClick?.()}
>
	<div class="flex items-center justify-between mb-2">
		<span class="text-sm font-medium text-gray-300">{config.name}</span>
		<span class="text-xs text-gray-500 uppercase">{config.provider}</span>
	</div>

	{#if hasError && response?.error}
		<div class="text-red-400 text-sm p-2 bg-red-900/20 rounded">
			{response.error}
		</div>
	{:else if isDone && response}
		<div class="text-gray-300 text-sm max-h-40 overflow-y-auto">
			{response.response.slice(0, 200)}{response.response.length > 200 ? '...' : ''}
		</div>
		{#if response.latencyMs}
			<div class="mt-2 text-xs text-gray-500">
				{response.latencyMs}ms
			</div>
		{/if}
	{:else if isLoading}
		<div class="text-gray-500 text-sm flex items-center gap-2">
			<span class="animate-spin">⏳</span>
			Generating...
		</div>
	{:else}
		<div class="text-gray-500 text-sm">
			Waiting for response...
		</div>
	{/if}
</button>
