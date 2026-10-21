<script>
    import { t, language, sendMessage, changeView, error, tvMode, toggleTvMode } from '../../stores.js';

    function createHost() {
        localStorage.removeItem('wordScrambleHostSession'); // Ensure a clean slate
        sendMessage('create-game', { language: $language, loading: true });
    }
</script>

<div class="h-full min-h-0 w-full flex flex-col justify-between items-center p-4 sm:p-6 lg:p-8 relative box-border overflow-y-auto">
    <div class="w-full flex justify-start">
        <button on:click={() => changeView('language')} class="px-3 py-1 bg-neutral-900 border border-neutral-600 text-xs sm:text-sm hover:bg-primary hover:text-black hover:border-white transition-all">{$t.selectLanguage}</button>
    </div>

    <div class="flex flex-col items-center justify-center my-auto w-full py-4">
        <h1 class="text-2xl sm:text-4xl mb-6 sm:mb-8 text-center text-primary leading-snug" style="text-shadow: 0 0 10px var(--color-primary), 0 0 20px var(--color-primary);">{$t.appName}</h1>
        
        {#if $error.message && !$error.fatal}
            <div class="my-4 p-3 bg-red-900/50 border-2 border-danger text-red-300 font-bold text-center rounded-md max-w-sm w-full">
                <p>{$error.message}</p>
            </div>
        {/if}

        <div class="flex flex-col gap-3.5 sm:gap-4 w-full max-w-sm">
            <button on:click={createHost} class="btn-arcade text-lg sm:text-xl w-full" style="--btn-color: var(--color-secondary);">{$t.createHostDisplay}</button>
            <button on:click={() => changeView('joinPrompt')} class="btn-arcade text-lg sm:text-xl w-full" style="--btn-color: var(--color-accent);">{$t.joinAsPlayer}</button>
            <button on:click={() => changeView('instructions')} class="btn-arcade text-sm sm:text-base w-full btn-neutral" style="--btn-color: var(--color-primary);">📖 {$t.howToPlay}</button>
        </div>
    </div>

    <div class="w-full flex flex-wrap items-center justify-between gap-2 pt-2">
        {#if import.meta.env.DEV}
            <a 
                href="/?debug=1" 
                class="px-2.5 sm:px-3 py-1.5 bg-fuchsia-950/80 border border-fuchsia-500/60 rounded text-[11px] sm:text-xs text-fuchsia-300 hover:bg-fuchsia-800 hover:text-white transition-all flex items-center gap-1.5 shadow-lg"
                title="Open UI Component Dev Harness"
            >
                <span>🧪</span>
                <span class="font-bold">UI Dev Harness</span>
            </a>
        {:else}
            <div></div>
        {/if}

        <button 
            on:click={toggleTvMode} 
            class="px-2.5 sm:px-3 py-1.5 bg-neutral-900 border rounded text-[11px] sm:text-xs transition-all flex items-center gap-1.5 ml-auto {$tvMode ? 'border-primary text-primary' : 'border-neutral-700 text-neutral-400 hover:text-white'}"
            title={$t.tvModeDesc}
        >
            <span>📺</span>
            <span>{$t.tvMode}: {$tvMode ? 'ON' : 'OFF'}</span>
        </button>
    </div>
</div>
