<script lang="ts">
    import Header from './Header.svelte';
    import Footer from './Footer.svelte';
    import '../app.css';
    import {setUser} from "$lib/stores/auth";

    export let data: { user: { id: string, username: string, email: string } | null };

    if (data.user) {
        setUser(data.user); // 设置用户信息
    }

</script>

<slot/>
<slot/>

<div class="app">
    <main>
        <slot/>
    </main>
</div>

<style>
    .app {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
    }

    main {
        flex: 1;
        display: flex;
        flex-direction: column;
        width: 100%;
        margin: 0 auto;
        box-sizing: border-box;
    }

    footer {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        padding: 12px;
    }

    footer a {
        font-weight: bold;
    }

    @media (min-width: 480px) {
        footer {
            padding: 12px 0;
        }
    }
</style>
