<script>
    import { createEventDispatcher } from 'svelte';
    import { t } from '../../stores.js';

    export let message = "An error occurred.";
    const dispatch = createEventDispatcher();
</script>

<div class="h-screen flex flex-col justify-center items-center bg-black text-white p-8 panel-arcade" style="--neon-color: var(--color-danger); --neon-color-rgb: var(--color-danger-rgb);">
    <h1 class="text-3xl text-danger mb-4 text-center" style="text-shadow: 0 0 8px var(--color-danger);">{$t.errorOccurred}</h1>
    <p class="text-lg mb-6 text-center">{message}</p>
    <button on:click={() => dispatch('reset')} class="btn-arcade" style="--btn-color: var(--color-danger);">{$t.mainMenu}</button>
</div>