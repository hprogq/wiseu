<script lang="ts">
    import {onMount} from 'svelte';
    import {goto} from '$app/navigation';
    import {apiFetch} from '$lib/api';
    import {createEventDispatcher} from 'svelte';
    import {ChevronLeft} from 'lucide-svelte';

    let serviceTypes: any[] = [];
    let serviceParams: any[] = [];
    let selectedType = '';
    let formData: Record<string, string> = {};
    let isLoading = true;
    let showSuccessAlert = false;
    let showErrorAlert = false;
    let showLoading = false;
    let error: string | null = null;
    const dispatch = createEventDispatcher();

    interface ServiceType {
        type: string;
        name: string;
        description: string;
        icon: string;
        identityType: string[];
    }

    interface ServiceTypeInfo {
        "type": string,
        "name": string,
        "description": string,
        "icon": string,
        "category": string,
        "identityType": string[]
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


    let identities: any[] = [];
    let selectedIdentityId = '';

    // 获取可绑定服务类型
    async function fetchServiceTypes() {
        try {
            const response = await apiFetch<ServiceType[]>('services/types');
            if (response.success) {
                serviceTypes = response.data;
            } else {
                error = response.message;
            }
        } catch (err) {
            error = (err as Error).message;
        } finally {
            isLoading = false;
        }
    }

    interface ServiceParam {
        fieldName: string;
        displayName: string;
        fieldType: string;
        description: string;
        required: boolean;
    }

    // 获取服务所需的参数
    async function fetchServiceParams(type: string) {
        isLoading = true;
        try {
            const response = await apiFetch<ServiceParam[]>(`services/types/${type}/params`);
            if (response.success) {
                serviceParams = response.data;
                formData = {}; // 清空表单数据
                serviceParams.forEach(param => {
                    formData[param.fieldName] = ''; // 初始化每个字段
                });

                // 获取用户身份列表
                const identitiesResponse = await apiFetch<Identity[]>('identities');
                if (identitiesResponse.success) {
                    identities = identitiesResponse.data;

                    // 筛选符合服务身份类型要求的身份
                    const selectedServiceType = serviceTypes.find(st => st.type === type);
                    if (selectedServiceType) {
                        identities = identities.filter(identity => selectedServiceType.identityType.includes(identity.type));
                    }
                } else {
                    error = identitiesResponse.message;
                }
            } else {
                error = response.message;
            }
        } catch (err) {
            error = (err as Error).message;
        } finally {
            isLoading = false;
        }
    }

    // 提交表单
    async function submitForm() {
        showLoading = true;
        try {
            const payload: any = {
                type: selectedType,
                identityId: selectedIdentityId,
                configuration: {}
            };
            if (serviceParams.length > 0) {
                payload.configuration = formData;
            }
            const response = await apiFetch('services', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            if (response.success) {
                showSuccessAlert = true;
                setTimeout(() => {
                    showSuccessAlert = false;
                    goto('/me/services'); // 绑定成功后跳转到服务列表页面
                }, 3000);
            } else {
                showErrorAlert = true;
                setTimeout(() => showErrorAlert = false, 3000);
            }
        } catch (err) {
            showErrorAlert = true;
            setTimeout(() => showErrorAlert = false, 3000);
        } finally {
            showLoading = false;
        }
    }

    // 监听类型选择
    function handleTypeChange(event: Event) {
        const target = event.target as HTMLSelectElement;
        selectedType = target.value;
        fetchServiceParams(selectedType);
    }

    onMount(fetchServiceTypes);
</script>

<svelte:head>
    <title>Add New Service</title>
    <meta name="description" content="Add a new service to your WiseU account"/>
</svelte:head>

{#if isLoading}
    <div class="flex items-center justify-center min-h-screen">
        <span class="loading loading-spinner loading-lg text-indigo-600"></span>
    </div>
{:else if error}
    <div class="alert alert-error shadow-lg">
        <div>
            <span>{error}</span>
        </div>
    </div>
{:else}
    <div class="min-h-screen backdrop-blur-md">
        <div class="navbar fixed top-0 z-50 w-full transition-all duration-500 ease-in-out border-b border-gray-200 max-h-[4.125rem] bg-base-100/50 backdrop-blur-md flex-shrink-0">
            <div class="navbar-start">
                <button class="btn btn-ghost" on:click={() => goto('/me/services')}>
                    <ChevronLeft/>
                </button>
            </div>
            <div class="navbar-center">
                <a href="/" class="btn btn-ghost normal-case text-xl">Add New Service</a>
            </div>
        </div>

        <div class="flex items-center justify-center p-4 min-h-screen">
            <div class="card w-full max-w-md bg-base-100 shadow-xl">
                <div class="card-body">
                    <h2 class="card-title">Select Service Type</h2>

                    <!-- 类型选择下拉菜单 -->
                    <select class="select select-bordered w-full" on:change={handleTypeChange}
                            bind:value={selectedType}>
                        <option value="" disabled>Select Service Type</option>
                        {#each serviceTypes as type}
                            <option value={type.type}>
                                {type.name}
                            </option>
                        {/each}
                    </select>

                    <!-- 身份选择下拉菜单 -->
                    {#if identities.length > 0}
                        <div class="mt-4">
                            <h2 class="card-title">Select Identity</h2>
                            <select class="select select-bordered w-full" bind:value={selectedIdentityId}>
                                <option value="" disabled>Select Identity</option>
                                {#each identities as identity}
                                    <option value={identity._id}>
                                        {identity.alias}
                                    </option>
                                {/each}
                            </select>
                        </div>
                    {:else if selectedType}
                        <div class="mt-4 text-red-500">
                            No identities available for this service. Please add an identity first.
                        </div>
                    {/if}

                    <!-- 服务参数表单 -->
                    {#if serviceParams.length > 0}
                        <form on:submit|preventDefault={submitForm} class="mt-4 space-y-4">
                            {#each serviceParams as param}
                                <div class="form-control">
                                    <label class="label">
                                        <span class="label-text">{param.displayName} {param.required ? '*' : ''}</span>
                                    </label>

                                    <!-- 根据 fieldType 渲染不同的 input 类型 -->
                                    {#if param.fieldType === 'password'}
                                        <input
                                                type="password"
                                                bind:value={formData[param.fieldName]}
                                                placeholder={param.description}
                                                required={param.required}
                                                class="input input-bordered"
                                        />
                                    {:else}
                                        <input
                                                type="text"
                                                bind:value={formData[param.fieldName]}
                                                placeholder={param.description}
                                                required={param.required}
                                                class="input input-bordered"
                                        />
                                    {/if}
                                </div>
                            {/each}
                            <div class="form-control mt-6">
                                <button class="btn btn-primary w-full" type="submit"
                                        disabled={showLoading || !selectedIdentityId}>
                                    {showLoading ? 'Binding...' : 'Bind Service'}
                                </button>
                            </div>
                        </form>
                    {:else if selectedType}
                        <!-- 如果没有配置项，也需要提供提交按钮 -->
                        <form on:submit|preventDefault={submitForm} class="mt-4">
                            <div class="form-control mt-6">
                                <button class="btn btn-primary w-full" type="submit"
                                        disabled={showLoading || !selectedIdentityId}>
                                    {showLoading ? 'Binding...' : 'Bind Service'}
                                </button>
                            </div>
                        </form>
                    {/if}

                    <!-- 加载动画 -->
                    {#if showLoading}
                        <div class="alert alert-info shadow-lg mt-4">
                            <div>
                                <span>Processing...</span>
                            </div>
                        </div>
                    {/if}

                    <!-- 成功提示 -->
                    {#if showSuccessAlert}
                        <div class="alert alert-success shadow-lg mt-4">
                            <div>
                                <span>Service added successfully!</span>
                            </div>
                        </div>
                    {/if}

                    <!-- 错误提示 -->
                    {#if showErrorAlert}
                        <div class="alert alert-error shadow-lg mt-4">
                            <div>
                                <span>Something went wrong!</span>
                            </div>
                        </div>
                    {/if}
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    .min-h-screen {
        min-height: 100vh;
    }

    .loading {
        height: 4rem;
        width: 4rem;
    }

    .backdrop-blur-md {
        backdrop-filter: blur(10px);
    }
</style>
