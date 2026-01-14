<script lang="ts">
	/**
	 * Integration Connect Button Component
	 *
	 * A button for integration cards with animated states:
	 * - Connect: Primary filled button
	 * - Connecting: Button with spinner
	 * - Connected: Outline button with green indicator
	 * - Connected + Hover: Text transition to "Disconnect"
	 */

	import { cn } from '$lib/utils/cn';
	import { Loader2, Key } from '@lucide/svelte';

	interface Props {
		isConnected: boolean;
		isConnecting?: boolean;
		disabled?: boolean;
		onclick: (e: MouseEvent) => void;
		onhoverchange?: (hovered: boolean) => void;
		class?: string;
	}

	let {
		isConnected,
		isConnecting = false,
		disabled = false,
		onclick,
		onhoverchange,
		class: className = ''
	}: Props = $props();

	let isHovered = $state(false);

	function setHovered(value: boolean) {
		isHovered = value;
		onhoverchange?.(value);
	}
</script>

<button
	type="button"
	class={cn(
		'focus-visible:ring-ring relative inline-flex h-9 w-full items-center justify-center gap-2 overflow-hidden rounded-md px-4 text-sm font-medium transition-all duration-200 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-1 disabled:pointer-events-none disabled:opacity-50',
		isConnected
			? isHovered
				? 'border border-destructive/60 bg-destructive/10 text-destructive'
				: 'border border-border bg-background text-foreground shadow-sm'
			: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
		className
	)}
	disabled={disabled || isConnecting}
	{onclick}
	onmouseenter={() => setHovered(true)}
	onmouseleave={() => setHovered(false)}
>
	{#if isConnecting}
		<Loader2 class="h-4 w-4 animate-spin" />
		<span>Connecting...</span>
	{:else if isConnected}
		<!-- Connected state with centered text and indicator on the right -->
		<div class="relative flex h-full w-full items-center justify-center overflow-hidden">
			<!-- Connected text (slides up on hover) -->
			<span
				class={cn(
					'flex items-center justify-center transition-transform duration-300 ease-out',
					isHovered ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'
				)}
			>
				Connected
			</span>
			<!-- Disconnect text (slides in from bottom on hover) -->
			<span
				class={cn(
					'absolute inset-0 flex items-center justify-center transition-transform duration-300 ease-out',
					isHovered ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
				)}
			>
				Disconnect
			</span>
		</div>
		<!-- Green indicator on the far right -->
		<span
			class={cn(
				'absolute right-3 h-2 w-2 rounded-full bg-green-500 transition-opacity duration-300',
				isHovered ? 'opacity-0' : 'opacity-100'
			)}
		></span>
	{:else}
		<Key class="h-4 w-4" />
		<span>Connect</span>
	{/if}
</button>
