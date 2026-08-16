<script>
    import { t, showBattleHistory, gamePhase, phaseTimer, currentRound, myPlayerQuestions, myBattlesToAnswer, currentVotingBattle, currentPlayerDetails, gameState } from '../../../stores.js';
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

{#if $currentPlayerDetails}
<div class="fixed top-0 left-0 right-0 bg-neutral-950/95 px-4 py-2 z-10 border-b-2" style="border-color: var(--color-secondary); box-shadow: 0 0 10px var(--color-secondary);">
    <div class="w-full max-w-4xl mx-auto flex items-center justify-between gap-4">
        <div class="flex items-center gap-3 min-w-0">
            <div class="w-12 h-12 flex-shrink-0">
                <PixelAvatar avatar={$currentPlayerDetails.avatar} />
            </div>
            <div class="min-w-0">
                <span class="font-bold text-lg truncate block">{$currentPlayerDetails.name}</span>
                {#if $currentPlayerDetails.isHost}
                    <span class="px-2 py-1 bg-warning text-black text-xs font-display rounded-sm">{$t.host}</span>
                {/if}
            </div>
        </div>
        <div class="text-right flex-shrink-0">
            <span class="font-bold text-2xl text-primary">{Math.round($animatedScore)}</span>
            <span class="text-sm text-neutral-400"> {$t.score}</span>
        </div>
    </div>
</div>
{/if}


<div class="min-h-screen flex flex-col items-center p-4 pt-24 w-full">
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
        <PlayerBattleRevealView timer={$phaseTimer} />

    {:else if $gamePhase === 'results'}
        <PlayerResultsView game={$gameState} player={$currentPlayerDetails} />
    {/if}
</div>