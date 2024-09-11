<script lang="ts">
    import {onMount} from 'svelte';
    import {apiFetch} from '$lib/api'; // 引入你定义的 apiFetch
    import {goto} from '$app/navigation';
    import {setUser} from "$lib/stores/auth"; // 导入跳转函数

    // 发送登出请求并处理响应
    const logout = async () => {
        try {
            const response = await apiFetch('sessions', {
                method: 'DELETE',
                credentials: 'include' // 带上 cookie 进行跨域
            });

            if (response.success) {
                setUser(null);
                goto('/');
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
