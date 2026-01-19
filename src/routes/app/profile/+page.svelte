<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Globe, Twitter, Github, Linkedin, Upload, Trash2 } from '@lucide/svelte';

	let { data } = $props();

	let isLoading = $state(false);
	let isUploadingAvatar = $state(false);
	let localProfile = $state<typeof data.profile | null>(null);
	let fileInput = $state<HTMLInputElement | null>(null);

	// Use local state if modified, otherwise use data from server
	const profile = $derived(localProfile ?? data.profile);

	function getInitials(name: string): string {
		if (!name) return 'U';
		return name
			.split(' ')
			.map((word) => word[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}

	async function handleAvatarUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file || !profile) return;

		isUploadingAvatar = true;
		try {
			const formData = new FormData();
			formData.append('file', file);

			const response = await fetch('/api/avatar', {
				method: 'POST',
				body: formData
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Failed to upload avatar');
			}

			const result = await response.json();
			localProfile = {
				display_name: profile.display_name,
				bio: profile.bio,
				avatar_url: result.avatarUrl,
				website: profile.website,
				twitter: profile.twitter,
				github: profile.github,
				linkedin: profile.linkedin
			};
			toast.success('Avatar updated successfully');
			// Refresh page data so sidebar avatar updates
			await invalidateAll();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to upload avatar');
		} finally {
			isUploadingAvatar = false;
			if (input) input.value = '';
		}
	}

	async function handleAvatarDelete() {
		if (!profile) return;

		isUploadingAvatar = true;
		try {
			const response = await fetch('/api/avatar', {
				method: 'DELETE'
			});

			if (!response.ok) {
				throw new Error('Failed to delete avatar');
			}

			localProfile = {
				display_name: profile.display_name,
				bio: profile.bio,
				avatar_url: '',
				website: profile.website,
				twitter: profile.twitter,
				github: profile.github,
				linkedin: profile.linkedin
			};
			toast.success('Avatar removed');
			// Refresh page data so sidebar avatar updates
			await invalidateAll();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to remove avatar');
		} finally {
			isUploadingAvatar = false;
		}
	}
</script>

<div class="h-full">
	<div class="mb-6">
		<h1 class="text-2xl font-bold">Profile</h1>
		<p class="text-muted-foreground">Manage your public profile information</p>
	</div>

	<form
		method="POST"
		action="?/save"
		class="max-w-2xl space-y-6"
		use:enhance={() => {
			isLoading = true;
			return async ({ result }) => {
				isLoading = false;
				if (result.type === 'success') {
					toast.success('Profile saved successfully');
					const successData = result.data as { profile?: NonNullable<typeof data.profile> } | undefined;
					if (successData?.profile) {
						localProfile = successData.profile;
					}
				} else if (result.type === 'failure') {
					const failData = result.data as { error?: string } | undefined;
					toast.error(failData?.error || 'Failed to save profile');
				}
			};
		}}
	>
		<Card>
			<CardHeader>
				<CardTitle>Basic Information</CardTitle>
				<CardDescription>Your public profile details</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="flex items-center gap-4">
					<Avatar.Root class="h-20 w-20">
						<Avatar.Image src={profile?.avatar_url} alt={profile?.display_name} />
						<Avatar.Fallback class="text-lg">{getInitials(profile?.display_name || '')}</Avatar.Fallback>
					</Avatar.Root>
					<div class="flex-1 space-y-2">
						<Label>Profile Picture</Label>
						<div class="flex gap-2">
							<input
								bind:this={fileInput}
								type="file"
								accept="image/jpeg,image/png,image/gif,image/webp"
								class="hidden"
								onchange={handleAvatarUpload}
							/>
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={isUploadingAvatar}
								onclick={() => fileInput?.click()}
							>
								<Upload class="size-4 mr-2" />
								{isUploadingAvatar ? 'Uploading...' : 'Upload'}
							</Button>
							{#if profile?.avatar_url}
								<Button
									type="button"
									variant="outline"
									size="sm"
									disabled={isUploadingAvatar}
									onclick={handleAvatarDelete}
								>
									<Trash2 class="size-4 mr-2" />
									Remove
								</Button>
							{/if}
						</div>
						<p class="text-xs text-muted-foreground">JPEG, PNG, GIF or WebP. Max 5MB.</p>
					</div>
				</div>

				<div class="space-y-2">
					<Label for="display_name">Display Name</Label>
					<Input
						id="display_name"
						name="display_name"
						placeholder="John Doe"
						value={profile?.display_name || ''}
					/>
				</div>

				<div class="space-y-2">
					<Label for="bio">Bio</Label>
					<Textarea
						id="bio"
						name="bio"
						placeholder="Tell us about yourself..."
						rows={4}
						value={profile?.bio || ''}
					/>
				</div>
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle>Social Links</CardTitle>
				<CardDescription>Connect your social profiles</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="space-y-2">
					<Label for="website" class="flex items-center gap-2">
						<Globe class="size-4" />
						Website
					</Label>
					<Input
						id="website"
						name="website"
						type="url"
						placeholder="https://yourwebsite.com"
						value={profile?.website || ''}
					/>
				</div>

				<div class="space-y-2">
					<Label for="twitter" class="flex items-center gap-2">
						<Twitter class="size-4" />
						Twitter / X
					</Label>
					<Input
						id="twitter"
						name="twitter"
						placeholder="@username"
						value={profile?.twitter || ''}
					/>
				</div>

				<div class="space-y-2">
					<Label for="github" class="flex items-center gap-2">
						<Github class="size-4" />
						GitHub
					</Label>
					<Input
						id="github"
						name="github"
						placeholder="username"
						value={profile?.github || ''}
					/>
				</div>

				<div class="space-y-2">
					<Label for="linkedin" class="flex items-center gap-2">
						<Linkedin class="size-4" />
						LinkedIn
					</Label>
					<Input
						id="linkedin"
						name="linkedin"
						placeholder="username or profile URL"
						value={profile?.linkedin || ''}
					/>
				</div>
			</CardContent>
		</Card>

		<div class="flex justify-end pb-8">
			<Button type="submit" disabled={isLoading}>
				{#if isLoading}
					Saving...
				{:else}
					Save Profile
				{/if}
			</Button>
		</div>
	</form>
</div>
