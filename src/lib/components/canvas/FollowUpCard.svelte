<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Badge } from '$lib/components/ui/badge';
	import { Plus, X, Loader2, GitMerge, AlertTriangle } from '@lucide/svelte';
	import type { FollowUpNode } from '$lib/services/canvas/types/canvasTypes';

	interface Props {
		node: FollowUpNode;
		onPromptChange?: (prompt: string) => void;
		onAddNode?: () => void;
		onRemove?: () => void;
		onDragStart?: (e: MouseEvent) => void;
		depthWarning?: { warn: boolean; depth: number; message: string } | null;
	}

	let {
		node,
		onPromptChange,
		onAddNode,
		onRemove,
		onDragStart,
		depthWarning = null
	}: Props = $props();

	function handleInput(e: Event) {
		const target = e.target as HTMLTextAreaElement;
		onPromptChange?.(target.value);
	}

	function handleMouseDown(e: MouseEvent) {
		// Only start drag if clicking on header area (not buttons or textarea)
		const target = e.target as HTMLElement;
		if (target.closest('button, textarea, [data-no-drag]')) {
			return;
		}
		onDragStart?.(e);
	}

	const parentCount = $derived(node.parentResponseIds.length);
	const isMultiParent = $derived(parentCount > 1);
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="relative" onmousedown={handleMouseDown}>
	<Card.Root
		class="w-[400px] shadow-lg cursor-grab active:cursor-grabbing border-2 {node.status === 'generating' ? 'border-primary' : 'border-dashed border-muted-foreground/30'}"
		data-slot="followup-card"
	>
		<Card.Header class="pb-3">
			<div class="flex items-center justify-between gap-2">
				<div class="flex items-center gap-2 min-w-0">
					<Card.Title class="text-base">Follow-up</Card.Title>
					{#if isMultiParent}
						<Badge variant="secondary" class="gap-1 text-xs" title="Merging responses from multiple models">
							<GitMerge class="h-3 w-3" />
							{parentCount} merged
						</Badge>
					{/if}
					{#if depthWarning?.warn}
						<Badge variant="outline" class="gap-1 text-xs text-amber-500 border-amber-500/30" title={depthWarning.message}>
							<AlertTriangle class="h-3 w-3" />
							Depth {depthWarning.depth}
						</Badge>
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
		<Card.Content class="pt-0">
			{#if node.status === 'generating'}
				<div class="relative h-[200px] rounded-md border bg-muted/30 flex items-center justify-center gap-2 text-muted-foreground">
					<Loader2 class="h-5 w-5 animate-spin" />
					<span>Generating responses...</span>
				</div>
			{:else}
				<div class="relative h-[200px]">
					<Textarea
						value={node.prompt}
						oninput={handleInput}
						placeholder="Enter your follow-up question..."
						class="absolute inset-0 h-full resize-none overflow-auto"
					/>
				</div>
			{/if}
		</Card.Content>

		<!-- Status indicator -->
		{#if node.childResponseIds.length > 0}
			<Card.Footer class="pt-0 pb-3">
				<span class="text-xs text-muted-foreground">
					{node.childResponseIds.length} model{node.childResponseIds.length === 1 ? '' : 's'} attached
				</span>
			</Card.Footer>
		{/if}
	</Card.Root>

	<!-- Add Node Button (positioned on the right edge) -->
	{#if node.status !== 'generating' && node.prompt.trim()}
		<button
			onclick={onAddNode}
			class="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 flex h-8 w-8 items-center justify-center rounded-full border bg-card shadow-md transition-all hover:scale-110 hover:bg-accent"
			title="Add model"
		>
			<Plus class="h-4 w-4" />
		</button>
	{/if}
</div>
