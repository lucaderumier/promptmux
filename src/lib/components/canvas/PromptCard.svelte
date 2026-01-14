<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Plus } from '@lucide/svelte';

	interface Props {
		value?: string;
		onchange?: (value: string) => void;
		onAddNode?: () => void;
		onDragStart?: (e: MouseEvent) => void;
	}

	let {
		value = $bindable(''),
		onchange,
		onAddNode,
		onDragStart
	}: Props = $props();

	function handleInput(e: Event) {
		const target = e.target as HTMLTextAreaElement;
		value = target.value;
		onchange?.(target.value);
	}

	function handleMouseDown(e: MouseEvent) {
		// Only start drag if clicking on header area (not buttons or textarea)
		const target = e.target as HTMLElement;
		if (target.closest('button, textarea, [data-no-drag]')) {
			return;
		}
		onDragStart?.(e);
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="relative" onmousedown={handleMouseDown}>
	<Card.Root class="w-[400px] shadow-lg cursor-grab active:cursor-grabbing" data-slot="prompt-card">
		<Card.Header class="pb-3">
			<Card.Title class="text-base">Prompt</Card.Title>
		</Card.Header>
		<Card.Content class="pt-0">
			<div class="relative h-[300px]">
				<Textarea
					{value}
					oninput={handleInput}
					placeholder="Enter your prompt here..."
					class="absolute inset-0 h-full resize-none overflow-auto"
				/>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Add Node Button (positioned on the right edge) -->
	<button
		onclick={onAddNode}
		class="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 flex h-8 w-8 items-center justify-center rounded-full border bg-card shadow-md transition-all hover:scale-110 hover:bg-accent"
		title="Add model"
	>
		<Plus class="h-4 w-4" />
	</button>
</div>
