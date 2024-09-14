<script lang="ts">
    import {apiFetch} from '$lib/api';
    import {goto} from '$app/navigation';
    import {goBack} from "$lib/common";
    import {ChevronLeft, Database, LogOut, PersonStanding, User} from "lucide-svelte";

    interface User {
        id: string;
        username: string;
        email: string;
    }

    interface UserResponse {
        user: User;
    }

    let data: User | null = null;
    let error: string | null = null;

    async function loadData() {
        try {
            const response = await apiFetch<UserResponse>('users/me');
            if (response.success) {
                data = response.data.user;
            } else {
                error = response.message;
            }
        } catch (err) {
            error = (err as Error).message;
        }
    }

    function logout() {
        goto('/logout');
    }

    function chat() {
        goto('/chat');
    }

    loadData();
</script>

<svelte:head>
    <title>My Account</title>
    <meta name="description" content="WiseU User Profile"/>
</svelte:head>

<div class="flex flex-col h-screen">
    <!-- 顶部菜单栏 -->
    <div class="navbar fixed top-0 z-50 w-full transition-all duration-500 ease-in-out border-b border-gray-200 max-h-[4.125rem] bg-base-100/50 backdrop-blur-md flex-shrink-0">
        <div class="navbar-start">
            <button class="btn btn-ghost" on:click={goBack}>
                <ChevronLeft/>
            </button>
        </div>
        <div class="navbar-center">
            <a href="/" class="btn btn-ghost normal-case text-xl">Me</a>
        </div>
        <div class="navbar-end">
            <button class="btn btn-error" on:click={logout}>
                <span class="text-white">Logout</span>
                <LogOut color="white"/>
            </button>
        </div>
    </div>

    {#if data}
        <div class="flex-grow flex items-center justify-center">
            <div class="p-8 w-full max-w-sm transform transition-transform duration-300 ease-in-out hover:scale-105">
                <div class="flex items-center justify-center mb-6">
                    <div class="bg-indigo-500 p-4 rounded-full">
                        <User size={48} color="white"/>
                    </div>
                </div>
                <h1 class="text-2xl font-bold text-center text-indigo-700 mb-2">Welcome, {data.username}</h1>
                <p class="text-center text-gray-600 mb-4">This is your personal information</p>
                <div class="text-lg text-gray-700 space-y-2 mb-4">
                    <p><strong>Username:</strong> {data.username}</p>
                    <p><strong>Email:</strong> {data.email}</p>
                </div>
                <button class="btn btn-info" on:click={() => goto('/me/identities')}>
                    <span class="text-white">My Identities</span>
                    <PersonStanding color="white"/>
                </button>

                <button class="btn btn-warning" on:click={() => goto('/me/services')}>
                    <span class="text-white">My Services</span>
                    <Database color="white"/>
                </button>
            </div>
        </div>
    {:else if error}
        <div class="flex-grow flex items-center justify-center bg-red-100 text-red-500">
            <div class="text-center">
                <p>Error: {error}</p>
            </div>
        </div>
    {:else}
        <div class="flex-grow flex items-center justify-center bg-gray-100">
            <div class="text-center">
                <span class="loading loading-spinner loading-lg text-indigo-600"></span>
            </div>
        </div>
    {/if}
</div>

<style module>
    .flex-grow {
        flex-grow: 1;
    }

    .min-h-screen {
        min-height: 100vh;
    }

    .loading {
        height: 4rem;
        width: 4rem;
    }

    .btn-custom {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background-color: #4f46e5;
        color: white;
        font-weight: bold;
        padding: 0.75rem 1.5rem;
        border-radius: 9999px;
        box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
    }

    .btn-custom:hover {
        background-color: #4338ca;
        transform: translateY(-3px);
        box-shadow: 0px 6px 12px rgba(0, 0, 0, 0.2);
    }

    .btn-custom svg {
        transition: transform 0.3s ease;
    }

    .btn-custom:hover svg {
        transform: translateX(5px);
    }

    .navbar {
        backdrop-filter: blur(10px);
        display: flex;
        justify-content: space-between;
    }
</style>
