<script lang="ts">
	/**
	 * Integration Logo Box Component
	 *
	 * Displays provider logos with a subtle glass morphism effect.
	 */

	interface Props {
		src: string;
		alt: string;
		size?: 'sm' | 'md' | 'lg';
		emphasized?: boolean;
		class?: string;
	}

	let {
		src,
		alt,
		size = 'lg',
		emphasized = false,
		class: className = ''
	}: Props = $props();

	// Size configurations
	const sizeConfig = {
		sm: { container: 'h-10 w-10', icon: 'h-5 w-5' },
		md: { container: 'h-12 w-12', icon: 'h-7 w-7' },
		lg: { container: 'h-14 w-14', icon: 'h-8 w-8' }
	};

	let containerClass = $derived(sizeConfig[size].container);
	let iconClass = $derived(sizeConfig[size].icon);
</script>

<div
	class="relative {containerClass} {className} transition-transform duration-200 {emphasized
		? 'scale-110'
		: ''}"
>
	<!-- Glass morphism background -->
	<div
		class="absolute inset-0 rounded-xl border border-border/50 bg-muted/50 backdrop-blur-sm"
	></div>
	<!-- Icon container -->
	<div class="relative flex {containerClass} items-center justify-center rounded-xl">
		<img src={src} {alt} class="{iconClass} relative z-10 object-contain" />
	</div>
</div>
