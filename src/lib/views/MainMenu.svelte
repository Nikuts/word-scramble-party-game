<script>
    import { t, language, sendMessage, changeView, error, tvMode, toggleTvMode } from '../../stores.js';

    function createHost() {
        localStorage.removeItem('wordScrambleHostSession'); // Ensure a clean slate
        sendMessage('create-game', { language: $language, loading: true });
    }
</script>

<div class="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative">
    <h1 class="text-3xl sm:text-4xl mb-8 text-center text-primary" style="text-shadow: 0 0 10px var(--color-primary), 0 0 20px var(--color-primary);">{$t.appName}</h1>
    
    {#if $error.message && !$error.fatal}
        <div class="my-4 p-3 bg-red-900/50 border-2 border-danger text-red-300 font-bold text-center rounded-md max-w-sm w-full">
            <p>{$error.message}</p>
        </div>
    {/if}

    <div class="flex flex-col gap-4 w-full max-w-sm">
        <button on:click={createHost} class="btn-arcade text-xl w-full" style="--btn-color: var(--color-secondary);">{$t.createHostDisplay}</button>
        <button on:click={() => changeView('joinPrompt')} class="btn-arcade text-xl w-full" style="--btn-color: var(--color-accent);">{$t.joinAsPlayer}</button>
    </div>
    
    <div class="absolute top-4 left-4 flex gap-2">
        <button on:click={() => changeView('language')} class="px-3 py-1 bg-neutral-900 border border-neutral-600 text-sm hover:bg-primary hover:text-black hover:border-white transition-all">{$t.selectLanguage}</button>
    </div>

    {#if import.meta.env.DEV}
        <a 
            href="/?debug=1" 
            class="absolute bottom-4 left-4 px-3 py-1.5 bg-fuchsia-950/80 border border-fuchsia-500/60 rounded text-xs text-fuchsia-300 hover:bg-fuchsia-800 hover:text-white transition-all flex items-center gap-1.5 shadow-lg"
            title="Open UI Component Dev Harness"
        >
            <span>🧪</span>
            <span class="font-bold">UI Dev Harness</span>
        </a>
    {/if}

    <button 
        on:click={toggleTvMode} 
        class="absolute bottom-4 right-4 px-3 py-1.5 bg-neutral-900 border rounded text-xs transition-all flex items-center gap-1.5 {$tvMode ? 'border-primary text-primary' : 'border-neutral-700 text-neutral-400 hover:text-white'}"
        title={$t.tvModeDesc}
    >
        <span>📺</span>
        <span>{$t.tvMode}: {$tvMode ? 'ON' : 'OFF'}</span>
    </button>
</div>
