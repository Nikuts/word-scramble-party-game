<script>
    import { t, sendMessage, gameState, currentPlayer } from '../../../stores.js';
    import SevenSegmentDisplay from '../../shared/SevenSegmentDisplay.svelte';

    export let timer;

    const reactionEmojis = ['🔥', '😂', '💀', '👏', '🤯', '🌈'];

    function sendReaction(emoji) {
        if (!$gameState || !$currentPlayer) return;
        sendMessage('send-lobby-emoji', {
            gameId: $gameState.id,
            emoji: emoji
        });
    }
</script>

<div class="w-full max-w-4xl mx-auto text-center flex-grow flex flex-col justify-center items-center py-8">
    <SevenSegmentDisplay time={timer} />
    <h1 class="font-display text-3xl sm:text-5xl my-4 text-accent" style="text-shadow: 0 0 10px var(--color-accent);">{$t.battleReveal}</h1>
    <p class="mt-4 text-xl sm:text-2xl font-display text-primary animate-pulse">{$t.pleaseWait}</p>

    <div class="mt-8 p-4 bg-neutral-900/60 border border-neutral-700 rounded-lg max-w-md w-full mx-auto">
        <p class="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">{$t.sendReaction}</p>
        <div class="flex justify-center gap-2.5 sm:gap-4">
            {#each reactionEmojis as emoji}
                <button 
                    class="text-2xl sm:text-3xl p-2 bg-neutral-800 hover:bg-neutral-700 active:scale-125 border border-neutral-600 rounded-full transition-transform shadow-md cursor-pointer"
                    on:click={() => sendReaction(emoji)}
                >
                    {emoji}
                </button>
            {/each}
        </div>
    </div>
</div>