<!-- src/lib/views/Instructions.svelte -->
<script>
    import { t, changeView, gameState } from '../../stores.js';

    function handleBack() {
        if ($gameState) {
            changeView('playerGame');
        } else {
            changeView('mainMenu');
        }
    }
</script>

<div class="h-[100dvh] max-h-[100dvh] overflow-y-auto overscroll-contain flex flex-col items-center p-3 sm:p-6 lg:p-8 py-4 justify-start sm:justify-center select-none font-sans safe-top safe-bottom">
    <div class="w-full max-w-2xl panel-arcade overflow-y-auto max-h-full p-4 sm:p-6 rounded-3xl border border-fuchsia-500/40 shadow-2xl backdrop-blur-md my-auto" style="--neon-color: var(--color-accent); --neon-color-rgb: var(--color-accent-rgb);">
        
        <!-- Header -->
        <header class="text-center mb-4">
            <h1 class="text-2xl sm:text-3xl lg:text-4xl font-display font-black text-amber-300 tracking-wider drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]">
                📖 {$t.instructionsTitle || 'How to Play'}
            </h1>
        </header>
        
        <div class="space-y-3 text-left">
            <!-- Step 1: Question Phase -->
            <div class="p-3 sm:p-3.5 bg-neutral-900/80 border-l-4 border-cyan-400 rounded-r-xl shadow-sm">
                <h2 class="text-sm sm:text-base font-display font-bold text-cyan-300 flex items-center gap-2">
                    {$t.instructions1Title || '1. Fuel the Chaos (Question Phase)'}
                </h2>
                <p class="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                    {$t.instructions1Text}
                </p>
            </div>

            <!-- Step 2: Battle Phase -->
            <div class="p-3 sm:p-3.5 bg-neutral-900/80 border-l-4 border-fuchsia-400 rounded-r-xl shadow-sm">
                <h2 class="text-sm sm:text-base font-display font-bold text-fuchsia-300 flex items-center gap-2">
                    {$t.instructions2Title || '2. Craft the Punchlines (Battle Phase)'}
                </h2>
                <p class="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                    {$t.instructions2Text}
                </p>
            </div>

            <!-- Step 3: Voting Phase -->
            <div class="p-3 sm:p-3.5 bg-neutral-900/80 border-l-4 border-emerald-400 rounded-r-xl shadow-sm">
                <h2 class="text-sm sm:text-base font-display font-bold text-emerald-300 flex items-center gap-2">
                    {$t.instructions3Title || '3. Vote & Score (Voting Phase)'}
                </h2>
                <p class="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                    {$t.instructions3Text}
                </p>
            </div>

            <!-- Step 4: One-Time Powerups & Word Royalties -->
            <div class="p-3 sm:p-3.5 bg-neutral-900/80 border-l-4 border-amber-400 rounded-r-xl shadow-sm">
                <h2 class="text-sm sm:text-base font-display font-bold text-amber-300 flex items-center gap-2">
                    {$t.instructions4Title || '4. ⚡ One-Time Powerups & Word Royalties'}
                </h2>
                <div class="mt-2 space-y-2 text-xs sm:text-sm text-slate-200">
                    <!-- Re-Roll -->
                    <div class="flex items-start gap-2.5 bg-neutral-950/60 p-2 rounded-lg border border-neutral-800">
                        <span class="text-base flex-shrink-0">🎲</span>
                        <div>
                            <div class="flex items-baseline gap-1.5 flex-wrap">
                                <span class="text-amber-300 font-bold font-display text-xs sm:text-sm">{$t.powerupRerollTitle || 'Question Re-Roll'}</span>
                                <span class="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-amber-950/90 text-amber-400 border border-amber-500/40">
                                    {$t.oneTimePerGame || '1x per game'}
                                </span>
                            </div>
                            <span class="text-slate-300 block text-xs mt-0.5 leading-tight">
                                {$t.powerupRerollDesc || 'Swap an unwanted question prompt in the Question phase for a brand new one.'}
                            </span>
                        </div>
                    </div>

                    <!-- Time Boost -->
                    <div class="flex items-start gap-2.5 bg-neutral-950/60 p-2 rounded-lg border border-neutral-800">
                        <span class="text-base flex-shrink-0">⏱️</span>
                        <div>
                            <div class="flex items-baseline gap-1.5 flex-wrap">
                                <span class="text-amber-300 font-bold font-display text-xs sm:text-sm">{$t.powerupTimeBoostTitle || '+30s Time Boost'}</span>
                                <span class="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-amber-950/90 text-amber-400 border border-amber-500/40">
                                    {$t.oneTimePerGame || '1x per game'}
                                </span>
                            </div>
                            <span class="text-slate-300 block text-xs mt-0.5 leading-tight">
                                {$t.powerupTimeBoostDesc || 'Add 30 seconds to the clock during Question or Battle Answering phases for all players.'}
                            </span>
                        </div>
                    </div>

                    <!-- Word Royalties -->
                    <div class="flex items-start gap-2.5 bg-neutral-950/60 p-2 rounded-lg border border-neutral-800">
                        <span class="text-base flex-shrink-0">👑</span>
                        <div>
                            <div class="flex items-baseline gap-1.5 flex-wrap">
                                <span class="text-amber-300 font-bold font-display text-xs sm:text-sm">{$t.powerupRoyaltiesTitle || 'Word Royalties (+50 pts)'}</span>
                            </div>
                            <span class="text-slate-300 block text-xs mt-0.5 leading-tight">
                                {$t.powerupRoyaltiesDesc || 'Earn +50 bonus points every time an opponent uses your words in a winning punchline!'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Ultimate Goal Footer -->
            <div class="pt-2.5 mt-3 border-t border-neutral-800 text-center">
                 <p class="font-display font-black text-xs sm:text-sm text-yellow-300 drop-shadow-[0_0_10px_rgba(253,224,71,0.5)]">
                    {$t.instructionsGoal || '🏆 The player with the highest score after 3 rounds is crowned Champion!'}
                 </p>
            </div>
        </div>
    </div>

    <button on:click={handleBack} class="mt-4 btn-arcade px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-neutral-900 border border-neutral-700 text-slate-200 hover:border-cyan-400 hover:text-white transition-all cursor-pointer">
        &larr; {$gameState ? $t.backToLobby : $t.backToMenu}
    </button>
</div>