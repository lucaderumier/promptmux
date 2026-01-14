<script lang="ts">
	import { mode, toggleMode } from 'mode-watcher';
	import { Sun, Moon } from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';

	const isDark = $derived(mode.current === 'dark');
</script>

<div class="h-full">
	<div class="mb-6">
		<h1 class="text-2xl font-bold">Settings</h1>
		<p class="text-muted-foreground">Manage your preferences</p>
	</div>

	<section>
		<h2 class="text-lg font-semibold mb-4">Appearance</h2>
		<Card.Root class="max-w-md">
			<Card.Header class="pb-3">
				<Card.Title class="text-base">Theme</Card.Title>
				<Card.Description>Choose between light and dark mode</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						{#if isDark}
							<Moon class="h-5 w-5 text-muted-foreground" />
							<span>Dark mode</span>
						{:else}
							<Sun class="h-5 w-5 text-muted-foreground" />
							<span>Light mode</span>
						{/if}
					</div>
					<Button variant="outline" size="sm" onclick={toggleMode}>
						{isDark ? 'Switch to light' : 'Switch to dark'}
					</Button>
				</div>
			</Card.Content>
		</Card.Root>
	</section>
</div>
