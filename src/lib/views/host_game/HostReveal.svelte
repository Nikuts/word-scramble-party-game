<!-- src/lib/views/host_game/HostReveal.svelte -->
<script>
    import { onDestroy } from 'svelte';
    import { t, tvMode, language, gameState, gamePlayers } from '../../../stores.js';
    import { formatVotesLabel } from '../../../ui_text.js';
    import PixelAvatar from '../../shared/PixelAvatar.svelte';
    import ArcadeIcon from '../../shared/ArcadeIcon.svelte';
    import HexBadge from '../../shared/HexBadge.svelte';
    import { TIMEOUT_ANSWER_PLACEHOLDER } from '../../../../shared/config.js';

    export let animatedScores = {};

    let beat2Ready = false;
    let revealedBattleKey = null;
    let beatTimer = null;

    onDestroy(() => {
        if (beatTimer) clearTimeout(beatTimer);
    });

    function renderAnswer(answer) {
        if (typeof answer === 'string') {
            if (answer === TIMEOUT_ANSWER_PLACEHOLDER) return `(${$t.noAnswerSubmitted || 'No answer submitted'})`;
            return answer;
        }
        if (typeof answer === 'object' && answer !== null && (answer.title || answer.tagline)) {
            let title = (answer.title || '...').trim();
            let tagline = (answer.tagline || '...').trim();
            if (title === TIMEOUT_ANSWER_PLACEHOLDER) title = `(${$t.noAnswerSubmitted || 'No answer submitted'})`;
            if (tagline === TIMEOUT_ANSWER_PLACEHOLDER || tagline === '') tagline = '...';
            return `${$t.title || 'Title'}: ${title}\n${$t.tagline || 'Tagline'}: ${tagline}`;
        }
        return `(${$t.noAnswerSubmitted || 'No answer submitted'})`;
    }

    function getWordColorClass(authorIndex) {
        if (authorIndex === 0) return 'text-cyan-300 font-bold';
        if (authorIndex === 1) return 'text-pink-300 font-bold';
        if (authorIndex === 2) return 'text-emerald-300 font-bold';
        if (authorIndex === 3) return 'text-amber-300 font-bold';
        if (authorIndex === 4) return 'text-purple-300 font-bold';
        return 'text-neutral-300';
    }

    function getRevealPunchlineSizeClass(answer, isQuad, isTrio, isFinal) {
        const rendered = renderAnswer(answer);
        const len = String(rendered || '').length;
        if (isQuad) {
            if (len > 75 || (isFinal && len > 65)) return 'text-fluid-punchline-xs';
            return 'text-fluid-punchline-sm';
        }
        if (isTrio) {
            if (len > 95 || (isFinal && len > 80)) return 'text-fluid-punchline-xs';
            if (len > 48) return 'text-fluid-punchline-sm';
            return 'text-fluid-punchline-md';
        }
        if (len > 115 || (isFinal && len > 95)) return 'text-fluid-punchline-xs';
        if (len > 55) return 'text-fluid-punchline-sm';
        return 'text-fluid-punchline-md';
    }

    function getAggregatedRoyalties(royalties) {
        if (!Array.isArray(royalties) || royalties.length === 0) return [];
        const byAuthor = new Map();
        for (const roy of royalties) {
            if (!roy) continue;
            const key = roy.authorId || roy.authorName || '';
            const existing = byAuthor.get(key);
            if (existing) {
                existing.points += roy.points || 0;
            } else {
                byAuthor.set(key, { authorId: roy.authorId, authorName: roy.authorName || '', points: roy.points || 0 });
            }
        }
        return Array.from(byAuthor.values());
    }

    function getVotersForCompetitor(votes, competitorId, players) {
        const entries = Object.entries(votes || {}).filter(([, votedFor]) => votedFor === competitorId);
        return entries.map(([voterId]) => players.find(p => p.id === voterId)).filter(Boolean);
    }

    $: battle = $gameState.battleSchedule?.[$gameState.currentVotingBattleIndex];
    $: currentBattleKey = battle ? (battle.id || String($gameState.currentVotingBattleIndex)) : null;
    $: if (currentBattleKey !== revealedBattleKey) {
        revealedBattleKey = currentBattleKey;
        if (beatTimer) clearTimeout(beatTimer);
        beat2Ready = false;
        if (currentBattleKey !== null) {
            beatTimer = setTimeout(() => {
                beat2Ready = true;
            }, 1000);
        }
    }
</script>

<!-- Prototype v5 Reveal Arena + Inline Royalties + Preserved Rainbow Author Word Attribution -->
{#if battle}
    {@const isQuad = battle.competitors?.length === 4}
    {@const isTrio = battle.competitors?.length === 3}
    {@const isFinal = !!battle.genre}
    {@const maxNamedVoters = isQuad ? 2 : 3}
    {@const formatLabel = isQuad ? ($t.quadLabel || '4-WAY BRAWL') : (isTrio ? ($t.brawlLabel || '3-WAY BRAWL') : ($t.showdownLabel || '1-ON-1 SHOWDOWN'))}

    {@const aggregatedRoyalties = getAggregatedRoyalties(battle.royalties)}

    <!-- Prompt Header with Inline Royalties Summary (Prototype v5) -->
    <div class="relative z-10 w-full cut-md host-hud-surface border-2 border-[color:rgba(var(--color-primary-rgb),0.72)] px-4 sm:px-6 py-2.5 sm:py-3 2xl:py-4 flex flex-wrap items-center justify-between gap-2 sm:gap-3 flex-shrink-0">
        <div class="min-w-0 flex-1 text-left">
            <span class="text-xs sm:text-sm 2xl:text-base font-display text-fuchsia-300 uppercase tracking-widest block mb-0.5">
                {($t.results || 'REVEAL').toUpperCase()} // {formatLabel}
            </span>
            {#if isFinal}
                <p class="text-sm sm:text-base 2xl:text-lg font-display text-amber-300 mb-0.5">{battle.genre}</p>
                <p class="text-fluid-prompt font-sans font-extrabold text-white leading-snug">{battle.premise}</p>
            {:else}
                <p class="text-fluid-prompt font-sans font-extrabold text-white leading-snug">{battle.prompt}</p>
            {/if}
        </div>

        {#if aggregatedRoyalties.length > 0}
            <div class="flex flex-col items-end gap-1 max-w-full">
                <div class="cut-sm px-3.5 sm:px-4 py-1.5 sm:py-2 bg-cyan-950/50 border border-cyan-400/80 text-cyan-200 font-mono text-xs sm:text-sm 2xl:text-base font-bold flex flex-wrap items-center gap-x-2 gap-y-0.5 max-w-full">
                    <span>{$t.royaltiesSummary || 'ROYALTIES'}:</span>
                    {#each aggregatedRoyalties as roy, idx}
                        <span>{#if idx > 0}· {/if}{roy.authorName.toUpperCase()} +{roy.points}</span>
                    {/each}
                </div>
                <span class="text-[11px] lg:text-xs 2xl:text-sm font-mono text-cyan-300/90">
                    {$t.wordColorsLegend || 'Colors show which friend wrote each word'}
                </span>
            </div>
        {/if}
    </div>

    {@const isDuo = !isQuad && !isTrio && battle.competitors?.length === 2}
    <main class="relative z-10 w-full reveal-cards-grid grid-cols-1 {isQuad ? 'sm:grid-cols-2 lg:grid-cols-4' : (isTrio ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2 sm:!gap-8 2xl:!gap-12')} {isDuo ? '' : '2xl:!gap-5'} pt-5 pb-1 lg:flex-1 lg:min-h-0 items-stretch content-center lg:overflow-visible my-auto">
        {#each battle.competitors as c_id (c_id)}
            {@const p = $gamePlayers.find(x => x.id === c_id)}
            {@const isWinner = battle.winnerId === c_id}
            {@const bdown = battle.scoreBreakdown?.[c_id]}
            {@const isTie = !battle.winnerId && bdown?.winBonus > 0}
            {@const showWinnerUI = beat2Ready && isWinner}
            {@const showTieUI = beat2Ready && isTie}
            {@const hasRainbow = bdown?.rainbowBonus > 0}
            {@const myRoyaltyPts = (battle.royalties || []).filter(r => r.authorId === c_id || (p?.name && r.authorName === p.name)).reduce((s, r) => s + (r.points || 0), 0)}
            {@const totalCardPoints = battle.pointsAwarded?.[c_id] || 0}
            {@const answer = battle.answers?.[c_id]}
            {@const punchlineClass = getRevealPunchlineSizeClass(answer, isQuad, isTrio, isFinal)}
            {@const cardVoters = getVotersForCompetitor(battle.votes, c_id, $gamePlayers)}
            {@const visibleVoters = cardVoters.slice(0, maxNamedVoters)}
            {@const hiddenVoterCount = Math.max(0, cardVoters.length - visibleVoters.length)}

            <div class="relative flex flex-col lg:min-h-0 h-full lg:max-h-[32.5rem] 2xl:max-h-[43.75rem]">
                {#if showWinnerUI}
                    <div class="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20 fighter-crest bg-emerald-400 text-black text-[10px] sm:text-xs 2xl:text-sm border-2 border-emerald-200 whitespace-nowrap py-0.5 2xl:py-1 shadow-md">
                        <ArcadeIcon name="crown" className="w-3.5 h-3.5 2xl:w-4 2xl:h-4" />
                        <span>{$t.champion || 'CHAMPION'}</span>
                    </div>
                {:else if showTieUI}
                    <div class="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20 fighter-crest bg-amber-400 text-black text-[10px] sm:text-xs 2xl:text-sm border-2 border-amber-200 whitespace-nowrap py-0.5 2xl:py-1 shadow-md">
                        <span>{$t.tie || 'TIE!'}</span>
                    </div>
                {/if}

                <div class="reveal-card flex-1 host-panel-surface border-2 {showWinnerUI ? 'border-emerald-400 ring-1 ring-amber-400/50' : (showTieUI ? 'border-amber-400/80' : 'border-[#332e59]')} cut-md {isQuad ? 'p-2.5 sm:p-3 2xl:p-5 pt-4 2xl:pt-6' : 'p-3 sm:p-4 2xl:p-6 pt-4 2xl:pt-6'} transition-colors gap-2 2xl:gap-3.5">

                <!-- Row 1: Competitor Header -->
                <div class="flex items-center justify-between gap-2 pb-1.5 2xl:pb-2.5 border-b border-[#332e59]">
                    <div class="flex items-center gap-2.5 2xl:gap-3.5 min-w-0">
                        <div class="{isQuad ? 'w-9 h-9 2xl:w-12 2xl:h-12' : 'w-11 h-11 sm:w-12 sm:h-12 lg:w-14 lg:h-14 2xl:w-16 2xl:h-16'} flex-shrink-0">
                            <PixelAvatar avatar={p?.avatar || '❓'} />
                        </div>
                        <div class="min-w-0 text-left">
                            <span class="font-display {isQuad ? 'text-sm sm:text-base 2xl:text-xl' : 'text-base sm:text-xl 2xl:text-2xl'} text-white block leading-tight line-clamp-1 break-words">{p?.name || $t.disconnected}</span>
                            <span class="text-xs sm:text-sm 2xl:text-base font-mono text-cyan-300 font-bold block leading-tight">{Math.round(animatedScores[c_id] || p?.score || 0)} {$t.pts || 'PTS'}</span>
                        </div>
                    </div>
                </div>

                <!-- Row 2: Nested Dark Answer Box (Rainbow Word Attribution Preserved) -->
                <div class="reveal-card-answer bg-[#070610] border border-[#332e59] cut-sm {isQuad ? 'p-2.5 2xl:p-4' : 'p-3 sm:p-4 2xl:p-6'} {isQuad ? 'min-h-[5.5rem] lg:min-h-[6.875rem] 2xl:min-h-[10rem]' : 'min-h-[6.875rem] lg:min-h-[11.25rem] 2xl:min-h-[16.25rem]'} max-h-[15.625rem] xl:max-h-[18.75rem] 2xl:max-h-[23.75rem] {punchlineClass} font-sans font-bold text-center leading-snug overflow-y-auto w-full flex items-center justify-center">
                    {#if battle.annotatedAnswers?.[c_id]}
                        {@const annotated = battle.annotatedAnswers[c_id]}
                        {#if annotated.isFinal}
                            <div class="text-left w-full space-y-1.5 my-auto">
                                <div class="break-words">
                                    <span class="font-display text-primary mr-1 text-xs md:text-sm">{$t.title || 'Title'}:</span>
                                    {#each annotated.title as tok, i}
                                        {#if i > 0 && !/^[.,!?:;…]+$/.test(tok.text)}{' '}{/if}<span class="{getWordColorClass(tok.authorIndex)}">{tok.text}</span>
                                    {/each}
                                </div>
                                <div class="break-words">
                                    <span class="font-display text-primary mr-1 text-xs md:text-sm">{$t.tagline || 'Tagline'}:</span>
                                    {#each annotated.tagline as tok, i}
                                        {#if i > 0 && !/^[.,!?:;…]+$/.test(tok.text)}{' '}{/if}<span class="{getWordColorClass(tok.authorIndex)}">{tok.text}</span>
                                    {/each}
                                </div>
                            </div>
                        {:else}
                            <p class="text-center w-full break-words my-auto">
                                {#each annotated.words as tok, i}
                                    {#if i > 0 && !/^[.,!?:;…]+$/.test(tok.text)}{' '}{/if}<span class="{getWordColorClass(tok.authorIndex)}">{tok.text}</span>
                                {/each}
                            </p>
                        {/if}
                    {:else}
                        <span class="whitespace-pre-wrap break-words my-auto text-slate-100">{renderAnswer(answer)}</span>
                    {/if}
                </div>

                <!-- Row 3: Centered +PTS & Score Breakdown Badges (Beat 2 after 1.0s) -->
                <div class="flex flex-col items-center justify-center text-center w-full py-1 2xl:py-2">
                    {#if !beat2Ready}
                        <span class="font-display {isQuad ? 'text-xl sm:text-2xl 2xl:text-3xl' : 'text-2xl sm:text-3xl 2xl:text-4xl'} text-slate-600 animate-pulse leading-none">
                            • • •
                        </span>
                    {:else if totalCardPoints > 0}
                        <span class="font-display {isQuad ? 'text-xl sm:text-2xl 2xl:text-3xl' : 'text-2xl sm:text-3xl 2xl:text-4xl'} text-amber-300 whitespace-nowrap leading-none">
                            +{totalCardPoints} {$t.pts || 'PTS'}
                        </span>
                        <div class="flex flex-wrap items-center justify-center {isQuad ? 'gap-1 2xl:gap-1.5 text-[10px] 2xl:text-xs' : 'gap-1.5 2xl:gap-2 text-xs 2xl:text-sm'} mt-1.5 2xl:mt-2 font-mono">
                            {#if bdown?.votePoints > 0}
                                <span class="cut-sm px-2 py-0.5 bg-[#1c1936] border border-[#332e59] text-slate-200 font-bold whitespace-nowrap">
                                    {bdown.votes} {formatVotesLabel(bdown.votes, $t, $language)} (+{bdown.votePoints})
                                </span>
                            {/if}
                            {#if bdown?.winBonus > 0}
                                <span class="cut-sm px-2 py-0.5 bg-amber-950/90 border border-amber-500 text-amber-200 font-bold whitespace-nowrap">
                                    {$t.winBonusBreakdown || 'Win'} (+{bdown.winBonus})
                                </span>
                            {/if}
                            {#if bdown?.sweepBonus > 0}
                                <span class="cut-sm px-2 py-0.5 bg-purple-950/90 border border-purple-400 text-purple-200 font-bold whitespace-nowrap">
                                    {$t.sweepBonusBreakdown || 'Sweep'} (+{bdown.sweepBonus})
                                </span>
                            {/if}
                            {#if hasRainbow}
                                <span class="cut-sm px-2 py-0.5 bg-pink-950/80 border border-pink-400 text-pink-200 font-bold whitespace-nowrap">
                                    {$t.rainbowBonusBreakdown || 'Rainbow'} (+{bdown.rainbowBonus})
                                </span>
                            {/if}
                            {#if myRoyaltyPts > 0}
                                <span class="cut-sm px-2 py-0.5 bg-cyan-950/90 border border-cyan-400 text-cyan-200 font-bold whitespace-nowrap">
                                    {$t.royaltyBreakdown || 'Royalties'} (+{myRoyaltyPts})
                                </span>
                            {/if}
                        </div>
                    {:else}
                        <span class="font-display text-lg sm:text-xl 2xl:text-2xl text-slate-500">+0 {$t.pts || 'PTS'}</span>
                    {/if}
                </div>

                <!-- Row 4: Voter Attribution Chips (Beat 2 after 1.0s) -->
                <div class="pt-1.5 2xl:pt-2.5 border-t border-[#332e59] text-left flex flex-wrap items-center gap-1.5 2xl:gap-2">
                    {#if !beat2Ready}
                        <span class="text-xs font-mono text-slate-600 animate-pulse">...</span>
                    {:else}
                        <span class="text-[11px] 2xl:text-xs font-display text-slate-400 uppercase mr-0.5">
                            {$t.votedForThis || 'VOTERS'}:
                        </span>
                        {#each visibleVoters as voter (voter.id)}
                            <div class="cut-sm flex items-center gap-1 bg-[#0a0914] border border-[#332e59] px-2 py-0.5 2xl:px-2.5 2xl:py-1 text-xs 2xl:text-sm font-display text-slate-100" title={voter.name}>
                                <div class="w-4 h-4 2xl:w-5 2xl:h-5 flex-shrink-0">
                                    <PixelAvatar avatar={voter.avatar || '❓'} />
                                </div>
                                <span class="whitespace-nowrap">{voter.name}</span>
                            </div>
                        {/each}
                        {#if hiddenVoterCount > 0}
                            <span class="cut-sm bg-[#1c1936] border border-cyan-400/60 px-2 py-0.5 2xl:px-2.5 2xl:py-1 text-xs 2xl:text-sm font-mono font-bold text-cyan-300">
                                {$t.moreVoters ? $t.moreVoters.replace('{n}', hiddenVoterCount) : `+${hiddenVoterCount} more`}
                            </span>
                        {/if}
                        {#if cardVoters.length === 0}
                            <span class="text-xs 2xl:text-sm font-mono text-slate-500 italic">{$t.noVotes || 'No votes'}</span>
                        {/if}
                    {/if}
                </div>
                </div>
            </div>
        {/each}

        {#if isDuo}
            <div class="hidden sm:flex pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30" aria-hidden="true">
                <HexBadge
                    bgClass="bg-[#0e0b22]"
                    borderClass="text-amber-400"
                    className="px-4 py-2 lg:px-5 lg:py-2.5 2xl:px-7 2xl:py-3 {!$tvMode ? 'drop-shadow-[0_0_16px_rgba(250,204,21,0.45)]' : ''}"
                >
                    <span class="font-display text-base lg:text-xl 2xl:text-3xl text-amber-300 tracking-widest leading-none">VS</span>
                </HexBadge>
            </div>
        {/if}
    </main>
{/if}
