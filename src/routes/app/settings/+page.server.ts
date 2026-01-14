import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// Settings page doesn't need any server data for now
	// Theme preference is handled client-side by mode-watcher
	return {};
};
