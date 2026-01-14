<script lang="ts">
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils/cn';

	interface NavItem {
		href: string;
		label: string;
		icon: string;
	}

	const navItems: NavItem[] = [
		{ href: '/app', label: 'Canvas', icon: '🎨' },
		{ href: '/app/library', label: 'Library', icon: '📚' },
		{ href: '/app/settings', label: 'Settings', icon: '⚙️' }
	];

	function isActive(href: string): boolean {
		if (href === '/app') {
			return $page.url.pathname === '/app';
		}
		return $page.url.pathname.startsWith(href);
	}
</script>

<aside class="w-64 border-r bg-card h-full flex flex-col">
	<!-- Logo -->
	<div class="p-4 border-b">
		<a href="/app" class="flex items-center gap-2">
			<span class="text-xl font-bold">PromptMux</span>
		</a>
	</div>

	<!-- Navigation -->
	<nav class="flex-1 p-4 space-y-1">
		{#each navItems as item}
			<a
				href={item.href}
				class={cn(
					'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
					isActive(item.href)
						? 'bg-primary text-primary-foreground'
						: 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
				)}
			>
				<span>{item.icon}</span>
				<span>{item.label}</span>
			</a>
		{/each}
	</nav>

	<!-- New Prompt Button -->
	<div class="p-4 border-t">
		<Button href="/app" variant="outline" class="w-full">
			<span class="mr-2">+</span>
			New Prompt
		</Button>
	</div>
</aside>
