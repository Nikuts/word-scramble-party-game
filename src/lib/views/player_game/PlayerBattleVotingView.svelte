<!-- src/lib/views/player_game/PlayerBattleVotingView.svelte -->
<script>
    import { t, sendMessage } from '../../../stores.js';
    import SevenSegmentDisplay from '../../shared/SevenSegmentDisplay.svelte';

    export let timer;
    export let battle;
    export let player;
    export let gameId;
    export let players = [];
    
    $: isMyTurnToVote = battle && !battle.competitors.includes(player?.id) && !battle.votes[player?.id];
    $: amIWatching = battle && (battle.competitors.includes(player?.id) || !!battle.votes[player?.id]);

    function castVote(battleId, voteForPlayerId) {
        if (!battle || !player) return;
        
        sendMessage('vote', {
            gameId: gameId,
            playerId: player.id,
            battleId,
            voteForPlayerId
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
    
    const reactionEmojis = ['🔥', '😂', '💀', '💩', '🤮', '🤯'];

    function sendReaction(emoji) {
        if (!gameId || !player) return;
        sendMessage('send-lobby-emoji', {
            gameId: gameId,
            emoji: emoji
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
            {#if battle?.competitors?.length === 4}
                {$t.quadLabel || '🔥 4-WAY BRAWL'}
            {:else if battle?.competitors?.length === 3}
                {$t.brawlLabel || '💥 3-WAY BRAWL'}
            {:else}
                {$t.duoLabel || '⚡ 1-ON-1 SHOWDOWN'}
            {/if}
        </span>
        <div class="flex-shrink-0">
            <SevenSegmentDisplay time={timer} showLabel={false} size="sm" />
        </div>
    </header>

    {#if battle && isMyTurnToVote}
        {@const isFinalRound = !!battle.genre}
        
        <!-- Prompt Box -->
        <div class="bg-neutral-950/90 border border-neutral-800 rounded-2xl p-3 mb-2.5 text-center shadow-md flex-shrink-0">
            <span class="text-xs font-display font-bold text-cyan-400 uppercase tracking-widest block mb-1">
                {isFinalRound ? ($t.moviePitch || 'MOVIE PREMISE') : ($t.battlePrompt || 'BATTLE PROMPT')}
            </span>
            <p class="text-sm sm:text-base font-bold text-slate-100 leading-snug">
                {isFinalRound ? (battle.premise || battle.prompt) : battle.prompt}
            </p>
        </div>

        <!-- Vertical Single-Column Stack of Full-Width Voting Cards -->
        <div class="flex-1 overflow-y-auto space-y-3 pr-0.5">
            {#each battle.competitors as c_id, i (c_id)}
                {@const c = players.find(p => p.id === c_id)}
                {@const style = cardStyles[i % cardStyles.length]}
                {@const answer = c ? renderAnswer(battle.answers[c.id]) : `(${$t.disconnected})`}
                
                <div class="bg-neutral-950/90 border-2 {style.cardBorder} rounded-2xl p-3.5 shadow-md flex flex-col justify-between transition-all">
                    <div>
                        <div class="flex items-center justify-between mb-2">
                            <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-display font-bold uppercase tracking-wider {style.badgeBg} border {style.badgeBorder} {style.badgeText}">
                                {style.label}
                            </span>
                        </div>
                        <p class="text-sm sm:text-base font-medium text-slate-100 whitespace-pre-wrap leading-relaxed min-h-[3rem] bg-neutral-900/90 p-3 rounded-xl border border-neutral-800">
                            {answer}
                        </p>
                    </div>

                    <!-- Dedicated Vote Button -->
                    <button
                        type="button"
                        disabled={!c}
                        on:click={() => c && castVote(battle.id, c.id)}
                        class="btn-arcade mt-3 w-full py-3.5 bg-gradient-to-r {style.btnBg} text-white font-display font-black text-sm tracking-wider uppercase rounded-xl active:scale-98 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        style="box-shadow: 0 0 15px {style.btnShadow};"
                    >
                        🗳️ {$t.voteForThisAnswer || 'VOTE FOR THIS ANSWER'}
                    </button>
                </div>
            {/each}
        </div>

    {:else if battle && amIWatching}
        <!-- Competitor or Voted Spectator State -->
        <div class="flex-1 flex flex-col justify-center items-center text-center p-4 bg-neutral-950/80 border border-neutral-800 rounded-2xl my-auto">
            <div class="w-16 h-16 rounded-full bg-purple-950/60 border border-purple-400 flex items-center justify-center text-3xl mb-3 shadow-[0_0_20px_rgba(168,85,247,0.4)] animate-bounce">
                {#if battle.competitors.includes(player?.id)}
                    ⚔️
                {:else}
                    🗳️
                {/if}
            </div>
            
            <h2 class="text-base sm:text-lg font-display font-black text-white uppercase tracking-wider mb-1">
                {#if battle.competitors.includes(player?.id)}
                    {$t.youAreCompeting || 'YOU ARE IN THIS BATTLE!'}
                {:else}
                    {$t.voteSubmitted || 'VOTE SUBMITTED!'}
                {/if}
            </h2>
            <p class="text-xs text-slate-400 font-sans max-w-xs animate-pulse">
                {#if battle.competitors.includes(player?.id)}
                    {$t.waitingForVotes || 'Other players are voting on your punchline...'}
                {:else}
                    {$t.waitingForOtherVotes || 'Waiting for remaining votes to be locked in...'}
                {/if}
            </p>
        </div>

        <!-- Docked Live Floating Emoji Reaction Bar -->
        <footer class="mt-2.5 pt-2 border-t border-neutral-800 flex-shrink-0">
            <span class="text-[9px] font-display font-bold text-slate-400 uppercase tracking-widest block text-center mb-1.5">
                {$t.sendReaction || 'REACT LIVE'}
            </span>
            <div class="flex justify-center items-center gap-2">
                {#each reactionEmojis as emoji}
                    <button
                        type="button"
                        on:click={() => sendReaction(emoji)}
                        class="w-10 h-10 rounded-full bg-neutral-900 border border-neutral-700 hover:border-cyan-400 active:scale-125 flex items-center justify-center text-lg shadow-sm transition-transform cursor-pointer"
                    >
                        {emoji}
                    </button>
                {/each}
            </div>
        </footer>

    {:else}
        <!-- Default Waiting State -->
        <div class="flex-1 flex flex-col justify-center items-center text-center p-4">
            <h1 class="text-lg font-display font-black text-amber-400 uppercase tracking-wide mb-2">{$t.votingPhase || 'VOTING PHASE'}</h1>
            <p class="text-xs text-slate-400 animate-pulse">{$t.waitingForVotes || 'Waiting for votes...'}</p>
        </div>
    {/if}
</div>