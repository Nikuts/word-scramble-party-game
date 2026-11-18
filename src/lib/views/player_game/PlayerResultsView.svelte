<!-- src/lib/views/player_game/PlayerResultsView.svelte -->
<script>
    import { t, showBattleHistory, sendMessage, resetToMenu } from '../../../stores.js';
    import PixelAvatar from '../../shared/PixelAvatar.svelte';
    import ArcadeIcon from '../../shared/ArcadeIcon.svelte';
    import SvgReactionButtons from '../../shared/SvgReactionButtons.svelte';

    export let game;
    export let player;

    $: sortedPlayers = game?.players ? [...game.players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)) : [];
    $: myRank = player ? sortedPlayers.filter(p => (p.score ?? 0) > (player.score ?? 0)).length + 1 : 4;
    $: isHost = player?.id === game?.hostPlayerId || player?.isHost || false;

    const rankTitles = {
        1: { border: 'border-amber-400', bg: 'bg-amber-400 text-black', scoreColor: 'text-amber-300' },
        2: { border: 'border-slate-300', bg: 'bg-slate-300 text-black', scoreColor: 'text-slate-200' },
        3: { border: 'border-amber-600', bg: 'bg-amber-700 text-white', scoreColor: 'text-amber-400' },
        4: { border: 'border-cyan-500/70', bg: 'bg-[#1c1936] text-cyan-300 border border-cyan-400/50', scoreColor: 'text-cyan-300' }
    };

    $: currentRankStyle = rankTitles[myRank] || rankTitles[4];

    function getRankTitle(rank, dict) {
        const isEn = !dict.place || dict.place === 'PLACE';
        if (rank === 1) return `${isEn ? '1ST' : '1'} ${dict.place || 'PLACE'} - ${dict.champion || 'CHAMPION'}!`;
        if (rank === 2) return `${isEn ? '2ND' : '2'} ${dict.place || 'PLACE'} - ${dict.runnerUp || 'RUNNER UP'}`;
        if (rank === 3) return `${isEn ? '3RD' : '3'} ${dict.place || 'PLACE'} - ${dict.podium || 'PODIUM'}`;
        return `#${rank} - ${dict.participant || 'PARTICIPANT'}`;
    }

    function getRankSubtitle(rank) {
        if (rank === 1) return $t.victoryRoyale || 'VICTORY ROYALE!';
        if (rank === 2) return $t.greatGame || 'GREAT GAME!';
        if (rank === 3) return $t.onThePodium || 'ON THE PODIUM!';
        return $t.wellPlayed || 'WELL PLAYED! (GG)';
    }

    function formatAwardMetric(key, v, dict) {
        if (!v) return '';
        if (key === 'ammoFactory' && v.value > 0) return `+${v.value} ${dict.royaltiesSummary || 'ROYALTIES'}`;
        if ((key === 'minimalist' || key === 'shakespeare') && v.count > 0) return `${v.count}${dict.wordsShortUnit || 'w'}`;
        if (v.value > 0) return `${v.value}x`;
        return '';
    }

    function getMyBadges(superlatives, playerId, dict) {
        if (!superlatives) return [];
        if (Array.isArray(superlatives)) {
            return superlatives
                .filter(s => (Array.isArray(s?.playerIds) ? s.playerIds.includes(playerId) : s?.playerId === playerId))
                .map(s => ({
                    title: s.title || s.title_uk || s.name || '',
                    desc: s.description || s.description_uk || s.desc || '',
                    stat: ''
                }));
        }
        return Object.entries(superlatives)
            .filter(([, v]) => (Array.isArray(v?.playerIds) ? v.playerIds.includes(playerId) : v?.playerId === playerId))
            .map(([k, v]) => ({
                title: dict[`${k}Title`] || k,
                desc: dict[`${k}Desc`] || (v?.value ? `+${v.value} pts` : ''),
                stat: formatAwardMetric(k, v, dict)
            }));
    }
</script>

<div class="w-full h-full flex flex-col justify-between p-3 pb-[max(8px,env(safe-area-inset-bottom))] max-w-md md:max-w-3xl mx-auto select-none font-sans overflow-hidden box-border">
    
    <!-- Scrollable Results Content -->
    <div class="flex-1 min-h-0 overflow-y-auto flex flex-col pr-0.5 mb-2">
        <div class="my-auto flex flex-col justify-start gap-3 bg-[#131126] border-2 {currentRankStyle.border} cut-md p-3.5 sm:p-5">
            
            <!-- Top Hero Rank & Avatar -->
            <div class="text-center flex flex-col items-center justify-start flex-shrink-0">
                <div class="fighter-crest px-4 py-1.5 {currentRankStyle.bg} font-display text-xs sm:text-sm uppercase tracking-wider mb-1">
                    {#if myRank === 1}
                        <ArcadeIcon name="crown" className="w-4 h-4" />
                    {/if}
                    <span>{getRankTitle(myRank, $t)}</span>
                </div>

                <span class="text-[11px] sm:text-xs font-display text-slate-400 uppercase tracking-widest block mb-2.5">
                    {getRankSubtitle(myRank)}
                </span>

                <div class="w-20 h-20 sm:w-24 sm:h-24 mx-auto mt-1 mb-1.5 relative flex-shrink-0">
                    <PixelAvatar avatar={player?.avatar || '🦊'} className="w-full h-full" />
                    {#if myRank === 1}
                        <div class="absolute -top-2.5 -right-1.5 text-amber-300">
                            <ArcadeIcon name="crown" className="w-6 h-6 animate-bounce" />
                        </div>
                    {/if}
                </div>

                <div class="mt-1 flex-shrink-0">
                    <span class="text-[11px] font-display uppercase tracking-widest text-slate-400 block mb-0.5">
                        {$t.finalScores || 'FINAL SCORE'}
                    </span>
                    <div class="flex items-baseline justify-center gap-2">
                        <span class="text-3xl sm:text-5xl font-display {currentRankStyle.scoreColor} leading-none">
                            {(player?.score || 0).toLocaleString()}
                        </span>
                        <span class="text-xs sm:text-sm font-display text-slate-400 uppercase leading-none">{$t.pts || 'PTS'}</span>
                    </div>
                </div>
            </div>

            <!-- Personal Superlatives -->
            <div class="pt-2.5 border-t border-[#332e59] flex-shrink-0">
                <span class="text-[10px] font-display uppercase tracking-widest text-amber-400 block text-center mb-1.5">
                    {$t.superlativesTitle || 'ACCOLADES & AWARDS'}
                </span>

                {#if game?.superlatives}
                    {@const myBadges = getMyBadges(game.superlatives, player?.id, $t)}
                    {#if myBadges.length > 0}
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {#each myBadges as badge}
                                <div class="p-2 cut-sm bg-amber-950/40 border border-amber-500/50 text-center">
                                    <div class="flex items-center justify-center gap-1.5 mb-0.5">
                                        <span class="font-display text-xs text-amber-300 leading-tight">{badge.title}</span>
                                        {#if badge.stat}
                                            <span class="cut-sm px-1.5 py-0.5 bg-amber-400/20 border border-amber-400/60 font-mono text-[10px] font-bold text-amber-200 leading-none">{badge.stat}</span>
                                        {/if}
                                    </div>
                                    <span class="text-[11px] text-slate-300 font-sans leading-tight block">{badge.desc}</span>
                                </div>
                            {/each}
                        </div>
                    {:else}
                        <div class="p-2 cut-sm bg-[#0a0914] border border-cyan-500/40 text-center">
                            <span class="text-xs text-slate-300 font-sans font-semibold">{$t.thanksForPlaying || 'Great battle of words! Thank you for playing.'}</span>
                        </div>
                    {/if}
                {:else}
                    <div class="p-2 cut-sm bg-[#0a0914] border border-cyan-500/40 text-center">
                        <span class="text-xs text-slate-300 font-sans font-semibold">{$t.thanksForPlaying || 'Great battle of words! Thank you for playing.'}</span>
                    </div>
                {/if}
            </div>

            <!-- Compact Final Top 3 Standings Strip -->
            {#if sortedPlayers.length > 0}
                <div class="pt-2.5 border-t border-[#332e59] flex-shrink-0">
                    <span class="text-[10px] font-display uppercase tracking-widest text-cyan-300 block text-center mb-1.5">
                        {$t.fullStandingsPts || $t.finalScores || 'TOP STANDINGS'}
                    </span>
                    <div class="space-y-1.5">
                        {#each sortedPlayers.slice(0, 3) as p, idx (p.id)}
                            {@const rankNum = sortedPlayers.filter(x => (x.score ?? 0) > (p.score ?? 0)).length + 1}
                            {@const isMe = p.id === player?.id}
                            <div class="cut-sm px-2.5 py-1.5 flex items-center justify-between gap-2 border {isMe ? 'bg-cyan-950/35 border-cyan-400/80' : 'bg-[#0a0914] border-[#332e59]'}">
                                <div class="flex items-center gap-2 min-w-0">
                                    <span class="font-mono text-xs font-extrabold {rankNum === 1 ? 'text-amber-300' : (rankNum === 2 ? 'text-slate-200' : 'text-amber-500')} flex-shrink-0">#{rankNum}</span>
                                    <div class="w-5 h-5 flex-shrink-0">
                                        <PixelAvatar avatar={p.avatar || '❓'} className="w-full h-full" />
                                    </div>
                                    <span class="font-display text-xs text-white truncate">{p.name}</span>
                                </div>
                                <span class="font-mono text-xs font-bold text-cyan-300 flex-shrink-0">
                                    {(p.score ?? 0).toLocaleString()} <span class="text-[10px] font-display text-slate-400">{$t.pts || 'PTS'}</span>
                                </span>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}

            <!-- Action Buttons -->
            <div class="space-y-2 pt-2 border-t border-[#332e59] flex-shrink-0">
                {#if game?.battleHistory && game.battleHistory.length > 0}
                    <button
                        type="button"
                        on:click={() => showBattleHistory.set(true)}
                        class="btn-arcade w-full py-2.5 px-4 text-xs sm:text-sm"
                        style="--btn-color: var(--color-primary);"
                    >
                        <ArcadeIcon name="history" className="w-4 h-4" />
                        <span>{$t.viewBattleHistory || 'VIEW BATTLE HISTORY'}</span>
                    </button>
                {/if}

                {#if isHost}
                    <div class="flex gap-2">
                        <button
                            type="button"
                            on:click={() => sendMessage('play-again', { gameId: game.id, loading: true })}
                            class="btn-arcade flex-1 py-2.5 px-4 text-xs sm:text-sm"
                            style="--btn-color: var(--color-warning);"
                        >
                            <ArcadeIcon name="refresh" className="w-4 h-4" />
                            <span>{$t.playAgain || 'PLAY AGAIN'}</span>
                        </button>
                        <button
                            type="button"
                            on:click={resetToMenu}
                            class="btn-arcade btn-neutral px-4 py-2.5 text-xs sm:text-sm"
                        >
                            <ArcadeIcon name="home" className="w-4 h-4" />
                            <span>{$t.mainMenu || 'MENU'}</span>
                        </button>
                    </div>
                {:else}
                    <div class="p-2 cut-sm bg-[#0a0914] border border-[#332e59] text-center flex items-center justify-center gap-2">
                        <span class="text-xs font-sans text-slate-300 font-medium">
                            {$t.waitingForHostToRestart || 'Waiting for host to start a new game...'}
                        </span>
                    </div>
                {/if}
            </div>
        </div>
    </div>

    <!-- 4 SVG Arcade Reactions Footer (NO Avatars) -->
    <footer class="pt-1.5 border-t border-[#332e59] flex-shrink-0">
        <SvgReactionButtons compact={true} />
    </footer>
</div>
