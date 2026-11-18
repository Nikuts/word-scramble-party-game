<script>
    import { t, language, sendMessage, changeView, error, tvMode } from '../../stores.js';
    import ArcadeIcon from '../shared/ArcadeIcon.svelte';

    function createHost() {
        localStorage.removeItem('wordScrambleHostSession');
        sendMessage('create-game', { language: $language, tvMode: $tvMode, loading: true });
    }
</script>

<div class="h-screen-safe min-h-0 w-full flex flex-col justify-between items-center p-4 sm:p-6 lg:p-8 relative box-border overflow-y-auto select-none">
    <div class="w-full max-w-3xl flex justify-between items-center flex-shrink-0">
        <button
            type="button"
            on:click={() => changeView('language')}
            class="cut-sm px-3 py-1.5 bg-[#131126] border border-[#332e59] hover:border-primary text-xs sm:text-sm font-display text-slate-300 hover:text-primary transition-colors cursor-pointer"
        >
            {$t.selectLanguage}
        </button>

        {#if import.meta.env.DEV}
            <a
                href="/?debug=1"
                class="cut-sm px-2.5 py-1.5 bg-fuchsia-950/80 border border-fuchsia-500/60 text-[11px] sm:text-xs font-display text-fuchsia-300 hover:bg-fuchsia-800 hover:text-white transition-all flex items-center gap-1.5"
                title="Open UI Component Dev Harness"
            >
                <span>UI Dev Harness</span>
            </a>
        {/if}
    </div>

    <div class="flex flex-col items-center justify-center my-auto w-full py-4 max-w-md">
        <div class="fighter-crest bg-primary/15 border border-primary/60 text-primary text-[11px] sm:text-xs mb-3">
            <ArcadeIcon name="bolt" className="w-3.5 h-3.5" />
            <span>{$t.realTimePartyGame || 'REAL-TIME MULTIPLAYER PARTY GAME'}</span>
        </div>

        <h1 class="text-3xl sm:text-5xl mb-6 sm:mb-8 text-center text-white leading-tight tracking-wider">
            {$t.appName}
        </h1>

        {#if $error.message && !$error.fatal}
            <div class="mb-4 p-3 cut-sm bg-rose-950/90 border-2 border-danger text-rose-200 font-bold text-center w-full text-sm">
                <p>{$error.message}</p>
            </div>
        {/if}

        <div class="flex flex-col gap-3.5 w-full">
            <button type="button" on:click={createHost} class="btn-arcade text-lg sm:text-xl w-full py-3.5" style="--btn-color: var(--color-secondary);">
                <ArcadeIcon name="tv" className="w-5 h-5" />
                <span>{$t.createHostDisplay}</span>
            </button>
            <button type="button" on:click={() => changeView('joinPrompt')} class="btn-arcade text-lg sm:text-xl w-full py-3.5" style="--btn-color: var(--color-accent);">
                <ArcadeIcon name="sword" className="w-5 h-5" />
                <span>{$t.joinAsPlayer}</span>
            </button>
            <button type="button" on:click={() => changeView('instructions')} class="btn-arcade text-sm sm:text-base w-full btn-neutral py-2.5" style="--btn-color: var(--color-primary);">
                <ArcadeIcon name="book" className="w-4 h-4" />
                <span>{$t.howToPlay}</span>
            </button>
        </div>
    </div>

    <div class="h-2 flex-shrink-0"></div>
</div>
