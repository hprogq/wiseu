<script lang="ts">
    import {onMount} from 'svelte';
    import {apiFetch} from '$lib/api';
    import {goto} from '$app/navigation';
    import {Sparkles, AlertCircle} from 'lucide-svelte';

    interface Identity {
        _id: string;
        type: string;
        alias: string;
        lastUpdated: string;
        typeInfo: {
            name: string;
            description: string;
            icon: string;
        };
    }

    let identities: Identity[] = [];
    let error: string | null = null;
    let loading = true;

    async function fetchIdentities() {
        try {
            const response = await apiFetch<{ data: Identity[] }>('identities');
            if (response.success) {
                identities = response.data;
            } else {
                error = response.message;
            }
        } catch (err) {
            error = (err as Error).message;
        } finally {
            loading = false;
        }
    }

    function viewIdentityDetails(identityId: string) {
        goto(`/me/identities/${identityId}`);
    }

    onMount(() => {
        fetchIdentities();
    });
</script>

<svelte:head>
    <title>My Identities | WiseU</title>
</svelte:head>

<div class="navbar fixed top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-gray-200">
    <div class="navbar-start">
        <a href="/" class="btn btn-ghost normal-case text-xl">WiseU</a>
    </div>
    <div class="navbar-end">
        <button class="btn btn-ghost" on:click={() => goto('/me')}>
            <!-- 用户图标 -->
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                 class="w-6 h-6">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M5.121 17.804A10.97 10.97 0 0012 19c2.728 0 5.214-.984 7.121-2.804M15 12a3 3 0 11-6 0 3 3 0 016 0zM12 5a9 9 0 100 18 9 9 0 000-18z"/>
            </svg>
        </button>
    </div>
</div>

<div class="min-h-screen flex flex-col items-center pt-20 bg-gradient-to-br from-blue-100 via-white to-blue-50 relative overflow-hidden">
    <div class="absolute inset-0 bg-white opacity-50 backdrop-filter backdrop-blur-lg"></div>

    <div class="relative z-10 text-center mt-8 mb-8 px-4">
        <h1 class="text-4xl font-bold text-grey-700">Your Digital Identities</h1>
        <p class="text-gray-600 mt-3 max-w-96 mx-auto">Manage and explore your connected identities. Each one
            represents a unique aspect of your digital presence.</p>
    </div>

    {#if loading}
        <div class="flex items-center justify-center h-64">
            <span class="loading loading-spinner loading-lg text-indigo-600"></span>
        </div>
    {:else if error}
        <div class="alert alert-error shadow-lg max-w-md mx-auto">
            <AlertCircle/>
            <span>{error}</span>
        </div>
    {:else if identities.length === 0}
        <div class="text-center text-gray-600 relative z-10 bg-white/80 p-8 rounded-lg shadow-md max-w-96">
            <Sparkles class="mx-auto mb-4 text-indigo-500" size={48}/>
            <p class="text-xl mb-4">You haven't connected any identities yet. Start building your digital presence!</p>
            <button class="btn btn-primary" on:click={() => goto('/me/identities/add')}>Connect Your First Identity
            </button>
        </div>
    {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10 px-4 w-full max-w-md">
            {#each identities as identity}
                <div class="bg-white/90 shadow-md rounded-lg p-6 hover:shadow-lg transition cursor-pointer transform hover:-translate-y-1"
                     role="button"
                     tabindex="0"
                     on:click={() => viewIdentityDetails(identity._id)}
                     on:keydown={(e) => e.key === 'Enter' && viewIdentityDetails(identity._id)}>
                    <div class="flex items-center space-x-4 mb-4">
                        <img src={identity.typeInfo.icon} alt="icon" class="w-12 h-12 rounded-full shadow-sm"/>
                        <div>
                            <h3 class="font-bold text-lg text-slate-700">{identity.alias}</h3>
                            <p class="text-gray-500">{identity.typeInfo.name}</p>
                        </div>
                    </div>
                    <p class="text-sm text-gray-600 mb-2">{identity.typeInfo.description}</p>
                    <p class="text-xs text-gray-400">Last
                        updated: {new Date(identity.lastUpdated).toLocaleDateString()}</p>
                </div>
            {/each}
        </div>
    {/if}

    {#if identities.length > 0}
        <div class="mt-8 text-center relative z-10">
            <button class="btn btn-outline btn-primary" on:click={() => goto('/me/identities/add')}>Add Another
                Identity
            </button>
        </div>
    {/if}
</div>

<style>
    .min-h-screen {
        min-height: 100vh;
    }

    .loading {
        height: 4rem;
        width: 4rem;
    }

    .btn-primary {
        @apply bg-indigo-600 text-white font-bold py-2 px-6 rounded-full transition duration-300 ease-in-out;
    }

    .btn-primary:hover {
        @apply bg-indigo-700 transform -translate-y-1 shadow-lg;
    }

    .btn-outline.btn-primary {
        @apply bg-transparent text-indigo-600 border-indigo-600;
    }

    .btn-outline.btn-primary:hover {
        @apply bg-indigo-600 text-white;
    }

    .backdrop-blur-md {
        backdrop-filter: blur(10px);
    }

    .backdrop-blur-lg {
        backdrop-filter: blur(15px);
    }

    .shadow-md {
        box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
    }

    .shadow-lg {
        box-shadow: 0px 6px 15px rgba(0, 0, 0, 0.1);
    }
</style>