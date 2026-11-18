<!-- src/lib/views/Instructions.svelte -->
<script>
    import { t, changeView, gameState } from '../../stores.js';
    import ArcadeIcon from '../shared/ArcadeIcon.svelte';

    function handleBack() {
        if ($gameState) {
            changeView('playerGame');
        } else {
            changeView('mainMenu');
        }
    }
</script>

<div class="h-screen-safe max-h-screen-safe overflow-y-auto overscroll-contain flex flex-col items-center p-3 sm:p-6 lg:p-8 py-4 justify-start sm:justify-center select-none font-sans safe-top safe-bottom">
    <div class="w-full max-w-2xl panel-arcade overflow-y-auto max-h-full p-4 sm:p-6 my-auto" style="--neon-color: var(--color-accent);">
        
        <header class="text-center mb-4">
            <h1 class="text-2xl sm:text-3xl lg:text-4xl font-display text-amber-300 tracking-wider flex items-center justify-center gap-2.5">
                <ArcadeIcon name="book" className="w-7 h-7 sm:w-8 sm:h-8" />
                <span>{$t.instructionsTitle || 'How to Play'}</span>
            </h1>
        </header>
        
        <div class="space-y-3 text-left">
            <!-- Step 1: Question Phase -->
            <div class="cut-sm p-3 sm:p-3.5 bg-[#0e0b22] border-l-4 border-cyan-400">
                <h2 class="text-sm sm:text-base font-display text-cyan-300 flex items-center gap-2">
                    <ArcadeIcon name="bolt" className="w-4 h-4" />
                    <span>{$t.instructions1Title}</span>
                </h2>
                <p class="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                    {$t.instructions1Text}
                </p>
            </div>

            <!-- Step 2: Battle Phase -->
            <div class="cut-sm p-3 sm:p-3.5 bg-[#0e0b22] border-l-4 border-fuchsia-400">
                <h2 class="text-sm sm:text-base font-display text-fuchsia-300 flex items-center gap-2">
                    <ArcadeIcon name="sword" className="w-4 h-4" />
                    <span>{$t.instructions2Title}</span>
                </h2>
                <p class="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                    {$t.instructions2Text}
                </p>
            </div>

            <!-- Step 3: Voting Phase -->
            <div class="cut-sm p-3 sm:p-3.5 bg-[#0e0b22] border-l-4 border-emerald-400">
                <h2 class="text-sm sm:text-base font-display text-emerald-300 flex items-center gap-2">
                    <ArcadeIcon name="vote" className="w-4 h-4" />
                    <span>{$t.instructions3Title}</span>
                </h2>
                <p class="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                    {$t.instructions3Text}
                </p>
            </div>

            <!-- Step 4: One-Time Powerups & Word Royalties -->
            <div class="cut-sm p-3 sm:p-3.5 bg-[#0e0b22] border-l-4 border-amber-400">
                <h2 class="text-sm sm:text-base font-display text-amber-300 flex items-center gap-2">
                    <ArcadeIcon name="sparkles" className="w-4 h-4" />
                    <span>{$t.instructions4Title}</span>
                </h2>
                <div class="mt-2 space-y-2 text-xs sm:text-sm text-slate-200">
                    <div class="flex items-start gap-2.5 bg-[#070610] p-2.5 cut-sm border border-[#332e59]">
                        <ArcadeIcon name="refresh" className="w-4 h-4 text-purple-300 mt-0.5" />
                        <div>
                            <div class="flex items-baseline gap-1.5 flex-wrap">
                                <span class="text-amber-300 font-display text-xs sm:text-sm">{$t.powerupRerollTitle}</span>
                                <span class="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-amber-950/90 text-amber-300 border border-amber-500/40">
                                    {$t.oneTimePerRound}
                                </span>
                            </div>
                            <span class="text-slate-300 block text-xs mt-0.5 leading-tight">{$t.powerupRerollDesc}</span>
                        </div>
                    </div>

                    <div class="flex items-start gap-2.5 bg-[#070610] p-2.5 cut-sm border border-[#332e59]">
                        <ArcadeIcon name="clock" className="w-4 h-4 text-amber-300 mt-0.5" />
                        <div>
                            <div class="flex items-baseline gap-1.5 flex-wrap">
                                <span class="text-amber-300 font-display text-xs sm:text-sm">{$t.powerupTimeBoostTitle}</span>
                                <span class="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-amber-950/90 text-amber-300 border border-amber-500/40">
                                    {$t.oneTimePerGame}
                                </span>
                            </div>
                            <span class="text-slate-300 block text-xs mt-0.5 leading-tight">{$t.powerupTimeBoostDesc}</span>
                        </div>
                    </div>

                    <div class="flex items-start gap-2.5 bg-[#070610] p-2.5 cut-sm border border-[#332e59]">
                        <ArcadeIcon name="crown" className="w-4 h-4 text-cyan-300 mt-0.5" />
                        <div>
                            <span class="text-amber-300 font-display text-xs sm:text-sm block">{$t.powerupRoyaltiesTitle}</span>
                            <span class="text-slate-300 block text-xs mt-0.5 leading-tight">{$t.powerupRoyaltiesDesc}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="pt-2.5 mt-3 border-t border-[#332e59] text-center">
                <p class="font-display text-xs sm:text-sm text-amber-300 flex items-center justify-center gap-1.5">
                    <ArcadeIcon name="trophy" className="w-4 h-4" />
                    <span>{$t.instructionsGoal}</span>
                </p>
            </div>
        </div>
    </div>

    <button
        type="button"
        on:click={handleBack}
        class="mt-4 btn-arcade btn-neutral px-6 py-2.5 text-xs sm:text-sm"
        style="--btn-color: var(--color-primary);"
    >
        <ArcadeIcon name="arrow-left" className="w-4 h-4" />
        <span>{$gameState ? $t.backToLobby : $t.backToMenu}</span>
    </button>
</div>
