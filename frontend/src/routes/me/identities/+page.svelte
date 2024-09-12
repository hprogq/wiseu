<script lang="ts">
    import {onMount} from 'svelte';
    import {apiFetch} from '$lib/api';
    import {goto} from '$app/navigation';
    import {Sparkles, AlertCircle, User, PlusCircle, ChevronLeft} from 'lucide-svelte';
    import {fade, fly} from 'svelte/transition';
    import {goBack} from "$lib/common";

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

<div class="navbar fixed top-0 z-50 w-full transition-all duration-500 ease-in-out border-b border-gray-200 max-h-[4.125rem] bg-base-100/50 backdrop-blur-md flex-shrink-0">
    <div class="navbar-start">
        <button class="btn btn-ghost" on:click={goBack}>
            <ChevronLeft/>
        </button>
    </div>
    <div class="navbar-center">
        <a href="/" class="btn btn-ghost normal-case text-xl">My Identities</a>
    </div>
    <div class="navbar-end">
        <button class="btn btn-ghost" on:click={() => goto('/me')}>
            <User/>
        </button>
    </div>
</div>

<div class="min-h-screen flex flex-col items-center pt-24 overflow-hidden">
    <div class="absolute inset-0 bg-white opacity-50 backdrop-filter backdrop-blur-lg"></div>

    <div class="relative z-10 text-center mt-8 mb-12 px-4">
        <h1 class="text-4xl font-bold text-gray-800 mb-4">Your Digital Identities</h1>
        <p class="text-gray-600 mt-3 max-w-lg mx-auto text-lg">Manage and explore your connected identities.</p>
    </div>

    {#if loading}
        <div class="flex items-center justify-center h-64" in:fade>
            <span class="loading loading-spinner loading-lg text-indigo-600"></span>
        </div>
    {:else if error}
        <div class="alert alert-error shadow-lg max-w-md mx-auto" in:fly={{ y: 20, duration: 500 }}>
            <AlertCircle/>
            <span>{error}</span>
        </div>
    {:else if identities.length === 0}
        <div class="text-center text-gray-600 relative z-10 bg-white/90 p-10 rounded-xl shadow-lg max-w-96"
             in:fly={{ y: 20, duration: 500 }}>
            <Sparkles class="mx-auto mb-6 text-indigo-500" size={64}/>
            <p class="text-xl mb-6">You haven't connected any identities yet. Start building your digital presence!</p>
            <button class="btn btn-primary btn-lg" on:click={() => goto('/me/identities/add')}>
                Connect Your First Identity
            </button>
        </div>
    {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10 px-4 w-full max-w-6xl">
            {#each identities as identity, i (identity._id)}
                <div class="bg-white/90 rounded-xl border-2 border-neutral-100 p-6 hover:shadow-xl cursor-pointer transform hover:-translate-y-2 hover:bg-indigo-50"
                     role="button"
                     tabindex="0"
                     on:click={() => viewIdentityDetails(identity._id)}
                     on:keydown={(e) => e.key === 'Enter' && viewIdentityDetails(identity._id)}
                     in:fly={{ y: 20, duration: 500, delay: i * 100 }}>
                    <div class="flex items-center space-x-4 mb-4">
                        <img src={identity.typeInfo.icon} alt="icon"
                             class="w-16 h-16 rounded-full shadow-md object-cover"/>
                        <div>
                            <h3 class="font-bold text-lg text-gray-800">{identity.alias}</h3>
                            <p class="text-indigo-600 font-medium">{identity.typeInfo.name}</p>
                        </div>
                    </div>
                    <p class="text-gray-600 mb-4 line-clamp-2">{identity.typeInfo.description}</p>
                    <p class="text-sm text-gray-400">Last
                        updated: {new Date(identity.lastUpdated).toLocaleDateString()}</p>
                </div>
            {/each}
        </div>
    {/if}

    {#if identities.length > 0}
        <div class="mt-12 text-center relative z-10">
            <button class="btn btn-outline btn-primary btn-lg" on:click={() => goto('/me/identities/add')}>
                <PlusCircle size={24} class="mr-2"/>
                Add Another Identity
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
        @apply bg-indigo-600 text-white font-bold py-3 px-8 rounded-full ease-in-out;
    }

    .btn-primary:hover {
        @apply bg-indigo-700 transform -translate-y-1 shadow-lg;
    }

    .btn-outline.btn-primary {
        @apply bg-transparent text-indigo-600 border-2 border-indigo-600;
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
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }

    .shadow-lg {
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    }

    .shadow-xl {
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    }

    .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
</style>