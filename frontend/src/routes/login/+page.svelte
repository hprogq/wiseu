<script lang="ts">
    import {apiFetch} from '$lib/api';
    import {goBack} from "$lib/common";
    import {goto} from '$app/navigation';
    import {fly} from 'svelte/transition';
    import {setUser, userStore} from "$lib/stores/auth";
    import {Check, ChevronLeft, Info} from 'lucide-svelte';

    let username = '';
    let password = '';
    let loading = false;
    let errorMessage: string | null = null;
    let successMessage: string | null = null;
    let showNotification = false;

    const handleLogin = async () => {
        errorMessage = null;
        successMessage = null;
        loading = true;
        showNotification = false;

        try {
            // 调用 API
            const response = await apiFetch<{ user: { id: string, username: string, email: string } }>('sessions', {
                method: 'POST',
                body: JSON.stringify({username, password}),
            });

            if (response.success) {
                setUser(response.data.user);
                successMessage = 'Login successful!';
                showNotification = true;

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
            console.error('Login error', error);
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
    <title>Login</title>
    <meta name="description" content="WiseU Login"/>
</svelte:head>

<!-- 浅色毛玻璃背景 -->
<div class="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-blue-100 via-white to-blue-50">
    <div class="navbar fixed top-0 z-50 w-full transition-all duration-500 ease-in-out border-b-2 border-transparent max-h-[4.125rem] bg-base-100/50 backdrop-blur-md flex-shrink-0">
        <div class="navbar-start">
            <button class="btn btn-ghost" on:click={goBack}>
                <!-- 返回图标 -->
                <ChevronLeft size={24}/>
            </button>
        </div>
        <div class="navbar-center">
            <a href="/" class="btn btn-ghost normal-case text-xl">Login Page</a>
        </div>
        <div class="navbar-end"></div>
    </div>

    <!-- 背景毛玻璃效果 -->
    <div class="absolute inset-0 bg-white opacity-50 backdrop-filter backdrop-blur-md"></div>

    <!-- 登录框 -->
    <div class="relative p-8 w-full max-w-md z-10 transform transition-transform duration-300 ease-in-out">
        <span class="text-5xl">👋</span>
        <h1 class="mt-5 text-3xl font-bold mb-6 text-indigo-600">Welcome Back</h1>

        <form on:submit|preventDefault={handleLogin} class="space-y-4">
            <div class="form-control">
                <label for="username" class="label">
                    <span class="label-text">Username / Email</span>
                </label>
                <input
                        id="username"
                        bind:value={username}
                        type="text"
                        placeholder="Username / Email"
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
                        placeholder="Password"
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
                    Logging in...
                {:else}
                    Login
                {/if}
            </button>
        </form>

        <div class="mt-6">
            <div class="text-center">
                <a href="/register"
                   class="inline-block text-sm text-gray-500 underline italic hover:text-gray-700 transition duration-300 ease-in-out">
                    Don't have an account? Register here
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
