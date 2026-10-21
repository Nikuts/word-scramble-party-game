<script>
    import { t, gameState, gamePhase, gamePlayers, phaseTimer, currentRound } from '../../../stores.js';
    import SevenSegmentDisplay from '../../shared/SevenSegmentDisplay.svelte';
    import PixelAvatar from '../../shared/PixelAvatar.svelte';

    export let animatedScores = {};
</script>

<!-- Phase: Question & Battle Answering (Adaptive Responsive Grid) -->
<div class="flex-shrink-0 text-center mb-1.5 sm:mb-2">
    <div class="mb-1">
        <SevenSegmentDisplay time={$phaseTimer} size="sm" />
    </div>
    <h1 class="text-lg sm:text-xl lg:text-2xl font-display font-black tracking-wider text-primary drop-shadow-[0_0_12px_rgba(var(--color-primary-rgb),0.7)] mt-0.5">
        {$t.roundStatus ? $t.roundStatus.replace('{currentRound}', $currentRound) : `ROUND ${$currentRound}`} · {$gamePhase === 'question' ? ($t.questionPhase || 'QUESTION').toUpperCase() : ($currentRound === 3 ? ($t.finalRound || 'FINAL BATTLE').toUpperCase() : ($t.battlePhase || 'BATTLE').toUpperCase())}
    </h1>
</div>

<main class="flex-1 flex items-center justify-center min-h-0 py-1 overflow-hidden">
    <div class="w-full max-h-full overflow-y-auto pr-1">
        <div class="grid {$gamePlayers.length > 8 ? 'gap-2 sm:gap-2.5' : 'gap-2.5 sm:gap-3'} {$gamePlayers.length <= 4 ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 max-w-6xl' : ($gamePlayers.length <= 6 ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 max-w-6xl' : ($gamePlayers.length <= 8 ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 max-w-6xl' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 max-w-7xl'))} mx-auto">
            {#each $gamePlayers as p (p.id)}
                {@const isConnected = !!p.socketId}
                {@const isQuestionPhase = $gamePhase === 'question'}
                {@const totalItems = isQuestionPhase 
                    ? ($gameState.playerAnswers?.[p.id]?.questions?.length || 3) 
                    : ($gameState.battleSchedule?.filter(b => b.competitors?.includes(p.id))?.length || 1)}
                {@const answeredItems = isQuestionPhase 
                    ? ($gameState.playerAnswers?.[p.id]?.questions?.filter(q => !!q.answer)?.length || 0) 
                    : ($gameState.battleSchedule?.filter(b => b.competitors?.includes(p.id) && !!b.answers?.[p.id])?.length || 0)}
                {@const isComplete = isConnected && answeredItems >= totalItems && totalItems > 0}
                {@const isWorking = isConnected && answeredItems > 0 && !isComplete}
                {@const progressPct = totalItems > 0 ? Math.round((answeredItems / totalItems) * 100) : 0}

                <div class="panel-arcade {$gamePlayers.length <= 6 ? 'p-3.5 sm:p-4 rounded-2xl' : ($gamePlayers.length <= 8 ? 'p-2.5 sm:p-3 rounded-2xl' : 'p-2 sm:p-2.5 rounded-2xl')} flex flex-col justify-between border-neutral-700/90 bg-neutral-950/90 shadow-xl transition-all duration-300">
                    <div class="flex items-center gap-2 sm:gap-2.5 mb-1">
                        <div class="{$gamePlayers.length <= 6 ? 'w-12 h-12 sm:w-14 sm:h-14' : ($gamePlayers.length <= 8 ? 'w-10 h-10 sm:w-12 sm:h-12' : 'w-8 h-8 sm:w-10 sm:h-10')} flex-shrink-0">
                            <PixelAvatar avatar={p.avatar} />
                        </div>
                        <div class="min-w-0 flex-1 text-left">
                            <div class="flex items-center gap-1.5">
                                <p class="font-black {$gamePlayers.length <= 6 ? 'text-base sm:text-lg lg:text-xl' : ($gamePlayers.length <= 8 ? 'text-sm sm:text-base' : 'text-xs sm:text-sm')} text-slate-100 whitespace-nowrap truncate">{p.name}</p>
                                {#if p.isHost}
                                    <span class="px-1.5 py-0.5 bg-warning text-black text-[9px] font-display rounded font-black flex-shrink-0">{$t.host || 'HOST'}</span>
                                {/if}
                            </div>
                            <p class="text-primary font-mono font-black {$gamePlayers.length <= 6 ? 'text-lg sm:text-xl' : ($gamePlayers.length <= 8 ? 'text-base sm:text-lg' : 'text-sm sm:text-base')} leading-tight mt-0.5">
                                {Math.round(animatedScores[p.id] || p.score)} <span class="text-[10px] sm:text-xs text-slate-400 font-display">{$t.pts || 'PTS'}</span>
                            </p>
                        </div>
                    </div>

                    <div class="w-full mt-auto pt-1">
                        <div class="flex items-center justify-between text-[11px] sm:text-xs font-display font-bold mb-1">
                            {#if !isConnected}
                                <span class="text-danger animate-pulse font-bold">{$t.disconnected || 'OFFLINE'}</span>
                            {:else if isComplete}
                                <span class="text-emerald-400 flex items-center gap-1 font-black">
                                    ✓ {$t.ready || 'READY!'}
                                </span>
                            {:else if isWorking}
                                <span class="text-cyan-300 flex items-center gap-1 animate-pulse">
                                    ✍️ {$t.answering || 'Assembling...'}
                                </span>
                            {:else}
                                <span class="text-amber-300 flex items-center gap-1">
                                    💭 {$t.thinking || 'Thinking...'}
                                </span>
                            {/if}
                            <span class="font-mono text-slate-300 font-bold">{answeredItems}/{totalItems}</span>
                        </div>

                        <div class="w-full h-2 sm:h-2.5 bg-neutral-900 rounded-full overflow-hidden border border-neutral-700/60">
                            <div 
                                class="h-full transition-all duration-500 {
                                    !isConnected ? 'bg-red-500' : (isComplete ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]' : (isWorking ? 'bg-cyan-400' : 'bg-amber-400'))
                                }" 
                                style="width: {isConnected ? progressPct : 0}%;"
                            ></div>
                        </div>
                    </div>
                </div>
            {/each}
        </div>
    </div>
</main>
