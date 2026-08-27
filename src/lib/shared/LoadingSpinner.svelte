<script>
    import { onMount } from 'svelte';
    import { t, reconnectSocket, resetToMenu } from '../../stores.js';

    export let message = "Loading...";
    export let allowRetry = false;
    export let retryTimeoutMs = 15000;

    let showRetry = false;

    onMount(() => {
        if (!allowRetry) return;
        const timeout = setTimeout(() => {
            showRetry = true;
        }, retryTimeoutMs);
        return () => clearTimeout(timeout);
    });
</script>

<div class="w-full h-full flex-1 flex flex-col justify-center items-center p-4 select-none">
    <div class="neon-spinner"></div>
    {#if message}
      <p class="mt-6 text-lg sm:text-xl text-center text-slate-300 font-display animate-pulse max-w-md">{message}</p>
    {/if}
    {#if showRetry && allowRetry}
      <div class="mt-6 flex flex-col sm:flex-row gap-3 items-center">
          <button 
              on:click={reconnectSocket}
              class="px-4 py-2 bg-primary text-black font-display font-bold text-sm rounded-md shadow-md hover:scale-105 transition-all cursor-pointer"
          >
              🔄 {$t.retryConnection}
          </button>
          <button 
              on:click={resetToMenu}
              class="px-3 py-1.5 bg-neutral-800 text-neutral-400 hover:text-white font-display text-xs rounded-md transition-all cursor-pointer"
          >
              {$t.mainMenu}
          </button>
      </div>
    {/if}
</div>
