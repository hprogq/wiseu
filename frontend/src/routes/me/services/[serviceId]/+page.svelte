<script lang="ts">
    import {onMount} from 'svelte';
    import {goto} from '$app/navigation';
    import {apiFetch} from '$lib/api';
    import {page} from '$app/stores';
    import {createEventDispatcher} from 'svelte';
    import {goBack} from "$lib/common";
    import {ChevronLeft, RefreshCw, Trash, Play, Pause, RefreshCcw} from "lucide-svelte";

    let serviceId: string;
    let serviceInfo: any = null;
    let serviceParams: any = [];
    let formData: Record<string, string> = {};
    let isLoading = true;
    let isUpdating = false;
    let isDeleting = false;
    let isRefreshing = false;
    let isEnabling = false;
    let isDisabling = false;
    let isClearingRuntime = false;
    let error: string | null = null;
    let showConfirmDialog = false;
    let showDeleteDialog = false;
    let showSuccessAlert = false;
    let showErrorAlert = false;
    let alertMessage = '';
    const dispatch = createEventDispatcher();

    $: serviceId = $page.params.serviceId;

    let identities: any[] = [];
    let selectedIdentityId = '';

    interface ServiceType {
        "_id": string,
        "user": string,
        "type": string,
        "identityId": string,
        "configuration": {
            [key: string]: string
        },
        "primary": boolean,
        "status": string,
        "failureReason": string,
        "lastUpdated": string
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

    // 获取服务详情
    async function fetchServiceInfo() {
        try {
            const response = await apiFetch<ServiceType[]>(`services/${serviceId}`);
            if (response.success) {
                serviceInfo = response.data;

                // 获取服务类型信息
                const typesResponse = await apiFetch<ServiceTypeInfo[]>('services/types');
                if (typesResponse.success) {
                    const serviceTypes = typesResponse.data;

                    // 查找当前服务的类型信息
                    const currentType = serviceTypes.find(type => type.type === serviceInfo.type);
                    if (currentType) {
                        serviceInfo.typeInfo = currentType;
                    }
                }

                // 获取用户身份列表
                const identitiesResponse = await apiFetch<Identity[]>('identities');
                if (identitiesResponse.success) {
                    identities = identitiesResponse.data;

                    // 筛选符合服务身份类型要求的身份
                    if (serviceInfo.typeInfo) {
                        identities = identities.filter(identity => serviceInfo.typeInfo.identityType.includes(serviceInfo.identityType));
                    }

                    // 设置当前选中的身份ID
                    selectedIdentityId = serviceInfo.identityId;
                } else {
                    error = identitiesResponse.message;
                }

                await fetchServiceParams(serviceInfo.type);  // 获取服务类型参数
            } else {
                error = response.message;
            }
        } catch (err) {
            error = (err as Error).message;
        } finally {
            isLoading = false;
        }
    }

    // 获取服务所需的配置参数
    async function fetchServiceParams(type: string) {
        try {
            const response = await apiFetch<{ data: any }>(`services/types/${type}/params`);
            if (response.success) {
                serviceParams = response.data;
                // Initialize formData with current configuration
                formData = serviceInfo.configuration || {};
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
            const payload: any = {
                identityId: selectedIdentityId
            };
            if (serviceParams.length > 0) {
                payload.configuration = formData;
            }
            const response = await apiFetch(`services/${serviceId}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            if (response.success) {
                showAlert('success', 'Service updated successfully!');
            } else {
                showAlert('error', 'Failed to update service.');
            }
        } catch (err) {
            showAlert('error', 'An error occurred while updating service.');
        } finally {
            isUpdating = false;
        }
    }

    // 刷新服务
    async function refreshService() {
        isRefreshing = true;
        try {
            const response = await apiFetch(`services/${serviceId}/refresh`, {
                method: 'POST'
            });
            if (response.success) {
                showAlert('success', 'Service refreshed successfully!');
            } else {
                showAlert('error', 'Failed to refresh service.');
            }
        } catch (err) {
            showAlert('error', 'An error occurred while refreshing service.');
        } finally {
            isRefreshing = false;
        }
    }

    // 删除服务
    async function deleteService() {
        isDeleting = true;
        try {
            const response = await apiFetch(`services/${serviceId}`, {
                method: 'DELETE'
            });
            if (response.success) {
                showAlert('success', 'Service deleted successfully!');
                setTimeout(() => goto('/me/services'), 2000);
            } else {
                showAlert('error', 'Failed to delete service.');
            }
        } catch (err) {
            showAlert('error', 'An error occurred while deleting service.');
        } finally {
            isDeleting = false;
        }
    }

    // 启动服务
    async function enableService() {
        isEnabling = true;
        try {
            const response = await apiFetch(`services/${serviceId}/enable`, {
                method: 'POST'
            });
            if (response.success) {
                showAlert('success', 'Service enabled successfully!');
                serviceInfo.status = 'UP';
            } else {
                showAlert('error', 'Failed to enable service.');
            }
        } catch (err) {
            showAlert('error', 'An error occurred while enabling service.');
        } finally {
            isEnabling = false;
        }
    }

    // 禁用服务
    async function disableService() {
        isDisabling = true;
        try {
            const response = await apiFetch(`services/${serviceId}/disable`, {
                method: 'POST'
            });
            if (response.success) {
                showAlert('success', 'Service disabled successfully!');
                serviceInfo.status = 'DOWN';
            } else {
                showAlert('error', 'Failed to disable service.');
            }
        } catch (err) {
            showAlert('error', 'An error occurred while disabling service.');
        } finally {
            isDisabling = false;
        }
    }

    // 清除运行时数据
    async function clearRuntimeData() {
        isClearingRuntime = true;
        try {
            const response = await apiFetch(`services/${serviceId}/runtime`, {
                method: 'DELETE'
            });
            if (response.success) {
                showAlert('success', 'Runtime data cleared successfully!');
            } else {
                showAlert('error', 'Failed to clear runtime data.');
            }
        } catch (err) {
            showAlert('error', 'An error occurred while clearing runtime data.');
        } finally {
            isClearingRuntime = false;
        }
    }

    // 确认框的事件处理
    function handleConfirmRefresh() {
        refreshService();
        showConfirmDialog = false;
    }

    function handleConfirmDelete() {
        deleteService();
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

    onMount(fetchServiceInfo);
</script>

<svelte:head>
    <title>Manage Service</title>
    <meta name="description" content="Manage your service on WiseU"/>
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
                <a href="/" class="btn btn-ghost normal-case text-xl">Service Info</a>
            </div>
            <div class="navbar-end"></div>
        </div>

        <div class="flex items-center justify-center p-4 min-h-screen">
            <div class="card-body text-center">
                <h2 class="card-title justify-center">
                    {serviceInfo.typeInfo?.name}
                </h2>
                <p>{serviceInfo.typeInfo?.description}</p>
                <div class="text-gray-500 flex justify-center items-center">
                    <span>Status: {serviceInfo.status}</span>
                    <!-- 刷新图标 -->
                    <button class="ml-2" on:click={() => (showConfirmDialog = true)} disabled={isRefreshing}>
                        {#if isRefreshing}
                            <span class="loading loading-spinner loading-sm"></span>
                        {:else}
                            <RefreshCw/>
                        {/if}
                    </button>
                </div>

                <!-- 服务控制按钮 -->
                <div class="flex justify-center mt-4 space-x-2">
                    {#if serviceInfo.status === 'UP'}
                        <button class="btn btn-warning" on:click={disableService} disabled={isDisabling}>
                            {#if isDisabling}
                                <span class="loading loading-spinner loading-sm"></span>
                            {:else}
                                <Pause/>
                                Disable
                            {/if}
                        </button>
                    {:else}
                        <button class="btn btn-success" on:click={enableService} disabled={isEnabling}>
                            {#if isEnabling}
                                <span class="loading loading-spinner loading-sm"></span>
                            {:else}
                                <Play/>
                                Enable
                            {/if}
                        </button>
                    {/if}
                    <button class="btn btn-info" on:click={clearRuntimeData} disabled={isClearingRuntime}>
                        {#if isClearingRuntime}
                            <span class="loading loading-spinner loading-sm"></span>
                        {:else}
                            <RefreshCcw/>
                            Clear Data
                        {/if}
                    </button>
                </div>

                <!-- 使用 collapse 实现服务配置更新表单 -->
                <div class="collapse collapse-arrow mt-4">
                    <input type="checkbox" class="peer"/>
                    <div class="collapse-title bg-base-200 text-base-content">
                        Update Service Configuration
                    </div>
                    <div class="collapse-content bg-base-200">
                        <form on:submit|preventDefault={submitForm} class="space-y-4">
                            <!-- 身份选择下拉菜单 -->
                            <div class="form-control">
                                <label class="label">
                                    <span class="label-text">Select Identity</span>
                                </label>
                                <select class="select select-bordered w-full" bind:value={selectedIdentityId}>
                                    {#each identities as identity}
                                        <option value={identity._id}>
                                            {identity.alias}
                                        </option>
                                    {/each}
                                </select>
                            </div>

                            {#each serviceParams as param}
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

                <!-- 刷新服务确认提示框 -->
                {#if showConfirmDialog}
                    <div class="modal modal-open">
                        <div class="modal-box">
                            <h3 class="font-bold text-lg">Refresh Service</h3>
                            <p class="py-4">Are you sure you want to refresh this service?</p>
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
                            <h3 class="font-bold text-lg">Delete Service</h3>
                            <p class="py-4">Are you sure you want to delete this service?</p>
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
