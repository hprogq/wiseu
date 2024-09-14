import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	build: {
		target: 'esnext'
	},
	server: {
		host: '0.0.0.0', // 允许通过 IP 访问
		port: 5173, // 可以根据需要更改端口
		open: false // 可选：启动时自动打开浏览器
	}
});
