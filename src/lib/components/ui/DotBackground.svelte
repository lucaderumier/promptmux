<script lang="ts">
	import { cn } from '$lib/utils/cn';

	let {
		size = 20,
		dotSize = 1.2,
		color = 'currentColor',
		opacity = 0.15,
		class: className = ''
	}: {
		size?: number;
		dotSize?: number;
		color?: string;
		opacity?: number;
		class?: string;
	} = $props();

	const backgroundStyle = $derived(`
		background-image: radial-gradient(circle at center, ${color} ${dotSize}px, transparent ${dotSize}px);
		background-size: ${size}px ${size}px;
		background-position: center;
		opacity: ${opacity};
	`);
</script>

<div
	class={cn('pointer-events-none absolute inset-0 h-full w-full', className)}
	style={backgroundStyle}
></div>
