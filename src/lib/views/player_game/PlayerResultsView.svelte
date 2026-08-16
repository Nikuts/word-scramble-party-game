<script>
    import { t, showBattleHistory, sendMessage, resetToMenu } from '../../../stores.js';

    export let game;
    export let player;

    $: myRankData = game && player ? game.players.map((p, i) => ({...p, rank: i + 1})).find(p => p.id === player.id) : null;
    $: myRank = myRankData ? myRankData.rank : 0;
</script>

<div class="text-center w-full flex flex-col justify-center items-center flex-grow py-12">
    <h1 class="text-4xl sm:text-5xl mb-6 text-accent" style="text-shadow: 0 0 10px var(--color-accent);">{$t.gameOver}</h1>
    {#if myRank > 0}
        <p class="text-2xl sm:text-3xl mb-2">{$t.yourRank}: <span class="text-warning">{['🥇','🥈','🥉'][myRank - 1] || `${myRank}`}</span></p>
    {/if}
    <p class="text-2xl sm:text-3xl mb-8">{$t.finalScores}: <span class="text-primary">{player?.score || 0}</span></p>

    <div class="mt-4 flex flex-col sm:flex-row gap-4">
        <button on:click={resetToMenu} class="btn-arcade btn-neutral">{$t.mainMenu}</button>
        {#if player?.isHost}
            <button on:click={() => sendMessage('play-again', { gameId: game.id, loading: true })} class="btn-arcade text-xl" style="--btn-color: var(--color-accent);">{$t.playAgain}</button>
        {/if}
    </div>
    
    {#if game?.battleHistory && game.battleHistory.length > 0}
    <div class="mt-8 border-t-2 border-neutral-700 pt-6 w-full max-w-sm">
         <button on:click={() => showBattleHistory.set(true)} class="btn-arcade text-lg w-full" style="--btn-color: var(--color-primary);">{$t.viewBattleHistory}</button>
    </div>
    {/if}
</div>