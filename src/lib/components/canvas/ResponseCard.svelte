<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { X, Loader2, AlertCircle, ArrowUpRight, Heart, Clock, Coins, Plus } from '@lucide/svelte';
	import type { ResponseNode } from '$lib/services/canvas/types/canvasTypes';
	import { PROVIDER_CONFIGS } from '$lib/services/settings/types/settingsTypes';

	interface Props {
		node: ResponseNode;
		onRemove?: () => void;
		onDragStart?: (e: MouseEvent) => void;
		onGetResponse?: () => void;
		onToggleLike?: () => void;
		onAddFollowUp?: () => void;
		canGetResponse?: boolean;
	}

	let { node, onRemove, onDragStart, onGetResponse, onToggleLike, onAddFollowUp, canGetResponse = false }: Props = $props();

	const providerConfig = $derived(
		node.provider ? PROVIDER_CONFIGS.find((p) => p.id === node.provider) : null
	);

	// Can show the "Get response" button when model is selected and not currently loading or done
	const showGetResponseButton = $derived(
		node.modelId && (node.status === 'idle' || node.status === 'error' || (node.status === 'done' && node.response))
	);

	// Show follow-up button when response is complete
	const canAddFollowUp = $derived(node.response && node.status === 'done');

	// Format cost display (convert cents to dollars)
	function formatCost(cents: number | null): string {
		if (cents === null) return '';
		// Convert cents to dollars
		const dollars = cents / 100;
		// Format with appropriate decimal places based on magnitude
		if (dollars < 0.0001) {
			return '<$0.0001';
		} else if (dollars < 0.01) {
			return `$${dollars.toFixed(4)}`;
		} else if (dollars < 1) {
			return `$${dollars.toFixed(3)}`;
		}
		return `$${dollars.toFixed(2)}`;
	}

	function handleMouseDown(e: MouseEvent) {
		// Only start drag if clicking on header area (not buttons or content)
		const target = e.target as HTMLElement;
		if (target.closest('button, [data-no-drag]')) {
			return;
		}
		onDragStart?.(e);
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="relative" onmousedown={handleMouseDown}>
	<Card.Root
		class="w-[400px] shadow-lg select-none cursor-grab active:cursor-grabbing"
		data-slot="response-card"
	>
		<!-- Header with drag handle -->
		<Card.Header class="pb-3">
			<div class="flex items-center justify-between gap-2">
				<div class="flex items-center gap-2 min-w-0">
					{#if providerConfig}
						<img
							src={providerConfig.logo}
							alt={providerConfig.name}
							class="h-5 w-5 shrink-0"
						/>
						<span class="font-medium truncate">{node.modelName}</span>
					{:else}
						<span class="text-muted-foreground">Select a model</span>
					{/if}
				</div>
				<button
					onclick={onRemove}
					class="rounded p-1 transition-colors hover:bg-destructive/10 hover:text-destructive shrink-0"
					title="Remove"
				>
					<X class="h-4 w-4" />
				</button>
			</div>
		</Card.Header>

		<Card.Content class="pt-0" data-no-drag>
			<div class="relative h-[300px] rounded-md border bg-muted/30">
				{#if node.status === 'selecting'}
					<div class="flex h-full items-center justify-center text-muted-foreground">
						<span>Select a model to continue</span>
					</div>
				{:else if node.status === 'loading'}
					<div class="flex h-full items-center justify-center gap-2 text-muted-foreground">
						<Loader2 class="h-5 w-5 animate-spin" />
						<span>Getting response...</span>
					</div>
				{:else if node.status === 'error'}
					<div class="flex h-full flex-col items-center justify-center gap-3 p-4">
						<div class="flex flex-col items-center gap-2 text-destructive">
							<AlertCircle class="h-6 w-6" />
							<span class="text-center text-sm">{node.error || 'An error occurred'}</span>
						</div>
						{#if showGetResponseButton}
							<Button
								variant="outline"
								size="sm"
								onclick={onGetResponse}
								disabled={!canGetResponse}
								class="gap-1.5"
							>
								Retry
								<ArrowUpRight class="h-3.5 w-3.5" />
							</Button>
						{/if}
					</div>
				{:else if node.response}
					<ScrollArea class="h-full p-3">
						<pre class="whitespace-pre-wrap text-sm font-sans">{node.response}</pre>
					</ScrollArea>
				{:else}
					<div class="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
						<span>Ready to get response</span>
						<Button
							variant="default"
							size="sm"
							onclick={onGetResponse}
							disabled={!canGetResponse}
							class="gap-1.5"
						>
							Get response
							<ArrowUpRight class="h-3.5 w-3.5" />
						</Button>
					</div>
				{/if}
			</div>
		</Card.Content>

		<!-- Footer with metadata badges and like button -->
		{#if node.response && node.status === 'done'}
			<Card.Footer class="pt-3 pb-3">
				<div class="flex items-center justify-between w-full">
					<div class="flex items-center gap-2">
						{#if node.latencyMs !== null}
							<Badge variant="secondary" class="gap-1 text-xs">
								<Clock class="h-3 w-3" />
								{node.latencyMs}ms
							</Badge>
						{/if}
						{#if node.promptTokens !== null && node.completionTokens !== null}
							<Badge variant="secondary" class="gap-1 text-xs" title="Input / Output tokens">
								<span class="text-muted-foreground">↗</span>{node.promptTokens}
								<span class="text-muted-foreground">/</span>
								<span class="text-muted-foreground">↘</span>{node.completionTokens}
							</Badge>
						{/if}
						{#if node.costCents !== null}
							<Badge variant="outline" class="gap-1 text-xs" title="Estimated cost (may vary)">
								<Coins class="h-3 w-3" />
								~{formatCost(node.costCents)}
							</Badge>
						{/if}
					</div>
					<!-- Like button -->
					<button
						onclick={onToggleLike}
						class="rounded p-1 transition-colors hover:bg-accent"
						title={node.liked ? 'Unlike' : 'Like'}
					>
						<Heart
							class="h-5 w-5 transition-colors {node.liked ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}"
						/>
					</button>
				</div>
			</Card.Footer>
		{/if}
	</Card.Root>

	<!-- Add Follow-up Button (positioned on the right edge, like PromptCard) -->
	{#if canAddFollowUp}
		<button
			onclick={onAddFollowUp}
			class="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 flex h-8 w-8 items-center justify-center rounded-full border bg-card shadow-md transition-all hover:scale-110 hover:bg-accent"
			title="Add follow-up"
		>
			<Plus class="h-4 w-4" />
		</button>
	{/if}
</div>
