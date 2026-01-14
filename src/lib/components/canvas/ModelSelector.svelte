<script lang="ts">
	import * as Popover from '$lib/components/ui/popover';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { AVAILABLE_MODELS, type Provider, type ModelConfig } from '$lib/llm/types';
	import { PROVIDER_CONFIGS } from '$lib/services/settings/types/settingsTypes';

	interface Props {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		onSelect?: (model: ModelConfig) => void;
		configuredProviders?: Provider[];
		children?: import('svelte').Snippet;
	}

	let {
		open = $bindable(false),
		onOpenChange,
		onSelect,
		configuredProviders = [],
		children
	}: Props = $props();

	// Get providers that have logos configured
	const providersWithModels = $derived(
		PROVIDER_CONFIGS.filter((p) => AVAILABLE_MODELS[p.id]?.length > 0)
	);

	function handleSelect(model: ModelConfig) {
		onSelect?.(model);
		open = false;
		onOpenChange?.(false);
	}

	function isProviderConfigured(provider: Provider): boolean {
		return configuredProviders.includes(provider);
	}
</script>

<Popover.Root bind:open onOpenChange={onOpenChange}>
	<Popover.Trigger>
		{#if children}
			{@render children()}
		{/if}
	</Popover.Trigger>
	<Popover.Content class="w-[280px] p-0" align="start">
		<ScrollArea class="h-[320px]">
			<div class="p-2">
				{#each providersWithModels as provider}
					{@const models = AVAILABLE_MODELS[provider.id] || []}
					{@const isConfigured = isProviderConfigured(provider.id)}
					<div class="mb-3 last:mb-0">
						<!-- Provider Header -->
						<div class="flex items-center gap-2 px-2 py-1.5">
							<img
								src={provider.logo}
								alt={provider.name}
								class="h-4 w-4"
								class:opacity-40={!isConfigured}
							/>
							<span
								class="text-xs font-medium uppercase tracking-wide"
								class:text-muted-foreground={!isConfigured}
							>
								{provider.name}
							</span>
							{#if !isConfigured}
								<span class="ml-auto text-xs text-muted-foreground">No API key</span>
							{/if}
						</div>

						<!-- Models -->
						<div class="space-y-0.5">
							{#each models as model}
								<button
									onclick={() => handleSelect(model)}
									disabled={!isConfigured}
									class="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
								>
									<span class="truncate">{model.name}</span>
								</button>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</ScrollArea>
	</Popover.Content>
</Popover.Root>
