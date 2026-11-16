<script>
    import { t, gameState, gamePlayers, phaseTimer } from '../../../stores.js';
    import SevenSegmentDisplay from '../../shared/SevenSegmentDisplay.svelte';
    import PixelAvatar from '../../shared/PixelAvatar.svelte';
    import { TIMEOUT_ANSWER_PLACEHOLDER } from '../../../../shared/config.js';

    export let animatedScores = {};

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
            return `Title: ${title}\nTagline: ${tagline}`;
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
            if (len > 25 || isFinal) return 'text-fluid-punchline-xs';
            return 'text-fluid-punchline-sm';
        }
        if (isTrio) {
            if (len > 65 || isFinal) return 'text-fluid-punchline-xs';
            if (len > 35) return 'text-fluid-punchline-sm';
            return 'text-fluid-punchline-md';
        }
        if (len > 90 || isFinal) return 'text-fluid-punchline-xs';
        if (len > 45) return 'text-fluid-punchline-sm';
        return 'text-fluid-punchline-md';
    }

    $: battle = $gameState.battleSchedule?.[$gameState.currentVotingBattleIndex];
</script>

<!-- Phase: Battle Result Reveal Arena -->
{#if battle}
    {@const isQuad = battle.competitors?.length === 4}
    {@const isTrio = battle.competitors?.length === 3}
    {@const isFinal = !!battle.genre}
    {@const formatBadgeText = isQuad ? `${$t.quadLabel || '4-WAY BRAWL'} ${$t.results || 'RESULTS'}` : (isTrio ? `${$t.brawlLabel || '3-WAY BRAWL'} ${$t.results || 'RESULTS'}` : `${$t.showdownLabel || '1-ON-1 SHOWDOWN'} ${$t.results || 'RESULTS'}`)}

    <!-- Stage Header: Timer -->
    <div class="flex flex-col items-center mb-0.5 flex-shrink-0">
        <SevenSegmentDisplay time={$phaseTimer} size="sm" disableLowWarning={true} />
    </div>

    <!-- Prompt Banner Card (Horizontally Centered with Format Badge) -->
    <div class="w-full max-w-6xl bg-neutral-950/95 border-2 border-cyan-400/80 rounded-2xl px-4 sm:px-5 py-1 sm:py-1.5 mb-1 shadow-lg text-center flex-shrink-0 mx-auto">
        <div class="flex items-center justify-center gap-2 mb-0.5">
            <span class="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-display font-black tracking-wider uppercase bg-fuchsia-950/90 border border-fuchsia-400 text-fuchsia-300 shadow-sm">
                {formatBadgeText}
            </span>
            <span class="text-xs font-display font-bold text-cyan-300 uppercase tracking-widest">
                {isFinal ? ($t.finalBattleTheme || 'FINAL BATTLE PREMISE') : ($t.battlePrompt || 'BATTLE PROMPT')}
            </span>
        </div>
        {#if isFinal}
            <p class="text-xs sm:text-sm font-bold text-amber-300">{battle.genre}</p>
            <p class="text-fluid-prompt font-sans font-bold text-white leading-snug">{battle.premise}</p>
        {:else}
            <p class="text-fluid-prompt font-sans font-bold text-white leading-snug">{battle.prompt}</p>
        {/if}
    </div>

    <!-- Full-Width Reveal Cards (Horizontally Centered & Auto-Scaled Text) -->
    <main class="w-full max-w-7xl grid grid-cols-1 {isQuad ? 'sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5' : (isTrio ? 'sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3.5' : 'sm:grid-cols-2 md:grid-cols-2 gap-3.5 sm:gap-5')} pt-3 mb-0.5 flex-1 min-h-0 items-stretch px-1 mx-auto overflow-y-auto">
        {#each battle.competitors as c_id (c_id)}
            {@const p = $gamePlayers.find(x => x.id === c_id)}
            {@const isWinner = battle.winnerId === c_id}
            {@const bdown = battle.scoreBreakdown?.[c_id]}
            {@const isTie = !battle.winnerId && bdown?.winBonus > 0}
            {@const hasRainbow = bdown?.rainbowBonus > 0}
            {@const myRoyaltyPts = (battle.royalties || []).filter(r => r.authorId === c_id || (p?.name && r.authorName === p.name)).reduce((s, r) => s + (r.points || 0), 0)}
            {@const answer = battle.answers?.[c_id]}
            {@const punchlineClass = getRevealPunchlineSizeClass(answer, isQuad, isTrio, isFinal)}

            <div class="bg-neutral-950/95 border-2 {isWinner ? 'border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.6)] ring-2 ring-yellow-400/40' : (isTie ? 'ring-2 ring-yellow-500 border-amber-400/70' : 'border-neutral-700/80 shadow-xl')} rounded-2xl {isQuad ? 'p-1.5 sm:p-2' : 'p-2 sm:p-2.5'} flex flex-col justify-between min-h-0 relative transition-all">
                {#if isWinner}
                    <div class="absolute -top-2.5 inset-x-0 flex justify-center pointer-events-none z-10">
                        <div class="bg-yellow-400 text-black px-2.5 py-0.5 rounded-full font-display font-black text-[10px] sm:text-xs tracking-wider shadow-lg flex items-center gap-1 border border-yellow-200 whitespace-nowrap">
                            <span>👑</span> <span>{$t.winner || 'WINNER!'}</span>
                        </div>
                    </div>
                {:else if isTie}
                    <div class="absolute -top-2.5 inset-x-0 flex justify-center pointer-events-none z-10">
                        <div class="bg-amber-400 text-black px-2.5 py-0.5 rounded-full font-display font-black text-[10px] sm:text-xs tracking-wider shadow-lg flex items-center gap-1 border border-amber-200 whitespace-nowrap">
                            <span>🤝</span> <span>{$t.tie || 'TIE!'}</span>
                        </div>
                    </div>
                {/if}

                <div class="flex-1 min-h-0 flex flex-col justify-between">
                    <!-- Card Header: Avatar & Name -->
                    <div class="flex items-center gap-2 pb-1 mb-0.5 border-b border-neutral-800 flex-shrink-0">
                        <div class="{isQuad ? 'w-7 h-7 sm:w-8 sm:h-8' : 'w-8 h-8 sm:w-10 sm:h-10'} flex-shrink-0">
                            <PixelAvatar avatar={p?.avatar || '❓'} />
                        </div>
                        <div class="min-w-0 flex-grow text-left">
                            <span class="font-display font-black {isQuad ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'} text-white block leading-tight line-clamp-1 break-words">{p?.name || $t.disconnected}</span>
                            <span class="text-xs font-mono text-cyan-300 font-bold block leading-tight">{Math.round(animatedScores[c_id] || p?.score || 0)} {$t.pts || 'PTS'}</span>
                        </div>
                    </div>

                    <!-- Word Highlight Sentence (Auto-Scales on Long Answers, Zero Clipping) -->
                    <div class="flex-1 min-h-0 flex items-center justify-center my-0.5 px-0.5">
                        <div class="bg-black/90 border border-neutral-700/80 rounded-xl {isQuad ? 'p-1 min-h-[1.75rem]' : 'p-2 sm:p-2.5 min-h-[2.25rem]'} {punchlineClass} font-sans font-bold text-center leading-snug max-h-full overflow-y-auto w-full flex items-center justify-center">
                            {#if battle.annotatedAnswers?.[c_id]}
                                {@const annotated = battle.annotatedAnswers[c_id]}
                                {#if annotated.isFinal}
                                    <div class="text-left w-full space-y-1 my-auto">
                                        <div class="break-words">
                                            <span class="font-bold text-primary mr-1 text-xs md:text-sm">{$t.title || 'Title'}:</span>
                                            {#each annotated.title as tok, i}
                                                {#if i > 0 && !/^[.,!?:;…]+$/.test(tok.text)}{' '}{/if}<span class="{getWordColorClass(tok.authorIndex)}">{tok.text}</span>
                                            {/each}
                                        </div>
                                        <div class="break-words">
                                            <span class="font-bold text-primary mr-1 text-xs md:text-sm">{$t.tagline || 'Tagline'}:</span>
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
                                <span class="whitespace-pre-wrap break-words my-auto">{renderAnswer(answer)}</span>
                            {/if}
                        </div>
                    </div>

                    <!-- Points & Badges Section (Centered) -->
                    <div class="flex flex-col items-center justify-center my-0.5 text-center w-full flex-shrink-0">
                        {#if hasRainbow}
                            <div class="w-full flex justify-center mb-0.5">
                                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-sans font-extrabold tracking-wide bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-cyan-500/20 border border-pink-400 text-pink-200 whitespace-nowrap">
                                    {$t.rainbowBadge || '🌈 RAINBOW VARIETY'} (+{bdown.rainbowBonus})
                                </span>
                            </div>
                        {/if}

                        {#if battle.pointsAwarded?.[c_id] > 0}
                            <span class="font-display font-black {isQuad ? 'text-sm sm:text-base xl:text-lg' : 'text-base sm:text-lg lg:text-xl'} text-amber-300 whitespace-nowrap leading-tight">
                                +{battle.pointsAwarded[c_id]} {$t.pts || 'PTS'}
                            </span>
                            {#if bdown || myRoyaltyPts > 0}
                                <div class="flex flex-wrap items-center justify-center {isQuad ? 'gap-0.5 text-[10px]' : 'gap-1 text-[11px] sm:text-xs'} mt-0.5 font-mono">
                                    {#if bdown?.votePoints > 0}
                                        <span class="{isQuad ? 'px-1 py-0' : 'px-1.5 py-0.5'} rounded bg-neutral-800 border border-neutral-700 text-neutral-200 font-bold whitespace-nowrap">
                                            🗳️ {bdown.votes} {bdown.votes === 1 ? ($t.vote || 'Vote') : ($t.votes || $t.votesBreakdown || 'Votes')} (+{bdown.votePoints})
                                        </span>
                                    {/if}
                                    {#if bdown?.winBonus > 0}
                                        <span class="{isQuad ? 'px-1 py-0' : 'px-1.5 py-0.5'} rounded bg-yellow-950/80 border border-yellow-500 text-yellow-200 font-bold whitespace-nowrap">
                                            🏆 {$t.winBonusBreakdown || 'Win'} (+{bdown.winBonus})
                                        </span>
                                    {/if}
                                    {#if bdown?.sweepBonus > 0}
                                        <span class="{isQuad ? 'px-1 py-0' : 'px-1.5 py-0.5'} rounded bg-purple-950/80 border border-purple-500 text-purple-200 font-bold whitespace-nowrap">
                                            🧹 {$t.sweepBonusBreakdown || 'Sweep'} (+{bdown.sweepBonus})
                                        </span>
                                    {/if}
                                    {#if myRoyaltyPts > 0}
                                        <span class="{isQuad ? 'px-1 py-0' : 'px-1.5 py-0.5'} rounded bg-cyan-950/80 border border-cyan-500 text-cyan-200 font-bold whitespace-nowrap">
                                            ✨ {$t.royaltyBreakdown || 'Royalties'} (+{myRoyaltyPts})
                                        </span>
                                    {/if}
                                </div>
                            {/if}
                        {/if}
                    </div>
                </div>

                <!-- Voter Chips (Inline Label + Chips for Vertical Efficiency) -->
                <div class="pt-1 border-t border-neutral-800/80 text-left flex-shrink-0 flex flex-wrap items-center gap-1">
                    <span class="text-[10px] sm:text-[11px] font-display font-bold text-slate-300 uppercase mr-0.5">
                        {$t.votedForThis || 'VOTED FOR THIS'}:
                    </span>
                    {#each Object.entries(battle.votes || {}) as [voterId, votedFor]}
                        {#if votedFor === c_id}
                            {@const voter = $gamePlayers.find(p => p.id === voterId)}
                            <div class="flex items-center gap-1 bg-neutral-900 border border-neutral-700 px-1.5 py-0.5 rounded-md text-xs font-display text-slate-100 shadow-sm" title={voter?.name}>
                                <div class="w-4 h-4 flex-shrink-0">
                                    <PixelAvatar avatar={voter?.avatar || '❓'} />
                                </div>
                                <span class="font-bold whitespace-nowrap">{voter?.name}</span>
                            </div>
                        {/if}
                    {/each}
                    {#if !Object.values(battle.votes || {}).includes(c_id)}
                        <span class="text-xs font-mono text-slate-400 italic">{$t.noVotes || 'No votes'}</span>
                    {/if}
                </div>
            </div>
        {/each}
    </main>

    {#if battle.royalties && battle.royalties.length > 0}
        <div class="my-0.5 py-1 px-3 bg-neutral-900/95 border border-secondary/50 rounded-lg text-xs sm:text-sm text-neutral-200 flex flex-wrap items-center justify-center gap-2 max-w-3xl mx-auto flex-shrink-0">
            <span class="text-secondary font-bold">✨ {$t.wordRoyalties || 'Word Royalties'}:</span>
            {#each battle.royalties as roy}
                <span class="bg-neutral-800 px-2.5 py-0.5 rounded border border-neutral-700 font-mono text-xs sm:text-sm">
                    <span class="text-primary font-bold">{roy.authorName}</span> (+{roy.points} {$t.pts || 'pts'})
                </span>
            {/each}
        </div>
    {/if}
{/if}
