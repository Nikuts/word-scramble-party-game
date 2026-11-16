<!-- src/lib/views/player_game/PlayerBattleVotingView.svelte -->
<script>
    import { t, sendMessage } from '../../../stores.js';
    import SevenSegmentDisplay from '../../shared/SevenSegmentDisplay.svelte';
    import PixelAvatar from '../../shared/PixelAvatar.svelte';

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
            if (answer === '::TIMEOUT::') return `(${$t.noAnswerSubmitted})`;
            return answer;
        }
        if (typeof answer === 'object' && answer !== null && (answer.title || answer.tagline)) {
            let title = (answer.title || '...').trim();
            let tagline = (answer.tagline || '...').trim();
            if (title === '::TIMEOUT::') title = `(${$t.noAnswerSubmitted})`;
            if (tagline === '::TIMEOUT::' || tagline === '') tagline = '...';
            return `"${title}"\n${tagline}`;
        }
        return `(${$t.noAnswerSubmitted})`;
    }
    
    function sendReaction() {
        if (!gameId || !player) return;
        sendMessage('send-lobby-emoji', {
            gameId: gameId
        });
    }

    const cardStyles = [
        { label: 'ANSWER A', badgeBg: 'bg-cyan-950/80', badgeBorder: 'border-cyan-400', badgeText: 'text-cyan-300', cardBorder: 'border-cyan-500/60', btnBg: 'from-cyan-500 to-blue-600', btnShadow: 'rgba(6,182,212,0.6)' },
        { label: 'ANSWER B', badgeBg: 'bg-pink-950/80', badgeBorder: 'border-pink-400', badgeText: 'text-pink-300', cardBorder: 'border-pink-500/60', btnBg: 'from-pink-500 to-rose-600', btnShadow: 'rgba(236,72,153,0.6)' },
        { label: 'ANSWER C', badgeBg: 'bg-emerald-950/80', badgeBorder: 'border-emerald-400', badgeText: 'text-emerald-300', cardBorder: 'border-emerald-500/60', btnBg: 'from-emerald-500 to-teal-600', btnShadow: 'rgba(16,185,129,0.6)' },
        { label: 'ANSWER D', badgeBg: 'bg-purple-950/80', badgeBorder: 'border-purple-400', badgeText: 'text-purple-300', cardBorder: 'border-purple-500/60', btnBg: 'from-purple-500 to-indigo-600', btnShadow: 'rgba(168,85,247,0.6)' }
    ];
</script>

<div class="w-full h-full max-h-full min-h-0 flex flex-col justify-between p-3 pb-[max(8px,env(safe-area-inset-bottom))] max-w-md mx-auto select-none font-sans overflow-hidden box-border">
    
    <!-- Top Header: Bounded Format Badge & Mini Timer -->
    <header class="flex items-center justify-between gap-2 mb-2 flex-shrink-0 bg-neutral-950/90 border border-neutral-800 rounded-xl px-3 py-1.5 backdrop-blur-md">
        <span class="inline-flex items-center justify-center px-3 py-0.5 rounded-full text-[11px] font-display font-black uppercase tracking-wider bg-purple-950 text-purple-300 border border-purple-500/50 flex-shrink-0">
            {#if compCount === 4}
                {$t.quadLabel || '🔥 4-WAY BRAWL'}
            {:else if compCount === 3}
                {$t.brawlLabel || '💥 3-WAY BRAWL'}
            {:else}
                {$t.duoLabel || '⚡ 1-ON-1 SHOWDOWN'}
            {/if}
        </span>
        <div class="flex-shrink-0">
            <SevenSegmentDisplay time={timer} showLabel={false} size="sm" />
        </div>
    </header>

    {#if battle && (battle.prompt || battle.premise)}
        {@const isFinalRound = !!battle.genre}
        <!-- Prompt Box (U6: visible on voting phone) -->
        <div class="bg-neutral-950/95 border border-neutral-800 rounded-2xl p-2.5 sm:p-3 mb-2 text-center shadow-md flex-shrink-0 max-h-28 overflow-y-auto">
            <span class="text-xs font-display font-bold text-cyan-400 uppercase tracking-widest block mb-0.5">
                {isFinalRound ? ($t.moviePitch || 'MOVIE PREMISE') : ($t.battlePrompt || 'BATTLE PROMPT')}
            </span>
            {#if isFinalRound && battle.genre}
                <p class="text-xs font-display font-bold text-amber-300 uppercase tracking-wider mb-0.5">{battle.genre}</p>
            {/if}
            <p class="text-sm sm:text-base font-bold text-slate-100 leading-snug break-words">
                {isFinalRound ? (battle.premise || battle.prompt) : battle.prompt}
            </p>
        </div>
    {/if}

    {#if battle && isMyTurnToVote}
        <!-- Vertical Single-Column Stack of Full-Width Anonymous Voting Cards -->
        <div class="flex-1 min-h-0 overflow-y-auto space-y-3 pr-0.5 pb-2">
            {#each votingOptions as opt, i (opt.optionId)}
                {@const style = cardStyles[i % cardStyles.length]}
                {@const answer = renderAnswer(opt.answer)}
                
                <div class="bg-neutral-950/95 border-2 {style.cardBorder} rounded-2xl p-3.5 shadow-md flex flex-col justify-between transition-all">
                    <div>
                        <div class="flex items-center justify-between mb-2">
                            <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-display font-bold uppercase tracking-wider {style.badgeBg} border {style.badgeBorder} {style.badgeText}">
                                {$t[`answer${['A','B','C','D'][i]}`] || style.label}
                            </span>
                        </div>
                        <p class="text-sm sm:text-base font-medium text-slate-100 whitespace-pre-wrap break-words leading-relaxed min-h-[3rem] bg-neutral-900/90 p-3 rounded-xl border border-neutral-800">
                            {answer}
                        </p>
                    </div>

                    <!-- Dedicated Vote Button -->
                    <button
                        type="button"
                        on:click={() => castVote(battle.id, opt.optionId)}
                        class="btn-arcade mt-3 w-full py-3.5 bg-gradient-to-r {style.btnBg} text-white hover:!text-white font-display font-black text-sm tracking-wider uppercase rounded-xl !border-white/30 active:scale-98 transition-all cursor-pointer"
                        style="box-shadow: 0 0 15px {style.btnShadow};"
                    >
                        🗳️ {$t.voteForThisAnswer || 'VOTE FOR THIS ANSWER'}
                    </button>
                </div>
            {/each}
        </div>

    {:else if battle && amIWatching}
        <!-- Competitor or Voted Spectator State (U8: shows live vote tally) -->
        <div class="flex-1 min-h-0 flex flex-col justify-center items-center text-center p-4 bg-neutral-950/80 border border-neutral-800 rounded-2xl my-auto overflow-y-auto">
            <div class="w-16 h-16 rounded-full bg-purple-950/60 border border-purple-400 flex items-center justify-center text-3xl mb-3 shadow-[0_0_20px_rgba(168,85,247,0.4)] animate-bounce">
                {#if isCompetitor}
                    ⚔️
                {:else}
                    🗳️
                {/if}
            </div>
            
            <h2 class="text-base sm:text-lg font-display font-black text-white uppercase tracking-wider mb-1">
                {#if isCompetitor}
                    {$t.youAreCompeting || 'YOUR BATTLE!'}
                {:else}
                    {$t.voteSubmitted || 'VOTE SUBMITTED!'}
                {/if}
            </h2>
            <p class="text-xs text-slate-400 font-sans max-w-xs mb-3 animate-pulse">
                {#if isCompetitor}
                    {$t.waitingForVotes || 'Other players are voting on your punchline...'}
                {:else}
                    {$t.waitingForOtherVotes || 'Waiting for remaining votes to be locked in...'}
                {/if}
            </p>
            <div class="px-3.5 py-1.5 rounded-full bg-cyan-950/90 border border-cyan-500/60 text-cyan-300 font-mono text-xs sm:text-sm font-bold shadow-sm">
                🗳️ {votedCount} / {totalVoters} {$t.voters || 'VOTED'}
            </div>
        </div>

        <!-- Docked Live Floating Avatar Reaction Button -->
        <footer class="mt-2.5 pt-2 border-t border-neutral-800 flex-shrink-0 flex flex-col items-center">
            <span class="text-[9px] font-display font-bold text-slate-400 uppercase tracking-widest block text-center mb-1.5">
                {$t.sendReaction || 'SEND AVATAR REACTION'}
            </span>
            <button
                type="button"
                data-testid="send-reaction-btn"
                aria-label={$t.sendReaction || 'Send Reaction'}
                on:click={() => sendReaction()}
                class="w-12 h-12 rounded-full bg-neutral-900 border-2 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.5)] hover:scale-105 active:scale-95 flex items-center justify-center p-1.5 transition-transform cursor-pointer"
            >
                <PixelAvatar avatar={player?.avatar || '🦊'} className="w-full h-full" />
            </button>
        </footer>

    {:else}
        <!-- Default Waiting State -->
        <div class="flex-1 flex flex-col justify-center items-center text-center p-4">
            <h1 class="text-lg font-display font-black text-amber-400 uppercase tracking-wide mb-2">{$t.votingPhase || 'VOTING PHASE'}</h1>
            <p class="text-xs text-slate-400 animate-pulse">{$t.waitingForVotes || 'Waiting for votes...'}</p>
        </div>
    {/if}
</div>