<script lang="ts">
    import {onMount} from 'svelte';
    import {chatStore} from '$lib/stores/chat';
    import {apiFetchStream} from '$lib/api';
    import {derived} from 'svelte/store';
    import {fly, fade} from "svelte/transition";
    import {v4 as uuidv4} from 'uuid';
    import {goto, pushState} from "$app/navigation";
    import {marked} from 'marked'; // 引入 markdown 渲染库

    export let data;

    $: conversationId = data.conversationId;

    let newMessage = '';
    let isLoading = false;
    let isUserScrolling = false; // 标志位：判断用户是否正在滚动

    async function startNewChat() {
        pushState(`/chat`, {});
        chatStore.setConversationId(null);
        chatStore.clearMessages();

        const defaultMessage = {
            id: uuidv4(),
            content: await marked('欢迎来到 WiseU Chat! 在这里开始你的对话。'),
            sender: 'assistant' as const
        };

        chatStore.addMessage(defaultMessage); // 添加预置消息
    }

    function generateUniqueMessageId() {
        return uuidv4();
    }

    // 从 chatStore 中派生消息
    const messages = derived(chatStore, $chatStore => $chatStore.messages);

    async function sendMessage() {
        if (!newMessage.trim()) return;

        isLoading = true;
        const userMessage = {id: generateUniqueMessageId(), content: newMessage, sender: 'user' as const};
        chatStore.addMessage(userMessage);
        scrollToBottom(); // 发送消息时滚动到最底部

        try {
            const stream = apiFetchStream<{
                conversationId: string;
                role: string;
                content: string;
                status: string;
                complete: boolean;
            }>('messages', {
                method: 'POST',
                body: JSON.stringify({question: newMessage, conversationId}),
            });

            let assistantMessageId = generateUniqueMessageId();
            let assistantMessageContent = '';
            // 首先添加一个空的AI消息占位符
            chatStore.addMessage({
                id: assistantMessageId,
                content: '...',
                sender: 'assistant',
            });
            scrollToBottom();

            for await (const data of stream) {
                if (!data.success) {
                    console.error('Stream error:', data.message);
                    chatStore.updateMessage(assistantMessageId, `Error: ${data.message}`);
                    break;
                }

                if (data.data.role === 'notice') {
                    const noticeId = generateUniqueMessageId();
                    chatStore.addMessage({id: noticeId, content: data.data.content, sender: 'notice'});

                    // 设置定时器，3秒后删除 notice 消息
                    setTimeout(() => {
                        chatStore.removeMessage(noticeId);
                    }, 3000);
                    scrollToBottom();
                    continue;
                }

                if (data.data.role === 'assistant') {
                    assistantMessageContent = data.data.content;
                    chatStore.updateMessage(assistantMessageId, await marked(assistantMessageContent));
                    scrollToBottom();

                    if (data.data.complete) {
                        if (!conversationId) {
                            conversationId = data.data.conversationId;
                            chatStore.setConversationId(conversationId);
                            pushState(`/chat/${conversationId}`, {});
                        }
                        break;
                    }
                }
            }

            newMessage = '';
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            isLoading = false;
        }
    }

    function scrollToBottom() {
        const container = document.querySelector('.message-container');
        if (container && !isUserScrolling) {
            container.scrollTo({
                top: container.scrollHeight,
                behavior: 'smooth' // 平滑滚动
            });
        }
    }

    function handleScroll() {
        const container = document.querySelector('.message-container');
        if (container) {
            const atBottom = container.scrollHeight - container.scrollTop === container.clientHeight;
            isUserScrolling = !atBottom; // 如果用户不是在底部，表示在滚动
        }
    }

    onMount(() => {
        const container = document.querySelector('.message-container');
        if (container) {
            container.addEventListener('scroll', handleScroll);
        }
        scrollToBottom();
    });
</script>

<svelte:head>
    <title>Chat</title>
    <meta name="description" content="WiseU Chat"/>
</svelte:head>

<div class="flex flex-col h-screen">
    <!-- 顶部菜单栏 -->
    <div class="navbar fixed top-0 z-50 w-full transition-all duration-500 ease-in-out border-b-2 border-transparent max-h-[4.125rem] bg-base-100/50 backdrop-blur-md flex-shrink-0">
        <div class="navbar-start">
            <button class="btn btn-ghost" on:click={() => goto('/me')}>
                <!-- 用户图标 -->
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                     class="w-6 h-6">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M5.121 17.804A10.97 10.97 0 0012 19c2.728 0 5.214-.984 7.121-2.804M15 12a3 3 0 11-6 0 3 3 0 016 0zM12 5a9 9 0 100 18 9 9 0 000-18z"/>
                </svg>
            </button>
        </div>
        <div class="navbar-center">
            <h1 class="text-xl font-bold">WiseU</h1>
        </div>
        <div class="navbar-end">
            <button class="btn btn-ghost" on:click={startNewChat}>
                <!-- 加号图标 -->
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                     class="w-6 h-6">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
            </button>
        </div>
    </div>

    <!-- 消息展示界面 -->
    <div class="flex-grow overflow-hidden flex flex-col">
        <div class="flex-grow overflow-y-auto p-4 space-y-4 message-container">
            {#each $messages as message (message.id)}
                {#if message.sender === 'notice'}
                    <div transition:fly={{ y: -100, duration: 300 }} class="alert shadow-lg">
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
                        {message.content}
                    </div>
                {:else}
                    <div class="chat {message.sender === 'user' ? 'chat-end' : 'chat-start'}">
                        {#if message.sender === 'assistant'}
                            <div class="chat-header">
                                AI Assistant
                                <time class="text-xs opacity-50">Just now</time>
                            </div>
                        {/if}
                        <div transition:fade
                             class="chat-bubble {message.sender === 'user' ? 'chat-bubble-primary' : 'chat-bubble-secondary'} markdown-container">
                            {@html message.content}
                        </div>
                        {#if message.sender === 'user'}
                            <div class="chat-footer opacity-50">Sent</div>
                        {/if}
                    </div>
                {/if}
            {/each}
        </div>

        <!-- 输入框 -->
        <div class="p-4 bg-white border-t flex-shrink-0">
            <form on:submit|preventDefault={sendMessage} class="flex space-x-2">
                <input
                        type="text"
                        bind:value={newMessage}
                        placeholder="Type a message..."
                        class="flex-1 input input-bordered"
                        disabled={isLoading}
                />
                <button type="submit" class="btn btn-primary" disabled={isLoading}>
                    {isLoading ? 'Waiting...' : 'Send'}
                </button>
            </form>
        </div>
    </div>
</div>

<style module>
    /* 全局样式 */
    :global(body) {
        overflow: hidden;
    }

    /* 消息容器样式 */
    .message-container {
        scrollbar-width: thin;
        scrollbar-color: rgba(155, 155, 155, 0.5) transparent;
        padding-top: 4.125rem; /* 为固定的导航栏留出空间 */
    }

    .message-container::-webkit-scrollbar {
        width: 6px;
    }

    .message-container::-webkit-scrollbar-thumb {
        background-color: rgba(155, 155, 155, 0.5);
        border-radius: 3px;
    }

    :global(.chat-header) {
        font-weight: bold;
        margin-bottom: 0.25rem;
    }

    :global(.chat-footer) {
        font-size: 0.75rem;
        margin-top: 0.25rem;
    }

    /* 聊天气泡样式 */
    :global(.chat-bubble) {
        max-width: 80% !important;
        word-wrap: break-word;
    }

    :global(.chat-bubble-primary) {
        background-color: #3b82f6 !important;
        color: white !important;
        transition: none !important;
    }

    :global(.chat-bubble-secondary) {
        background-color: #e5e7eb !important;
        color: black !important;
        transition: none !important;
    }

    /* 表格样式 */
    :global(.markdown-container table) {
        border-collapse: collapse;
        width: 100%;
        margin-bottom: 1rem;
        background-color: inherit;
        font-size: 0.9em;
    }

    :global(.markdown-container table th),
    :global(.markdown-container table td) {
        border: 1px solid rgba(0, 0, 0, 0.1);
        padding: 8px;
        text-align: left;
        word-break: break-word; /* 单元格内容换行 */
    }

    :global(.markdown-container table th) {
        background-color: rgba(0, 0, 0, 0.05);
        font-weight: bold;
    }

    :global(.chat-bubble-primary .markdown-container table) {
        color: white;
    }

    :global(.chat-bubble-primary .markdown-container table th),
    :global(.chat-bubble-primary .markdown-container table td) {
        border-color: rgba(255, 255, 255, 0.3);
    }

    :global(.chat-bubble-primary .markdown-container table th) {
        background-color: rgba(255, 255, 255, 0.1);
    }

    /* 确保表格不会超出气泡 */
    :global(.chat-bubble.markdown-container) {
        max-width: 100%;
    }

    :global(.chat-bubble.markdown-container table) {
        table-layout: fixed; /* 固定表格布局 */
    }

    :global(.chat-bubble.markdown-container table th),
    :global(.chat-bubble.markdown-container table td) {
        word-wrap: break-word; /* 防止单元格溢出 */
        overflow-wrap: break-word;
    }

    :global(.chat-bubble.markdown-container pre) {
        overflow: scroll;
    }

    /* 其他 Markdown 样式 */
    :global(.markdown-container p) {
        margin: 0.5rem 0;
    }

    :global(.markdown-container ul),
    :global(.markdown-container ol) {
        margin-left: 1.5rem;
    }

    :global(.markdown-container blockquote) {
        margin: 1rem 0;
        padding-left: 1rem;
        border-left: 4px solid #d1d5db;
        color: #6b7280;
    }
</style>