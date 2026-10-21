<script>
    import { onDestroy } from 'svelte';
    import { t, flyingEmojis, sendMessage, gameState, gamePhase, gamePlayers, tvMode, toggleTvMode, activeTimeBoostNotice, activeAllVotesInNotice } from '../../stores.js';
    import { tweened } from 'svelte/motion';
    import { cubicOut } from 'svelte/easing';
    import LoadingSpinner from '../shared/LoadingSpinner.svelte';
    import PixelAvatar from '../shared/PixelAvatar.svelte';
    import { triggerConfetti } from '../utils.js';
    import HostGetReady from './host_game/HostGetReady.svelte';
    import HostArena from './host_game/HostArena.svelte';
    import HostVoting from './host_game/HostVoting.svelte';
    import HostReveal from './host_game/HostReveal.svelte';
    import HostPodium from './host_game/HostPodium.svelte';
    
    let loadingMessage = '';
    let lastRevealedBattleId = null;

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

    $: if ($gamePlayers) {
        const scoresObject = $gamePlayers.reduce((acc, p) => {
            acc[p.id] = p.score;
            return acc;
        }, {});
        animatedScores.set(scoresObject);
    }
    
    $: if ($gamePhase === 'battle_result_reveal') {
        const currentBattle = $gameState.battleSchedule?.[$gameState.currentVotingBattleIndex];
        if (currentBattle && currentBattle.id !== lastRevealedBattleId && currentBattle.winnerId) {
            lastRevealedBattleId = currentBattle.id;
            setTimeout(() => triggerConfetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } }), 200);
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
                    if (displayedScores[p.id] < finalScore) {
                        displayedScores[p.id] = animatedScore;
                    } else {
                        displayedScores[p.id] = finalScore;
                    }
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

    function removeEmoji(id) {
        flyingEmojis.update(all => all.filter(e => e.id !== id));
    }

    let showOrientationHint = true;
</script>

<!-- Full-Width Host Game Arena Layout (Zero Scroll on Desktop/TV, Smooth Touch Scroll on Tablet/Mobile) -->
<div class="min-h-screen lg:h-screen lg:max-h-[100dvh] w-full flex flex-col justify-between p-2 sm:p-3 lg:p-4 max-w-7xl mx-auto safe-top safe-bottom relative select-none font-sans host-game-container overflow-y-auto lg:overflow-hidden box-border pb-2 sm:pb-3">
    
    <!-- Subtle Orientation Hint on Portrait Screens -->
    {#if showOrientationHint}
        <div class="lg:hidden w-full bg-cyan-950/90 border border-cyan-400 text-cyan-200 px-3 py-1.5 rounded-xl mb-1 flex items-center justify-between text-xs font-display shadow-md flex-shrink-0 animate-fade-in">
            <div class="flex items-center gap-2">
                <span class="text-sm">🔄</span>
                <span>{$t.rotateDeviceHint || 'Tip: Rotate device to landscape for full TV display view'}</span>
            </div>
            <button 
                type="button" 
                class="text-cyan-400 hover:text-white px-1.5 py-0.5 text-xs font-bold cursor-pointer" 
                on:click={() => showOrientationHint = false}
                aria-label="Dismiss orientation hint"
            >
                ✕
            </button>
        </div>
    {/if}

    {#if $activeTimeBoostNotice}
        <div class="fixed top-6 right-6 z-50 animate-bounce bg-yellow-400 text-black px-4 py-2 rounded-lg font-display font-extrabold shadow-[0_0_20px_rgba(250,204,21,0.8)] border-2 border-white flex items-center gap-2">
            <span class="text-xl">⏱️</span>
            <span>{$t.timeBoostUsed.replace('{name}', $activeTimeBoostNotice.playerName)}</span>
        </div>
    {/if}

    {#if $activeAllVotesInNotice}
        <div class="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-bounce bg-emerald-400 text-black px-5 py-2 rounded-full font-display font-black tracking-wider shadow-[0_0_25px_rgba(52,211,153,0.9)] border-2 border-white flex items-center gap-2 text-sm sm:text-base pointer-events-none">
            <span>{$t.allVotesIn || '🗳️ ALL VOTES IN!'}</span>
        </div>
    {/if}

    <!-- Top Header: TV Mode on Left, Neon Theme Marquee in Center, End Game on Right -->
    <header class="flex-shrink-0 mb-1 sm:mb-1.5 w-full flex items-center justify-between gap-2 px-1">
        <!-- Left: TV Mode Button -->
        <div class="flex items-center">
            <button 
                type="button"
                on:click={toggleTvMode}
                class="px-2 sm:px-2.5 py-1 bg-black/90 text-[10px] sm:text-xs rounded-lg border transition-all font-display flex items-center gap-1.5 cursor-pointer {$tvMode ? 'border-primary text-primary shadow-sm shadow-primary/50' : 'border-neutral-700 text-neutral-400 hover:text-white'}"
                title={$t.tvModeDesc}
            >
                <span>📺</span>
                <span class="hidden sm:inline">{$t.tvMode || 'TV MODE'}: {$tvMode ? 'ON' : 'OFF'}</span>
                <span class="sm:hidden">{$tvMode ? 'TV ON' : 'TV OFF'}</span>
            </button>
        </div>

        <!-- Center: Theme Marquee -->
        <div class="px-3 sm:px-5 py-1 sm:py-1.5 rounded-xl bg-black/90 border-2 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] text-center flex-1 min-w-0 max-w-2xl lg:max-w-4xl mx-1 sm:mx-2">
            <span class="text-[9px] sm:text-[10px] font-display uppercase tracking-widest text-cyan-400 font-bold block leading-tight">
                {$t.chosenTheme || 'CHOSEN THEME'}
            </span>
            <span class="font-black text-amber-300 font-display text-xs sm:text-sm lg:text-base tracking-wide drop-shadow-[0_0_10px_rgba(252,211,77,0.5)] leading-snug break-words line-clamp-2 block">
                {$gameState.theme || '...'}
            </span>
        </div>

        <!-- Right: End Game Button -->
        <div class="flex items-center">
            <button 
                type="button"
                on:click={handleForceEndGame}
                class="px-2 sm:px-2.5 py-1 bg-neutral-900 border border-neutral-700 hover:border-danger/80 hover:bg-danger/20 text-neutral-400 hover:text-danger text-[10px] sm:text-xs rounded-lg transition-colors font-display cursor-pointer flex items-center gap-1"
                title={$t.endGame}
            >
                <span>🛑</span>
                <span class="hidden sm:inline">{$t.endGame || 'END GAME'}</span>
                <span class="sm:hidden">{$t.end || 'END'}</span>
            </button>
        </div>
    </header>

    {#if $gamePhase === 'generating_round' || $gamePhase === 'preparing_battles'}
        <!-- Phase: Generating Round / Preparing Battles -->
        <main class="flex-1 flex items-center justify-center my-auto min-h-0">
            <LoadingSpinner message={loadingMessage} allowRetry={false} />
        </main>

    {:else if $gamePhase === 'get_ready' || $gamePhase === 'battle_get_ready' || $gamePhase === 'voting_get_ready'}
        <HostGetReady />

    {:else if $gamePhase === 'question' || $gamePhase === 'battle_answering'}
        <HostArena animatedScores={$animatedScores} />

    {:else if $gamePhase === 'battle_voting'}
        <HostVoting />

    {:else if $gamePhase === 'battle_result_reveal'}
        <HostReveal animatedScores={$animatedScores} />

    {:else if $gamePhase === 'results'}
        <HostPodium {displayedScores} />
    {/if}

    <!-- Bottom Live Players Score Ribbon (Rendered for Get Ready, Voting, Reveal) -->
    {#if $gamePhase !== 'question' && $gamePhase !== 'battle_answering' && $gamePhase !== 'generating_round' && $gamePhase !== 'preparing_battles' && $gamePhase !== 'results'}
        {@const isReveal = $gamePhase === 'battle_result_reveal'}
        {@const currentBattle = $gameState.battleSchedule?.[$gameState.currentVotingBattleIndex]}
        {@const isLargeRoster = $gamePlayers.length > 8}
        <footer class="w-full flex items-center justify-center {isLargeRoster ? 'gap-1' : 'gap-1.5 sm:gap-2.5'} flex-wrap pt-1 flex-shrink-0 max-w-7xl mx-auto">
            {#each $gamePlayers as p (p.id)}
                {@const isWinner = isReveal && currentBattle?.winnerId === p.id}
                <div class="flex items-center {isLargeRoster ? 'gap-1 px-1.5 py-0.5 rounded-lg' : 'gap-2 px-2.5 sm:px-3 py-1 rounded-xl'} bg-neutral-950/90 border-2 {isWinner ? 'border-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.8)] ring-1 ring-yellow-400/40' : 'border-neutral-700/90'} shadow-md" data-player-id={p.id}>
                    <div class="{isLargeRoster ? 'w-4 h-4 sm:w-5 sm:h-5' : 'w-6 h-6 sm:w-7 sm:h-7'} flex-shrink-0">
                        <PixelAvatar avatar={p.avatar} />
                    </div>
                    <span class="font-display {isLargeRoster ? 'text-[10px] sm:text-xs' : 'text-xs sm:text-sm'} text-slate-100 font-bold whitespace-nowrap">{p.name}</span>
                    {#if isWinner}
                        <span class="text-xs sm:text-sm">👑</span>
                    {/if}
                    <span class="font-mono {isLargeRoster ? 'text-[10px] sm:text-xs' : 'text-xs sm:text-sm'} text-cyan-300 font-black ml-0.5">
                        {Math.round($animatedScores[p.id] || p.score)}
                    </span>
                </div>
            {/each}
        </footer>
    {/if}

    <!-- Flying Avatar & Emoji Container -->
    <div class="fixed inset-0 w-full h-full pointer-events-none overflow-hidden z-50">
        {#each $flyingEmojis as emoji (emoji.id)}
            {@const startX = emoji.startX ?? (Math.random() * 75 + 10)}
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
                        <span class="text-5xl sm:text-6xl filter drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] leading-none">{emoji.emoji}</span>
                        {#if emoji.avatar}
                            <div class="w-6 h-6 -mt-1.5 opacity-90 scale-90 rounded-full bg-black/60 p-0.5 border border-white/40 shadow-sm">
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