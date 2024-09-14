<script lang="ts">
    import {userStore} from "$lib/stores/auth";
    import {goto} from '$app/navigation';
    import {onMount} from 'svelte';
    import {get} from "svelte/store";

    onMount(() => {
        if (!get(userStore)) {
            goto('/signin'); // 未登录时重定向
        }
    });
</script>

<slot/>