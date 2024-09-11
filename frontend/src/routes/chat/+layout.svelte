<script lang="ts">
    import {setUser, userStore} from "$lib/stores/auth";
    import {goto} from '$app/navigation';
    import {onMount} from 'svelte';
    import {get} from "svelte/store";

    onMount(() => {
        if (!get(userStore)) {
            goto('/login'); // 未登录时重定向
        }
    });
</script>

<slot/>