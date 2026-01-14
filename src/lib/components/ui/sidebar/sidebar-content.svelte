<script lang="ts">
	import { cn } from '$lib/utils/cn.js';
	import type { WithElementRef } from 'bits-ui';
	import { onMount } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLElement>> = $props();

	let showTopIndicator = $state(false);
	let showBottomIndicator = $state(false);

	function updateScrollIndicators() {
		if (!ref) return;

		const { scrollTop, scrollHeight, clientHeight } = ref;
		showTopIndicator = scrollTop > 0;
		showBottomIndicator = scrollTop + clientHeight < scrollHeight && scrollHeight > clientHeight;
	}

	onMount(() => {
		if (ref) {
			updateScrollIndicators();
			ref.addEventListener('scroll', updateScrollIndicators);

			const resizeObserver = new ResizeObserver(() => {
				updateScrollIndicators();
			});
			resizeObserver.observe(ref);

			return () => {
				ref?.removeEventListener('scroll', updateScrollIndicators);
				resizeObserver.disconnect();
			};
		}
	});
</script>

<div class="relative flex min-h-0 flex-1 flex-col">
	<div
		class="mr-2 h-px flex-shrink-0 px-0 transition-opacity duration-150 {showTopIndicator
			? 'opacity-75'
			: 'opacity-0'}"
	>
		<div class="h-full bg-border"></div>
	</div>

	<div
		bind:this={ref}
		data-sidebar="content"
		class={cn(
			'flex min-h-0 flex-1 flex-col gap-2 overflow-auto pr-1 group-data-[collapsible=icon]:overflow-hidden',
			className
		)}
		{...restProps}
	>
		{@render children?.()}
	</div>

	<div
		class="mr-2 h-px flex-shrink-0 px-0 transition-opacity duration-150 {showBottomIndicator
			? 'opacity-75'
			: 'opacity-0'}"
	>
		<div class="h-full bg-border"></div>
	</div>
</div>
