<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import {
		CardProvider,
		FormApiKey,
		PROVIDER_CONFIGS,
		settingsStore,
		settingsHandlers,
		type ProviderConfig,
		type ApiKeyInfo
	} from '$lib/services/settings';
	import type { Provider } from '$lib/llm/types';

	let { data } = $props();

	// Initialize store with loaded data
	$effect(() => {
		settingsHandlers.setApiKeys(data.apiKeys);
	});

	// Dialog state
	let dialogOpen = $state(false);
	let selectedConfig = $state<ProviderConfig | null>(null);
	let isLoading = $state(false);

	// Form references for programmatic submission
	let saveFormRef: HTMLFormElement;
	let removeFormRef: HTMLFormElement;
	let currentProvider = $state<Provider | null>(null);
	let currentApiKey = $state('');
	let providerToRemove = $state<Provider | null>(null);

	function getApiKeyInfo(provider: Provider): ApiKeyInfo | undefined {
		return $settingsStore.apiKeys.find((k) => k.provider === provider);
	}

	function handleConfigure(config: ProviderConfig) {
		selectedConfig = config;
		dialogOpen = true;
	}

	function handleDialogClose() {
		dialogOpen = false;
		selectedConfig = null;
		currentApiKey = '';
	}

	function handleSave(apiKey: string) {
		if (!selectedConfig) return;
		currentProvider = selectedConfig.id;
		currentApiKey = apiKey;
		isLoading = true;

		// Submit the form programmatically
		requestAnimationFrame(() => {
			saveFormRef?.requestSubmit();
		});
	}

	function handleRemove(provider: Provider) {
		providerToRemove = provider;
		requestAnimationFrame(() => {
			removeFormRef?.requestSubmit();
		});
	}
</script>

<div class="h-full">
	<div class="mb-6">
		<h1 class="text-2xl font-bold">API Keys</h1>
		<p class="text-muted-foreground">Configure your API keys for LLM providers</p>
	</div>

	<div class="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-5xl">
		{#each PROVIDER_CONFIGS as config}
			<CardProvider
				{config}
				apiKeyInfo={getApiKeyInfo(config.id)}
				onConfigure={() => handleConfigure(config)}
				onRemove={getApiKeyInfo(config.id) ? () => handleRemove(config.id) : undefined}
			/>
		{/each}
	</div>

	<FormApiKey
		open={dialogOpen}
		config={selectedConfig}
		{isLoading}
		onClose={handleDialogClose}
		onSave={handleSave}
	/>

	<!-- Hidden form for save action -->
	<form
		bind:this={saveFormRef}
		method="POST"
		action="?/save"
		class="hidden"
		use:enhance={() => {
			return async ({ result }) => {
				isLoading = false;

				if (result.type === 'success' && result.data?.apiKey) {
					settingsHandlers.addOrUpdateApiKey(result.data.apiKey);
					toast.success(`${selectedConfig?.name} API key saved successfully`);
					handleDialogClose();
				} else if (result.type === 'failure') {
					toast.error(result.data?.error || 'Failed to save API key');
				}
			};
		}}
	>
		<input type="hidden" name="provider" value={currentProvider || ''} />
		<input type="hidden" name="apiKey" value={currentApiKey} />
	</form>

	<!-- Hidden form for remove action -->
	<form
		bind:this={removeFormRef}
		method="POST"
		action="?/remove"
		class="hidden"
		use:enhance={() => {
			return async ({ result }) => {
				if (result.type === 'success' && result.data?.removedProvider) {
					settingsHandlers.removeApiKey(result.data.removedProvider);
					toast.success('API key removed successfully');
				} else if (result.type === 'failure') {
					toast.error(result.data?.error || 'Failed to remove API key');
				}
				providerToRemove = null;
			};
		}}
	>
		<input type="hidden" name="provider" value={providerToRemove || ''} />
	</form>
</div>
