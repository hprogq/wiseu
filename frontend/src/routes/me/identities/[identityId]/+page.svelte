<script lang="ts">
    import {onMount} from 'svelte';
    import {goto} from '$app/navigation';
    import {apiFetch} from '$lib/api';
    import {page} from '$app/stores';
    import {createEventDispatcher} from 'svelte';
    import {goBack} from "$lib/common";
    import {ChevronLeft, RefreshCw, Trash} from "lucide-svelte";

    let identityId: string;
    let identityInfo: any = null;
    let identityParams: any = [];
    let formData: Record<string, string> = {};
    let isLoading = true;
    let isUpdating = false;
    let isDeleting = false;
    let isRefreshing = false;
    let error: string | null = null;
    let aliasUpdated = false;
    let showConfirmDialog = false;
    let showDeleteDialog = false;
    let showSuccessAlert = false;
    let showErrorAlert = false;
    let alertMessage = '';
    const dispatch = createEventDispatcher();

    $: identityId = $page.params.identityId;

    // 获取身份详情
    async function fetchIdentityInfo() {
        try {
            const response = await apiFetch<{ data: any }>(`identities/${identityId}`);
            if (response.success) {
                identityInfo = response.data;
                await fetchIdentityParams(identityInfo.type);  // 获取身份类型参数
            } else {
                error = response.message;
            }
        } catch (err) {
            error = (err as Error).message;
        } finally {
            isLoading = false;
        }
    }

    // 获取身份所需的配置参数
    async function fetchIdentityParams(type: string) {
        try {
            const response = await apiFetch<{ data: any }>(`identities/types/${type}/params`);
            if (response.success) {
                identityParams = response.data;
                identityParams.forEach((param: any) => {
                    formData[param.fieldName] = ''; // 初始化表单数据
                });
            } else {
                error = response.message;
            }
        } catch (err) {
            error = (err as Error).message;
        }
    }

    // 提交更新表单
    async function submitForm() {
        isUpdating = true;
        try {
            const response = await apiFetch(`identities/${identityId}`, {
                method: 'PUT',
                body: JSON.stringify({configuration: formData})
            });
            if (response.success) {
                showAlert('success', 'Identity updated successfully!');
            } else {
                showAlert('error', 'Failed to update identity.');
            }
        } catch (err) {
            showAlert('error', 'An error occurred while updating identity.');
        } finally {
            isUpdating = false;
        }
    }

    // 更新别名
    async function refreshAlias() {
        isRefreshing = true;
        try {
            const response = await apiFetch(`identities/${identityId}/alias`, {
                method: 'POST'
            });
            if (response.success) {
                aliasUpdated = true;
                identityInfo.alias = response.data.alias; // 更新界面上的别名
                showAlert('success', 'Alias refreshed successfully!');
                setTimeout(() => {
                    aliasUpdated = false;
                }, 3000); // 3秒后隐藏提示
            } else {
                showAlert('error', 'Failed to refresh alias.');
            }
        } catch (err) {
            showAlert('error', 'An error occurred while refreshing alias.');
        } finally {
            isRefreshing = false;
        }
    }

    // 删除身份
    async function deleteIdentity() {
        isDeleting = true;
        try {
            const response = await apiFetch(`identities/${identityId}`, {
                method: 'DELETE'
            });
            if (response.success) {
                showAlert('success', 'Identity deleted successfully!');
                setTimeout(() => goto('/me'), 2000);
            } else {
                showAlert('error', 'Failed to delete identity.');
            }
        } catch (err) {
            showAlert('error', 'An error occurred while deleting identity.');
        } finally {
            isDeleting = false;
        }
    }

    // 确认框的事件处理
    function handleConfirmRefresh() {
        refreshAlias();
        showConfirmDialog = false;
    }

    function handleConfirmDelete() {
        deleteIdentity();
        showDeleteDialog = false;
    }

    // 显示提示信息
    function showAlert(type: 'success' | 'error', message: string) {
        alertMessage = message;
        if (type === 'success') {
            showSuccessAlert = true;
            setTimeout(() => showSuccessAlert = false, 3000);
        } else {
            showErrorAlert = true;
            setTimeout(() => showErrorAlert = false, 3000);
        }
    }

    onMount(fetchIdentityInfo);
</script>

<svelte:head>
    <title>Manage Identity</title>
    <meta name="description" content="Manage your identity on WiseU"/>
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
                <button class="btn btn-ghost" on:click={goBack}>
                    <ChevronLeft/>
                </button>
            </div>
            <div class="navbar-center">
                <a href="/" class="btn btn-ghost normal-case text-xl">Identity Info</a>
            </div>
            <div class="navbar-end"></div>
        </div>

        <div class="flex items-center justify-center p-4 min-h-screen">
            <div class="card-body text-center">
                <h2 class="card-title justify-center">
                    {identityInfo.typeInfo.name}
                </h2>
                <p>{identityInfo.typeInfo.description}</p>
                <div class="text-gray-500 flex justify-center items-center">
                    <span>Alias: {identityInfo.alias}</span>
                    <!-- 别名右侧的刷新图标 -->
                    <button class="ml-2" on:click={() => (showConfirmDialog = true)} disabled={isRefreshing}>
                        {#if isRefreshing}
                            <span class="loading loading-spinner loading-sm"></span>
                        {:else}
                            <RefreshCw/>
                        {/if}
                    </button>
                </div>

                <!-- 使用 collapse 实现身份配置更新表单 -->
                <div class="collapse collapse-arrow mt-4">
                    <input type="checkbox" class="peer"/>
                    <div class="collapse-title bg-base-200 text-base-content">
                        Update Identity Configuration
                    </div>
                    <div class="collapse-content bg-base-200">
                        <form on:submit|preventDefault={submitForm} class="space-y-4">
                            {#each identityParams as param}
                                <div class="form-control">
                                    <label class="label">
                                        <span class="label-text">{param.displayName} {param.required ? '*' : ''}</span>
                                    </label>

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
                                <button class="btn btn-primary" type="submit" disabled={isUpdating}>
                                    {#if isUpdating}
                                        <span class="loading loading-spinner loading-sm"></span>
                                        Saving...
                                    {:else}
                                        Save Changes
                                    {/if}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- 刷新别名提示框 -->
                {#if showConfirmDialog}
                    <div class="modal modal-open">
                        <div class="modal-box">
                            <h3 class="font-bold text-lg">Refresh Alias</h3>
                            <p class="py-4">Are you sure you want to refresh the alias for this identity?</p>
                            <div class="modal-action">
                                <button class="btn btn-primary" on:click={handleConfirmRefresh} disabled={isRefreshing}>
                                    {#if isRefreshing}
                                        <span class="loading loading-spinner loading-sm"></span>
                                        Refreshing...
                                    {:else}
                                        Yes
                                    {/if}
                                </button>
                                <button class="btn" on:click={() => (showConfirmDialog = false)}>Cancel</button>
                            </div>
                        </div>
                    </div>
                {/if}

                <!-- 删除提示框 -->
                {#if showDeleteDialog}
                    <div class="modal modal-open">
                        <div class="modal-box">
                            <h3 class="font-bold text-lg">Delete Identity</h3>
                            <p class="py-4">Are you sure you want to delete this identity?</p>
                            <div class="modal-action">
                                <button class="btn btn-error" on:click={handleConfirmDelete} disabled={isDeleting}>
                                    {#if isDeleting}
                                        <span class="loading loading-spinner loading-sm"></span>
                                        Deleting...
                                    {:else}
                                        Yes
                                    {/if}
                                </button>
                                <button class="btn" on:click={() => (showDeleteDialog = false)}>Cancel</button>
                            </div>
                        </div>
                    </div>
                {/if}

                <!-- Delete icon -->
                <div class="flex justify-end mt-6">
                    <button class="btn btn-error" on:click={() => (showDeleteDialog = true)} disabled={isDeleting}>
                        {#if isDeleting}
                            <span class="loading loading-spinner loading-sm"></span>
                        {:else}
                            <Trash color="white"/>
                        {/if}
                    </button>
                </div>

                <!-- 成功提示 -->
                {#if showSuccessAlert}
                    <div class="alert alert-success shadow-lg mt-4">
                        <div>
                            <span>{alertMessage}</span>
                        </div>
                    </div>
                {/if}

                <!-- 错误提示 -->
                {#if showErrorAlert}
                    <div class="alert alert-error shadow-lg mt-4">
                        <div>
                            <span>{alertMessage}</span>
                        </div>
                    </div>
                {/if}
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

    .modal-open {
        display: flex;
        justify-content: center;
        align-items: center;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        position: fixed;
        background-color: rgba(0, 0, 0, 0.5); /* 模态框背景的半透明遮罩 */
        z-index: 50; /* 确保它在页面的前面 */
    }

    .btn-circle {
        border-radius: 9999px;
    }
</style>