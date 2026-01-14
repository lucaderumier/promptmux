<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog';
	import { IntegrationLogoBox } from '$lib/components/ui/integration-logo-box';
	import { ExternalLink, Loader2 } from '@lucide/svelte';
	import type { ProviderConfig } from '../types/settingsTypes';

	interface Props {
		open: boolean;
		config: ProviderConfig | null;
		isLoading: boolean;
		onClose: () => void;
		onSave: (apiKey: string) => void;
	}

	let { open, config, isLoading, onClose, onSave }: Props = $props();

	let apiKey = $state('');
	let error = $state<string | null>(null);

	// Reset form when dialog opens/closes
	$effect(() => {
		if (open) {
			apiKey = '';
			error = null;
		}
	});

	function validateKey(): boolean {
		if (!apiKey.trim()) {
			error = 'API key is required';
			return false;
		}

		if (config && !apiKey.startsWith(config.keyPrefix)) {
			error = `API key should start with "${config.keyPrefix}"`;
			return false;
		}

		error = null;
		return true;
	}

	function handleSubmit() {
		if (!validateKey()) return;
		onSave(apiKey.trim());
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !isLoading) {
			handleSubmit();
		}
	}
</script>

<Dialog bind:open onOpenChange={(isOpen) => !isOpen && onClose()}>
	<DialogContent class="sm:max-w-md">
		<DialogHeader>
			<div class="flex items-center gap-3">
				{#if config}
					<IntegrationLogoBox
						src={config.logo}
						alt={config.name}
						size="md"
					/>
				{/if}
				<div>
					<DialogTitle>
						{config ? `Configure ${config.name}` : 'Configure API Key'}
					</DialogTitle>
					<DialogDescription>
						{#if config}
							Enter your API key to enable {config.name} models
						{/if}
					</DialogDescription>
				</div>
			</div>
		</DialogHeader>

		<div class="space-y-4 py-4">
			<div class="space-y-2">
				<Label for="api-key">API Key</Label>
				<Input
					id="api-key"
					type="password"
					placeholder={config ? `${config.keyPrefix}...` : 'Enter API key'}
					bind:value={apiKey}
					onkeydown={handleKeyDown}
					disabled={isLoading}
					class="font-mono"
				/>
				{#if error}
					<p class="text-sm text-destructive">{error}</p>
				{/if}
			</div>

			{#if config}
				<a
					href={config.docsUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
				>
					<ExternalLink class="h-3.5 w-3.5" />
					Get your API key from {config.name}
				</a>
			{/if}
		</div>

		<DialogFooter>
			<Button variant="outline" onclick={onClose} disabled={isLoading}>
				Cancel
			</Button>
			<Button onclick={handleSubmit} disabled={isLoading || !apiKey.trim()}>
				{#if isLoading}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					Saving...
				{:else}
					Save API Key
				{/if}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>
