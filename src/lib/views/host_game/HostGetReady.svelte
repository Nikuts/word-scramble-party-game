<!-- src/lib/views/host_game/HostGetReady.svelte -->
<script>
    import { t, tvMode, gamePhase, currentRound, gamePlayers } from '../../../stores.js';
    import ArcadeIcon from '../../shared/ArcadeIcon.svelte';
    import PixelAvatar from '../../shared/PixelAvatar.svelte';

    export let animatedScores = {};

    $: isBattleGetReady = $gamePhase === 'battle_get_ready';
    $: isVotingGetReady = $gamePhase === 'voting_get_ready';
    $: titleText = isBattleGetReady
        ? ($t.battleGetReadyTitle || 'BATTLE INCOMING!')
        : (isVotingGetReady ? ($t.votingGetReadyTitle || 'GET READY TO VOTE!') : ($t.getReadyTitle || 'GET READY!'));
    $: phasePillText = isBattleGetReady
        ? `${($t.round || 'ROUND').toUpperCase()} ${$currentRound || 1} // ${($t.battlePhase || 'BATTLE PHASE').toUpperCase()}`
        : (isVotingGetReady
            ? `${($t.round || 'ROUND').toUpperCase()} ${$currentRound || 1} // ${($t.votingPhase || 'VOTING PHASE').toUpperCase()}`
            : `${($t.round || 'ROUND').toUpperCase()} ${$currentRound || 1} // ${($t.questionPhase || 'QUESTION PHASE').toUpperCase()}`);
    $: descText = isBattleGetReady
        ? ($t.battleGetReadySubtitle || "Combine opponents' words to craft the funniest winning punchlines!")
        : (isVotingGetReady
            ? ($t.votingGetReadySubtitle || 'Pick the funniest answer on your screen!')
            : ($t.getReadyDesc || 'Answer funny questions with at least 5 words to build the room word bank!'));
    $: footerBadge = isBattleGetReady
        ? ($t.mixingRoomWords || 'MIXING ROOM WORDS...')
        : (isVotingGetReady ? ($t.voteForBestAnswer || 'VOTE FOR THE BEST ANSWER') : ($t.answerTheQuestions || 'PREPARE TO ANSWER'));
    $: iconName = isBattleGetReady ? 'sword' : (isVotingGetReady ? 'vote' : 'bolt');
    $: accentBorder = isBattleGetReady ? 'border-fuchsia-500/80' : (isVotingGetReady ? 'border-emerald-400/80' : 'border-cyan-400/80');
    $: pillColor = isBattleGetReady ? 'bg-fuchsia-950/90 border-fuchsia-400 text-fuchsia-300' : (isVotingGetReady ? 'bg-emerald-950/90 border-emerald-400 text-emerald-300' : 'bg-cyan-950/90 border-cyan-400 text-cyan-300');

    $: sortedPlayers = [...$gamePlayers].sort((a, b) => ((b.score || 0) - (a.score || 0)));
    $: maxPlayerScore = Math.max(1, ...sortedPlayers.map(p => Math.round(animatedScores[p.id] ?? p.score ?? 0)));
    $: isTwoColumnStandings = sortedPlayers.length > 7;
    $: halfIndex = Math.ceil(sortedPlayers.length / 2);
</script>

<!-- Prototype v5 Split-Stage Get Ready + Live Standings -->
<main class="relative z-10 flex-1 min-h-0 w-full grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3 items-stretch">
    <!-- Left Hero Card (5 cols) -->
    <section class="lg:col-span-5 min-w-0 cut-md bg-gradient-to-br from-[#140b2d] via-[#121024] to-[#0d192c] border-2 {accentBorder} p-5 sm:p-8 2xl:p-10 flex flex-col items-center justify-center text-center {!$tvMode ? 'shadow-[inset_0_0_52px_rgba(217,70,239,0.14)]' : ''}">
        <div class="fighter-crest text-xs sm:text-sm 2xl:text-base border {pillColor} mb-4 2xl:mb-5">
            <span>{phasePillText}</span>
        </div>

        <h1 class="text-3xl sm:text-4xl xl:text-5xl 2xl:text-6xl font-display tracking-wider uppercase text-white leading-tight mb-3 2xl:mb-4">
            {titleText}
        </h1>

        <div class="inline-flex items-center gap-2 font-display text-sm sm:text-base 2xl:text-lg text-cyan-300 tracking-widest uppercase mb-4 2xl:mb-5">
            <ArcadeIcon name={iconName} className="w-4 h-4 sm:w-5 sm:h-5 2xl:w-6 2xl:h-6" />
            <span>{$t.lookAtYourPhones || 'LOOK AT YOUR PHONES'}</span>
        </div>

        <p class="text-sm sm:text-base 2xl:text-xl font-sans text-slate-300 max-w-md 2xl:max-w-xl leading-relaxed mb-5 2xl:mb-7">
            {descText}
        </p>

        <div class="cut-sm px-4 py-1.5 2xl:px-6 2xl:py-2.5 bg-[#0a0914] border border-cyan-400/60 font-display text-xs sm:text-sm 2xl:text-base text-cyan-300 tracking-widest uppercase">
            {footerBadge}
        </div>
    </section>

    <!-- Right Live Standings Leaderboard (7 cols) -->
    <section class="lg:col-span-7 min-w-0 cut-md host-panel-surface border-2 border-[color:rgba(var(--color-primary-rgb),0.65)] p-3 sm:p-5 flex flex-col min-h-0">
        <div class="flex items-center justify-between gap-2 pb-2 mb-2.5 border-b border-[#332e59] flex-shrink-0">
            <div class="inline-flex items-center gap-2 text-cyan-300 font-display text-xs sm:text-sm 2xl:text-base tracking-widest uppercase">
                <ArcadeIcon name="trophy" className="w-4 h-4 2xl:w-5 2xl:h-5" />
                <span>// {$t.liveStandings || 'LIVE STANDINGS'}</span>
            </div>
            <span class="font-mono text-xs sm:text-sm 2xl:text-base text-slate-400 font-bold uppercase">
                {sortedPlayers.length} {$t.fighters || 'FIGHTERS'}
            </span>
        </div>

        <div class="flex-1 min-h-0 overflow-y-auto flex items-center">
            {#if isTwoColumnStandings}
                <div class="w-full grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div class="flex flex-col gap-1.5 2xl:gap-2">
                        {#each sortedPlayers.slice(0, halfIndex) as p, idx (p.id)}
                            {@const pScore = Math.round(animatedScores[p.id] ?? p.score ?? 0)}
                            {@const fillPct = pScore > 0 ? Math.max(6, Math.round((pScore / maxPlayerScore) * 100)) : 4}
                            <div class="relative overflow-hidden cut-sm flex items-center justify-between px-3 py-1.5 2xl:px-4 2xl:py-2.5 bg-[#0a0914] border {idx === 0 ? 'border-amber-400 bg-amber-950/20' : (idx < 3 ? 'border-cyan-400/70' : 'border-[#332e59]')}">
                                <div class="absolute inset-y-0 left-0 pointer-events-none {idx === 0 ? 'bg-amber-400/10' : (idx < 3 ? 'bg-cyan-400/10' : 'bg-white/5')}" style="width: {fillPct}%;"></div>
                                <div class="relative z-10 flex items-center gap-2 2xl:gap-3 min-w-0">
                                    <span class="font-mono text-xs 2xl:text-sm font-bold w-6 {idx === 0 ? 'text-amber-300' : (idx < 3 ? 'text-cyan-300' : 'text-slate-400')}">#{idx + 1}</span>
                                    <div class="w-6 h-6 2xl:w-8 2xl:h-8 flex-shrink-0"><PixelAvatar avatar={p.avatar} /></div>
                                    <span class="font-display text-xs sm:text-sm 2xl:text-base text-white truncate">{p.name}</span>
                                </div>
                                <span class="relative z-10 font-mono text-xs sm:text-sm 2xl:text-base font-bold {idx === 0 ? 'text-amber-300' : (idx < 3 ? 'text-cyan-300' : 'text-slate-300')} flex-shrink-0 pl-2">
                                    {pScore}
                                </span>
                            </div>
                        {/each}
                    </div>
                    <div class="flex flex-col gap-1.5 2xl:gap-2">
                        {#each sortedPlayers.slice(halfIndex) as p, idx (p.id)}
                            {@const rank = halfIndex + idx + 1}
                            {@const pScore = Math.round(animatedScores[p.id] ?? p.score ?? 0)}
                            {@const fillPct = pScore > 0 ? Math.max(6, Math.round((pScore / maxPlayerScore) * 100)) : 4}
                            <div class="relative overflow-hidden cut-sm flex items-center justify-between px-3 py-1.5 2xl:px-4 2xl:py-2.5 bg-[#0a0914] border border-[#332e59]">
                                <div class="absolute inset-y-0 left-0 pointer-events-none bg-white/5" style="width: {fillPct}%;"></div>
                                <div class="relative z-10 flex items-center gap-2 2xl:gap-3 min-w-0">
                                    <span class="font-mono text-xs 2xl:text-sm font-bold w-6 text-slate-400">#{rank}</span>
                                    <div class="w-6 h-6 2xl:w-8 2xl:h-8 flex-shrink-0"><PixelAvatar avatar={p.avatar} /></div>
                                    <span class="font-display text-xs sm:text-sm 2xl:text-base text-white truncate">{p.name}</span>
                                </div>
                                <span class="relative z-10 font-mono text-xs sm:text-sm 2xl:text-base font-bold text-slate-300 flex-shrink-0 pl-2">
                                    {pScore}
                                </span>
                            </div>
                        {/each}
                    </div>
                </div>
            {:else}
                <div class="w-full flex flex-col gap-2 2xl:gap-3">
                    {#each sortedPlayers as p, idx (p.id)}
                        {@const pScore = Math.round(animatedScores[p.id] ?? p.score ?? 0)}
                        {@const fillPct = pScore > 0 ? Math.max(6, Math.round((pScore / maxPlayerScore) * 100)) : 4}
                        <div class="relative overflow-hidden cut-sm flex items-center justify-between px-3.5 py-2 2xl:px-5 2xl:py-3 bg-[#0a0914] border {idx === 0 ? 'border-amber-400 bg-amber-950/20' : (idx < 3 ? 'border-cyan-400/70' : 'border-[#332e59]')}">
                            <div class="absolute inset-y-0 left-0 pointer-events-none {idx === 0 ? 'bg-amber-400/12' : (idx < 3 ? 'bg-cyan-400/10' : 'bg-white/5')}" style="width: {fillPct}%;"></div>
                            <div class="relative z-10 flex items-center gap-2.5 2xl:gap-3.5 min-w-0">
                                <span class="font-mono text-sm 2xl:text-base font-bold w-7 {idx === 0 ? 'text-amber-300' : (idx < 3 ? 'text-cyan-300' : 'text-slate-400')}">#{idx + 1}</span>
                                <div class="w-8 h-8 2xl:w-10 2xl:h-10 flex-shrink-0"><PixelAvatar avatar={p.avatar} /></div>
                                <span class="font-display text-sm sm:text-base 2xl:text-xl text-white truncate">{p.name}</span>
                            </div>
                            <span class="relative z-10 font-mono text-sm sm:text-base 2xl:text-xl font-bold {idx === 0 ? 'text-amber-300' : (idx < 3 ? 'text-cyan-300' : 'text-slate-300')} flex-shrink-0 pl-2">
                                {pScore}
                            </span>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
    </section>
</main>
