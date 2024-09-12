<script lang="ts">
    import {apiFetch} from '$lib/api';
    import {goBack} from "$lib/common";
    import {writable} from 'svelte/store';
    import {goto} from '$app/navigation'; // 导入 goto 方法
    import {fly} from 'svelte/transition';
    import {setUser} from "$lib/stores/auth";
    import {ChevronLeft, Info, Check} from "lucide-svelte"; // 导入 fly 动画

    // 存储登录用户信息
    export const loggedInUser = writable<{ id: string, username: string, email: string } | null>(null);

    let username = '';
    let email = '';
    let password = '';
    let loading = false;
    let errorMessage: string | null = null;
    let successMessage: string | null = null;
    let showNotification = false;

    const handleRegister = async () => {
        // 清除旧错误和成功消息
        errorMessage = null;
        successMessage = null;
        loading = true;
        showNotification = false;

        try {
            // 调用注册 API
            const response = await apiFetch<{ user: { id: string, username: string, email: string } }>('users', {
                method: 'POST',
                body: JSON.stringify({username, email, password}),
            });

            if (response.success) {
                setUser(response.data.user);
                successMessage = 'Registration successful!';
                showNotification = true;

                // 设置定时器，3 秒后自动消失并跳转到 /me 页面
                setTimeout(() => {
                    showNotification = false;
                    goto('/chat');
                }, 1000);
            } else {
                errorMessage = response.message;
                showNotification = true;
                setTimeout(() => (showNotification = false), 3000); // 3 秒后自动消失
            }
        } catch (error) {
            console.error('Registration error', error);
            errorMessage = 'An error occurred. Please try again later.';
            showNotification = true;
            setTimeout(() => (showNotification = false), 3000); // 3 秒后自动消失
        } finally {
            loading = false;
        }
    };

    const closeNotification = () => {
        showNotification = false;
    };
</script>

<svelte:head>
    <title>Register</title>
    <meta name="description" content="WiseU Register"/>
</svelte:head>

<!-- 浅色毛玻璃背景 -->
<div class="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-blue-100 via-white to-blue-50">
    <div class="navbar fixed top-0 z-50 w-full transition-all duration-500 ease-in-out border-b-2 border-transparent max-h-[4.125rem] bg-base-100/50 backdrop-blur-md flex-shrink-0">
        <div class="navbar-start">
            <button class="btn btn-ghost" on:click={goBack}>
                <!-- 返回图标 -->
                <ChevronLeft/>
            </button>
        </div>
        <div class="navbar-center">
            <a href="/" class="btn btn-ghost normal-case text-xl">Register Page</a>
        </div>
        <div class="navbar-end"></div>
    </div>

    <!-- 背景毛玻璃效果 -->
    <div class="absolute inset-0 bg-white opacity-50 backdrop-filter backdrop-blur-md"></div>

    <!-- 注册框 -->
    <div class="relative p-8 w-full max-w-md z-10 transform transition-transform duration-300 ease-in-out">
        <span class="text-5xl">🙌</span>
        <h1 class="mt-5 text-3xl font-bold mb-6 text-indigo-600">Hey There</h1>

        <form on:submit|preventDefault={handleRegister} class="space-y-4">
            <div class="form-control">
                <label for="username" class="label">
                    <span class="label-text">Username</span>
                </label>
                <input
                        id="username"
                        bind:value={username}
                        type="text"
                        class="input input-bordered w-full transition-all duration-200 ease-in-out hover:shadow-md focus:shadow-lg"
                        required
                />
            </div>

            <div class="form-control">
                <label for="email" class="label">
                    <span class="label-text">Email</span>
                </label>
                <input
                        id="email"
                        bind:value={email}
                        type="email"
                        class="input input-bordered w-full transition-all duration-200 ease-in-out hover:shadow-md focus:shadow-lg"
                        required
                />
            </div>

            <div class="form-control">
                <label for="password" class="label">
                    <span class="label-text">Password</span>
                </label>
                <input
                        id="password"
                        bind:value={password}
                        type="password"
                        class="input input-bordered w-full transition-all duration-200 ease-in-out hover:shadow-md focus:shadow-lg"
                        required
                />
            </div>

            <button
                    type="submit"
                    class="btn btn-primary w-full transition-all duration-200 ease-in-out"
                    disabled={loading}
            >
                {#if loading}
                    <span class="loading loading-spinner loading-sm"></span>
                    Registering...
                {:else}
                    Register
                {/if}
            </button>
        </form>

        <div class="mt-6">
            <div class="text-center">
                <a href="/login"
                   class="inline-block text-sm text-gray-500 underline italic hover:text-gray-700 transition duration-300 ease-in-out">
                    Already have an account? Log in here
                </a>
            </div>
        </div>
    </div>

    <!-- 悬浮通知 -->
    {#if showNotification}
        <div transition:fly="{{ y: -100, duration: 300 }}"
             class="fixed top-4 left-1/2 transform -translate-x-1/2 w-full max-w-md px-4 z-50">
            {#if errorMessage}
                <div role="alert" class="alert shadow-lg flex justify-between items-center">
                    <Info/>
                    <span>{errorMessage}</span>
                    <button class="btn btn-sm btn-ghost" on:click={closeNotification}>✕</button>
                </div>
            {/if}

            {#if successMessage}
                <div role="alert" class="alert shadow-lg flex justify-between items-center">
                    <Check/>
                    <span>{successMessage}</span>
                    <button class="btn btn-sm btn-ghost" on:click={closeNotification}>✕</button>
                </div>
            {/if}
        </div>
    {/if}
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
