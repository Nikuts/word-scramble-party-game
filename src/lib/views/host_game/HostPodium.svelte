<script>
    import { t, gameState, gamePlayers } from '../../../stores.js';
    import PixelAvatar from '../../shared/PixelAvatar.svelte';

    export let displayedScores = {};

    $: sortedPlayers = [...$gamePlayers].sort((a, b) => ((displayedScores[b.id] ?? b.score) || 0) - ((displayedScores[a.id] ?? a.score) || 0));
    $: firstPlace = sortedPlayers[0];
    $: secondPlace = sortedPlayers[1];
    $: thirdPlace = sortedPlayers[2];
    $: restOfPlayers = sortedPlayers.slice(3);
    $: maxScore = Math.max(1, (displayedScores[firstPlace?.id] ?? firstPlace?.score) || 1);
    $: sups = $gameState?.superlatives;

    function getPodiumHeight(place, score) {
        const ratio = Math.max(0, Math.min(1, ((score ?? 0) / maxScore)));
        if (place === 1) {
            return Math.round(75 + (ratio * 45)); // 75px -> 120px
        } else if (place === 2) {
            return Math.round(52 + (ratio * 35));  // 52px -> 87px
        } else {
            return Math.round(38 + (ratio * 25));  // 38px -> 63px
        }
    }

    function getAwardRecipients(award) {
        if (!award) return [];
        const ids = Array.isArray(award.playerIds) && award.playerIds.length > 0
            ? award.playerIds
            : (award.playerId ? [award.playerId] : []);
        return ids.map(id => $gamePlayers.find(pl => pl.id === id)).filter(Boolean);
    }
</script>

<!-- Phase: Final Results Split-Stage Olympic Podium & Adaptive Roster -->
<div class="w-full min-h-0 flex flex-col justify-between p-1.5 sm:p-3 select-none font-sans overflow-y-auto lg:overflow-hidden box-border max-w-6xl mx-auto flex-1">
    
    <!-- 1. Stage Header: Glowing Trophy & Title -->
    <header class="text-center flex-shrink-0 pt-0.5 pb-1">
        <h1 class="text-lg sm:text-xl lg:text-2xl font-display font-black text-amber-300 uppercase tracking-widest drop-shadow-[0_0_15px_rgba(251,191,36,0.8)]">
            🏆 {$t.finalScores || 'FINAL SCORES & CHAMPIONS'}
        </h1>
    </header>

    <!-- 2. Main Stage: Split Screen or Grand Centered Podium -->
    <div class="flex-1 flex {restOfPlayers.length > 0 ? 'flex-col lg:flex-row items-center justify-between' : 'items-center justify-center'} gap-3 sm:gap-4 min-h-0 my-auto w-full px-1">
        
        <!-- Podium Column (Centered when 3P, Left side when 4P+) -->
        <div class="{restOfPlayers.length > 0 ? 'w-full lg:w-1/2' : 'max-w-2xl w-full mx-auto'} flex items-end justify-center gap-2 sm:gap-3 px-1 pb-1">
            
            <!-- 🥈 2nd Place Podium (Left - Dynamic Height) -->
            {#if secondPlace}
                {@const pScore = displayedScores[secondPlace.id] ?? secondPlace.score ?? 0}
                <div class="flex-1 max-w-[130px] sm:max-w-[160px] flex flex-col items-center">
                    <div class="w-11 h-11 sm:w-14 sm:h-14 mb-1 relative">
                        <PixelAvatar avatar={secondPlace.avatar} className="w-full h-full" />
                    </div>
                    <span class="font-display font-black text-xs sm:text-sm text-slate-200 truncate max-w-full text-center block">
                        {secondPlace.name}
                    </span>
                    <span class="font-mono text-xs sm:text-sm font-black text-slate-300 block mb-0.5">
                        {pScore.toLocaleString()} <span class="text-[8px] text-slate-500 font-sans">PTS</span>
                    </span>

                    <!-- Silver Podium Block with Dynamic Score Height -->
                    <div
                        style="height: {getPodiumHeight(2, pScore)}px"
                        class="w-full rounded-t-2xl bg-gradient-to-b from-slate-300 to-slate-600 border-2 border-slate-200 flex flex-col items-center justify-start pt-1.5 pb-1 shadow-[0_0_20px_rgba(203,213,225,0.4)] transition-all duration-700 ease-out"
                    >
                        <span class="font-display font-black text-xl sm:text-2xl text-black drop-shadow-sm leading-none">2</span>
                        <span class="font-sans font-bold text-[8px] sm:text-[9px] text-slate-900 uppercase tracking-wider mt-0.5">{$t.runnerUp || 'RUNNER UP'}</span>
                    </div>
                </div>
            {/if}

            <!-- 🥇 1st Place Champion Podium (Center - Tallest Dynamic Height) -->
            {#if firstPlace}
                {@const pScore = displayedScores[firstPlace.id] ?? firstPlace.score ?? 0}
                <div class="flex-1 max-w-[150px] sm:max-w-[180px] flex flex-col items-center z-10">
                    <div class="w-14 h-14 sm:w-18 sm:h-18 mb-1 relative">
                        <PixelAvatar avatar={firstPlace.avatar} className="w-full h-full" />
                        <div class="absolute -top-3 left-1/2 -translate-x-1/2 text-lg sm:text-xl animate-bounce drop-shadow-[0_0_15px_rgba(251,191,36,0.8)]">
                            👑
                        </div>
                    </div>
                    <span class="font-display font-black text-sm sm:text-base text-amber-300 truncate max-w-full text-center block drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]">
                        {firstPlace.name}
                    </span>
                    <span class="font-mono text-sm sm:text-base font-black text-amber-400 block mb-0.5 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]">
                        {pScore.toLocaleString()} <span class="text-[9px] text-amber-200 font-sans">PTS</span>
                    </span>

                    <!-- Gold Champion Podium Block with Dynamic Max Score Height -->
                    <div
                        style="height: {getPodiumHeight(1, pScore)}px"
                        class="w-full rounded-t-2xl bg-gradient-to-b from-amber-300 via-amber-400 to-yellow-600 border-2 border-amber-200 flex flex-col items-center justify-start pt-2 pb-1.5 shadow-[0_0_30px_rgba(251,191,36,0.7)] transition-all duration-700 ease-out"
                    >
                        <span class="font-display font-black text-2xl sm:text-3xl text-black drop-shadow-sm leading-none">1</span>
                        <span class="font-sans font-black text-[9px] sm:text-[10px] text-amber-950 uppercase tracking-widest mt-0.5">{$t.champion || 'CHAMPION'}</span>
                    </div>
                </div>
            {/if}

            <!-- 🥉 3rd Place Podium (Right - Dynamic Height) -->
            {#if thirdPlace}
                {@const pScore = displayedScores[thirdPlace.id] ?? thirdPlace.score ?? 0}
                <div class="flex-1 max-w-[130px] sm:max-w-[160px] flex flex-col items-center">
                    <div class="w-11 h-11 sm:w-14 sm:h-14 mb-1 relative">
                        <PixelAvatar avatar={thirdPlace.avatar} className="w-full h-full" />
                    </div>
                    <span class="font-display font-black text-xs sm:text-sm text-amber-500 truncate max-w-full text-center block">
                        {thirdPlace.name}
                    </span>
                    <span class="font-mono text-xs sm:text-sm font-black text-amber-600 block mb-0.5">
                        {pScore.toLocaleString()} <span class="text-[8px] text-slate-500 font-sans">PTS</span>
                    </span>

                    <!-- Bronze Podium Block with Dynamic Score Height -->
                    <div
                        style="height: {getPodiumHeight(3, pScore)}px"
                        class="w-full rounded-t-2xl bg-gradient-to-b from-amber-600 to-amber-900 border-2 border-amber-500 flex flex-col items-center justify-start pt-1.5 pb-1 shadow-[0_0_20px_rgba(180,83,9,0.4)] transition-all duration-700 ease-out"
                    >
                        <span class="font-display font-black text-xl sm:text-2xl text-amber-100 drop-shadow-sm leading-none">3</span>
                        <span class="font-sans font-bold text-[8px] sm:text-[9px] text-amber-200 uppercase tracking-wider mt-0.5">{$t.podium || 'PODIUM'}</span>
                    </div>
                </div>
            {/if}
        </div>

        <!-- Right Side: Clean Proportional Leaderboard (Compact Pills for 4-6P, 2-Col for 7-14P) -->
        {#if restOfPlayers.length > 0}
            {@const isCompactRoster = restOfPlayers.length > 6}
            <div class="w-full lg:w-1/2 bg-neutral-950/85 border border-neutral-800 rounded-2xl p-2 sm:p-2.5 shadow-xl flex flex-col justify-start min-h-0 max-h-60 lg:max-h-64 overflow-y-auto">
                <div class="flex items-center justify-between border-b border-neutral-800 pb-1 mb-1 flex-shrink-0">
                    <span class="text-xs sm:text-sm font-display font-bold uppercase tracking-wider text-slate-300">
                        🎮 {$t.leaderboardRoster || 'LEADERBOARD ROSTER'}
                    </span>
                    <span class="text-[9px] font-mono text-cyan-400 font-bold px-1.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40">
                        {restOfPlayers.length} {$t.players || 'PLAYERS'}
                    </span>
                </div>

                <!-- Clean Adaptive Grid -->
                <div class="grid {restOfPlayers.length > 3 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'} {isCompactRoster ? 'gap-1' : 'gap-1.5'} w-full">
                    {#each restOfPlayers as p, idx (p.id)}
                        {@const pScore = displayedScores[p.id] ?? p.score}
                        <div class="flex items-center justify-between {isCompactRoster ? 'px-2 py-1 rounded-lg' : 'px-2.5 py-1.5 rounded-xl'} bg-neutral-900/90 border border-neutral-800 hover:border-cyan-500/50 transition-colors shadow-sm min-w-0">
                            <div class="flex items-center gap-1.5 sm:gap-2 min-w-0">
                                <span class="font-mono text-[10px] sm:text-[11px] font-bold text-slate-400 flex-shrink-0">
                                    #{idx + 4}
                                </span>
                                <div class="{isCompactRoster ? 'w-5 h-5' : 'w-6 h-6'} flex-shrink-0">
                                    <PixelAvatar avatar={p.avatar} className="w-full h-full" />
                                </div>
                                <div class="min-w-0 text-left">
                                    <span class="font-display font-bold {isCompactRoster ? 'text-[11px] sm:text-xs' : 'text-xs sm:text-sm'} text-slate-100 truncate block">
                                        {p.name}
                                    </span>
                                </div>
                            </div>
                            <span class="font-mono {isCompactRoster ? 'text-[11px]' : 'text-xs'} font-bold text-cyan-400 flex-shrink-0 pl-1">
                                {pScore.toLocaleString()} <span class="text-[8px] text-slate-500 font-sans">PTS</span>
                            </span>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}
    </div>

    <!-- 3. Special Accolades Showcase (5 Superlative Cards) -->
    {#if sups && Object.keys(sups).length > 0}
        <div class="w-full bg-neutral-950/90 border border-neutral-800 rounded-2xl p-1.5 sm:p-2 flex-shrink-0 shadow-lg mt-1">
            <h2 class="text-[10px] sm:text-xs font-display font-black text-amber-400 uppercase tracking-widest text-center mb-1">
                🎖️ {$t.superlativesTitle || 'ACCOLADES & AWARDS'}
            </h2>
            <div class="flex flex-wrap items-stretch justify-center gap-1.5 text-center">
                {#if sups.ammoFactory}
                    {@const winners = getAwardRecipients(sups.ammoFactory)}
                    {#if winners.length > 0}
                        <div class="flex-1 min-w-[140px] max-w-[190px] p-1.5 rounded-xl bg-neutral-900/90 border border-neutral-800 hover:border-amber-500/50 transition-colors flex flex-col justify-between items-center text-center">
                            <div class="w-full flex flex-col items-center">
                                <div class="flex items-center justify-center gap-1 mb-0.5 flex-wrap">
                                    {#each winners as p (p.id)}
                                        <div class="flex items-center gap-1">
                                            <div class="w-4 h-4 flex-shrink-0"><PixelAvatar avatar={p.avatar} /></div>
                                            <span class="font-display font-bold text-[10px] text-slate-200 truncate max-w-[90px]">{p.name}</span>
                                        </div>
                                    {/each}
                                </div>
                                <span class="font-display font-black text-[10px] text-amber-300 block leading-tight">{$t.ammoFactoryTitle || '🎯 The Ammo Factory'}</span>
                                <span class="text-[8px] text-slate-400 font-sans leading-tight block mt-0.5">{$t.ammoFactoryDesc || 'Words in winning battles'} (+{sups.ammoFactory.value})</span>
                            </div>
                        </div>
                    {/if}
                {/if}
                {#if sups.rainbowAlchemist}
                    {@const winners = getAwardRecipients(sups.rainbowAlchemist)}
                    {#if winners.length > 0}
                        <div class="flex-1 min-w-[140px] max-w-[190px] p-1.5 rounded-xl bg-neutral-900/90 border border-neutral-800 hover:border-amber-500/50 transition-colors flex flex-col justify-between items-center text-center">
                            <div class="w-full flex flex-col items-center">
                                <div class="flex items-center justify-center gap-1 mb-0.5 flex-wrap">
                                    {#each winners as p (p.id)}
                                        <div class="flex items-center gap-1">
                                            <div class="w-4 h-4 flex-shrink-0"><PixelAvatar avatar={p.avatar} /></div>
                                            <span class="font-display font-bold text-[10px] text-slate-200 truncate max-w-[90px]">{p.name}</span>
                                        </div>
                                    {/each}
                                </div>
                                <span class="font-display font-black text-[10px] text-amber-300 block leading-tight">{$t.rainbowAlchemistTitle || '🌈 The Rainbow Alchemist'}</span>
                                <span class="text-[8px] text-slate-400 font-sans leading-tight block mt-0.5">{$t.rainbowAlchemistDesc || 'Combined words 3+ players'} ({sups.rainbowAlchemist.value}x)</span>
                            </div>
                        </div>
                    {/if}
                {/if}
                {#if sups.cleanSweeper}
                    {@const winners = getAwardRecipients(sups.cleanSweeper)}
                    {#if winners.length > 0}
                        <div class="flex-1 min-w-[140px] max-w-[190px] p-1.5 rounded-xl bg-neutral-900/90 border border-neutral-800 hover:border-amber-500/50 transition-colors flex flex-col justify-between items-center text-center">
                            <div class="w-full flex flex-col items-center">
                                <div class="flex items-center justify-center gap-1 mb-0.5 flex-wrap">
                                    {#each winners as p (p.id)}
                                        <div class="flex items-center gap-1">
                                            <div class="w-4 h-4 flex-shrink-0"><PixelAvatar avatar={p.avatar} /></div>
                                            <span class="font-display font-bold text-[10px] text-slate-200 truncate max-w-[90px]">{p.name}</span>
                                        </div>
                                    {/each}
                                </div>
                                <span class="font-display font-black text-[10px] text-amber-300 block leading-tight">{$t.cleanSweeperTitle || '🧹 The Clean Sweeper'}</span>
                                <span class="text-[8px] text-slate-400 font-sans leading-tight block mt-0.5">{$t.cleanSweeperDesc || '100% battle wins'} ({sups.cleanSweeper.value}x)</span>
                            </div>
                        </div>
                    {/if}
                {/if}
                {#if sups.minimalist}
                    {@const winners = getAwardRecipients(sups.minimalist)}
                    {#if winners.length > 0}
                        <div class="flex-1 min-w-[140px] max-w-[190px] p-1.5 rounded-xl bg-neutral-900/90 border border-neutral-800 hover:border-amber-500/50 transition-colors flex flex-col justify-between items-center text-center">
                            <div class="w-full flex flex-col items-center">
                                <div class="flex items-center justify-center gap-1 mb-0.5 flex-wrap">
                                    {#each winners as p (p.id)}
                                        <div class="flex items-center gap-1">
                                            <div class="w-4 h-4 flex-shrink-0"><PixelAvatar avatar={p.avatar} /></div>
                                            <span class="font-display font-bold text-[10px] text-slate-200 truncate max-w-[90px]">{p.name}</span>
                                        </div>
                                    {/each}
                                </div>
                                <span class="font-display font-black text-[10px] text-amber-300 block leading-tight">{$t.minimalistTitle || '🪶 The Minimalist'}</span>
                                <span class="text-[8px] text-slate-400 font-sans leading-tight block mt-0.5">{$t.minimalistDesc || 'Shortest winning punchline'} ({sups.minimalist.count}w)</span>
                            </div>
                        </div>
                    {/if}
                {/if}
                {#if sups.shakespeare}
                    {@const winners = getAwardRecipients(sups.shakespeare)}
                    {#if winners.length > 0}
                        <div class="flex-1 min-w-[140px] max-w-[190px] p-1.5 rounded-xl bg-neutral-900/90 border border-neutral-800 hover:border-amber-500/50 transition-colors flex flex-col justify-between items-center text-center">
                            <div class="w-full flex flex-col items-center">
                                <div class="flex items-center justify-center gap-1 mb-0.5 flex-wrap">
                                    {#each winners as p (p.id)}
                                        <div class="flex items-center gap-1">
                                            <div class="w-4 h-4 flex-shrink-0"><PixelAvatar avatar={p.avatar} /></div>
                                            <span class="font-display font-bold text-[10px] text-slate-200 truncate max-w-[90px]">{p.name}</span>
                                        </div>
                                    {/each}
                                </div>
                                <span class="font-display font-black text-[10px] text-amber-300 block leading-tight">{$t.shakespeareTitle || '💬 The Shakespeare'}</span>
                                <span class="text-[8px] text-slate-400 font-sans leading-tight block mt-0.5">{$t.shakespeareDesc || 'Epic long masterpiece'} ({sups.shakespeare.count}w)</span>
                            </div>
                        </div>
                    {/if}
                {/if}
            </div>
        </div>
    {/if}
</div>
