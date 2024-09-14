import type { Handle } from '@sveltejs/kit';
import { apiFetch } from '$lib/api';
import { setUser } from '$lib/stores/auth'; // 使用你之前定义的 apiFetch 函数

export const handle: Handle = async ({ event, resolve }) => {
	const protectedRoutes = ['/chat', '/me'];

	// 检查是否是受保护的路由
	if (protectedRoutes.some((route) => event.url.pathname.startsWith(route))) {
		try {
			const response = await apiFetch<{ user: { id: string; username: string; email: string } }>(
				'users/me',
				{
					fetch: event.fetch,
					method: 'GET'
				}
			);

			if (response.success) {
				setUser(response.data.user);
			} else {
				setUser(null);
				// 如果用户未登录，重定向到登录页面
				return new Response(null, {
					status: 303,
					headers: {
						Location: '/signin'
					}
				});
			}
		} catch (error) {
			console.error('Auth check failed', error);
			return new Response(null, {
				status: 303,
				headers: {
					Location: '/signin'
				}
			});
		}
	}

	// 如果用户已登录或者是公开页面，继续处理请求
	return resolve(event);
};
