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
		<div class="relative h-full w-full">
			<Sidebar.Trigger class="absolute left-4 top-4 z-50" />
			<main class="h-full w-full overflow-hidden pt-16 pl-16">
				{@render children()}
			</main>
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>
