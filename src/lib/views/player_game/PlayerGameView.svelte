<script>
    import { t, showBattleHistory, gamePhase, phaseTimer, currentRound, myPlayerQuestions, myBattlesToAnswer, currentVotingBattle, currentPlayerDetails, gameState, activeAllVotesInNotice, musicMuted, toggleMusicMuted } from '../../../stores.js';
    import { tweened } from 'svelte/motion';
    import { cubicOut } from 'svelte/easing';
    import LoadingSpinner from '../../shared/LoadingSpinner.svelte';

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
    import ArcadeIcon from '../../shared/ArcadeIcon.svelte';
    import FlyingReactionsOverlay from '../../shared/FlyingReactionsOverlay.svelte';

    let loadingMessage = '';

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

<div class="h-screen-safe max-h-screen-safe w-full flex flex-col justify-between overflow-hidden select-none font-sans box-border relative">
    {#if $activeAllVotesInNotice && $gamePhase === 'battle_voting'}
        <div class="fixed top-14 inset-x-0 flex justify-center z-50 pointer-events-none px-4">
            <div class="cut-sm animate-bounce bg-emerald-400 text-black px-4 py-1.5 font-display tracking-wider border-2 border-white flex items-center gap-1.5 text-xs sm:text-sm shadow-lg">
                <ArcadeIcon name="vote" className="w-4 h-4" />
                <span>{($t.allVotesIn || 'ALL VOTES IN!').replace(/^🗳️\s*/, '')}</span>
            </div>
        </div>
    {/if}

    {#if $currentPlayerDetails}
        <header class="flex-shrink-0 bg-[#131126] px-3.5 py-1.5 z-10 border-b-2 pt-[max(6px,env(safe-area-inset-top))]" style="border-color: var(--color-secondary);">
            <div class="w-full max-w-md md:max-w-4xl mx-auto flex items-center justify-between gap-3">
                <div class="flex items-center gap-2.5 min-w-0">
                    <div class="w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0">
                        <PixelAvatar avatar={$currentPlayerDetails.avatar} />
                    </div>
                    <div class="min-w-0">
                        <div class="flex items-center gap-1.5">
                            <span class="font-display text-sm sm:text-base truncate block text-white">{$currentPlayerDetails.name}</span>
                            {#if $currentPlayerDetails.isHost}
                                <span class="cut-sm px-1.5 py-0.5 bg-amber-400 text-black text-[9px] font-display">{$t.host || 'HOST'}</span>
                            {/if}
                        </div>
                    </div>
                </div>
                <div class="flex items-center gap-2 flex-shrink-0">
                    {#if $currentPlayerDetails.isHost}
                        <button
                            type="button"
                            on:click={toggleMusicMuted}
                            data-testid="player-music-toggle-btn"
                            aria-label={$t.toggleMusic || 'Toggle music'}
                            aria-pressed={!$musicMuted}
                            title={$musicMuted ? ($t.musicOff || 'Music Off') : ($t.musicOn || 'Music On')}
                            class="cut-sm p-1.5 border transition-colors flex items-center justify-center cursor-pointer {$musicMuted
                                ? 'bg-[#0a0914] border-[#332e59] text-slate-400 hover:text-white'
                                : 'bg-emerald-950/60 border-emerald-400/75 text-emerald-300 hover:text-emerald-200'}"
                        >
                            <ArcadeIcon name={$musicMuted ? 'music-off' : 'music'} className="w-4 h-4" />
                        </button>
                    {/if}
                    <div class="text-right flex-shrink-0">
                        <span class="font-bold text-lg sm:text-xl text-primary font-mono">{Math.round($animatedScore).toLocaleString()}</span>
                        <span class="text-xs text-slate-400 font-display"> {$t.pts || $t.score || 'PTS'}</span>
                    </div>
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

    <FlyingReactionsOverlay />
</div>
