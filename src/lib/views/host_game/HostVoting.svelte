<script>
    import { t, gameState, gamePlayers, phaseTimer } from '../../../stores.js';
    import SevenSegmentDisplay from '../../shared/SevenSegmentDisplay.svelte';
    import { TIMEOUT_ANSWER_PLACEHOLDER } from '../../../../shared/config.js';

    const cardStyles = [
        { border: 'border-cyan-400', text: 'text-cyan-400', bg: 'bg-cyan-950/30' },
        { border: 'border-fuchsia-400', text: 'text-fuchsia-400', bg: 'bg-fuchsia-950/30' },
        { border: 'border-amber-400', text: 'text-amber-400', bg: 'bg-amber-950/30' },
        { border: 'border-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-950/30' }
    ];

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

    function getPunchlineSizeClass(answerText, isQuad, isTrio, isFinal) {
        const len = String(answerText || '').length;
        if (isQuad) {
            if (len > 110 || (isFinal && len > 80)) return 'text-fluid-punchline-xs';
            if (len > 60 || isFinal) return 'text-fluid-punchline-sm';
            return 'text-fluid-punchline-md';
        }
        if (isTrio) {
            if (len > 130 || (isFinal && len > 95)) return 'text-fluid-punchline-xs';
            if (len > 80 || isFinal) return 'text-fluid-punchline-sm';
            if (len > 50) return 'text-fluid-punchline-md';
            return 'text-fluid-punchline';
        }
        if (len > 150 || (isFinal && len > 110)) return 'text-fluid-punchline-xs';
        if (len > 100 || isFinal) return 'text-fluid-punchline-sm';
        if (len > 65) return 'text-fluid-punchline-md';
        return 'text-fluid-punchline';
    }

    $: battle = $gameState.battleSchedule?.[$gameState.currentVotingBattleIndex];
</script>

<!-- Phase: Battle Voting Arena -->
{#if battle}
    {@const votingOptions = Array.isArray(battle.votingOptions) && battle.votingOptions.length > 0
        ? battle.votingOptions
        : (battle.competitors || []).map((c_id, idx) => ({
            optionId: `opt_${idx}`,
            answer: battle.answers?.[c_id] ?? battle.answers?.[`opt_${idx}`]
        }))}
    {@const competitorCount = battle.competitorCount ?? votingOptions.length}
    {@const isQuad = competitorCount === 4}
    {@const isTrio = competitorCount === 3}
    {@const isFinal = !!battle.genre}
    {@const formatBadgeText = isQuad ? ($t.quadLabel || '🔥 4-WAY BRAWL') : (isTrio ? ($t.brawlLabel || '💥 3-WAY BRAWL') : ($t.showdownLabel || '⚡ 1-ON-1 SHOWDOWN'))}
    {@const formatBadgeColor = isQuad ? 'bg-orange-950/90 border-orange-400 text-orange-200' : (isTrio ? 'bg-purple-950/90 border-purple-400 text-purple-200' : 'bg-cyan-950/90 border-cyan-400 text-cyan-200')}

    <!-- Stage Header: Timer & Format Badge -->
    <div class="flex flex-col items-center mb-1 flex-shrink-0">
        <SevenSegmentDisplay time={$phaseTimer} size="sm" />
        <div class="flex items-center gap-2 mt-0.5">
            <span class="px-3 py-0.5 rounded-full text-xs font-display font-black tracking-wider uppercase border shadow-md {formatBadgeColor}">
                {formatBadgeText}
            </span>
            <span class="text-xs sm:text-sm font-display font-bold text-slate-200 tracking-widest uppercase">
                {$t.voteForBestAnswer || 'VOTE FOR THE FUNNIEST ANSWER'}
            </span>
        </div>
    </div>

    <!-- Prompt Banner Card (Horizontally Centered & Dynamic Typography) -->
    <div class="w-full max-w-6xl bg-neutral-950/95 border-2 border-cyan-400/80 rounded-2xl px-4 sm:px-6 py-2 sm:py-2.5 mb-2 shadow-lg text-center flex-shrink-0 mx-auto">
        <span class="text-xs font-display font-bold text-cyan-300 uppercase tracking-widest block mb-0.5">
            {isFinal ? ($t.finalBattleTheme || 'FINAL BATTLE PREMISE') : ($t.battlePrompt || 'BATTLE PROMPT')}
        </span>
        {#if isFinal}
            <p class="text-sm sm:text-base font-bold text-amber-300 mb-0.5">{battle.genre}</p>
            <p class="text-fluid-prompt font-sans font-bold text-white leading-snug">{battle.premise}</p>
        {:else}
            <p class="text-fluid-prompt font-sans font-bold text-white leading-snug">{battle.prompt}</p>
        {/if}
    </div>

    <!-- Full-Width Answer Arena Cards (Auto-Scaling Typography for Long Answers & Zero Clipping) -->
    <main class="w-full max-w-7xl grid grid-cols-1 {isQuad ? 'sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5' : (isTrio ? 'sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4' : 'sm:grid-cols-2 md:grid-cols-2 gap-4 sm:gap-6')} mb-1.5 flex-1 min-h-0 items-stretch px-1 mx-auto overflow-y-auto">
        {#each votingOptions as opt, i (opt.optionId || i)}
            {@const style = cardStyles[i] || cardStyles[0]}
            {@const answerLabel = i === 0 ? ($t.answerA || 'OPTION A') : (i === 1 ? ($t.answerB || 'OPTION B') : (i === 2 ? ($t.answerC || 'OPTION C') : ($t.answerD || 'OPTION D')))}
            {@const answer = renderAnswer(opt.answer)}
            {@const punchlineClass = getPunchlineSizeClass(answer, isQuad, isTrio, isFinal)}
            <div class="bg-neutral-950/85 border-2 {style.border} {style.bg} rounded-2xl {isQuad ? 'p-2.5 sm:p-3' : 'p-3 sm:p-4'} shadow-xl flex flex-col justify-between min-h-0 overflow-hidden">
                <div class="flex items-center justify-between gap-1 border-b border-neutral-800 pb-1.5 mb-1.5 flex-shrink-0">
                    <span class="font-display font-black {isQuad ? 'text-xs sm:text-sm' : 'text-sm sm:text-base md:text-lg'} {style.text} tracking-wider whitespace-nowrap">{answerLabel}</span>
                    <span class="text-[11px] sm:text-xs font-mono text-slate-300 font-bold uppercase tracking-widest flex-shrink-0">{$t.anonymous || 'ANONYMOUS'}</span>
                </div>
                <div class="flex-1 min-h-0 overflow-y-auto flex items-center justify-center py-1.5 sm:py-2.5 px-1 text-center">
                    <p class="{punchlineClass} font-sans font-bold text-slate-100 leading-snug whitespace-pre-wrap break-words w-full my-auto">
                        "{answer}"
                    </p>
                </div>
                <div class="pt-1.5 border-t border-neutral-800/80 mt-1 flex justify-center text-center flex-shrink-0">
                    <span class="{isQuad ? 'text-[11px] sm:text-xs' : 'text-xs sm:text-sm'} font-display font-black {style.text} uppercase tracking-wider leading-snug">
                        {$t.tapOptionOnPhone ? $t.tapOptionOnPhone.replace('{label}', answerLabel) : `Tap ${answerLabel} on Phone`}
                    </span>
                </div>
            </div>
        {/each}
    </main>

    <!-- Anonymous Live Voter Gauge -->
    {@const votedCount = battle.votedCount ?? Object.keys(battle.votes || {}).length}
    {@const totalVoters = battle.totalVoters ?? $gamePlayers.filter(p => !(battle.competitors || []).includes(p.id)).length}
    {@const percentage = totalVoters > 0 ? Math.round((votedCount / totalVoters) * 100) : 0}
    <div class="w-full max-w-lg bg-neutral-950/85 border border-neutral-700/80 rounded-2xl px-4 py-1.5 mb-1.5 shadow-md flex flex-col gap-1 flex-shrink-0 mx-auto">
        <div class="flex items-center justify-between text-xs sm:text-sm">
            <span class="font-display font-bold text-cyan-400">🗳️ {$t.votesLockedIn || 'VOTES LOCKED IN'}:</span>
            <span class="font-mono font-bold text-white">{votedCount} / {totalVoters} {$t.voters || 'VOTERS'}</span>
        </div>
        <div class="w-full bg-neutral-800 rounded-full h-2 overflow-hidden border border-neutral-700">
            <div class="bg-gradient-to-r from-cyan-400 to-emerald-400 h-full rounded-full transition-all duration-300" style="width: {percentage}%;"></div>
        </div>
    </div>
{/if}
