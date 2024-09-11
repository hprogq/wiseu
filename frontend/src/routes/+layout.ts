import type { LayoutLoad } from './$types';
import { apiFetch } from '$lib/api';

export const load: LayoutLoad = async ({ fetch }) => {
	const response = await apiFetch<{ user: { id: string; username: string; email: string } }>(
		'users/me',
		{ fetch }
	)
		.then((res) => res)
		.catch((err) => {
			return { success: false, data: { user: null } };
		});

	return {
		user: response.success ? response.data.user : null
	};
};
