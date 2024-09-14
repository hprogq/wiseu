<script lang="ts">
    import {apiFetch} from '$lib/api';
    import {goBack} from "$lib/common";
    import {writable} from 'svelte/store';
    import {goto} from '$app/navigation'; // 导入 goto 方法
    import {fly} from 'svelte/transition';
    import {setUser} from "$lib/stores/auth";
    import {ChevronLeft, Info, Check} from "lucide-svelte"; // 导入 fly 动画

    export const loggedInUser = writable<{ id: string, username: string, email: string } | null>(null);

    let username = '';
    let email = '';
    let password = '';
    let loading = false;
    let errorMessage: string | null = null;
    let successMessage: string | null = null;
    let showNotification = false;

    const handleSignUp = async () => {
        errorMessage = null;
        successMessage = null;
        loading = true;
        showNotification = false;

        try {
            const response = await apiFetch<{ user: { id: string, username: string, email: string } }>('users', {
                method: 'POST',
                body: JSON.stringify({username, email, password}),
            });

            if (response.success) {
                setUser(response.data.user);
                successMessage = 'Sign up successful!';
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
            console.error('Sign up error', error);
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
    <title>Sign Up</title>
    <meta name="description" content="WiseU Sign Up"/>
</svelte:head>

<!-- 浅色毛玻璃背景 -->
<div class="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-blue-100 via-white to-blue-50">
    <div class="navbar fixed top-0 z-50 w-full transition-all duration-500 ease-in-out border-b border-gray-200 max-h-[4.125rem] bg-base-100/50 backdrop-blur-md flex-shrink-0">
        <div class="navbar-start">
            <button class="btn btn-ghost" on:click={goBack}>
                <ChevronLeft/>
            </button>
        </div>
        <div class="navbar-center">
            <a href="/" class="btn btn-ghost normal-case text-xl">Sign Up</a>
        </div>
        <div class="navbar-end"></div>
    </div>

    <!-- 背景毛玻璃效果 -->
    <div class="absolute inset-0 bg-white opacity-50 backdrop-filter backdrop-blur-md"></div>

    <!-- 注册框 -->
    <div class="relative p-8 w-full max-w-md z-10 transform transition-transform duration-300 ease-in-out">
        <span class="text-5xl">🙌</span>
        <h1 class="mt-5 text-3xl font-bold mb-6 text-indigo-600">Hey There</h1>

        <form on:submit|preventDefault={handleSignUp} class="space-y-4">
            <div class="form-control">
                <label for="username" class="label">
                    <span class="label-text">Username</span>
                </label>
                <input
                        id="username"
                        bind:value={username}
                        type="text"
                        placeholder="Username"
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
                        placeholder="Email"
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
                    Signing Up...
                {:else}
                    Sign Up
                {/if}
            </button>
        </form>

        <div class="mt-6">
            <div class="text-center">
                <a href="/signin"
                   class="inline-block text-sm text-gray-500 underline italic hover:text-gray-700 transition duration-300 ease-in-out">
                    Already have an account? <b>Sign in</b> here.
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
    .backdrop-blur-md {
        backdrop-filter: blur(10px);
    }

    .min-h-screen {
        min-height: 100vh;
    }
</style>
