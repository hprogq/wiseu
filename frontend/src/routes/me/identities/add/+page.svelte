<script lang="ts">
    import {onMount} from 'svelte';
    import {goto} from '$app/navigation';
    import {apiFetch} from '$lib/api';
    import {createEventDispatcher} from 'svelte';
    import {ChevronLeft} from 'lucide-svelte';

    let identityTypes: any[] = [];
    let identityParams: any[] = [];
    let selectedType = '';
    let formData: Record<string, string> = {};
    let isLoading = true;
    let showSuccessAlert = false;
    let showErrorAlert = false;
    let showLoading = false;
    let error: string | null = null;
    const dispatch = createEventDispatcher();

    interface IdentityType {
        type: string;
        name: string;
        description: string;
        icon: string;
    }

    // 获取可绑定身份类型
    async function fetchIdentityTypes() {
        try {
            const response = await apiFetch<IdentityType[]>('identities/types');
            if (response.success) {
                identityTypes = response.data;
            } else {
                error = response.message;
            }
        } catch (err) {
            error = (err as Error).message;
        } finally {
            isLoading = false;
        }
    }

    interface IdentityParam {
        fieldName: string;
        displayName: string;
        fieldType: string;
        description: string;
        required: boolean;
    }

    // 获取身份所需的参数
    async function fetchIdentityParams(type: string) {
        isLoading = true;
        try {
            const response = await apiFetch<IdentityParam[]>(`identities/types/${type}/params`);
            if (response.success) {
                identityParams = response.data;
                formData = {}; // 清空表单数据
                identityParams.forEach(param => {
                    formData[param.fieldName] = ''; // 初始化每个字段
                });
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
            const response = await apiFetch('identities', {
                method: 'POST',
                body: JSON.stringify({
                    type: selectedType,
                    configuration: formData
                })
            });
            if (response.success) {
                showSuccessAlert = true;
                setTimeout(() => {
                    showSuccessAlert = false;
                    goto('/me'); // 绑定成功后跳转到 /me 页面
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
        fetchIdentityParams(selectedType);
    }

    onMount(fetchIdentityTypes);
</script>

<svelte:head>
    <title>Add New Identity</title>
    <meta name="description" content="Add a new identity to your WiseU account"/>
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
                <button class="btn btn-ghost" on:click={() => goto('/me')}>
                    <ChevronLeft/>
                </button>
            </div>
            <div class="navbar-center">
                <a href="/" class="btn btn-ghost normal-case text-xl">Add New Identity</a>
            </div>
        </div>

        <div class="flex items-center justify-center p-4 min-h-screen">
            <div class="card w-full max-w-md bg-base-100 shadow-xl">
                <div class="card-body">
                    <h2 class="card-title">Select Identity Type</h2>

                    <!-- 类型选择下拉菜单 -->
                    <select class="select select-bordered w-full" on:change={handleTypeChange}
                            bind:value={selectedType}>
                        <option value="" disabled>Select Identity Type</option>
                        {#each identityTypes as type}
                            <option value={type.type}>
                                {type.name}
                            </option>
                        {/each}
                    </select>

                    <!-- 身份参数表单 -->
                    {#if identityParams.length > 0}
                        <form on:submit|preventDefault={submitForm} class="mt-4 space-y-4">
                            {#each identityParams as param}
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
                                <button class="btn btn-primary w-full" type="submit" disabled={showLoading}>
                                    {showLoading ? 'Binding...' : 'Bind Identity'}
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
                                <span>Identity bound successfully!</span>
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
