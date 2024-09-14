<script lang="ts">
    import {onMount} from 'svelte';
    import {apiFetch} from '$lib/api'; // 引入你定义的 apiFetch
    import {goto} from '$app/navigation';
    import {setUser} from "$lib/stores/auth"; // 导入跳转函数

    // 发送登出请求并处理响应
    const logout = async () => {
        try {
            const response = await apiFetch('sessions', {
                fetch,
                method: 'DELETE',
                credentials: 'include' // 带上 cookie 进行跨域
            });

            if (response.success) {
                setUser(null);
                setTimeout(() => goto('/'), 1000); // 1 秒后跳转到首页
            } else {
                console.error('Logout failed:', response.message);
            }
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    // 当页面加载时自动执行登出操作
    onMount(() => {
        logout();
    });
</script>

<svelte:head>
    <title>Logout</title>
    <meta name="description" content="WiseU Logout"/>
</svelte:head>

<!-- 可选的登出提示页面 -->
<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-blue-50">
    <!-- 背景毛玻璃效果 -->
    <div class="absolute inset-0 bg-white opacity-50 backdrop-filter backdrop-blur-md"></div>
    
    <div class="text-center">
        <h1 class="text-3xl font-bold text-indigo-500">Logging out...</h1>
        <p class="text-gray-500">Please wait, you will be redirected shortly.</p>
    </div>
</div>

<style>
    /* 背景毛玻璃效果 */
    .backdrop-blur-md {
        backdrop-filter: blur(10px);
    }

    .min-h-screen {
        min-height: 100vh;
    }
</style>
