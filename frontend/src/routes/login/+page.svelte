<script lang="ts">
    import {apiFetch} from '$lib/api';
    import {goBack} from "$lib/common";
    import {goto} from '$app/navigation';
    import {fly} from 'svelte/transition';
    import {setUser, userStore} from "$lib/stores/auth";
    import { IconArrowRight } from '@tabler/icons-svelte';

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
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                     class="w-6 h-6">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M15 19l-7-7 7-7"/>
                </svg>
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
    <div class="flex justify-center self-center  z-10">
        <div class="p-12 mx-auto rounded-2xl w-100 ">
            <div class="mb-4">
                <div class="flex items-center justify-between">
                    <h3 class="font-semibold text-2xl text-gray-800">Sign In </h3>
                    <div class="flex">
                        <a href="/register"
                           class="inline-block text-sm text-gray-500 underline hover:text-gray-700 transition duration-300 ease-in-out">
                            Register
                        </a>
                        <IconArrowRight />
                    </div>
                </div>
                <p class="text-gray-500">Please sign in to your account.</p>
            </div>
            <div class="space-y-5">
                <div class="space-y-2">
                    <label for="email-input" class="text-sm font-medium text-gray-700 tracking-wide">Username</label>
                    <input id="email-input" class=" w-full text-base px-4 py-2 border  border-gray-300 rounded-lg focus:outline-none focus:border-green-400" placeholder="Your username">
                </div>
                <div class="space-y-2">
                    <label for="password-input" class="mb-5 text-sm font-medium text-gray-700 tracking-wide">
                        Password
                    </label>
                    <input id="password-input" class="w-full content-center text-base px-4 py-2 border  border-gray-300 rounded-lg focus:outline-none focus:border-green-400" type="password" placeholder="Enter your password">
                </div>
                <div>
                    <button type="submit" class="w-full flex justify-center bg-green-400  hover:bg-green-500 text-gray-100 p-3  rounded-full tracking-wide font-semibold  shadow-lg cursor-pointer transition ease-in duration-500">
                        Sign in
                    </button>
                </div>
            </div>
            <div class="pt-5 text-center text-gray-400 text-xs">
              <span>
                Copyright © 2024
                <a href="/" rel="" target="_blank" title="WiseU" class="text-green hover:text-green-500 ">WiseU</a></span>
            </div>
        </div>
    </div>
<!--    <div class="relative p-8 w-full max-w-md z-10 transform transition-transform duration-300 ease-in-out">-->
<!--        <h1 class="text-3xl font-bold text-center mb-6 text-indigo-600">Login to WiseU</h1>-->

<!--        <form on:submit|preventDefault={handleLogin} class="space-y-4">-->
<!--            <div class="form-control">-->
<!--                <label for="username" class="label">-->
<!--                    <span class="label-text">Username</span>-->
<!--                </label>-->
<!--                <input-->
<!--                        id="username"-->
<!--                        bind:value={username}-->
<!--                        type="text"-->
<!--                        class="input input-bordered w-full transition-all duration-200 ease-in-out hover:shadow-md focus:shadow-lg"-->
<!--                        required-->
<!--                />-->
<!--            </div>-->

<!--            <div class="form-control">-->
<!--                <label for="password" class="label">-->
<!--                    <span class="label-text">Password</span>-->
<!--                </label>-->
<!--                <input-->
<!--                        id="password"-->
<!--                        bind:value={password}-->
<!--                        type="password"-->
<!--                        class="input input-bordered w-full transition-all duration-200 ease-in-out hover:shadow-md focus:shadow-lg"-->
<!--                        required-->
<!--                />-->
<!--            </div>-->

<!--            <button-->
<!--                    type="submit"-->
<!--                    class="btn btn-primary w-full transition-all duration-200 ease-in-out"-->
<!--                    disabled={loading}-->
<!--            >-->
<!--                {#if loading}-->
<!--                    <span class="loading loading-spinner loading-sm"></span>-->
<!--                    Logging in...-->
<!--                {:else}-->
<!--                    Login-->
<!--                {/if}-->
<!--            </button>-->
<!--        </form>-->

<!--        <div class="mt-6">-->
<!--            <div class="text-center">-->
<!--                <a href="/register"-->
<!--                   class="inline-block text-sm text-gray-500 underline italic hover:text-gray-700 transition duration-300 ease-in-out">-->
<!--                    Don't have an account? Register here-->
<!--                </a>-->
<!--            </div>-->
<!--        </div>-->
<!--    </div>-->

    <!-- 悬浮通知 -->
    {#if showNotification}
        <div transition:fly="{{ y: -100, duration: 300 }}"
             class="fixed top-4 left-1/2 transform -translate-x-1/2 w-full max-w-md px-4 z-50">
            {#if errorMessage}
                <div role="alert" class="alert shadow-lg flex justify-between items-center">
                    <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            class="stroke-info h-6 w-6 shrink-0">
                        <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span>{errorMessage}</span>
                    <button class="btn btn-sm btn-ghost" on:click={closeNotification}>✕</button>
                </div>
            {/if}

            {#if successMessage}
                <div role="alert" class="alert shadow-lg flex justify-between items-center">
                    <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-6 w-6 shrink-0 stroke-current"
                            fill="none"
                            viewBox="0 0 24 24">
                        <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
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
