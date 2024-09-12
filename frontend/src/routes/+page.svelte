<script lang="ts">
    import {goto} from '$app/navigation'; // 导入 SvelteKit 的导航方法
    import {onMount} from 'svelte';
    import {userStore} from '$lib/stores/auth';
    import {get} from 'svelte/store';
    import {setUser} from "$lib/stores/auth";

    let loading = false;

    const navigateToLogin = () => {
        goto('/login'); // 跳转到 /login 页面
    };

    onMount(() => {
        if (get(userStore)) {
            loading = true;
            setTimeout(() => {
                goto('/chat'); // 1秒后跳转到 /chat
            }, 1000);
        }
    });
</script>

<svelte:head>
    <title>Home</title>
    <meta name="description" content="WiseU Home"/>
</svelte:head>

<!-- 动态背景效果和页面内容 -->
<div class="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-br from-blue-100 via-white to-blue-50 animate-gradient">
    <!-- 背景毛玻璃效果 -->
    <div class="absolute inset-0 bg-white opacity-50 backdrop-filter backdrop-blur-md"></div>

    <!-- 文字内容 -->
    <div class="relative z-10 text-center transform transition-transform duration-300 ease-in-out">
        <h1 class="text-5xl font-extrabold text-indigo-500 mb-4 animate-bounce-once">
            Hello
        </h1>
        <h2 class="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 animate-pulse">
            WiseU!
        </h2>
    </div>

    <!-- 跳转按钮或者加载动画 -->
    {#if loading}
        <!-- 如果已登录，显示加载动画 -->
        <div class="relative z-10 mt-16 flex space-x-2"> <!-- 增加 mt-16 调整与 "WiseU!" 的距离 -->
            <span class="dot bg-indigo-300"></span> <!-- 使用较浅的颜色 -->
            <span class="dot bg-indigo-300"></span>
            <span class="dot bg-indigo-300"></span>
        </div>
    {:else}
        <!-- 如果未登录，显示按钮 -->
        <div class="relative z-10 mt-8 enter-animation">
            <button on:click={navigateToLogin} class="btn-custom">
                Try Now
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                     class="ml-2 w-6 h-6 inline-block">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
            </button>
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

    /* 背景渐变动画 */
    @keyframes gradientBackground {
        0% {
            background-position: 0% 50%;
        }
        50% {
            background-position: 100% 50%;
        }
        100% {
            background-position: 0% 50%;
        }
    }

    .animate-gradient {
        background-size: 400% 400%;
        animation: gradientBackground 15s ease infinite;
    }

    /* 动态效果 */
    .animate-bounce-once {
        animation: bounce 2s ease-in-out 1; /* 只执行一次 */
    }

    @keyframes bounce {
        0%, 100% {
            transform: translateY(0);
        }
        50% {
            transform: translateY(-15px);
        }
    }

    .animate-pulse {
        animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    @keyframes pulse {
        0%, 100% {
            opacity: 1;
        }
        50% {
            opacity: 0.5;
        }
    }

    /* 按钮美化 */
    .btn-custom {
        display: inline-flex;
        align-items: center;
        background-color: #4f46e5;
        color: white;
        font-weight: bold;
        padding: 0.75rem 1.5rem;
        border-radius: 9999px; /* 圆角按钮 */
        box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
    }

    .btn-custom:hover {
        background-color: #4338ca; /* 深色 */
        transform: translateY(-3px); /* 悬停时上升 */
        box-shadow: 0px 6px 12px rgba(0, 0, 0, 0.2);
    }

    .btn-custom svg {
        transition: transform 0.3s ease; /* 添加箭头动画 */
    }

    .btn-custom:hover svg {
        transform: translateX(5px); /* 悬停时箭头向右移动 */
    }

    /* 按钮进入时动画 */
    .enter-animation {
        animation: fadeIn 1s ease-in-out;
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    /* 加载动画样式 */
    .dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        animation: bounce 0.6s infinite alternate;
        background-color: #93c5fd; /* 更浅的颜色 */
    }

    .dot:nth-child(1) {
        animation-delay: 0s;
    }

    .dot:nth-child(2) {
        animation-delay: 0.2s;
    }

    .dot:nth-child(3) {
        animation-delay: 0.4s;
    }
</style>
