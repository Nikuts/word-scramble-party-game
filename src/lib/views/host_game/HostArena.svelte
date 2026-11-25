<!-- src/lib/views/host_game/HostArena.svelte -->
<script>
    import { t, gameState, gamePhase, gamePlayers, currentRound } from '../../../stores.js';
    import PixelAvatar from '../../shared/PixelAvatar.svelte';
    import ArcadeIcon from '../../shared/ArcadeIcon.svelte';

    export let animatedScores = {};

    $: isQuestion = $gamePhase === 'question';
    $: playerCount = $gamePlayers.length;

    $: rankByPlayerId = [...$gamePlayers]
        .sort((a, b) => ((b.score || 0) - (a.score || 0)))
        .reduce((acc, p, idx) => { acc[p.id] = idx + 1; return acc; }, {});

    $: finishedCount = $gamePlayers.filter(p => {
        const total = isQuestion
            ? ($gameState.playerAnswers?.[p.id]?.questions?.length || 3)
            : ($gameState.battleSchedule?.filter(b => b.competitors?.includes(p.id))?.length || 2);
        const done = isQuestion
            ? ($gameState.playerAnswers?.[p.id]?.questions?.filter(q => !!q.answer)?.length || 0)
            : ($gameState.battleSchedule?.filter(b => b.competitors?.includes(p.id) && !!b.answers?.[p.id])?.length || 0);
        return done >= total && total > 0 && (!!p.socketId || !!p.isAway);
    }).length;
</script>

<!-- Prototype v5 Arena Sub-Header & Full-Space Player Progress Grid -->
<div class="relative z-10 w-full cut-md host-hud-surface border-2 border-[color:rgba(var(--color-primary-rgb),0.72)] {playerCount > 8 ? 'px-3.5 sm:px-5 py-1.5 sm:py-2 2xl:py-3.5' : 'px-4 sm:px-6 py-2 sm:py-2.5 2xl:py-3.5'} flex flex-wrap items-center justify-between gap-2 sm:gap-3 flex-shrink-0">
    <h1 class="font-display text-sm sm:text-lg lg:text-xl 2xl:text-2xl text-white tracking-wider uppercase m-0">
        {($t.round || 'ROUND').toUpperCase()} {$currentRound || 1} // {isQuestion
            ? ($t.questionPhase || 'ANSWERING QUESTIONS').toUpperCase()
            : ($currentRound === 3 ? ($t.finalRound || 'FINAL BATTLE').toUpperCase() : ($t.battlePhase || 'ASSEMBLING BATTLE PUNCHLINES').toUpperCase())}
    </h1>

    <span class="cut-sm px-3.5 sm:px-4 py-1 sm:py-1.5 bg-emerald-950/60 border border-emerald-400 text-emerald-300 font-display text-xs sm:text-sm 2xl:text-base tracking-widest uppercase">
        {$t.finishedRatio
            ? $t.finishedRatio.replace('{done}', finishedCount).replace('{total}', playerCount)
            : `${finishedCount} / ${playerCount} FINISHED`}
    </span>
</div>

<main class="relative z-10 lg:flex-1 lg:min-h-0 w-full lg:overflow-hidden flex items-center justify-center py-0.5">
    <div class="w-full h-full content-center {playerCount <= 4 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2' : (playerCount <= 6 ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' : (playerCount <= 8 ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'))} grid {playerCount > 8 ? 'gap-1.5 sm:gap-2 xl:gap-2.5 2xl:gap-4' : 'gap-2.5 sm:gap-3.5 2xl:gap-5'}">
        {#each $gamePlayers as p (p.id)}
            {@const isConnected = !!p.socketId}
            {@const isAway = !isConnected && !!p.isAway}
            {@const rank = rankByPlayerId[p.id] || 1}
            {@const totalItems = isQuestion
                ? ($gameState.playerAnswers?.[p.id]?.questions?.length || 3)
                : ($gameState.battleSchedule?.filter(b => b.competitors?.includes(p.id))?.length || 2)}
            {@const answeredItems = isQuestion
                ? ($gameState.playerAnswers?.[p.id]?.questions?.filter(q => !!q.answer)?.length || 0)
                : ($gameState.battleSchedule?.filter(b => b.competitors?.includes(p.id) && !!b.answers?.[p.id])?.length || 0)}
            {@const isComplete = answeredItems >= totalItems && totalItems > 0 && (isConnected || isAway)}
            {@const isWorking = isConnected && answeredItems > 0 && !isComplete}
            {@const cardNeon = isComplete ? 'var(--color-accent)' : (!isConnected && !isAway ? 'var(--color-danger)' : (isAway ? 'var(--color-warning)' : (isWorking ? 'var(--color-primary)' : '#332e59')))}
            {@const statusBoxClass = isComplete
                ? 'bg-emerald-950/50 border-emerald-400 text-emerald-300'
                : (!isConnected && !isAway
                    ? 'bg-rose-950/60 border-danger text-rose-300'
                    : (isAway
                        ? 'bg-amber-950/50 border-amber-400 text-amber-300'
                        : (isWorking
                            ? 'bg-cyan-950/50 border-cyan-400 text-cyan-300'
                            : 'bg-amber-950/35 border-amber-500/70 text-amber-300')))}

            <div
                class="panel-arcade {playerCount <= 6 ? 'p-3.5 sm:p-5 2xl:p-7 gap-3 2xl:gap-5 lg:min-h-[11.25rem] 2xl:min-h-[15.625rem]' : (playerCount <= 8 ? 'p-2.5 2xl:p-4 gap-2 2xl:gap-3' : 'p-2 sm:p-2.5 xl:p-3 2xl:p-5 gap-1.5 xl:gap-2 2xl:gap-3 lg:min-h-[7rem] xl:min-h-[8.25rem] 2xl:min-h-[12.2rem]')} flex flex-col justify-between transition-colors min-w-0 min-h-0 overflow-hidden"
                style="--neon-color: {cardNeon};"
            >
                <!-- Header: Avatar + Name + Crown + Score + Rank -->
                <div class="flex items-center {playerCount > 8 ? 'gap-2 2xl:gap-3.5 mb-0.5 2xl:mb-1.5' : 'gap-2.5 2xl:gap-3.5 mb-2'} min-w-0">
                    <div class="{playerCount <= 6 ? 'w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 2xl:w-20 2xl:h-20' : (playerCount <= 8 ? 'w-10 h-10 2xl:w-14 2xl:h-14' : 'w-8 h-8 xl:w-10 xl:h-10 2xl:w-16 2xl:h-16')} flex-shrink-0">
                        <PixelAvatar avatar={p.avatar} />
                    </div>
                    <div class="min-w-0 flex-1 text-left">
                        <div class="flex items-center gap-1.5 min-w-0">
                            <p class="font-display font-black {playerCount <= 6 ? 'text-base sm:text-xl 2xl:text-2xl' : (playerCount <= 8 ? 'text-sm sm:text-base 2xl:text-xl' : 'text-xs xl:text-sm 2xl:text-xl')} text-white truncate">{p.name}</p>
                            {#if rank === 1 && (p.score || 0) > 0}
                                <ArcadeIcon name="crown" className="w-3.5 h-3.5 xl:w-4 xl:h-4 2xl:w-5 2xl:h-5 text-amber-300 flex-shrink-0" />
                            {/if}
                            {#if p.isHost}
                                <span class="cut-sm px-1.5 py-0.5 2xl:px-2 bg-amber-400 text-black text-[9px] 2xl:text-[11px] font-display uppercase flex-shrink-0">{$t.host || 'HOST'}</span>
                            {/if}
                        </div>
                        <div class="flex items-center {playerCount > 8 ? 'gap-1.5' : 'gap-2'} mt-0.5 2xl:mt-1 whitespace-nowrap min-w-0">
                            <span class="cut-sm {playerCount > 8 ? 'px-1.5 py-0.5 2xl:px-2.5 2xl:py-1 text-[10px] xl:text-[11px] 2xl:text-sm' : 'px-2 py-0.5 2xl:px-2.5 2xl:py-1 text-xs 2xl:text-sm'} bg-[#0a0914] border border-cyan-500/50 text-cyan-300 font-mono font-bold leading-none truncate">
                                {Math.round(animatedScores[p.id] || p.score)} {$t.pts || 'PTS'}
                            </span>
                            <span class="font-mono {playerCount > 8 ? 'text-[10px] xl:text-xs 2xl:text-sm' : 'text-xs 2xl:text-sm'} text-slate-400 font-bold flex-shrink-0">#{rank}</span>
                        </div>
                    </div>
                </div>

                <!-- Framed Status Bar -->
                <div class="cut-sm border {playerCount > 8 ? 'px-2 2xl:px-3.5 py-1 xl:py-1.5 2xl:py-2 text-[10px] xl:text-xs 2xl:text-sm tracking-normal xl:tracking-wide gap-1.5' : 'px-2.5 2xl:px-3.5 py-1.5 2xl:py-2.5 text-xs sm:text-sm 2xl:text-base tracking-wide gap-2'} font-display uppercase flex items-center justify-between min-w-0 {statusBoxClass}">
                    {#if isComplete}
                        <span class="inline-flex items-center gap-1 min-w-0 truncate">
                            <ArcadeIcon name="check" className="{playerCount > 8 ? 'w-3 h-3 2xl:w-3.5 2xl:h-3.5' : 'w-3.5 h-3.5'} flex-shrink-0" />
                            <span class="truncate">{$t.lockedIn || 'LOCKED IN'}</span>
                        </span>
                    {:else if !isConnected && isAway}
                        <span class="inline-flex items-center gap-1 min-w-0 truncate">
                            <ArcadeIcon name="clock" className="{playerCount > 8 ? 'w-3 h-3 2xl:w-3.5 2xl:h-3.5' : 'w-3.5 h-3.5'} flex-shrink-0" />
                            <span class="truncate">{$t.awayStatus || 'AWAY'}</span>
                        </span>
                    {:else if !isConnected}
                        <span class="truncate">{$t.disconnected || 'OFFLINE'}</span>
                    {:else if isWorking}
                        <span class="inline-flex items-center gap-1 min-w-0 truncate">
                            <ArcadeIcon name="edit" className="{playerCount > 8 ? 'w-3 h-3 2xl:w-3.5 2xl:h-3.5' : 'w-3.5 h-3.5'} flex-shrink-0" />
                            <span class="truncate">{$t.answering || 'ASSEMBLING...'}</span>
                        </span>
                    {:else}
                        <span class="inline-flex items-center gap-1 min-w-0 truncate">
                            <ArcadeIcon name="clock" className="{playerCount > 8 ? 'w-3 h-3 2xl:w-3.5 2xl:h-3.5' : 'w-3.5 h-3.5'} flex-shrink-0" />
                            <span class="truncate">{$t.thinking || 'THINKING...'}</span>
                        </span>
                    {/if}
                    <span class="font-mono font-bold flex-shrink-0">{answeredItems}/{totalItems}</span>
                </div>

                <!-- Step Bricks Footer -->
                <div class="w-full {playerCount > 8 ? 'mt-0.5' : 'mt-1'} flex-shrink-0">
                    {#if playerCount <= 8}
                        <div class="flex items-center justify-between text-[10px] 2xl:text-xs font-display tracking-wider uppercase mb-1 2xl:mb-1.5">
                            <span class="text-slate-400">{$t.promptsProgress || 'PROMPTS PROGRESS'}</span>
                            <span class="{isComplete ? 'text-emerald-400' : (isWorking ? 'text-cyan-300' : 'text-amber-300')}">
                                {isComplete ? ($t.allSent || 'ALL SENT') : ($t.inProgress || 'IN PROGRESS')}
                            </span>
                        </div>
                    {/if}
                    <div class="grid gap-1 2xl:gap-1.5" style="grid-template-columns: repeat({Math.max(1, totalItems)}, minmax(0, 1fr));">
                        {#each Array(Math.max(1, totalItems)) as _, stepIdx}
                            {@const filled = stepIdx < answeredItems}
                            <div class="{playerCount > 8 ? 'h-2.5 min-h-[10px] xl:h-3 2xl:h-4' : (playerCount <= 6 ? 'h-3.5 min-h-[14px] lg:h-4 2xl:h-5' : 'h-3 min-h-[12px] 2xl:h-4')} cut-sm border {filled
                                ? (isComplete ? 'bg-emerald-400 border-emerald-200' : 'bg-cyan-400 border-cyan-200')
                                : (!isConnected && !isAway ? 'bg-rose-950 border-danger/60' : 'bg-[#121024] border-[#433c78]')
                            } transition-colors duration-300"></div>
                        {/each}
                    </div>
                </div>
            </div>
        {/each}
    </div>
</main>
