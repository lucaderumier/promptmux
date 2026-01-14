import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Snippet } from 'svelte';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// Utility types for shadcn-svelte components
export type WithElementRef<T, E extends HTMLElement = HTMLElement> = T & {
	ref?: E | null;
};

export type WithoutChildrenOrChild<T> = Omit<T, 'children' | 'child'>;

export type WithoutChildren<T> = Omit<T, 'children'>;

export type WithoutChild<T> = Omit<T, 'child'>;

export type WithChildren<T> = T & {
	children?: Snippet;
};

export type WithChild<T, ChildProps extends Record<string, unknown> = Record<string, never>> = T & {
	child?: Snippet<[ChildProps & { props: Record<string, unknown> }]>;
	children?: Snippet;
};
