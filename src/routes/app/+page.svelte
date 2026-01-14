<script lang="ts">
	import PromptCanvas from '$lib/components/canvas/PromptCanvas.svelte';

	let { data } = $props();
</script>

<div class="h-full w-full">
	<PromptCanvas configuredProviders={data.configuredProviders} />
</div>
