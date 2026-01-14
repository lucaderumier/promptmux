<script lang="ts">
	import '../app.css';
	import { Toaster } from '$lib/components/ui/sonner';
	import { ModeWatcher } from 'mode-watcher';

	let { children, data } = $props();
</script>

<ModeWatcher defaultMode="dark" />
<Toaster />

{@render children()}
