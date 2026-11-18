<!-- src/lib/views/player_game/PlayerBattleRevealView.svelte -->
<script>
    import { t, language } from '../../../stores.js';
    import { formatVotesLabel } from '../../../ui_text.js';
    import SevenSegmentDisplay from '../../shared/SevenSegmentDisplay.svelte';
    import PixelAvatar from '../../shared/PixelAvatar.svelte';
    import ArcadeIcon from '../../shared/ArcadeIcon.svelte';
    import SvgReactionButtons from '../../shared/SvgReactionButtons.svelte';
    import { TIMEOUT_ANSWER_PLACEHOLDER } from '../../../../shared/config.js';

    export let timer;
    export let battle = null;
    export let player = null;
    export let players = [];
    export let gameId = null;

    $: isCompetitor = battle && player && battle.competitors?.includes(player.id);
    $: isWinner = isCompetitor && (battle.winnerId === player.id || (Array.isArray(battle.winnerId) && battle.winnerId.includes(player.id)));
    $: isTieWinner = Boolean(isCompetitor && !isWinner && !battle?.winnerId && (myScoreBreakdown.winBonus || 0) > 0);

    $: myScoreBreakdown = (isCompetitor && battle?.scoreBreakdown?.[player.id]) || {
        votes: 0,
        votePoints: 0,
        winBonus: 0,
        sweepBonus: 0,
        rainbowBonus: 0,
        total: 0
    };

    $: myRoyaltyPts = (battle?.royalties || []).reduce(
        (s, r) => (r.authorId === player?.id || (player?.name && r.authorName === player.name)) ? s + (r.points || 0) : s,
        0
    );
    $: pointsAwarded = (isCompetitor && battle?.pointsAwarded?.[player.id]) || 0;

    $: votersForMe = Object.entries(battle?.votes || {})
        .filter(([, votedForId]) => votedForId === player?.id)
        .map(([voterId]) => players.find(p => p.id === voterId))
        .filter(Boolean);

    function renderAnswer(answer) {
        if (typeof answer === 'string') {
            if (answer === TIMEOUT_ANSWER_PLACEHOLDER) return `(${$t.noAnswerSubmitted || 'No answer'})`;
            return answer;
        }
        if (typeof answer === 'object' && answer !== null && (answer.title || answer.tagline)) {
            let title = (answer.title || '').trim();
            let tagline = (answer.tagline || '').trim();
            if (title === TIMEOUT_ANSWER_PLACEHOLDER) title = `(${$t.noAnswerSubmitted || 'No answer'})`;
            return `"${title}"\n${tagline}`;
        }
        return `(${$t.noAnswerSubmitted || 'No answer'})`;
    }
</script>

<div class="w-full h-full max-h-full min-h-0 flex flex-col justify-between p-3 pb-[max(8px,env(safe-area-inset-bottom))] max-w-md md:max-w-3xl mx-auto select-none font-sans overflow-hidden box-border" data-game-id={gameId}>
    
    <!-- Top Header -->
    <header class="flex items-center justify-between gap-2 mb-2 flex-shrink-0 bg-[#131126] border border-[#332e59] cut-sm px-3 py-1.5">
        <span class="fighter-crest text-[11px] font-display bg-purple-950 text-purple-300 border border-purple-400/60">
            {#if battle?.competitors?.length === 4}
                {$t.quadLabel || '4-WAY BRAWL'}
            {:else if battle?.competitors?.length === 3}
                {$t.brawlLabel || '3-WAY BRAWL'}
            {:else}
                {$t.duoLabel || '1-ON-1 SHOWDOWN'}
            {/if}
        </span>
        <SevenSegmentDisplay time={timer} showLabel={false} size="sm" disableLowWarning={true} />
    </header>

    <!-- Battle Prompt -->
    {#if battle?.prompt || battle?.premise || battle?.genre}
        <div class="bg-[#131126] border border-[#332e59] cut-md p-2.5 sm:p-3 mb-2 text-center flex-shrink-0">
            <span class="text-[11px] font-display text-cyan-300 uppercase tracking-widest block mb-0.5">
                {battle?.genre ? ($t.moviePitch || 'MOVIE PREMISE') : ($t.battlePrompt || 'BATTLE PROMPT')}
            </span>
            {#if battle?.genre}
                <span class="fighter-crest bg-amber-950/90 border border-amber-400/60 text-amber-300 text-[10px] mb-1">
                    {battle.genre}
                </span>
            {/if}
            <p class="text-sm sm:text-base font-bold text-slate-100 leading-snug">
                {battle.premise || battle.prompt}
            </p>
        </div>
    {/if}

    {#if isCompetitor}
        <main class="my-auto w-full flex flex-col justify-start p-3 sm:p-4 bg-[#131126] border-2 {isWinner || isTieWinner ? 'border-amber-400' : 'border-[#332e59]'} cut-md overflow-y-auto min-h-0">
            <div class="w-full flex flex-col gap-2.5">
                <div class="w-full py-1.5 px-3 cut-sm text-center font-display text-xs sm:text-base uppercase tracking-wider inline-flex items-center justify-center gap-1.5 {
                    isWinner || isTieWinner ? 'bg-amber-400 text-black' : 'bg-[#1c1936] text-slate-300 border border-[#332e59]'
                }">
                    {#if isWinner}
                        <ArcadeIcon name="crown" className="w-4 h-4" />
                    {/if}
                    <span>{isWinner ? ($t.youWonTheBattle || 'YOU WON THE BATTLE!').replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\s]+/u, '') : (isTieWinner ? ($t.tie || 'TIE!') : ($t.runnerUp || 'RUNNER-UP'))}</span>
                </div>

                <div class="text-center my-1">
                    <span class="text-[10px] font-display text-slate-400 uppercase tracking-widest block mb-1">
                        {$t.yourAnswer || 'Your Punchline'}
                    </span>
                    <div class="bg-[#070610] border border-[#332e59] cut-sm p-2.5 sm:p-3 text-sm sm:text-base font-bold text-white leading-relaxed whitespace-pre-wrap break-words">
                        {renderAnswer(battle?.answers?.[player?.id])}
                    </div>
                </div>

                <div class="flex flex-col items-center justify-center my-1 text-center">
                    <span class="font-display text-2xl sm:text-4xl text-amber-300">
                        +{pointsAwarded.toLocaleString()} {$t.pts || 'PTS'}
                    </span>

                    <div class="flex flex-wrap items-center justify-center gap-1.5 mt-1.5 text-[11px] sm:text-xs font-mono">
                        {#if myScoreBreakdown.votePoints > 0}
                            <span class="cut-sm px-2 py-0.5 bg-[#1c1936] border border-[#332e59] text-slate-200 font-bold">
                                {myScoreBreakdown.votes} {formatVotesLabel(myScoreBreakdown.votes, $t, $language)} (+{myScoreBreakdown.votePoints})
                            </span>
                        {/if}
                        {#if myScoreBreakdown.winBonus > 0}
                            <span class="cut-sm px-2 py-0.5 bg-amber-950 border border-amber-500 text-amber-200 font-bold">
                                {$t.winBonusBreakdown || $t.winBonus || 'Win Bonus'} (+{myScoreBreakdown.winBonus})
                            </span>
                        {/if}
                        {#if myScoreBreakdown.sweepBonus > 0}
                            <span class="cut-sm px-2 py-0.5 bg-purple-950 border border-purple-400 text-purple-200 font-bold">
                                {$t.sweepBonusBreakdown || $t.sweepBonus || 'Clean Sweep'} (+{myScoreBreakdown.sweepBonus})
                            </span>
                        {/if}
                        {#if myScoreBreakdown.rainbowBonus > 0}
                            <span class="cut-sm px-2 py-0.5 bg-pink-950 border border-pink-400 text-pink-200 font-bold">
                                {$t.rainbowBonusBreakdown || 'Rainbow'} (+{myScoreBreakdown.rainbowBonus})
                            </span>
                        {/if}
                        {#if myRoyaltyPts > 0}
                            <span class="cut-sm px-2 py-0.5 bg-cyan-950 border border-cyan-400 text-cyan-200 font-bold">
                                {$t.royaltyBreakdown || 'Royalties'} (+{myRoyaltyPts})
                            </span>
                        {/if}
                    </div>
                </div>
            </div>

            {#if votersForMe.length > 0}
                <div class="border-t border-[#332e59] pt-2 mt-2">
                    <span class="text-[10px] font-display text-slate-400 uppercase tracking-wider block mb-1">
                        {($t.votedForYou || 'VOTED FOR YOU').replace(/!+$/, '')}:
                    </span>
                    <div class="flex flex-wrap gap-1.5">
                        {#each votersForMe as voter}
                            <div class="cut-sm flex items-center gap-1 bg-[#0a0914] border border-[#332e59] px-2 py-0.5 text-xs font-display text-slate-200">
                                <div class="w-4 h-4 flex-shrink-0">
                                    <PixelAvatar avatar={voter.avatar} className="w-full h-full" />
                                </div>
                                <span>{voter.name}</span>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}
        </main>
    {:else}
        <main class="flex-1 min-h-0 flex flex-col justify-center items-center text-center p-4 bg-[#131126] border-2 border-[#332e59] cut-md my-auto">
            <h2 class="text-xl sm:text-2xl font-display text-amber-300 uppercase tracking-wider mb-2">
                {$t.battleReveal || 'BATTLE RESULTS'}
            </h2>
            <p class="text-xs sm:text-sm text-slate-300 font-sans max-w-xs">
                {$t.lookAtHostScreen || 'Watch the host screen to see the winning punchline and points breakdown!'}
            </p>
            {#if myRoyaltyPts > 0}
                <div class="mt-3 cut-sm px-3.5 py-1.5 bg-cyan-950/90 border border-cyan-400 text-cyan-200 font-mono text-xs sm:text-sm font-bold">
                    +{myRoyaltyPts} {$t.pts || 'PTS'} — {$t.royaltyBreakdown || 'Royalties'}
                </div>
            {/if}
        </main>
    {/if}

    <!-- 4 SVG Arcade Reactions Footer (NO Avatars) -->
    <footer class="mt-2 pt-2 border-t border-[#332e59] flex-shrink-0">
        <SvgReactionButtons compact={true} />
    </footer>
</div>
