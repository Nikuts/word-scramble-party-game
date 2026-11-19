<!-- src/lib/views/host_game/HostPodium.svelte -->
<script>
    import { t, language, gameState, gamePlayers } from '../../../stores.js';
    import { formatWinsLabel } from '../../../ui_text.js';
    import PixelAvatar from '../../shared/PixelAvatar.svelte';
    import ArcadeIcon from '../../shared/ArcadeIcon.svelte';
    import { TIMEOUT_ANSWER_PLACEHOLDER } from '../../../../shared/config.js';

    export let displayedScores = {};

    $: sortedPlayers = [...$gamePlayers].sort((a, b) => ((displayedScores[b.id] ?? b.score) || 0) - ((displayedScores[a.id] ?? a.score) || 0));
    $: firstPlace = sortedPlayers[0];
    $: secondPlace = sortedPlayers[1];
    $: thirdPlace = sortedPlayers[2];
    $: restOfPlayers = sortedPlayers.slice(3);
    $: sups = $gameState?.superlatives;

    $: allBattles = [...($gameState?.battleHistory || []), ...($gameState?.battleSchedule || [])].filter(Boolean);

    function didWinOrTie(battle, playerId) {
        return battle.winnerId === playerId || (!battle.winnerId && (battle.scoreBreakdown?.[playerId]?.winBonus || 0) > 0);
    }

    function getWinsCount(playerId) {
        if (!playerId) return 0;
        const seen = new Set();
        let count = 0;
        for (const b of allBattles) {
            if (b.id) {
                if (seen.has(b.id)) continue;
                seen.add(b.id);
            }
            if (didWinOrTie(b, playerId)) count++;
        }
        return count;
    }

    function getStandingsRank(score) {
        const val = score || 0;
        return sortedPlayers.filter(pl => ((displayedScores[pl.id] ?? pl.score) || 0) > val).length + 1;
    }

    function getChampionQuote(playerId) {
        if (!playerId) return '';
        let bestWinPts = -1;
        let bestWinQuote = '';
        let bestTiePts = -1;
        let tieQuote = '';
        for (const b of allBattles) {
            if (!b.answers?.[playerId]) continue;
            const raw = b.answers[playerId];
            let formatted = '';
            if (typeof raw === 'string' && raw !== TIMEOUT_ANSWER_PLACEHOLDER) formatted = raw;
            else if (typeof raw === 'object' && raw !== null && raw.title && raw.title !== TIMEOUT_ANSWER_PLACEHOLDER) {
                formatted = `${raw.title}${raw.tagline ? ` — ${raw.tagline}` : ''}`;
            }
            if (!formatted) continue;
            const pts = b.pointsAwarded?.[playerId] || 0;
            if (b.winnerId === playerId) {
                if (pts >= bestWinPts) {
                    bestWinPts = pts;
                    bestWinQuote = formatted;
                }
            } else if (didWinOrTie(b, playerId) && pts >= bestTiePts) {
                bestTiePts = pts;
                tieQuote = formatted;
            }
        }
        return bestWinQuote || tieQuote;
    }

    function getAwardRecipients(award) {
        if (!award) return [];
        const ids = Array.isArray(award.playerIds) && award.playerIds.length > 0
            ? award.playerIds
            : (award.playerId ? [award.playerId] : []);
        return ids.map(id => $gamePlayers.find(pl => pl.id === id)).filter(Boolean);
    }

    const accoladeIcon = {
        ammoFactory: 'bolt',
        rainbowAlchemist: 'sparkles',
        cleanSweeper: 'trophy',
        minimalist: 'sword',
        shakespeare: 'book'
    };

    $: firstWins = getWinsCount(firstPlace?.id);
    $: secondWins = getWinsCount(secondPlace?.id);
    $: thirdWins = getWinsCount(thirdPlace?.id);
    $: champQuote = getChampionQuote(firstPlace?.id);
</script>

<!-- Prototype v5 Split-Stage Trophy Cards Podium + Compact Full Standings + Accolades Strip -->
<div class="relative z-10 w-full lg:min-h-0 lg:flex-1 flex flex-col justify-between gap-2 sm:gap-2.5 select-none font-sans lg:overflow-hidden box-border">

    <!-- Upper Split Stage: Left Tall Trophy Cards + Right Full Standings (#4-#14) -->
    <div class="lg:flex-1 lg:min-h-0 w-full grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3 items-stretch">

        <!-- Top 3 Trophy Cards -->
        <section class="{restOfPlayers.length > 0 ? 'lg:col-span-6' : 'lg:col-span-12 max-w-6xl 2xl:max-w-7xl mx-auto w-full'} min-w-0 flex items-end justify-center gap-2 sm:gap-3 2xl:gap-4 py-1">

            <!-- #2 Runner Up -->
            {#if secondPlace}
                {@const pScore = displayedScores[secondPlace.id] ?? secondPlace.score ?? 0}
                <div class="flex-1 min-w-0 h-[78%] min-h-[11.5rem] lg:min-h-[13.125rem] cut-md bg-gradient-to-b from-slate-700/70 via-[#15182d] to-[#0d0e1c] border-2 border-slate-300/80 p-2.5 sm:p-3 2xl:p-5 flex flex-col items-center justify-between text-center">
                    <span class="cut-sm px-2.5 py-0.5 2xl:px-3.5 2xl:py-1 bg-slate-200 text-black font-display text-[10px] sm:text-xs 2xl:text-sm tracking-wider uppercase whitespace-nowrap">
                        {$t.runnerUpBadge || '#2 · RUNNER UP'}
                    </span>

                    <div class="flex flex-col items-center my-auto py-1">
                        <div class="w-14 h-14 sm:w-16 sm:h-16 xl:w-20 xl:h-20 2xl:w-28 2xl:h-28 mb-1.5 2xl:mb-2.5">
                            <PixelAvatar avatar={secondPlace.avatar} className="w-full h-full" />
                        </div>
                        <span class="font-display text-base sm:text-xl 2xl:text-2xl text-white truncate max-w-full block">{secondPlace.name}</span>
                        <span class="font-mono text-base sm:text-xl xl:text-2xl 2xl:text-3xl font-extrabold text-slate-200 mt-0.5">
                            {pScore.toLocaleString()} <span class="text-xs 2xl:text-sm text-slate-400 font-display">{$t.pts || 'PTS'}</span>
                        </span>
                    </div>

                    {#if secondWins > 0}
                        <div class="text-xs 2xl:text-sm font-mono text-slate-300 uppercase tracking-wider border-t border-slate-600/50 pt-1 2xl:pt-1.5 w-full truncate">
                            {formatWinsLabel(secondWins, $t, $language)}
                        </div>
                    {:else}
                        <span class="font-display text-2xl lg:text-3xl 2xl:text-5xl text-slate-300 opacity-25 select-none leading-none">#2</span>
                    {/if}
                </div>
            {/if}

            <!-- #1 Champion (Tallest Gold Card) -->
            {#if firstPlace}
                {@const pScore = displayedScores[firstPlace.id] ?? firstPlace.score ?? 0}
                <div class="flex-[1.2] min-w-0 h-[96%] min-h-[14rem] lg:min-h-[15.625rem] cut-md bg-gradient-to-b from-amber-500/30 via-amber-950/35 to-[#100c14] border-2 border-amber-300 flex flex-col items-center justify-between text-center overflow-hidden">
                    <div class="w-full bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-400 text-black py-1.5 2xl:py-2 px-2 flex items-center justify-center gap-1.5 font-display text-[10px] sm:text-xs 2xl:text-sm tracking-wider uppercase flex-shrink-0">
                        <ArcadeIcon name="crown" className="w-3.5 h-3.5 sm:w-4 sm:h-4 2xl:w-5 2xl:h-5 flex-shrink-0" />
                        <span class="truncate">{$t.firstPlaceChampion || '1ST PLACE · CHAMPION'}</span>
                    </div>

                    <div class="flex flex-col items-center my-auto px-2 2xl:px-4 py-1">
                        <div class="w-16 h-16 sm:w-20 sm:h-20 xl:w-28 xl:h-28 2xl:w-36 2xl:h-36 mb-1.5 2xl:mb-3">
                            <PixelAvatar avatar={firstPlace.avatar} className="w-full h-full" />
                        </div>
                        <span class="font-display text-lg sm:text-2xl xl:text-3xl 2xl:text-4xl text-amber-200 truncate max-w-full block">{firstPlace.name}</span>
                        <span class="font-mono text-xl sm:text-2xl xl:text-3xl 2xl:text-4xl font-extrabold text-amber-300 mt-0.5 2xl:mt-1">
                            {pScore.toLocaleString()} <span class="text-xs sm:text-sm 2xl:text-base text-amber-200 font-display">{$t.pts || 'PTS'}</span>
                        </span>
                    </div>

                    <div class="w-full px-2 2xl:px-4 pb-2 2xl:pb-3 flex-shrink-0">
                        {#if champQuote || firstWins > 0}
                            <div class="cut-sm bg-[#090812] border border-amber-400/60 px-2.5 py-1.5 2xl:px-3.5 2xl:py-2 text-[10px] sm:text-xs 2xl:text-sm font-mono text-amber-200 flex flex-col items-center gap-1">
                                {#if champQuote}
                                    <p class="line-clamp-2 leading-tight m-0 text-amber-100">"{champQuote}"</p>
                                {/if}
                                {#if firstWins > 0}
                                    <span class="text-[10px] sm:text-xs 2xl:text-sm font-display text-amber-300 uppercase tracking-wider leading-none whitespace-nowrap">
                                        {formatWinsLabel(firstWins, $t, $language)}
                                    </span>
                                {/if}
                            </div>
                        {:else}
                            <span class="font-display text-2xl lg:text-4xl 2xl:text-5xl text-amber-300 opacity-25 select-none leading-none block pb-1">#1</span>
                        {/if}
                    </div>
                </div>
            {/if}

            <!-- #3 Podium -->
            {#if thirdPlace}
                {@const pScore = displayedScores[thirdPlace.id] ?? thirdPlace.score ?? 0}
                <div class="flex-1 min-w-0 h-[70%] min-h-[10.3rem] lg:min-h-[11.5rem] cut-md bg-gradient-to-b from-amber-700/45 via-[#1c1218] to-[#0e0b16] border-2 border-amber-500/80 p-2.5 sm:p-3 2xl:p-5 flex flex-col items-center justify-between text-center">
                    <span class="cut-sm px-2.5 py-0.5 2xl:px-3.5 2xl:py-1 bg-amber-600 text-amber-50 font-display text-[10px] sm:text-xs 2xl:text-sm tracking-wider uppercase whitespace-nowrap">
                        {$t.podiumThirdBadge || '#3 · PODIUM'}
                    </span>

                    <div class="flex flex-col items-center my-auto py-1">
                        <div class="w-12 h-12 sm:w-16 sm:h-16 xl:w-[4.5rem] xl:h-[4.5rem] 2xl:w-24 2xl:h-24 mb-1.5 2xl:mb-2.5">
                            <PixelAvatar avatar={thirdPlace.avatar} className="w-full h-full" />
                        </div>
                        <span class="font-display text-base sm:text-lg 2xl:text-2xl text-amber-200 truncate max-w-full block">{thirdPlace.name}</span>
                        <span class="font-mono text-base sm:text-lg xl:text-xl 2xl:text-2xl font-extrabold text-amber-400 mt-0.5">
                            {pScore.toLocaleString()} <span class="text-xs 2xl:text-sm text-slate-400 font-display">{$t.pts || 'PTS'}</span>
                        </span>
                    </div>

                    {#if thirdWins > 0}
                        <div class="text-xs 2xl:text-sm font-mono text-amber-300/85 uppercase tracking-wider border-t border-amber-700/40 pt-1 2xl:pt-1.5 w-full truncate">
                            {formatWinsLabel(thirdWins, $t, $language)}
                        </div>
                    {:else}
                        <span class="font-display text-2xl lg:text-3xl 2xl:text-5xl text-amber-400 opacity-25 select-none leading-none">#3</span>
                    {/if}
                </div>
            {/if}
        </section>

        <!-- Right Panel: Full Standings (#4-#14) -->
        {#if restOfPlayers.length > 0}
            {@const isCompactRoster = restOfPlayers.length > 6}
            {@const isSmallRest = restOfPlayers.length <= 4}
            <section class="lg:col-span-6 min-w-0 host-panel-surface border-2 border-[color:rgba(var(--color-primary-rgb),0.55)] cut-md p-3 sm:p-4 2xl:p-5 flex flex-col lg:min-h-0">
                <div class="flex items-center justify-between border-b border-[#332e59] pb-1.5 mb-2 2xl:pb-2 2xl:mb-3 flex-shrink-0">
                    <span class="text-xs sm:text-sm 2xl:text-base font-display uppercase tracking-widest text-cyan-300">
                        // {$t.fullStandingsPts || 'FULL STANDINGS (PTS)'}
                    </span>
                    <span class="text-xs 2xl:text-sm font-mono text-slate-400 font-bold">
                        {restOfPlayers.length === 1 ? '#4' : `#4 - #${sortedPlayers.length}`}
                    </span>
                </div>

                <div class="lg:flex-1 lg:min-h-0 lg:overflow-y-auto grid {isSmallRest ? 'grid-cols-1 gap-2.5 2xl:gap-4 content-start' : (restOfPlayers.length > 3 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1')} {!isSmallRest ? (isCompactRoster ? 'gap-1.5 2xl:gap-2.5 content-start' : 'gap-2 2xl:gap-3 content-start') : ''}">
                    {#each restOfPlayers as p (p.id)}
                        {@const pScore = displayedScores[p.id] ?? p.score}
                        {@const compRank = getStandingsRank(pScore)}
                        <div class="flex items-center justify-between {isSmallRest ? 'px-4 py-3 lg:py-3.5 2xl:px-6 2xl:py-5' : (isCompactRoster ? 'px-2.5 py-1.5 2xl:px-3.5 2xl:py-2' : 'px-3 py-2 2xl:px-4 2xl:py-2.5')} cut-sm bg-[#0a0914] border border-[#332e59] min-w-0">
                            <div class="flex items-center {isSmallRest ? 'gap-3 2xl:gap-4' : 'gap-2 2xl:gap-3'} min-w-0">
                                <span class="font-mono {isSmallRest ? 'text-sm sm:text-base 2xl:text-2xl' : (isCompactRoster ? 'text-xs 2xl:text-sm' : 'text-xs 2xl:text-base')} font-bold text-slate-400 flex-shrink-0">#{compRank}</span>
                                <div class="{isSmallRest ? 'w-8 h-8 lg:w-10 lg:h-10 2xl:w-14 2xl:h-14' : (isCompactRoster ? 'w-5 h-5 2xl:w-7 2xl:h-7' : 'w-6 h-6 2xl:w-8 2xl:h-8')} flex-shrink-0">
                                    <PixelAvatar avatar={p.avatar} className="w-full h-full" />
                                </div>
                                <span class="font-display {isSmallRest ? 'text-sm sm:text-base 2xl:text-2xl' : (isCompactRoster ? 'text-xs 2xl:text-sm' : 'text-xs sm:text-sm 2xl:text-base')} text-slate-100 truncate block">{p.name}</span>
                            </div>
                            <span class="font-mono {isSmallRest ? 'text-sm sm:text-lg 2xl:text-2xl' : (isCompactRoster ? 'text-xs sm:text-sm 2xl:text-sm' : 'text-xs sm:text-sm 2xl:text-base')} font-bold text-cyan-300 flex-shrink-0 pl-2">
                                {pScore.toLocaleString()}
                            </span>
                        </div>
                    {/each}
                </div>
            </section>
        {/if}
    </div>

    <!-- Bottom Full-Width Accolades Banner -->
    {#if sups && Object.keys(sups).length > 0}
        <section class="w-full host-panel-surface border-2 border-amber-400/75 cut-md px-3 sm:px-4 2xl:px-5 py-2.5 sm:py-3 2xl:py-4 flex-shrink-0">
            <h2 class="text-xs sm:text-sm 2xl:text-base font-display text-amber-300 uppercase tracking-widest text-center mb-1.5 2xl:mb-2.5 inline-flex items-center justify-center gap-2 w-full">
                <ArcadeIcon name="trophy" className="w-3.5 h-3.5 sm:w-4 sm:h-4 2xl:w-5 2xl:h-5" />
                <span>{$t.superlativesTitle || 'POST-GAME ACCOLADES & MATCH AWARDS'}</span>
            </h2>
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-flow-col lg:auto-cols-fr gap-2 sm:gap-2.5 text-center">
                {#each ['ammoFactory', 'rainbowAlchemist', 'cleanSweeper', 'minimalist', 'shakespeare'] as key}
                    {#if sups[key]}
                        {@const winners = getAwardRecipients(sups[key])}
                        {#if winners.length > 0}
                            <div class="px-2.5 py-2 2xl:px-3.5 2xl:py-3 cut-sm bg-[#0a0914] border border-[#332e59] flex flex-col justify-between items-center text-center min-w-0">
                                <div class="flex items-center justify-center gap-1.5 mb-1 flex-wrap max-w-full">
                                    {#each winners as p (p.id)}
                                        <div class="flex items-center gap-1.5 min-w-0">
                                            <div class="w-5 h-5 sm:w-6 sm:h-6 2xl:w-8 2xl:h-8 flex-shrink-0"><PixelAvatar avatar={p.avatar} /></div>
                                            <span class="font-display text-xs sm:text-sm 2xl:text-base text-white truncate max-w-[6rem] 2xl:max-w-[8.25rem]">{p.name}</span>
                                        </div>
                                    {/each}
                                </div>
                                <span class="font-display text-xs sm:text-sm 2xl:text-base text-amber-300 inline-flex items-center justify-center gap-1.5 leading-tight truncate max-w-full">
                                    <ArcadeIcon name={accoladeIcon[key]} className="w-3.5 h-3.5 sm:w-4 sm:h-4 2xl:w-5 2xl:h-5 flex-shrink-0" />
                                    <span class="truncate">{($t[`${key}Title`] || key).replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\s]+/u, '')}</span>
                                </span>
                                <span class="text-xs sm:text-sm 2xl:text-base font-mono font-bold text-slate-300 uppercase tracking-wider leading-tight mt-0.5 2xl:mt-1">
                                    {#if key === 'ammoFactory'}
                                        +{sups[key].value} {$t.royaltiesSummary || 'ROYALTIES'}
                                    {:else if key === 'minimalist' || key === 'shakespeare'}
                                        {sups[key].count}{$t.wordsShortUnit || 'w'}
                                    {:else}
                                        {sups[key].value}x
                                    {/if}
                                </span>
                            </div>
                        {/if}
                    {/if}
                {/each}
            </div>
        </section>
    {/if}
</div>
