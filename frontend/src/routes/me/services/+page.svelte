<script lang="ts">
    import {onMount} from 'svelte';
    import {apiFetch} from '$lib/api';
    import {goto} from '$app/navigation';
    import {Sparkles, AlertCircle, User, PlusCircle, ChevronLeft} from 'lucide-svelte';
    import {fade, fly} from 'svelte/transition';
    import {goBack} from "$lib/common";

    interface Service {
        _id: string;
        type: string;
        identityId: string;
        primary: boolean;
        status: string;
        lastUpdated: string;
        typeInfo: {
            name: string;
            description: string;
            icon: string;
        };
        identityAlias: string;
    }

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

    let services: Service[] = [];
    let error: string | null = null;
    let loading = true;

    async function fetchServices() {
        try {
            const response = await apiFetch<Service[]>('services');
            if (response.success) {
                services = response.data;
                // 获取用户身份信息
                const identitiesResponse = await apiFetch<Identity[]>('identities');
                let identities: Identity[] = [];
                if (identitiesResponse.success) {
                    identities = identitiesResponse.data;
                }

                // 创建身份映射
                const identityMap: Record<string, any> = {};
                identities.forEach(identity => {
                    identityMap[identity._id] = identity;
                });

                // 为每个服务添加类型信息和身份别名
                services = services.map(service => {
                    return {
                        ...service,
                        identityAlias: identityMap[service.identityId]?.alias || 'Unknown Identity'
                    };
                });
            } else {
                error = response.message;
            }
        } catch (err) {
            error = (err as Error).message;
        } finally {
            loading = false;
        }
    }

    function viewServiceDetails(serviceId: string) {
        goto(`/me/services/${serviceId}`);
    }

    onMount(() => {
        fetchServices();
    });
</script>

<svelte:head>
    <title>My Services | WiseU</title>
</svelte:head>

<div class="navbar fixed top-0 z-50 w-full transition-all duration-500 ease-in-out border-b border-gray-200 max-h-[4.125rem] bg-base-100/50 backdrop-blur-md flex-shrink-0">
    <div class="navbar-start">
        <button class="btn btn-ghost" on:click={goBack}>
            <ChevronLeft/>
        </button>
    </div>
    <div class="navbar-center">
        <a href="/" class="btn btn-ghost normal-case text-xl">My Services</a>
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
        <h1 class="text-4xl font-bold text-gray-800 mb-4">Your Connected Services</h1>
        <p class="text-gray-600 mt-3 max-w-lg mx-auto text-lg">Manage and explore your connected services.</p>
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
    {:else if services.length === 0}
        <div class="text-center text-gray-600 relative z-10 bg-white/90 p-10 rounded-xl shadow-lg max-w-96"
             in:fly={{ y: 20, duration: 500 }}>
            <Sparkles class="mx-auto mb-6 text-indigo-500" size={64}/>
            <p class="text-xl mb-6">You haven't connected any services yet. Start adding new services!</p>
            <button class="btn btn-primary btn-lg" on:click={() => goto('/me/services/add')}>
                Connect Your First Service
            </button>
        </div>
    {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10 px-4 w-full max-w-6xl">
            {#each services as service, i (service._id)}
                <div class="bg-white/90 rounded-xl border-2 border-neutral-100 p-6 hover:shadow-xl cursor-pointer transform hover:-translate-y-2 hover:bg-indigo-50"
                     role="button"
                     tabindex="0"
                     on:click={() => viewServiceDetails(service._id)}
                     on:keydown={(e) => e.key === 'Enter' && viewServiceDetails(service._id)}
                     in:fly={{ y: 20, duration: 500, delay: i * 100 }}>
                    <div class="flex items-center space-x-4 mb-4">
                        <img src={service.typeInfo.icon} alt="icon"
                             class="w-16 h-16 rounded-full shadow-md object-cover"/>
                        <div>
                            <h3 class="font-bold text-lg text-gray-800">{service.typeInfo.name}</h3>
                            <p class="text-indigo-600 font-medium">Status: {service.status}</p>
                            <p class="text-gray-500 text-sm">Identity: {service.identityAlias}</p>
                        </div>
                    </div>
                    <p class="text-gray-600 mb-4 line-clamp-2">{service.typeInfo.description}</p>
                    <p class="text-sm text-gray-400">Last
                        updated: {new Date(service.lastUpdated).toLocaleDateString()}</p>
                </div>
            {/each}
        </div>
    {/if}

    {#if services.length > 0}
        <div class="mt-12 text-center relative z-10">
            <button class="btn btn-outline btn-primary btn-lg" on:click={() => goto('/me/services/add')}>
                <PlusCircle size={24} class="mr-2"/>
                Add Another Service
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
