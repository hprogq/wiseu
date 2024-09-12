// @ts-nocheck
import type { PageLoad } from './$types';
import { apiFetch } from '$lib/api';
import { marked } from 'marked';
import { v4 as uuidv4 } from 'uuid';

export const load = async ({ params, fetch }: Parameters<PageLoad>[0]) => {
	const identityId = params.identityId;

	if (identityId) {
		return { identityId };
	}

	return { identityId: null };
};
