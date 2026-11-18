<!-- src/lib/views/player_game/PlayerBattleVotingView.svelte -->
<script>
    import { t, sendMessage } from '../../../stores.js';
    import SevenSegmentDisplay from '../../shared/SevenSegmentDisplay.svelte';
    import ArcadeIcon from '../../shared/ArcadeIcon.svelte';
    import SvgReactionButtons from '../../shared/SvgReactionButtons.svelte';
    import { TIMEOUT_ANSWER_PLACEHOLDER } from '../../../../shared/config.js';

    export let timer;
    export let battle;
    export let player;
    export let gameId;
    export let players = [];

    $: isCompetitor = Boolean(battle && (battle.isCompetitor !== undefined ? battle.isCompetitor : battle.competitors?.includes(player?.id)));
    $: hasVoted = Boolean(battle && (battle.hasVoted !== undefined ? battle.hasVoted : Boolean(battle.votes?.[player?.id])));
    $: isMyTurnToVote = Boolean(battle && !isCompetitor && !hasVoted);
    $: amIWatching = Boolean(battle && (isCompetitor || hasVoted));
    $: compCount = battle?.competitorCount || battle?.votingOptions?.length || battle?.competitors?.length || 2;
    $: votedCount = battle?.votedCount ?? Object.keys(battle?.votes || {}).length;
    $: totalVoters = battle?.totalVoters ?? Math.max(0, players.length - compCount);
    $: votingOptions = battle?.votingOptions || (battle?.competitors || []).map(c_id => ({
        optionId: c_id,
        answer: battle?.answers?.[c_id]
    }));

    function castVote(battleId, optionId) {
        if (!battle || !player || !optionId) return;

        sendMessage('vote', {
            gameId: gameId,
            playerId: player.id,
            battleId,
            optionId,
            voteForPlayerId: optionId
        });
    }

    function renderAnswer(answer) {
        if (typeof answer === 'string') {
            if (answer === TIMEOUT_ANSWER_PLACEHOLDER) return `(${$t.noAnswerSubmitted})`;
            return answer;
        }
        if (typeof answer === 'object' && answer !== null && (answer.title || answer.tagline)) {
            let title = (answer.title || '...').trim();
            let tagline = (answer.tagline || '...').trim();
            if (title === TIMEOUT_ANSWER_PLACEHOLDER) title = `(${$t.noAnswerSubmitted})`;
            if (tagline === TIMEOUT_ANSWER_PLACEHOLDER || tagline === '') tagline = '...';
            return `"${title}"\n${tagline}`;
        }
        return `(${$t.noAnswerSubmitted})`;
    }

    const cardStyles = [
        { label: 'ANSWER A', badgeBg: 'bg-cyan-950/90', badgeBorder: 'border-cyan-400', badgeText: 'text-cyan-300', cardBorder: 'border-cyan-400/80', btnColor: '#00e5ff' },
        { label: 'ANSWER B', badgeBg: 'bg-pink-950/90', badgeBorder: 'border-pink-400', badgeText: 'text-pink-300', cardBorder: 'border-pink-400/80', btnColor: '#ff2a85' },
        { label: 'ANSWER C', badgeBg: 'bg-emerald-950/90', badgeBorder: 'border-emerald-400', badgeText: 'text-emerald-300', cardBorder: 'border-emerald-400/80', btnColor: '#39ff14' },
        { label: 'ANSWER D', badgeBg: 'bg-amber-950/90', badgeBorder: 'border-amber-400', badgeText: 'text-amber-300', cardBorder: 'border-amber-400/80', btnColor: '#facc15' }
    ];
</script>

<div class="w-full h-full max-h-full min-h-0 flex flex-col justify-between p-3 pb-[max(8px,env(safe-area-inset-bottom))] max-w-md md:max-w-4xl mx-auto select-none font-sans overflow-hidden box-border">
    
    <!-- Top Header -->
    <header class="flex items-center justify-between gap-2 mb-2 flex-shrink-0 bg-[#131126] border border-[#332e59] cut-sm px-3 py-1.5">
        <span class="fighter-crest text-[11px] font-display bg-purple-950 text-purple-300 border border-purple-400/60 min-w-0 truncate">
            {#if compCount === 4}
                {$t.quadLabel || '4-WAY BRAWL'}
            {:else if compCount === 3}
                {$t.brawlLabel || '3-WAY BRAWL'}
            {:else}
                {$t.duoLabel || '1-ON-1 SHOWDOWN'}
            {/if}
        </span>
        <SevenSegmentDisplay time={timer} showLabel={false} size="sm" />
    </header>

    {#if battle && (battle.prompt || battle.premise)}
        {@const isFinalRound = !!battle.genre}
        <div class="bg-[#131126] border border-[#332e59] cut-md p-2.5 sm:p-3 mb-2 text-center flex-shrink-0 max-h-24 overflow-y-auto">
            <span class="text-[11px] font-display text-cyan-300 uppercase tracking-widest block mb-0.5">
                {isFinalRound ? ($t.moviePitch || 'MOVIE PREMISE') : ($t.battlePrompt || 'BATTLE PROMPT')}
            </span>
            {#if isFinalRound && battle.genre}
                <p class="text-xs font-display text-amber-300 uppercase tracking-wider mb-0.5">{battle.genre}</p>
            {/if}
            <p class="text-sm sm:text-base font-bold text-slate-100 leading-snug break-words">
                {isFinalRound ? (battle.premise || battle.prompt) : battle.prompt}
            </p>
        </div>
    {/if}

    {#if battle && isMyTurnToVote}
        <!-- Voting Cards (1 Col Phone, 2 Cols Tablet/PC) -->
        <div class="flex-1 min-h-0 overflow-y-auto flex flex-col pr-0.5 pb-2">
            <div class="{votingOptions.length <= 3 ? 'my-auto' : ''} grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {#each votingOptions as opt, i (opt.optionId)}
                    {@const style = cardStyles[i % cardStyles.length]}
                    {@const answer = renderAnswer(opt.answer)}

                    <div class="bg-[#131126] border-2 {style.cardBorder} cut-md p-4 sm:p-5 flex flex-col justify-between">
                        <div>
                            <div class="flex items-center justify-between mb-2">
                                <span class="fighter-crest text-xs font-display uppercase tracking-wider {style.badgeBg} border {style.badgeBorder} {style.badgeText}">
                                    {$t[`answer${['A','B','C','D'][i]}`] || style.label}
                                </span>
                            </div>
                            <p class="text-base sm:text-lg font-bold text-slate-100 whitespace-pre-wrap break-words leading-relaxed min-h-[4.25rem] flex items-center justify-center text-center bg-[#070610] p-3.5 cut-sm border border-[#332e59]">
                                {answer}
                            </p>
                        </div>

                        <button
                            type="button"
                            on:click={() => castVote(battle.id, opt.optionId)}
                            class="btn-arcade mt-3 w-full py-3 text-sm"
                            style="--btn-color: {style.btnColor};"
                        >
                            <ArcadeIcon name="vote" className="w-4 h-4" />
                            <span>{$t.voteForThisAnswer || 'VOTE FOR THIS ANSWER'}</span>
                        </button>
                    </div>
                {/each}
            </div>
        </div>

    {:else if battle && amIWatching}
        <!-- Competitor or Voted Spectator State -->
        <div class="flex-1 min-h-0 flex flex-col items-center text-center p-3.5 sm:p-4 bg-[#131126] border-2 border-[#332e59] cut-md overflow-y-auto max-w-md md:max-w-xl mx-auto w-full">
            <div class="my-auto w-full flex flex-col items-center">
                <div class="w-12 h-12 cut-sm bg-purple-950/80 border-2 border-purple-400 flex items-center justify-center text-purple-300 mb-2">
                    <ArcadeIcon name={isCompetitor ? 'sword' : 'vote'} className="w-6 h-6" />
                </div>

                <h2 class="text-base sm:text-lg font-display text-white uppercase tracking-wider mb-1">
                    {#if isCompetitor}
                        {$t.youAreCompeting || 'YOUR BATTLE!'}
                    {:else}
                        {$t.voteSubmitted || 'VOTE SUBMITTED!'}
                    {/if}
                </h2>
                <p class="text-xs sm:text-sm text-slate-300 font-sans max-w-xs mb-2.5">
                    {#if isCompetitor}
                        {$t.waitingForVotes || 'Other players are voting on your punchline...'}
                    {:else}
                        {$t.waitingForOtherVotes || 'Waiting for remaining votes to be locked in...'}
                    {/if}
                </p>

                {#if votingOptions.length > 0}
                    <div class="w-full space-y-1.5 mb-3 text-left">
                        {#each votingOptions as opt, i (opt.optionId)}
                            {@const style = cardStyles[i % cardStyles.length]}
                            <div class="bg-[#070610] border {style.cardBorder} cut-sm px-2.5 py-2">
                                <span class="text-[10px] font-display uppercase tracking-wider {style.badgeText} block mb-0.5">
                                    {$t[`answer${['A','B','C','D'][i]}`] || style.label}
                                </span>
                                <p class="text-xs sm:text-sm text-slate-200 whitespace-pre-wrap break-words leading-snug">
                                    {renderAnswer(opt.answer)}
                                </p>
                            </div>
                        {/each}
                    </div>
                {/if}

                <div class="cut-sm px-3.5 py-1.5 bg-cyan-950/90 border border-cyan-400/60 text-cyan-300 font-mono text-xs sm:text-sm font-bold">
                    {$t.votedRatio
                        ? $t.votedRatio.replace('{voted}', votedCount).replace('{total}', totalVoters)
                        : `${votedCount} / ${totalVoters} VOTED`}
                </div>
            </div>
        </div>

        <!-- 4 SVG Arcade Reactions Footer (NO Avatars) -->
        <footer class="mt-2.5 pt-2 border-t border-[#332e59] flex-shrink-0">
            <SvgReactionButtons compact={true} />
        </footer>

    {:else}
        <div class="flex-1 flex flex-col justify-center items-center text-center p-4">
            <h1 class="text-lg font-display text-amber-300 uppercase tracking-wide mb-2">{$t.votingPhase || 'VOTING PHASE'}</h1>
            <p class="text-xs text-slate-400 animate-pulse">{$t.waitingForVotes || 'Waiting for votes...'}</p>
        </div>
    {/if}
</div>
