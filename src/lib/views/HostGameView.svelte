<!-- src/lib/views/HostGameView.svelte -->
<script>
    import { onDestroy } from 'svelte';
    import { t, gameState, gamePhase, gamePlayers, phaseTimer, tvMode, toggleTvMode, musicMuted, toggleMusicMuted, activeTimeBoostNotice, activeAllVotesInNotice, currentRound } from '../../stores.js';
    import { tweened } from 'svelte/motion';
    import { cubicOut } from 'svelte/easing';
    import LoadingSpinner from '../shared/LoadingSpinner.svelte';
    import ArcadeIcon from '../shared/ArcadeIcon.svelte';
    import HexBadge from '../shared/HexBadge.svelte';
    import SevenSegmentDisplay from '../shared/SevenSegmentDisplay.svelte';
    import FlyingReactionsOverlay from '../shared/FlyingReactionsOverlay.svelte';
    import { sendMessage } from '../../stores.js';
    import { triggerConfetti } from '../utils.js';
    import HostGetReady from './host_game/HostGetReady.svelte';
    import HostArena from './host_game/HostArena.svelte';
    import HostVoting from './host_game/HostVoting.svelte';
    import HostReveal from './host_game/HostReveal.svelte';
    import HostPodium from './host_game/HostPodium.svelte';

    let loadingMessage = '';
    let lastRevealedBattleId = null;
    let showOrientationHint = true;

    const animatedScores = tweened({}, {
        duration: 500,
        easing: cubicOut,
        interpolate: (a, b) => {
            const result = {};
            const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
            return t => {
                for (const key of allKeys) {
                    const from = a[key] || 0;
                    const to = b[key] || 0;
                    result[key] = (1 - t) * from + t * to;
                }
                return result;
            };
        }
    });

    let lastScoresSignature = '';
    $: if ($gamePlayers) {
        const sig = $gamePlayers.map(p => `${p.id}:${p.score}`).join('|');
        if (sig !== lastScoresSignature) {
            lastScoresSignature = sig;
            const scoresObject = $gamePlayers.reduce((acc, p) => {
                acc[p.id] = p.score;
                return acc;
            }, {});
            animatedScores.set(scoresObject);
        }
    }

    $: if ($gamePhase === 'battle_result_reveal') {
        const currentBattle = $gameState.battleSchedule?.[$gameState.currentVotingBattleIndex];
        if (currentBattle && currentBattle.id !== lastRevealedBattleId && currentBattle.winnerId) {
            lastRevealedBattleId = currentBattle.id;
            setTimeout(() => triggerConfetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } }), 1000);
        }
    } else {
        lastRevealedBattleId = null;
    }

    let finalResultsShown = false;
    let displayedScores = {};
    let scoreAnimationId;

    onDestroy(() => {
        if (scoreAnimationId) cancelAnimationFrame(scoreAnimationId);
    });

    $: {
        if (($gamePhase === 'generating_round' || $gamePhase === 'preparing_battles') && !loadingMessage) {
            const messages = $t.generatingRoundMessages || [$t.pleaseWait];
            loadingMessage = messages[Math.floor(Math.random() * messages.length)];
        } else if ($gamePhase !== 'generating_round' && $gamePhase !== 'preparing_battles') {
            loadingMessage = '';
        }

        if ($gamePhase === 'results' && !finalResultsShown) {
            finalResultsShown = true;
            setTimeout(() => triggerConfetti({ particleCount: 250, spread: 120, origin: { y: 0.4 } }), 500);

            const players = $gamePlayers;
            players.forEach(p => displayedScores[p.id] = 0);

            const animationDuration = 2000;
            let startTime;

            function animateScores(timestamp) {
                if (!startTime) startTime = timestamp;
                const progress = Math.min((timestamp - startTime) / animationDuration, 1);

                players.forEach(p => {
                    const finalScore = p.score;
                    const animatedScore = Math.floor(progress * finalScore);
                    displayedScores[p.id] = displayedScores[p.id] < finalScore ? animatedScore : finalScore;
                });

                displayedScores = { ...displayedScores };

                if (progress < 1) {
                    scoreAnimationId = requestAnimationFrame(animateScores);
                } else {
                    players.forEach(p => { displayedScores[p.id] = p.score; });
                    displayedScores = { ...displayedScores };
                }
            }
            scoreAnimationId = requestAnimationFrame(animateScores);
        } else if ($gamePhase !== 'results' && finalResultsShown) {
            finalResultsShown = false;
            displayedScores = {};
            if (scoreAnimationId) cancelAnimationFrame(scoreAnimationId);
        }
    }

    function handleForceEndGame() {
        if (confirm($t.confirmEndGame)) {
            sendMessage('force-end-game', { gameId: $gameState.id });
        }
    }

    $: isResultsPhase = $gamePhase === 'results';
    $: isRevealPhase = $gamePhase === 'battle_result_reveal';
    $: isLoadingPhase = $gamePhase === 'generating_round' || $gamePhase === 'preparing_battles';
</script>

<div class="h-full max-h-full lg:h-screen-safe lg:max-h-screen-safe w-full flex flex-col justify-start lg:justify-between p-2 sm:p-3 2xl:p-5 max-w-[min(98vw,210vh)] mx-auto safe-top safe-bottom relative select-none font-sans host-game-container overflow-y-auto lg:overflow-hidden box-border gap-2 2xl:gap-3.5">

    {#if showOrientationHint}
        <div class="lg:hidden w-full cut-sm bg-cyan-950/90 border border-cyan-400 text-cyan-200 px-3 py-1.5 flex items-center justify-between text-xs font-display flex-shrink-0">
            <div class="flex items-center gap-2">
                <ArcadeIcon name="rotate" className="w-3.5 h-3.5" />
                <span>{$t.rotateDeviceHint || 'Tip: Rotate device to landscape for full display view'}</span>
            </div>
            <button
                type="button"
                class="text-cyan-300 hover:text-white px-1.5 py-0.5 text-xs font-bold cursor-pointer"
                on:click={() => showOrientationHint = false}
                aria-label="Dismiss orientation hint"
            >
                <ArcadeIcon name="close" className="w-3.5 h-3.5" />
            </button>
        </div>
    {/if}

    {#if $activeTimeBoostNotice}
        <div class="fixed top-16 inset-x-0 flex justify-center z-50 pointer-events-none px-4">
            <div class="cut-sm animate-bounce bg-amber-400 text-black px-4 py-1.5 font-display border-2 border-white flex items-center gap-2 text-sm sm:text-base shadow-lg">
                <ArcadeIcon name="clock" className="w-4 h-4" />
                <span>{$t.timeBoostUsed.replace('{name}', $activeTimeBoostNotice.playerName)}</span>
            </div>
        </div>
    {/if}

    {#if $activeAllVotesInNotice && $gamePhase === 'battle_voting'}
        <div class="fixed top-20 inset-x-0 flex justify-center z-50 pointer-events-none px-4">
            <div class="cut-sm animate-bounce bg-emerald-400 text-black px-5 py-2 font-display tracking-wider border-2 border-white flex items-center gap-2 text-sm sm:text-base shadow-lg">
                <ArcadeIcon name="vote" className="w-4 h-4" />
                <span>{($t.allVotesIn || 'ALL VOTES IN!').replace(/^🗳️\s*/, '')}</span>
            </div>
        </div>
    {/if}

    <!-- Prototype v5 Unified Top HUD Bar -->
    <header class="relative z-20 flex-shrink-0 w-full flex items-center justify-between gap-2">
        <!-- Left Wing: Dedicated Full-Width Topic / Theme -->
        <div class="flex-1 min-w-0 min-h-[38px] sm:min-h-[42px] 2xl:min-h-[48px] cut-sm host-hud-surface border border-[color:rgba(var(--color-primary-rgb),0.65)] px-3 sm:px-4 2xl:px-5 py-1.5 sm:py-2 2xl:py-2.5 flex items-center">
            <span
                class="font-display text-xs sm:text-base lg:text-lg 2xl:text-xl text-slate-100 tracking-wide truncate block w-full"
                title={$gameState.theme || ''}
            >
                {$gameState.theme || '...'}
            </span>
        </div>

        <!-- Center Hex Crest: Timer, AI Loading, or FINAL -->
        <div class="flex-shrink-0">
            {#if isResultsPhase}
                <HexBadge borderClass="text-amber-400/90" className="px-5 sm:px-7 2xl:px-8 py-1.5 sm:py-2 text-amber-300 font-display text-base sm:text-xl 2xl:text-2xl leading-none" contentClass="flex items-center gap-1.5">
                    <ArcadeIcon name="trophy" className="w-4 h-4 sm:w-5 sm:h-5 2xl:w-6 2xl:h-6" />
                    <span>{$t.finalTag || 'FINAL'}</span>
                </HexBadge>
            {:else if isLoadingPhase}
                <HexBadge borderClass="text-cyan-400/90" className="px-5 sm:px-7 2xl:px-8 py-1.5 sm:py-2 text-cyan-300 font-display text-base sm:text-xl 2xl:text-2xl leading-none" contentClass="flex items-center gap-1.5">
                    <ArcadeIcon name="sparkles" className="w-4 h-4 sm:w-5 sm:h-5 2xl:w-6 2xl:h-6" />
                    <span>{$t.aiLabel || 'AI'}</span>
                </HexBadge>
            {:else}
                <SevenSegmentDisplay
                    time={$phaseTimer}
                    size="sm"
                    showLabel={false}
                    hex={true}
                    disableLowWarning={isRevealPhase}
                />
            {/if}
        </div>

        <!-- Right Wing: Round Status + Unified Host Utility Cluster (TV Mode, Music, End) -->
        <div class="flex-1 min-w-0 min-h-[38px] sm:min-h-[42px] 2xl:min-h-[48px] cut-sm host-hud-surface border border-[color:rgba(var(--color-secondary-rgb),0.65)] px-1.5 sm:px-3 lg:px-4 2xl:px-5 py-1.5 sm:py-2 2xl:py-2.5 flex items-center justify-between gap-1 sm:gap-2">
            {#if isResultsPhase}
                <span class="hidden sm:inline font-display text-xs sm:text-sm lg:text-base 2xl:text-lg text-secondary tracking-widest uppercase truncate">
                    {$t.matchComplete || 'MATCH COMPLETE'}
                </span>
            {:else}
                <span class="hidden sm:inline font-display text-xs sm:text-sm lg:text-base 2xl:text-lg text-emerald-400 tracking-widest uppercase truncate">
                    {$t.round ? `${$t.round} ${$currentRound || 1} / 3` : `ROUND ${$currentRound || 1} / 3`}
                </span>
            {/if}
            <div class="flex items-center gap-1 sm:gap-1.5 flex-shrink-0 ml-auto">
                <button
                    type="button"
                    on:click={toggleTvMode}
                    class="cut-sm p-1.5 sm:px-2.5 sm:py-1 lg:px-3 2xl:px-3.5 2xl:py-1.5 host-card-surface border text-xs sm:text-sm 2xl:text-base font-display transition-colors flex items-center justify-center gap-1.5 cursor-pointer flex-shrink-0 {$tvMode ? 'border-primary text-primary' : 'border-[color:var(--color-surface-border)] text-slate-300 hover:text-white'}"
                    title={$t.tvModeDesc}
                    aria-label={$t.tvLowPowerMode || 'Toggle TV Mode'}
                >
                    <ArcadeIcon name="tv" className="w-3.5 h-3.5 2xl:w-4 2xl:h-4" />
                    <span class="hidden sm:inline">{$tvMode ? ($t.tvOn || 'TV ON') : ($t.tvOff || 'TV OFF')}</span>
                </button>
                <button
                    type="button"
                    on:click={toggleMusicMuted}
                    class="cut-sm p-1.5 sm:px-2.5 sm:py-1.5 2xl:px-3 2xl:py-1.5 host-card-surface border transition-colors flex items-center justify-center cursor-pointer flex-shrink-0 {$musicMuted ? 'border-[color:var(--color-surface-border)] text-slate-400 hover:text-white' : 'border-emerald-400/70 text-emerald-300 hover:text-emerald-200'}"
                    title={$musicMuted ? ($t.musicOff || 'Music Off') : ($t.musicOn || 'Music On')}
                    aria-label={$t.toggleMusic || 'Toggle music'}
                    aria-pressed={!$musicMuted}
                    data-testid="music-toggle-btn"
                >
                    <ArcadeIcon name={$musicMuted ? 'music-off' : 'music'} className="w-3.5 h-3.5 2xl:w-4 2xl:h-4" />
                </button>
                <button
                    type="button"
                    on:click={handleForceEndGame}
                    class="cut-sm p-1.5 lg:px-3 lg:py-1 2xl:px-3.5 2xl:py-1.5 host-card-surface border border-[color:var(--color-surface-border)] hover:border-danger hover:bg-rose-950/70 text-slate-300 hover:text-rose-200 text-xs sm:text-sm 2xl:text-base font-display transition-colors cursor-pointer flex items-center justify-center gap-1.5 flex-shrink-0"
                    title={$t.endGame}
                    aria-label={$t.endGame || 'End Game'}
                >
                    <ArcadeIcon name="close" className="w-3.5 h-3.5 2xl:w-4 2xl:h-4" />
                    <span class="hidden lg:inline">{$t.endTag || 'END'}</span>
                </button>
            </div>
        </div>
    </header>

    {#if isLoadingPhase}
        <main class="flex-1 flex flex-col items-center justify-center my-auto min-h-0 w-full">
            <LoadingSpinner
                message={loadingMessage}
                stageBadge={$gamePhase === 'generating_round'
                    ? ($t.preparingRound ? $t.preparingRound.replace('{currentRound}', $currentRound || 1) : `PREPARING ROUND ${$currentRound || 1}`)
                    : ($t.aiBuildBattles || 'MATCHING BATTLES')}
                activeStep={$gamePhase === 'generating_round' ? 1 : 2}
            />
        </main>

    {:else if $gamePhase === 'get_ready' || $gamePhase === 'battle_get_ready' || $gamePhase === 'voting_get_ready'}
        <HostGetReady animatedScores={$animatedScores} />

    {:else if $gamePhase === 'question' || $gamePhase === 'battle_answering'}
        <HostArena animatedScores={$animatedScores} />

    {:else if $gamePhase === 'battle_voting'}
        <HostVoting />

    {:else if isRevealPhase}
        <HostReveal animatedScores={$animatedScores} />

    {:else if isResultsPhase}
        <HostPodium {displayedScores} />
    {/if}

    <FlyingReactionsOverlay />
</div>
