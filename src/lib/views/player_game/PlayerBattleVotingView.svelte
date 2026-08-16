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
            return `Title: ${title}\nTagline: ${tagline}`;
        }
        return `(${$t.noAnswerSubmitted})`;
    }
    const reactionEmojis = ['🔥', '😂', '💀', '👏', '🤯', '🌈'];

    function sendReaction(emoji) {
        if (!gameId || !player) return;
        sendMessage('send-lobby-emoji', {
            gameId: gameId,
            emoji: emoji
        });
    }
</script>

<div class="w-full max-w-4xl mx-auto text-center">
    <SevenSegmentDisplay time={timer} />
    
    {#if battle && isMyTurnToVote}
        {@const isFinalRound = !!battle.genre}
        
        <h1 class="text-3xl mb-1">{isFinalRound ? $t.voteForBestDialogue : $t.voteForBestAnswer}</h1>
        <h2 class="text-xl text-primary mb-4">{$t.yourTurnToVote}</h2>

        <div class="text-neutral-300 text-xl leading-relaxed mb-6 p-4 bg-neutral-900/50 border border-neutral-700 rounded-md max-w-4xl mx-auto">
            {#if isFinalRound}
                <p class="mb-2 text-primary font-bold">{battle.genre}</p>
                <p class="text-base sm:text-lg">{battle.premise}</p>
            {:else}
                {battle.prompt}
            {/if}
        </div>
        
        <div class="grid grid-cols-1 {battle.competitors.length === 4 ? 'md:grid-cols-2 lg:grid-cols-4' : (battle.competitors.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2')} gap-6 mt-6">
            {#each battle.competitors as c_id, i (c_id)}
                {@const c = players.find(p => p.id === c_id)}
                {@const answerLabel = i === 0 ? $t.answerA : (i === 1 ? $t.answerB : (i === 2 ? $t.answerC : $t.answerD))}
                {@const cardColor = i === 0 ? 'var(--color-primary)' : (i === 1 ? 'var(--color-secondary)' : (i === 2 ? 'var(--color-accent)' : '#a855f7'))}
                {#if c}
                    {@const answer = renderAnswer(battle.answers[c.id])}
                    <div class="flex flex-col panel-arcade" style="--neon-color: {cardColor};">
                        <div class="flex-grow">
                            <h3 class="text-xl mb-3" style="color: {cardColor};">{answerLabel}</h3>
                            <div class="text-left text-lg min-h-[6rem] bg-neutral-900 p-3 border border-neutral-700 rounded-md whitespace-pre-wrap">
                                {answer}
                            </div>
                        </div>
                        <button class="mt-4 w-full btn-arcade" style="--btn-color: {cardColor};" on:click={() => castVote(battle.id, c.id)}>
                            {$t.voteForThisAnswer}
                        </button>
                    </div>
                {:else}
                    <div class="flex flex-col panel-arcade opacity-50" style="--neon-color: #4b5563;">
                        <div class="flex-grow">
                            <h3 class="text-xl mb-3">{answerLabel}</h3>
                            <div class="text-left text-lg min-h-[6rem] bg-neutral-900 p-3 border border-neutral-700 rounded-md whitespace-pre-wrap">
                                <p>({$t.disconnected})</p>
                            </div>
                        </div>
                        <button class="mt-4 w-full btn-arcade" style="--btn-color: #4b5563;" disabled>
                            {$t.voteForThisAnswer}
                        </button>
                    </div>
                {/if}
            {/each}
        </div>
    {:else if battle && amIWatching}
        <h1 class="text-3xl mb-4">{$t.votingPhase}</h1>
        <p class="mt-8 text-2xl text-warning animate-pulse">
            {#if battle.competitors.includes(player.id)}
                {$t.waitingForVotes}
            {:else}
                {$t.waitingForOtherVotes}
            {/if}
        </p>
        
        <div class="mt-10 p-4 bg-neutral-900/60 border border-neutral-700 rounded-lg max-w-md mx-auto">
            <p class="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">{$t.sendReaction}</p>
            <div class="flex justify-center gap-2.5 sm:gap-4">
                {#each reactionEmojis as emoji}
                    <button 
                        class="text-2xl sm:text-3xl p-2 bg-neutral-800 hover:bg-neutral-700 active:scale-125 border border-neutral-600 rounded-full transition-transform shadow-md"
                        on:click={() => sendReaction(emoji)}
                    >
                        {emoji}
                    </button>
                {/each}
            </div>
        </div>
    {:else}
        <h1 class="text-3xl mb-4">{$t.votingPhase}</h1>
        <p class="mt-12 text-2xl text-warning animate-pulse">{$t.waitingForVotes}</p>
    {/if}
</div>