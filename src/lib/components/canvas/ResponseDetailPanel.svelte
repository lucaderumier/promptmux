<script lang="ts">
	import { marked } from 'marked';
	import * as Card from '$lib/components/ui/card';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { Badge } from '$lib/components/ui/badge';
	import { X, Heart, Clock, Coins, Maximize2, Minimize2, ChevronDown, Check } from '@lucide/svelte';
	import type { ResponseNode } from '$lib/services/canvas/types/canvasTypes';
	import { PROVIDER_CONFIGS } from '$lib/services/settings/types/settingsTypes';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	interface Props {
		node: ResponseNode;
		siblingNodes: ResponseNode[];
		onClose: () => void;
		onSelectNode: (nodeId: string) => void;
	}

	let { node, siblingNodes, onClose, onSelectNode }: Props = $props();

	// Expanded state
	let isExpanded = $state(false);

	const providerConfig = $derived(
		node.provider ? PROVIDER_CONFIGS.find((p) => p.id === node.provider) : null
	);

	// Get provider config for any node
	function getProviderConfig(provider: string | null) {
		return provider ? PROVIDER_CONFIGS.find((p) => p.id === provider) : null;
	}

	// Check if there are other siblings to switch to
	const hasSiblings = $derived(siblingNodes.length > 1);

	// Parse markdown to HTML
	const renderedContent = $derived.by(() => {
		if (!node.response) return '';
		return marked.parse(node.response, { async: false }) as string;
	});

	// Format cost display (convert cents to dollars)
	function formatCost(cents: number | null): string {
		if (cents === null) return '';
		const dollars = cents / 100;
		if (dollars < 0.0001) {
			return '<$0.0001';
		} else if (dollars < 0.01) {
			return `$${dollars.toFixed(4)}`;
		} else if (dollars < 1) {
			return `$${dollars.toFixed(3)}`;
		}
		return `$${dollars.toFixed(2)}`;
	}

	// Handle escape key to close
	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

<!-- Panel container - positioned fixed on the right with margins -->
<div
	class="fixed z-50 flex transition-all duration-200 ease-out {isExpanded ? 'inset-4' : 'right-4 top-4 bottom-4 w-[500px]'}"
	transition:fly={{ x: 100, duration: 200, easing: cubicOut }}
>
	<Card.Root
		class="flex h-full w-full flex-col shadow-xl"
		data-slot="response-detail-card"
	>
		<!-- Header with model info -->
		<Card.Header class="shrink-0 pb-3">
			<div class="flex items-center justify-between gap-2">
				<div class="flex items-center gap-2 min-w-0">
					<button
						onclick={() => (isExpanded = !isExpanded)}
						class="rounded p-1 transition-colors hover:bg-muted shrink-0"
						title={isExpanded ? 'Collapse' : 'Expand'}
					>
						{#if isExpanded}
							<Minimize2 class="h-4 w-4" />
						{:else}
							<Maximize2 class="h-4 w-4" />
						{/if}
					</button>
					{#if hasSiblings}
						<!-- Dropdown to switch between sibling responses -->
						<DropdownMenu.Root>
							<DropdownMenu.Trigger class="flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-muted min-w-0">
								{#if providerConfig}
									<img
										src={providerConfig.logo}
										alt={providerConfig.name}
										class="h-5 w-5 shrink-0"
									/>
									<span class="font-medium truncate">{node.modelName}</span>
								{:else}
									<span class="text-muted-foreground">Response</span>
								{/if}
								<ChevronDown class="h-4 w-4 shrink-0 text-muted-foreground" />
							</DropdownMenu.Trigger>
							<DropdownMenu.Content align="start" class="w-64">
								<DropdownMenu.Label>Switch response</DropdownMenu.Label>
								<DropdownMenu.Separator />
								{#each siblingNodes as sibling (sibling.id)}
									{@const siblingProvider = getProviderConfig(sibling.provider)}
									<DropdownMenu.Item
										class="flex items-center gap-2"
										onclick={() => onSelectNode(sibling.id)}
									>
										{#if siblingProvider}
											<img
												src={siblingProvider.logo}
												alt={siblingProvider.name}
												class="h-4 w-4 shrink-0"
											/>
										{/if}
										<span class="truncate flex-1">{sibling.modelName || 'Unknown model'}</span>
										{#if sibling.id === node.id}
											<Check class="h-4 w-4 shrink-0 text-primary" />
										{/if}
									</DropdownMenu.Item>
								{/each}
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					{:else}
						<!-- No siblings, just show the model name -->
						{#if providerConfig}
							<img
								src={providerConfig.logo}
								alt={providerConfig.name}
								class="h-5 w-5 shrink-0"
							/>
							<span class="font-medium truncate">{node.modelName}</span>
						{:else}
							<span class="text-muted-foreground">Response</span>
						{/if}
					{/if}
				</div>
				<button
					onclick={onClose}
					class="rounded p-1 transition-colors hover:bg-muted shrink-0"
					title="Close"
				>
					<X class="h-4 w-4" />
				</button>
			</div>
		</Card.Header>

		<!-- Content - scrollable markdown area -->
		<Card.Content class="flex-1 overflow-hidden pt-0">
			<div class="h-full rounded-md border bg-muted/30">
				<ScrollArea class="h-full p-4">
					<article class="prose-content">
						{@html renderedContent}
					</article>
				</ScrollArea>
			</div>
		</Card.Content>

		<!-- Footer with metadata badges and like button -->
		<Card.Footer class="shrink-0 pt-3 pb-3">
			<div class="flex items-center justify-between w-full">
				<div class="flex items-center gap-2 flex-wrap">
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
				{#if node.liked}
					<Heart class="h-5 w-5 fill-red-500 text-red-500" />
				{/if}
			</div>
		</Card.Footer>
	</Card.Root>
</div>

<style>
	.prose-content {
		font-size: 0.9375rem;
		line-height: 1.7;
		color: hsl(var(--foreground));
	}

	.prose-content :global(h1),
	.prose-content :global(h2),
	.prose-content :global(h3),
	.prose-content :global(h4),
	.prose-content :global(h5),
	.prose-content :global(h6) {
		font-weight: 600;
		margin-top: 1.5em;
		margin-bottom: 0.5em;
		line-height: 1.3;
	}

	.prose-content :global(h1:first-child),
	.prose-content :global(h2:first-child),
	.prose-content :global(h3:first-child) {
		margin-top: 0;
	}

	.prose-content :global(h1) {
		font-size: 1.5rem;
	}

	.prose-content :global(h2) {
		font-size: 1.25rem;
	}

	.prose-content :global(h3) {
		font-size: 1.125rem;
	}

	.prose-content :global(p) {
		margin-bottom: 1em;
	}

	.prose-content :global(p:last-child) {
		margin-bottom: 0;
	}

	.prose-content :global(ul),
	.prose-content :global(ol) {
		margin-bottom: 1em;
		padding-left: 1.5em;
	}

	.prose-content :global(li) {
		margin-bottom: 0.25em;
	}

	.prose-content :global(ul) {
		list-style-type: disc;
	}

	.prose-content :global(ol) {
		list-style-type: decimal;
	}

	.prose-content :global(code) {
		background-color: hsl(var(--muted));
		padding: 0.2em 0.4em;
		border-radius: 0.25rem;
		font-size: 0.875em;
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
	}

	.prose-content :global(pre) {
		background-color: hsl(var(--muted));
		padding: 1em;
		border-radius: 0.5rem;
		overflow-x: auto;
		margin-bottom: 1em;
	}

	.prose-content :global(pre code) {
		background-color: transparent;
		padding: 0;
		font-size: 0.875rem;
	}

	.prose-content :global(blockquote) {
		border-left: 3px solid hsl(var(--border));
		padding-left: 1em;
		margin-left: 0;
		margin-bottom: 1em;
		color: hsl(var(--muted-foreground));
		font-style: italic;
	}

	.prose-content :global(a) {
		color: hsl(var(--primary));
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.prose-content :global(a:hover) {
		text-decoration-thickness: 2px;
	}

	.prose-content :global(hr) {
		border: none;
		border-top: 1px solid hsl(var(--border));
		margin: 1.5em 0;
	}

	.prose-content :global(table) {
		width: 100%;
		border-collapse: collapse;
		margin-bottom: 1em;
	}

	.prose-content :global(th),
	.prose-content :global(td) {
		border: 1px solid hsl(var(--border));
		padding: 0.5em 0.75em;
		text-align: left;
	}

	.prose-content :global(th) {
		background-color: hsl(var(--muted));
		font-weight: 600;
	}

	.prose-content :global(strong) {
		font-weight: 600;
	}

	.prose-content :global(em) {
		font-style: italic;
	}
</style>
