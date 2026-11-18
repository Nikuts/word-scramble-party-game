<!-- src/lib/shared/LoadingSpinner.svelte -->
<script>
    import { t } from '../../stores.js';

    export let message = "Loading...";
    export let stageBadge = "";
    export let activeStep = 0; // 0 = generic spinner, 1 = prompts, 2 = battles, 3 = starting

    $: progressPercent = activeStep === 1 ? 38 : (activeStep === 2 ? 74 : (activeStep === 3 ? 92 : 0));
</script>

<div class="w-full h-full flex-1 flex flex-col justify-center items-center p-4 sm:p-6 select-none">
    {#if activeStep > 0}
        <div class="cut-lg bg-gradient-to-br from-[#0e0b22] to-[#190c2e] border-2 border-cyan-400/80 px-6 py-7 sm:px-10 sm:py-9 max-w-2xl w-full flex flex-col items-center text-center shadow-lg">
            {#if stageBadge}
                <div class="cut-sm bg-cyan-950/90 border border-cyan-400/80 px-3.5 py-1 text-xs sm:text-sm font-display text-cyan-300 tracking-widest uppercase mb-4">
                    // {stageBadge}
                </div>
            {/if}

            {#if message}
                <p class="text-xl sm:text-3xl font-sans font-extrabold text-white leading-snug mb-6 max-w-xl">
                    {message}
                </p>
            {/if}

            <div class="w-full max-w-md h-4 bg-[#070610] border-2 border-cyan-500/70 cut-sm overflow-hidden mb-4 p-0.5">
                <div
                    class="h-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-cyan-300 transition-all duration-500"
                    style="width: {progressPercent}%;"
                ></div>
            </div>

            <div class="grid grid-cols-3 gap-2 w-full max-w-md">
                <div class="cut-sm py-1.5 px-2 border font-display text-[11px] sm:text-xs tracking-wider uppercase text-center transition-colors {activeStep === 1 ? 'bg-emerald-950/70 border-emerald-400 text-emerald-300' : (activeStep > 1 ? 'bg-[#0b1f1c] border-emerald-500/40 text-emerald-400/80' : 'bg-[#0a0914] border-[#332e59] text-slate-400')}">
                    {$t.stepPrompts || '1. PROMPTS'}
                </div>
                <div class="cut-sm py-1.5 px-2 border font-display text-[11px] sm:text-xs tracking-wider uppercase text-center transition-colors {activeStep === 2 ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300' : (activeStep > 2 ? 'bg-[#0b1f1c] border-cyan-500/40 text-cyan-300/80' : 'bg-[#0a0914] border-[#332e59] text-slate-400')}">
                    {$t.stepBattles || '2. BATTLES'}
                </div>
                <div class="cut-sm py-1.5 px-2 border font-display text-[11px] sm:text-xs tracking-wider uppercase text-center transition-colors {activeStep >= 3 ? 'bg-amber-950/70 border-amber-400 text-amber-300' : 'bg-[#0a0914] border-[#332e59] text-slate-400'}">
                    {$t.stepStarting || '3. STARTING'}
                </div>
            </div>
        </div>
    {:else}
        <div class="panel-arcade flex flex-col items-center justify-center px-8 py-8 max-w-md w-full text-center" style="--neon-color: var(--color-primary);">
            <div class="neon-spinner"></div>
            {#if message}
                <p class="mt-6 text-base sm:text-xl text-center text-slate-200 font-display tracking-wider uppercase animate-pulse max-w-sm leading-snug">{message}</p>
            {/if}
        </div>
    {/if}
</div>
