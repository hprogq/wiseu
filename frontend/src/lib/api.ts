import { PUBLIC_API_BASE_URL } from '$env/static/public';

export const apiBaseUrl = PUBLIC_API_BASE_URL as string;

interface ApiOptions extends RequestInit {
	headers?: Record<string, string>;
}

interface ApiResponse<T> {
	data: T;
	message: string;
	success: boolean;
}

interface ApiOptions extends RequestInit {
	headers?: Record<string, string>;
	fetch?: typeof fetch; // 添加 fetch 参数
}

/**
 * 普通的 API 请求函数，处理非流式响应
 */
export async function apiFetch<T>(
	endpoint: string,
	options: ApiOptions = {}
): Promise<ApiResponse<T>> {
	const url = `${apiBaseUrl}/${endpoint}`;

	const fetchFunction = options.fetch || fetch; // 使用传入的 fetch，或默认的全局 fetch

	// 启用 withCredentials 以发送带有 cookie 的请求
	const response = await fetchFunction(url, {
		...options,
		headers: {
			'Content-Type': 'application/json',
			...options.headers
		},
		credentials: 'include' // 启用跨域请求的 cookie
	});

	if (!response.ok) {
		// 检查是否是400错误，并返回相应的错误消息
		const errorData = await response.json();
		if (response.status === 400) {
			return { success: false, message: errorData.message, data: null as any };
		}
		throw new Error(`API fetch failed with status ${response.status}`);
	}

	return (await response.json()) as ApiResponse<T>;
}

/**
 * 流式 API 请求函数，处理服务器发送的流式数据（如 SSE）
 */
export async function* apiFetchStream<T>(
	endpoint: string,
	options: ApiOptions = {}
): AsyncGenerator<ApiResponse<T>, void, unknown> {
	const url = `${apiBaseUrl}/${endpoint}`;

	const fetchFunction = options.fetch || fetch; // 使用传入的 fetch，或默认的全局 fetch

	const response = await fetchFunction(url, {
		...options,
		headers: {
			'Content-Type': 'application/json',
			...options.headers
		},
		credentials: 'include' // 启用跨域请求的 cookie
	});

	if (!response.ok) {
		const errorData = await response.json();
		if (response.status === 400) {
			yield { success: false, message: errorData.message, data: null as any };
			return;
		}
		throw new Error(`API fetch failed with status ${response.status}`);
	}

	const reader = response.body?.getReader();
	if (!reader) {
		throw new Error('Response body is not readable');
	}

	const decoder = new TextDecoder();
	let buffer = '';

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			let lines = buffer.split('\n');

			// 保留最后一行，因为它可能是不完整的
			buffer = lines.pop() || '';

			for (const line of lines) {
				if (line.startsWith('data: ')) {
					const jsonStr = line.slice(6);
					if (jsonStr === '[DONE]') return;

					try {
						const data = JSON.parse(jsonStr);
						yield data as ApiResponse<T>;
					} catch (e) {
						console.error('Error parsing stream data:', e);
					}
				}
			}
		}

		// 处理缓冲区中剩余的数据
		if (buffer.startsWith('data: ')) {
			const jsonStr = buffer.slice(6);
			if (jsonStr !== '[DONE]') {
				try {
					const data = JSON.parse(jsonStr);
					yield data as ApiResponse<T>;
				} catch (e) {
					console.error('Error parsing stream data:', e);
				}
			}
		}
	} finally {
		reader.releaseLock();
	}
}
