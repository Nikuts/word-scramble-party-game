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
    <p class="text-2xl sm:text-3xl mb-4">{$t.finalScores}: <span class="text-primary">{player?.score || 0}</span></p>

    {#if game?.superlatives}
        {@const sups = game.superlatives}
        {@const myBadges = Object.entries(sups).filter(([k, v]) => v?.playerId === player?.id)}
        {#if myBadges.length > 0}
            <div class="mt-2 mb-6 p-3 bg-neutral-900 border border-yellow-500/50 rounded-lg max-w-sm w-full text-center">
                <p class="text-xs font-bold uppercase tracking-wider text-yellow-400 mb-2">🎖️ {$t.superlativesTitle}</p>
                <div class="flex flex-wrap justify-center gap-2">
                    {#each myBadges as [badgeKey, badgeData]}
                        <span class="px-2.5 py-1 bg-yellow-950/80 border border-yellow-400 text-yellow-200 text-xs font-extrabold rounded-full shadow">
                            {$t[`${badgeKey}Title`]}
                        </span>
                    {/each}
                </div>
            </div>
        {/if}
    {/if}

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