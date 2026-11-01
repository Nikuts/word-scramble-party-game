<script>
    import { t, showBattleHistory, gamePhase, phaseTimer, currentRound, myPlayerQuestions, myBattlesToAnswer, currentVotingBattle, currentPlayerDetails, gameState, flyingEmojis, activeAllVotesInNotice } from '../../../stores.js';
    import { tweened } from 'svelte/motion';
    import { cubicOut } from 'svelte/easing';
    import LoadingSpinner from '../../shared/LoadingSpinner.svelte';

    // Import all the new phase-specific components
    import PlayerGetReadyView from './PlayerGetReadyView.svelte';
    import PlayerQuestionView from './PlayerQuestionView.svelte';
    import PlayerBattleGetReadyView from './PlayerBattleGetReadyView.svelte';
    import PlayerBattleAnsweringView from './PlayerBattleAnsweringView.svelte';
    import PlayerVotingGetReadyView from './PlayerVotingGetReadyView.svelte';
    import PlayerBattleVotingView from './PlayerBattleVotingView.svelte';
    import PlayerBattleRevealView from './PlayerBattleRevealView.svelte';
    import PlayerResultsView from './PlayerResultsView.svelte';
    import PlayerBattleHistoryView from './PlayerBattleHistoryView.svelte';
    import PixelAvatar from '../../shared/PixelAvatar.svelte';

    let loadingMessage = '';
    
    function removeEmoji(id) {
        flyingEmojis.update(all => all.filter(e => e.id !== id));
    }
    
    const animatedScore = tweened($currentPlayerDetails?.score || 0, {
        duration: 400,
        easing: cubicOut
    });
    $: animatedScore.set($currentPlayerDetails?.score || 0);
    
    $: if ($gamePhase === 'generating_round' || $gamePhase === 'preparing_battles') {
        if (!loadingMessage) {
            const messages = $t.generatingRoundMessages || [$t.pleaseWait];
            loadingMessage = messages[Math.floor(Math.random() * messages.length)];
        }
    } else {
        loadingMessage = '';
    }
</script>

<div class="h-[100dvh] max-h-[100dvh] w-full flex flex-col justify-between overflow-hidden select-none font-sans box-border relative">
    {#if $activeAllVotesInNotice}
        <div class="fixed top-14 left-1/2 -translate-x-1/2 z-50 animate-bounce bg-emerald-400 text-black px-4 py-1.5 rounded-full font-display font-black tracking-wider shadow-[0_0_20px_rgba(52,211,153,0.9)] border-2 border-white flex items-center gap-1.5 text-xs sm:text-sm pointer-events-none">
            <span>{$t.allVotesIn || '🗳️ ALL VOTES IN!'}</span>
        </div>
    {/if}

    {#if $currentPlayerDetails}
        <header class="flex-shrink-0 bg-neutral-950/95 px-3.5 py-1.5 z-10 border-b-2 pt-[max(6px,env(safe-area-inset-top))]" style="border-color: var(--color-secondary); box-shadow: 0 0 10px var(--color-secondary);">
            <div class="w-full max-w-md mx-auto flex items-center justify-between gap-3">
                <div class="flex items-center gap-2.5 min-w-0">
                    <div class="w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0">
                        <PixelAvatar avatar={$currentPlayerDetails.avatar} />
                    </div>
                    <div class="min-w-0">
                        <div class="flex items-center gap-1.5">
                            <span class="font-bold text-sm sm:text-base truncate block text-white">{$currentPlayerDetails.name}</span>
                            {#if $currentPlayerDetails.isHost}
                                <span class="px-1.5 py-0.2 bg-warning text-black text-[9px] font-display font-bold rounded">{$t.host || 'HOST'}</span>
                            {/if}
                        </div>
                    </div>
                </div>
                <div class="text-right flex-shrink-0">
                    <span class="font-bold text-lg sm:text-xl text-primary font-mono">{Math.round($animatedScore)}</span>
                    <span class="text-xs text-neutral-400 font-display"> {$t.score || 'PTS'}</span>
                </div>
            </div>
        </header>
    {/if}

    <main class="flex-1 min-h-0 w-full flex flex-col overflow-hidden relative">
        {#if $showBattleHistory && $gamePhase === 'results'}
            <PlayerBattleHistoryView game={$gameState} player={$currentPlayerDetails} />
        {:else if $gamePhase === 'generating_round' || $gamePhase === 'preparing_battles'}
            <LoadingSpinner message={loadingMessage} />
        {:else if $gamePhase === 'get_ready'}
            <PlayerGetReadyView timer={$phaseTimer} round={$currentRound} />
        {:else if $gamePhase === 'question'}
            <PlayerQuestionView timer={$phaseTimer} questions={$myPlayerQuestions}/>
        {:else if $gamePhase === 'battle_get_ready'}
            <PlayerBattleGetReadyView timer={$phaseTimer} />
        {:else if $gamePhase === 'battle_answering'}
            <PlayerBattleAnsweringView 
                timer={$phaseTimer} 
                battlesToAnswer={$myBattlesToAnswer}
                gameId={$gameState?.id}
                playerId={$currentPlayerDetails?.id}
            />
        {:else if $gamePhase === 'voting_get_ready'}
            <PlayerVotingGetReadyView timer={$phaseTimer} />
        {:else if $gamePhase === 'battle_voting'}
            <PlayerBattleVotingView timer={$phaseTimer} battle={$currentVotingBattle} player={$currentPlayerDetails} gameId={$gameState?.id} players={$gameState?.players}/>
        {:else if $gamePhase === 'battle_result_reveal'}
            <PlayerBattleRevealView timer={$phaseTimer} battle={$currentVotingBattle} player={$currentPlayerDetails} gameId={$gameState?.id} players={$gameState?.players} />
        {:else if $gamePhase === 'results'}
            <PlayerResultsView game={$gameState} player={$currentPlayerDetails} />
        {/if}
    </main>

    <!-- Flying Live Emoji Reactions Overlay -->
    <div class="pointer-events-none fixed inset-0 overflow-hidden z-50">
        {#each $flyingEmojis as emoji (emoji.id)}
            {@const startX = emoji.startX ?? 50}
            {@const endX = emoji.endX ?? startX}
            {@const startRotate = emoji.startRotate ?? 0}
            {@const endRotate = emoji.endRotate ?? 0}
            <div 
                class="flying-emoji"
                style="--start-x: {startX}vw; --end-x: {endX}vw; --start-rotate: {startRotate}deg; --end-rotate: {endRotate}deg;"
                on:animationend={() => removeEmoji(emoji.id)}
            >
                {#if emoji.emoji}
                    <div class="flex flex-col items-center select-none pointer-events-none">
                        <span class="text-4xl sm:text-5xl filter drop-shadow-[0_0_12px_rgba(255,255,255,0.8)] leading-none">{emoji.emoji}</span>
                        {#if emoji.avatar}
                            <div class="w-5 h-5 -mt-1 opacity-90 scale-90 rounded-full bg-black/60 p-0.5 border border-white/40 shadow-sm">
                                <PixelAvatar avatar={emoji.avatar} />
                            </div>
                        {/if}
                    </div>
                {:else}
                    <PixelAvatar avatar={emoji.avatar} />
                {/if}
            </div>
        {/each}
    </div>
</div>