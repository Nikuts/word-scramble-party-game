<script>
    import { t, language, setLanguage, sendMessage, changeView, error, tvMode, musicMuted } from '../../stores.js';
    import ArcadeIcon from '../shared/ArcadeIcon.svelte';

    $: isUkrainian = $language === 'uk' || $language === 'ua';

    function createHost() {
        localStorage.removeItem('wordScrambleHostSession');
        sendMessage('create-game', { language: $language, tvMode: $tvMode, musicMuted: $musicMuted, loading: true });
    }
</script>

<div class="h-screen-safe min-h-0 w-full flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 2xl:p-10 relative box-border overflow-y-auto select-none">
    {#if import.meta.env.DEV}
        <div class="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 flex items-center gap-2">
            <button
                type="button"
                on:click={() => changeView('soundTest')}
                class="cut-sm px-2.5 py-1.5 lg:px-4 lg:py-2 bg-amber-950/80 border border-amber-400/70 text-[11px] sm:text-xs lg:text-sm font-display text-amber-200 hover:bg-amber-700 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
                title="Open Interactive Music & Sound Lab"
            >
                <span>🎵 Music & Sound Lab</span>
            </button>
            <a
                href="/?debug=1"
                class="cut-sm px-2.5 py-1.5 lg:px-4 lg:py-2 bg-fuchsia-950/80 border border-fuchsia-500/60 text-[11px] sm:text-xs lg:text-sm font-display text-fuchsia-300 hover:bg-fuchsia-800 hover:text-white transition-all flex items-center gap-1.5"
                title="Open UI Component Dev Harness"
            >
                <span>UI Dev Harness</span>
            </a>
        </div>
    {/if}

    <div class="relative z-10 flex flex-col items-center justify-center my-auto w-full py-4 max-w-md sm:max-w-lg lg:max-w-[38rem] 2xl:max-w-[46rem]">
        <div class="fighter-crest bg-primary/15 border border-primary/60 text-primary text-[11px] sm:text-xs lg:text-sm lg:px-4 lg:py-1.5 mb-3 lg:mb-5">
            <ArcadeIcon name="bolt" className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
            <span>{$t.realTimePartyGame || 'REAL-TIME MULTIPLAYER PARTY GAME'}</span>
        </div>

        <h1 class="arcade-title text-3xl sm:text-5xl lg:text-6xl 2xl:text-[4.25rem] mb-6 sm:mb-8 lg:mb-10 text-center leading-tight tracking-wider">
            {$t.appName}
        </h1>

        {#if $error.message && !$error.fatal}
            <div class="mb-4 p-3 cut-sm bg-rose-950/90 border-2 border-danger text-rose-200 font-bold text-center w-full text-sm lg:text-base">
                <p>{$error.message}</p>
            </div>
        {/if}

        <div class="flex flex-col gap-3.5 lg:gap-4 w-full">
            <button type="button" on:click={createHost} class="btn-arcade text-lg sm:text-xl lg:text-2xl w-full py-3.5 lg:py-4 2xl:py-5" style="--btn-color: var(--color-secondary);">
                <ArcadeIcon name="tv" className="w-5 h-5 lg:w-6 lg:h-6" />
                <span>{$t.createHostDisplay}</span>
            </button>
            <button type="button" on:click={() => changeView('joinPrompt')} class="btn-arcade text-lg sm:text-xl lg:text-2xl w-full py-3.5 lg:py-4 2xl:py-5" style="--btn-color: var(--color-accent);">
                <ArcadeIcon name="sword" className="w-5 h-5 lg:w-6 lg:h-6" />
                <span>{$t.joinAsPlayer}</span>
            </button>
            <button type="button" on:click={() => changeView('instructions')} class="btn-arcade text-sm sm:text-base lg:text-lg w-full btn-neutral py-2.5 lg:py-3.5" style="--btn-color: var(--color-primary);">
                <ArcadeIcon name="book" className="w-4 h-4 lg:w-5 lg:h-5" />
                <span>{$t.howToPlay}</span>
            </button>
        </div>

        <!-- Centered 1-Tap Language Switcher -->
        <div
            class="mt-5 sm:mt-6 lg:mt-8 inline-flex items-center p-1 cut-sm bg-[#131126] border border-[#332e59] gap-1"
            role="group"
            aria-label={$t.selectLanguage || 'Select Language'}
        >
            <button
                type="button"
                on:click={() => setLanguage('en')}
                aria-pressed={!isUkrainian}
                aria-label="English"
                class="px-4 sm:px-5 py-1.5 lg:px-6 lg:py-2 text-xs sm:text-sm lg:text-base font-display tracking-widest uppercase transition-colors cursor-pointer {!isUkrainian
                    ? 'bg-cyan-400/20 border border-cyan-400/80 text-cyan-300'
                    : 'border border-transparent text-slate-400 hover:text-white'}"
            >
                EN
            </button>
            <button
                type="button"
                on:click={() => setLanguage('uk')}
                aria-pressed={isUkrainian}
                aria-label="Українська"
                class="px-4 sm:px-5 py-1.5 lg:px-6 lg:py-2 text-xs sm:text-sm lg:text-base font-display tracking-widest uppercase transition-colors cursor-pointer {isUkrainian
                    ? 'bg-emerald-400/20 border border-emerald-400/80 text-emerald-300'
                    : 'border border-transparent text-slate-400 hover:text-white'}"
            >
                УКР
            </button>
        </div>
    </div>
</div>
