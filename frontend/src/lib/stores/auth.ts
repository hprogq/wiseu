import { writable } from 'svelte/store';
import { apiFetch } from '$lib/api';

export const userStore = writable<{ id: string; username: string; email: string } | null>(null);

export function setUser(user: { id: string; username: string; email: string } | null) {
	userStore.set(user);
}
