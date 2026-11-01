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

    $: battle = $gameState.battleSchedule?.[$gameState.currentVotingBattleIndex];
</script>

<!-- Phase: Battle Result Reveal Arena -->
{#if battle}
    {@const isQuad = battle.competitors?.length === 4}
    {@const isTrio = battle.competitors?.length === 3}
    {@const isFinal = !!battle.genre}
    {@const formatBadgeText = isQuad ? `${$t.quadLabel || '4-WAY BRAWL'} ${$t.results || 'RESULTS'}` : (isTrio ? `${$t.brawlLabel || '3-WAY BRAWL'} ${$t.results || 'RESULTS'}` : `${$t.showdownLabel || '1-ON-1 SHOWDOWN'} ${$t.results || 'RESULTS'}`)}

    <!-- Stage Header: Timer & Battle Reveal Banner -->
    <div class="flex flex-col items-center mb-0.5 flex-shrink-0">
        <SevenSegmentDisplay time={$phaseTimer} size="sm" />
        <div class="flex items-center gap-2 mt-0.5">
            <span class="px-2.5 py-0.5 rounded-full text-[11px] font-display font-black tracking-wider uppercase bg-fuchsia-950/90 border border-fuchsia-400 text-fuchsia-300 shadow-md">
                {formatBadgeText}
            </span>
        </div>
    </div>

    <!-- Prompt Banner Card (Horizontally Centered) -->
    <div class="w-full max-w-6xl bg-neutral-950/85 border-2 border-cyan-400/70 rounded-2xl px-4 sm:px-5 py-1 sm:py-1.5 mb-1 shadow-[0_0_25px_rgba(6,182,212,0.2)] text-center backdrop-blur-md flex-shrink-0 mx-auto">
        <span class="text-[9px] sm:text-[11px] font-display font-bold text-cyan-400 uppercase tracking-widest block">
            {isFinal ? ($t.finalBattleTheme || 'FINAL BATTLE PREMISE') : ($t.battlePrompt || 'BATTLE PROMPT')}
        </span>
        {#if isFinal}
            <p class="text-xs sm:text-sm font-bold text-amber-300">{battle.genre}</p>
            <p class="text-sm sm:text-base lg:text-lg font-sans font-bold text-white leading-snug">{battle.premise}</p>
        {:else}
            <p class="text-sm sm:text-base lg:text-lg font-sans font-bold text-white leading-snug">{battle.prompt}</p>
        {/if}
    </div>

    <!-- Full-Width Reveal Cards (Horizontally Centered & Expanded Text) -->
    <main class="w-full max-w-7xl grid grid-cols-1 {isQuad ? 'sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5' : (isTrio ? 'sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3.5' : 'sm:grid-cols-2 md:grid-cols-2 gap-3.5 sm:gap-5')} pt-2.5 mb-0.5 flex-1 min-h-0 items-stretch px-1 mx-auto overflow-y-auto">
        {#each battle.competitors as c_id (c_id)}
            {@const p = $gamePlayers.find(x => x.id === c_id)}
            {@const isWinner = battle.winnerId === c_id}
            {@const isTie = !battle.winnerId && battle.pointsAwarded?.[c_id] > 0}
            {@const bdown = battle.scoreBreakdown?.[c_id]}
            {@const hasRainbow = bdown?.rainbowBonus > 0}
            {@const answer = battle.answers?.[c_id]}

            <div class="bg-neutral-950/90 border-2 {isWinner ? 'border-yellow-400 shadow-[0_0_25px_rgba(250,204,21,0.7)] ring-2 ring-yellow-400/40 pt-3 sm:pt-3.5' : (isTie ? 'ring-2 ring-yellow-500 border-neutral-700/80' : 'border-neutral-700/80 shadow-[0_0_15px_rgba(0,0,0,0.5)]')} rounded-2xl p-2 sm:p-2.5 flex flex-col justify-between backdrop-blur-md relative transition-all">
                {#if isWinner}
                    <div class="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-yellow-400 text-black px-2.5 py-0.5 rounded-full font-display font-black text-[10px] sm:text-[11px] tracking-wider shadow-lg flex items-center gap-1 border border-yellow-200 whitespace-nowrap z-10">
                        <span>👑</span> <span>{$t.winner || 'WINNER!'}</span>
                    </div>
                {/if}

                <div>
                    <!-- Card Header: Avatar & Name -->
                    <div class="flex items-center gap-2 pb-1 mb-1 border-b border-neutral-800">
                        <div class="{isQuad ? 'w-8 h-8 sm:w-9 sm:h-9' : 'w-9 h-9 sm:w-10 sm:h-10'} flex-shrink-0">
                            <PixelAvatar avatar={p?.avatar || '❓'} />
                        </div>
                        <div class="min-w-0 flex-grow text-left">
                            <span class="font-display font-black {isQuad ? 'text-xs sm:text-sm md:text-base' : 'text-sm sm:text-base md:text-lg'} text-white block leading-tight whitespace-nowrap truncate">{p?.name || $t.disconnected}</span>
                            <span class="text-[10px] sm:text-[11px] font-mono text-slate-400 font-bold block leading-tight">{Math.round(animatedScores[c_id] || p?.score || 0)} PTS</span>
                        </div>
                    </div>

                    <!-- Word Highlight Sentence (Much Larger on TV/Laptop) -->
                    <div class="bg-black/80 border border-neutral-700/80 rounded-xl p-1.5 sm:p-2 {isQuad ? 'text-xs sm:text-sm md:text-base' : 'text-sm sm:text-base lg:text-lg'} font-sans font-bold text-center leading-snug min-h-[2.75rem] flex items-center justify-center">
                        {#if battle.annotatedAnswers?.[c_id]}
                            {@const annotated = battle.annotatedAnswers[c_id]}
                            {#if annotated.isFinal}
                                <div class="text-left w-full space-y-1">
                                    <div>
                                        <span class="font-bold text-primary mr-1 text-xs md:text-sm">Title:</span>
                                        {#each annotated.title as tok, i}
                                            {#if i > 0 && !/^[.,!?:;…]+$/.test(tok.text)}{' '}{/if}<span class="{getWordColorClass(tok.authorIndex)}">{tok.text}</span>
                                        {/each}
                                    </div>
                                    <div>
                                        <span class="font-bold text-primary mr-1 text-xs md:text-sm">Tagline:</span>
                                        {#each annotated.tagline as tok, i}
                                            {#if i > 0 && !/^[.,!?:;…]+$/.test(tok.text)}{' '}{/if}<span class="{getWordColorClass(tok.authorIndex)}">{tok.text}</span>
                                        {/each}
                                    </div>
                                </div>
                            {:else}
                                <p class="text-center w-full">
                                    {#each annotated.words as tok, i}
                                        {#if i > 0 && !/^[.,!?:;…]+$/.test(tok.text)}{' '}{/if}<span class="{getWordColorClass(tok.authorIndex)}">{tok.text}</span>
                                    {/each}
                                </p>
                            {/if}
                        {:else}
                            <span class="whitespace-pre-wrap">{renderAnswer(answer)}</span>
                        {/if}
                    </div>

                    <!-- Points & Badges Section (Centered) -->
                    <div class="flex flex-col items-center justify-center my-1 text-center w-full">
                        {#if hasRainbow}
                            <div class="w-full flex justify-center mb-0.5">
                                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] md:text-[10px] font-display font-black tracking-wide bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-cyan-500/20 border border-pink-400 text-pink-300 shadow-[0_0_10px_rgba(236,72,153,0.4)] animate-pulse">
                                    {$t.rainbowBadge || '🌈 RAINBOW VARIETY'} (+{bdown.rainbowBonus})
                                </span>
                            </div>
                        {/if}

                        {#if battle.pointsAwarded?.[c_id] > 0}
                            <span class="font-display font-black {isQuad ? 'text-base sm:text-lg xl:text-xl' : 'text-lg sm:text-xl lg:text-2xl'} text-amber-300 drop-shadow-[0_0_12px_rgba(252,211,77,0.7)] whitespace-nowrap">
                                +{battle.pointsAwarded[c_id]} PTS
                            </span>
                            {#if bdown}
                                <div class="flex flex-wrap items-center justify-center gap-1 mt-0.5 text-[9px] md:text-[10px] font-mono">
                                    {#if bdown.votePoints > 0}
                                        <span class="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-300 font-medium">
                                            🗳️ {bdown.votes} {$t.votesBreakdown || 'Votes'} (+{bdown.votePoints})
                                        </span>
                                    {/if}
                                    {#if bdown.winBonus > 0}
                                        <span class="px-1.5 py-0.5 rounded bg-yellow-950/80 border border-yellow-500 text-yellow-300 font-bold">
                                            🏆 {$t.winBonusBreakdown || 'Win Bonus'} (+{bdown.winBonus})
                                        </span>
                                    {/if}
                                    {#if bdown.sweepBonus > 0}
                                        <span class="px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-500 text-purple-300 font-bold">
                                            🧹 {$t.sweepBonusBreakdown || 'Sweep Bonus'} (+{bdown.sweepBonus})
                                        </span>
                                    {/if}
                                </div>
                            {/if}
                        {/if}
                    </div>
                </div>

                <!-- Voter Chips -->
                <div class="pt-1 border-t border-neutral-800/80 text-left">
                    <span class="text-[9px] font-display font-bold text-slate-400 uppercase block mb-0.5">
                        {$t.votedForThis || 'VOTED FOR THIS'}:
                    </span>
                    <div class="flex flex-wrap gap-1">
                        {#each Object.entries(battle.votes || {}) as [voterId, votedFor]}
                            {#if votedFor === c_id}
                                {@const voter = $gamePlayers.find(p => p.id === voterId)}
                                <div class="flex items-center gap-1 bg-neutral-900 border border-neutral-700 px-1.5 py-0.5 rounded-md text-[10px] font-display text-slate-200 shadow-sm" title={voter?.name}>
                                    <div class="w-3.5 h-3.5 flex-shrink-0">
                                        <PixelAvatar avatar={voter?.avatar || '❓'} />
                                    </div>
                                    <span class="font-medium whitespace-nowrap">{voter?.name}</span>
                                </div>
                            {/if}
                        {/each}
                        {#if !Object.values(battle.votes || {}).includes(c_id)}
                            <span class="text-[9px] font-mono text-slate-500 italic">{$t.noVotes || 'No votes'}</span>
                        {/if}
                    </div>
                </div>
            </div>
        {/each}
    </main>

    {#if battle.royalties && battle.royalties.length > 0}
        <div class="my-0.5 py-1 px-3 bg-neutral-900/90 border border-secondary/40 rounded-lg text-xs text-neutral-300 flex flex-wrap items-center justify-center gap-2 max-w-2xl mx-auto flex-shrink-0">
            <span class="text-secondary font-bold">✨ {$t.wordRoyalties || 'Word Royalties'}:</span>
            {#each battle.royalties as roy}
                <span class="bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700 font-mono text-xs">
                    <span class="text-primary font-medium">{roy.authorName}</span> (+{roy.points} pts)
                </span>
            {/each}
        </div>
    {/if}
{/if}
