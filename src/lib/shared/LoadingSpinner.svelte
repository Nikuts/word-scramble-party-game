<script>
    export let message = "Loading...";
</script>

<div class="min-h-screen flex flex-col justify-center items-center p-4">
    <div class="neon-spinner"></div>
    {#if message}
      <p class="mt-6 text-lg text-center text-slate-300 font-display animate-pulse">{message}</p>
    {/if}
</div>
