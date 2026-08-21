<script>
    import { t, showBattleHistory, gamePhase, phaseTimer, currentRound, myPlayerQuestions, myBattlesToAnswer, currentVotingBattle, currentPlayerDetails, gameState, flyingEmojis } from '../../../stores.js';
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
    
    $: if ($gamePhase === 'generating_round') {
        if (!loadingMessage) {
            const messages = $t.generatingRoundMessages || [$t.pleaseWait];
            loadingMessage = messages[Math.floor(Math.random() * messages.length)];
        }
    } else {
        loadingMessage = '';
    }
</script>

<div class="h-[100dvh] max-h-[100dvh] w-full flex flex-col justify-between overflow-hidden select-none font-sans box-border relative">
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
        {:else if $gamePhase === 'generating_round'}
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
            <PlayerBattleRevealView timer={$phaseTimer} battle={$currentVotingBattle} player={$currentPlayerDetails} players={$gameState?.players} />
        {:else if $gamePhase === 'results'}
            <PlayerResultsView game={$gameState} player={$currentPlayerDetails} />
        {/if}
    </main>

    <!-- Flying Live Emoji Reactions Overlay -->
    <div class="pointer-events-none fixed inset-0 overflow-hidden z-50">
        {#each $flyingEmojis as emoji (emoji.id)}
            <div 
                class="absolute animate-float-up text-3xl select-none"
                style="left: {emoji.x}%; bottom: 0;"
                on:animationend={() => removeEmoji(emoji.id)}
            >
                {emoji.emoji}
            </div>
        {/each}
    </div>
</div>