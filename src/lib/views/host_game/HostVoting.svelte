<!-- src/lib/views/host_game/HostVoting.svelte -->
<script>
    import { t, tvMode, gameState, gamePlayers } from '../../../stores.js';
    import { TIMEOUT_ANSWER_PLACEHOLDER } from '../../../../shared/config.js';
    import HexBadge from '../../shared/HexBadge.svelte';

    const cardStyles = [
        { border: 'border-cyan-400', badgeBorder: 'border-cyan-400 text-cyan-300', bg: 'host-panel-surface' },
        { border: 'border-fuchsia-400', badgeBorder: 'border-fuchsia-400 text-fuchsia-300', bg: 'host-panel-surface' },
        { border: 'border-amber-400', badgeBorder: 'border-amber-400 text-amber-300', bg: 'host-panel-surface' },
        { border: 'border-emerald-400', badgeBorder: 'border-emerald-400 text-emerald-300', bg: 'host-panel-surface' }
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
            if (len > 105 || (isFinal && len > 85)) return 'text-fluid-punchline-xs';
            if (len > 55) return 'text-fluid-punchline-sm';
            return 'text-fluid-punchline-md';
        }
        if (isTrio) {
            if (len > 125 || (isFinal && len > 95)) return 'text-fluid-punchline-xs';
            if (len > 75) return 'text-fluid-punchline-sm';
            if (len > 45) return 'text-fluid-punchline-md';
            return 'text-fluid-punchline';
        }
        if (len > 145 || (isFinal && len > 110)) return 'text-fluid-punchline-xs';
        if (len > 90) return 'text-fluid-punchline-sm';
        if (len > 55) return 'text-fluid-punchline-md';
        return 'text-fluid-punchline';
    }

    $: battle = $gameState.battleSchedule?.[$gameState.currentVotingBattleIndex];
</script>

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
    {@const formatBadgeText = isQuad ? ($t.quadLabel || '4-WAY BRAWL') : (isTrio ? ($t.brawlLabel || '3-WAY BRAWL') : ($t.showdownLabel || '1-ON-1 SHOWDOWN'))}
    {@const votedCount = battle.votedCount ?? Object.keys(battle.votes || {}).length}
    {@const totalVoters = battle.totalVoters ?? $gamePlayers.filter(p => !(battle.competitors || []).includes(p.id)).length}
    {@const percentage = totalVoters > 0 ? Math.round((votedCount / totalVoters) * 100) : 0}

    <!-- Prototype v5 Merged Prompt & Vote Progress Box -->
    <div class="relative z-10 w-full cut-md host-hud-surface border-2 border-[color:rgba(var(--color-primary-rgb),0.72)] px-4 sm:px-6 py-2.5 sm:py-3 2xl:py-4 flex flex-col gap-2 flex-shrink-0">
        <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="min-w-0 flex-1 text-left">
                <span class="text-xs sm:text-sm 2xl:text-base font-display text-fuchsia-300 uppercase tracking-widest block mb-0.5">
                    {($t.voteForBestAnswer || 'VOTE ON YOUR PHONES').toUpperCase()} // {formatBadgeText}
                </span>
                {#if isFinal}
                    <p class="text-sm sm:text-base 2xl:text-lg font-display text-amber-300 mb-0.5">{battle.genre}</p>
                    <p class="text-fluid-prompt font-sans font-extrabold text-white leading-snug">{battle.premise}</p>
                {:else}
                    <p class="text-fluid-prompt font-sans font-extrabold text-white leading-snug">{battle.prompt}</p>
                {/if}
            </div>

            <div class="cut-sm px-3.5 sm:px-4 py-1.5 sm:py-2 bg-emerald-950/60 border border-emerald-400 text-emerald-300 font-display text-xs sm:text-sm 2xl:text-base tracking-widest uppercase flex-shrink-0">
                {$t.votedRatio
                    ? $t.votedRatio.replace('{voted}', votedCount).replace('{total}', totalVoters)
                    : `${votedCount} / ${totalVoters} VOTED`}
            </div>
        </div>

        <div class="w-full bg-[#070610] cut-sm h-1.5 overflow-hidden border border-[#332e59]">
            <div class="bg-gradient-to-r from-cyan-400 to-emerald-400 h-full transition-all duration-300" style="width: {percentage}%;"></div>
        </div>
    </div>

    <!-- Prototype v5 Clean Centered Answer Cards -->
    {@const isDuo = !isQuad && !isTrio && votingOptions.length === 2}
    <main class="relative z-10 w-full grid grid-cols-1 {isQuad ? 'sm:grid-cols-2 lg:grid-cols-4 gap-2.5 2xl:gap-4' : (isTrio ? 'sm:grid-cols-2 lg:grid-cols-3 gap-3 2xl:gap-5' : 'sm:grid-cols-2 gap-4 sm:gap-8 2xl:gap-12')} lg:flex-1 lg:min-h-0 items-center lg:overflow-hidden py-1">
        {#each votingOptions as opt, i (opt.optionId || i)}
            {@const style = cardStyles[i] || cardStyles[0]}
            {@const answerLabel = i === 0 ? ($t.answerA || 'OPTION A') : (i === 1 ? ($t.answerB || 'OPTION B') : (i === 2 ? ($t.answerC || 'OPTION C') : ($t.answerD || 'OPTION D')))}
            {@const answer = renderAnswer(opt.answer)}
            {@const punchlineClass = getPunchlineSizeClass(answer, isQuad, isTrio, isFinal)}
            <div data-testid="voting-option-card" class="{style.bg} border-2 {style.border} cut-md {isQuad ? 'p-3 sm:p-4 2xl:p-6 min-h-[12.5rem] lg:min-h-[16.25rem] 2xl:min-h-[23.75rem] lg:h-[min(100%,23.75rem)] 2xl:h-[min(100%,36.25rem)]' : 'p-4 sm:p-6 2xl:p-8 min-h-[15rem] lg:min-h-[22.5rem] 2xl:min-h-[31.25rem] lg:h-[min(100%,27.5rem)] 2xl:h-[min(100%,40rem)]'} flex flex-col items-center justify-between gap-3 2xl:gap-5 lg:min-h-0 overflow-hidden text-center">
                <div class="cut-sm px-4 py-1 2xl:px-6 2xl:py-2 bg-[#0a0914] border {style.badgeBorder} font-display {isQuad ? 'text-xs sm:text-sm lg:text-base 2xl:text-lg' : 'text-sm sm:text-base lg:text-lg 2xl:text-2xl'} tracking-widest uppercase flex-shrink-0">
                    {answerLabel}
                </div>

                <div class="flex-1 min-h-0 overflow-y-auto flex items-center justify-center bg-[#070610] border border-[#332e59] cut-sm py-3 px-4 2xl:py-5 2xl:px-6 w-full">
                    {#if typeof opt.answer === 'object' && opt.answer !== null && (opt.answer.title || opt.answer.tagline)}
                        {@const fTitle = (opt.answer.title === TIMEOUT_ANSWER_PLACEHOLDER || !opt.answer.title) ? `(${$t.noAnswerSubmitted || 'No answer submitted'})` : opt.answer.title.trim()}
                        {@const fTagline = (opt.answer.tagline === TIMEOUT_ANSWER_PLACEHOLDER || !opt.answer.tagline?.trim()) ? '...' : opt.answer.tagline.trim()}
                        <div class="text-left w-full space-y-2 my-auto {punchlineClass} font-sans font-bold text-slate-100 leading-snug">
                            <div class="break-words">
                                <span class="font-display text-cyan-300 mr-1.5 text-xs sm:text-sm uppercase">{$t.title || 'Title'}:</span>
                                <span>{fTitle}</span>
                            </div>
                            <div class="break-words">
                                <span class="font-display text-cyan-300 mr-1.5 text-xs sm:text-sm uppercase">{$t.tagline || 'Tagline'}:</span>
                                <span>{fTagline}</span>
                            </div>
                        </div>
                    {:else}
                        <p class="{punchlineClass} font-sans font-bold text-slate-100 leading-snug whitespace-pre-wrap break-words w-full my-auto">
                            {answer}
                        </p>
                    {/if}
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
