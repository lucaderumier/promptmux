<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar';
	import { AppSidebar } from '$lib/components/sidebar';

	let { children, data } = $props();

	// Get sidebar state from cookie (defaults to true/open)
	let defaultOpen = $state(true);
</script>

<Sidebar.Provider bind:open={defaultOpen}>
	<AppSidebar user={data.user} supabase={data.supabase} recentPromptMaps={data.recentPromptMaps} />
	<Sidebar.Inset>
		<header class="flex h-14 shrink-0 items-center gap-2 px-4">
			<Sidebar.Trigger class="-ml-1" />
		</header>
		<main class="flex-1 overflow-auto p-6">
			{@render children()}
		</main>
	</Sidebar.Inset>
</Sidebar.Provider>
