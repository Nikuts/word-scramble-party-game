<script>
    import { onDestroy } from 'svelte';
    import { t, flyingEmojis, sendMessage, gameState, gamePhase, gamePlayers, phaseTimer, currentRound, tvMode, toggleTvMode } from '../../stores.js';
    import { tweened } from 'svelte/motion';
    import { cubicOut } from 'svelte/easing';
    import LoadingSpinner from '../shared/LoadingSpinner.svelte';
    import SevenSegmentDisplay from '../shared/SevenSegmentDisplay.svelte';
    import PixelAvatar from '../shared/PixelAvatar.svelte';
    import { triggerConfetti } from '../utils.js';
    
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
        const currentBattle = $gameState.battleSchedule[$gameState.currentVotingBattleIndex];
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

    $: topScore = $gamePhase === 'results' && $gamePlayers.length > 0 ? [...$gamePlayers].sort((a, b) => b.score - a.score)[0].score : 0;

    onDestroy(() => {
        if (scoreAnimationId) cancelAnimationFrame(scoreAnimationId);
    });

    $: {
        if ($gamePhase === 'generating_round' && !loadingMessage) {
            const messages = $t.generatingRoundMessages || [$t.pleaseWait];
            loadingMessage = messages[Math.floor(Math.random() * messages.length)];
        } else if ($gamePhase !== 'generating_round') {
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
</script>

<div class="p-4 sm:p-8 flex flex-col md:flex-row gap-8 min-h-screen relative host-game-container">
    <!-- Player List Sidebar -->
    <aside class="w-full md:w-2/5 panel-arcade flex flex-col" style="--neon-color: var(--color-primary); --neon-color-rgb: var(--color-primary-rgb);">
        <h2 class="text-2xl mb-4 text-primary" style="text-shadow: 0 0 5px var(--color-primary);">{$t.players} ({$gamePlayers.length})</h2>
        <div class="flex-grow overflow-y-auto pr-2 space-y-3">
            {#each $gamePlayers as p (p.id)}
                <div class="flex items-center gap-4 bg-neutral-900/80 p-3 border border-neutral-700 rounded-md" data-player-id={p.id}>
                    <div class="w-12 h-12 flex-shrink-0">
                        <PixelAvatar avatar={p.avatar} />
                    </div>
                    <div class="flex-grow min-w-0">
                        <p class="text-lg font-medium flex items-center gap-2">
                            <span class="truncate">{p.name}</span>
                            {#if p.isHost}
                                <span class="px-2 py-1 bg-warning text-black text-xs font-display rounded-sm flex-shrink-0">{$t.host}</span>
                            {/if}
                        </p>
                        <p class="text-primary font-bold text-xl">
                            {$gamePhase === 'results' 
                                ? (displayedScores[p.id] !== undefined ? displayedScores[p.id] : p.score) 
                                : Math.round($animatedScores[p.id] || p.score)}
                            {$t.score}
                        </p>
                    </div>
                    {#if !p.socketId}
                        <span class="px-2 py-1 bg-danger text-white text-xs font-display rounded-sm animate-pulse flex-shrink-0">{$t.disconnected.toUpperCase()}</span>
                    {/if}
                </div>
            {/each}
        </div>
        <div class="mt-4 pt-4 border-t border-neutral-700">
            <p>{$t.chosenTheme}: <span class="font-bold text-primary">{$gameState.theme}</span></p>
        </div>
    </aside>

    <!-- Main Content Area -->
    <main class="w-full md:w-3/5 flex flex-col items-center py-8" class:flex-grow={$gamePhase === 'generating_round'}>
        {#if $gamePhase === 'generating_round'}
             <LoadingSpinner message={loadingMessage} />
        {:else if $gamePhase === 'get_ready'}
            <div class="text-center">
                <h1 class="text-3xl sm:text-4xl my-4 text-primary animate-pulse">{$t.getReadyTitle}</h1>
                <h2 class="text-xl sm:text-2xl text-accent">{$t.getReadySubtitle.replace('{currentRound}', $currentRound)}</h2>
                 <SevenSegmentDisplay time={$phaseTimer} />
            </div>
        {:else if $gamePhase === 'question' || $gamePhase === 'battle_answering'}
            <div class="text-center w-full">
                <SevenSegmentDisplay time={$phaseTimer} />
                {#if $gamePhase === 'question'}
                    <h1 class="text-3xl sm:text-4xl my-4">{$t.questionPhase}</h1>
                    <h2 class="text-xl sm:text-2xl text-primary">{$t.roundStatus.replace('{currentRound}', $currentRound)}</h2>
                {:else}
                    <h1 class="text-3xl sm:text-4xl my-4">{$currentRound === 3 ? $t.finalRound : $t.battlePhase}</h1>
                    <h2 class="text-xl sm:text-2xl text-primary">{$t.answering}</h2>
                {/if}

                <div class="mt-6 w-full max-w-4xl mx-auto">
                    <p class="text-lg font-bold mb-3">{$t.waitingFor}:</p>
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {#each $gamePlayers as p (p.id)}
                            {@const isConnected = !!p.socketId}
                            <div class="p-3 bg-neutral-900 border border-neutral-700 flex items-center gap-3 rounded-md transition-opacity {isConnected ? 'opacity-100' : 'opacity-50'}">
                                <div class="w-10 h-10 flex-shrink-0">
                                    <PixelAvatar avatar={p.avatar} />
                                </div>
                                <div class="flex-grow text-left min-w-0">
                                    <p class="font-bold truncate">{p.name}</p>
                                    {#if !isConnected}
                                        <p class="text-xs font-display text-danger animate-pulse">{$t.disconnected}</p>
                                    {:else if $gamePhase === 'question'}
                                        {@const totalQs = $gameState.playerAnswers[p.id]?.questions.length || 0}
                                        {@const answeredQs = $gameState.playerAnswers[p.id]?.questions.filter(q => !!q.answer).length || 0}
                                        <p class="text-xs font-display {answeredQs === totalQs ? 'text-green-400' : 'text-yellow-400 animate-pulse'}">{answeredQs}/{totalQs} {$t.answered}</p>
                                    {:else if $gamePhase === 'battle_answering'}
                                         {@const totalBattles = $gameState.battleSchedule.filter(b => b.competitors.includes(p.id)).length}
                                         {@const answeredBattles = $gameState.battleSchedule.filter(b => b.competitors.includes(p.id) && !!b.answers[p.id]).length}
                                         <p class="text-xs font-display {answeredBattles === totalBattles ? 'text-green-400' : 'text-yellow-400 animate-pulse'}">{answeredBattles}/{totalBattles} {$t.answered}</p>
                                    {/if}
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            </div>
        {:else if $gamePhase === 'battle_get_ready'}
            <div class="text-center">
                 <SevenSegmentDisplay time={$phaseTimer} />
                 <h1 class="text-3xl sm:text-4xl my-4 text-secondary animate-pulse">{$t.battleGetReadyTitle}</h1>
                 <h2 class="text-xl sm:text-2xl text-primary">{$t.battlePhase}</h2>
            </div>
        {:else if $gamePhase === 'voting_get_ready'}
            <div class="text-center">
                 <SevenSegmentDisplay time={$phaseTimer} />
                 <h1 class="text-3xl sm:text-4xl my-4 text-primary animate-pulse">{$t.votingGetReadyTitle}</h1>
                 <h2 class="text-xl sm:text-2xl text-accent">{$t.votingPhase}</h2>
            </div>
        {:else if $gamePhase === 'battle_voting'}
            {@const battle = $gameState.battleSchedule[$gameState.currentVotingBattleIndex]}
            <div class="text-center w-full max-w-5xl">
                <SevenSegmentDisplay time={$phaseTimer} />
                <h1 class="text-2xl sm:text-3xl my-4">{$t.voteForBestAnswer}</h1>
                {#if battle}
                    {@const isTrio = battle.competitors.length >= 3}
                    {@const isFinal = !!battle.genre}
                    <div class="mb-4">
                        <span class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-base font-bold tracking-wider border shadow-md {isTrio ? 'bg-purple-950/80 border-purple-400 text-purple-200' : 'bg-cyan-950/80 border-cyan-400 text-cyan-200'}">
                            {isTrio ? $t.brawlLabel : $t.showdownLabel}
                        </span>
                    </div>
                    <div class="text-neutral-300 text-lg sm:text-xl leading-relaxed mb-6 p-4 bg-black/50 border border-neutral-700 rounded-md max-w-4xl mx-auto">
                        {#if isFinal}
                            <p class="mb-2 text-primary font-bold">{battle.genre}</p>
                            <p class="text-base sm:text-lg">{battle.premise}</p>
                        {:else}
                            {battle.prompt}
                        {/if}
                    </div>
                    <div class="grid grid-cols-1 {isTrio ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-6 mt-6">
                        {#each battle.competitors as c_id, i (c_id)}
                            {@const answer = renderAnswer(battle.answers[c_id])}
                            {@const answerLabel = i === 0 ? $t.answerA : (i === 1 ? $t.answerB : (i === 2 ? $t.answerC : $t.answerD))}
                            {@const cardColor = i === 0 ? 'var(--color-primary)' : (i === 1 ? 'var(--color-secondary)' : (i === 2 ? 'var(--color-accent)' : '#a855f7'))}
                            {@const cardRgb = i === 0 ? 'var(--color-primary-rgb)' : (i === 1 ? 'var(--color-secondary-rgb)' : (i === 2 ? 'var(--color-accent-rgb)' : '168, 85, 247'))}
                            <div class="panel-arcade flex-grow" style="--neon-color: {cardColor}; --neon-color-rgb: {cardRgb};">
                                <h3 class="text-xl sm:text-2xl mb-3" style="color: {cardColor};">{answerLabel}</h3>
                                <div class="text-left text-lg sm:text-xl min-h-[8rem] bg-black/50 p-3 border border-neutral-700 rounded-md whitespace-pre-wrap">{answer}</div>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        {:else if $gamePhase === 'battle_result_reveal'}
            {@const battle = $gameState.battleSchedule[$gameState.currentVotingBattleIndex]}
            <div class="w-full text-center">
                <SevenSegmentDisplay time={$phaseTimer} />
                <h1 class="text-3xl sm:text-4xl mb-4">{$t.battleReveal}</h1>
                 {#if battle}
                    {@const isTrio = battle.competitors.length >= 3}
                    {@const winner = $gamePlayers.find(p => p.id === battle.winnerId)}
                    {@const isFinal = !!battle.genre}
                    <div class="mb-4">
                        <span class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-base font-bold tracking-wider border shadow-md {isTrio ? 'bg-purple-950/80 border-purple-400 text-purple-200' : 'bg-cyan-950/80 border-cyan-400 text-cyan-200'}">
                            {isTrio ? $t.brawlLabel : $t.showdownLabel}
                        </span>
                    </div>
                    <div class="panel-arcade w-full max-w-5xl mx-auto" style="--neon-color: var(--color-accent); --neon-color-rgb: var(--color-accent-rgb);">
                         <div class="text-neutral-300 text-lg sm:text-xl leading-relaxed mb-4 p-4 bg-black/50 border border-neutral-700 rounded-md max-w-4xl mx-auto">
                            {#if isFinal}
                                <p class="mb-2 text-primary font-bold">{battle.genre}</p>
                                <p class="text-base sm:text-lg">{battle.premise}</p>
                            {:else}
                                {battle.prompt}
                            {/if}
                        </div>
                         <div class="grid grid-cols-1 {isTrio ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-6">
                            {#each battle.competitors as c_id (c_id)}
                                {@const c = $gamePlayers.find(p => p.id === c_id)}
                                {@const answer = battle.answers[c_id]}
                                {@const isWinner = battle.winnerId === c_id}
                                {@const isTie = !battle.winnerId && battle.pointsAwarded?.[c_id] > 0}
                                <div class="bg-neutral-900 p-4 border-2 rounded-md relative {isWinner ? 'winner-card' : ''} {isTie ? 'ring-2 ring-yellow-500' : 'border-neutral-700'}">
                                    <div class="relative flex items-center gap-4 text-xl sm:text-2xl font-bold mb-3">
                                        <div class="w-12 h-12 flex-shrink-0">
                                            <PixelAvatar avatar={c?.avatar || '❓'} />
                                        </div>
                                        <span class="truncate">{c?.name || $t.disconnected}</span>
                                    </div>
                                    <p class="text-left text-lg sm:text-xl min-h-[8rem] bg-black/75 border border-neutral-600 p-3 rounded-md mt-1 whitespace-pre-wrap">{renderAnswer(answer)}</p>
                                    {#if battle.pointsAwarded?.[c_id] > 0}
                                        <div class="points-reveal-animation">
                                            +{battle.pointsAwarded[c_id]}
                                        </div>
                                    {/if}
                                    <div class="mt-4 text-left">
                                        <p class="text-lg font-bold text-neutral-400 mb-2">{$t.votedForYou}:</p>
                                        <div class="flex flex-wrap gap-2">
                                            {#each Object.entries(battle.votes) as [voterId, votedFor]}
                                                {#if votedFor === c_id}
                                                    {@const voter = $gamePlayers.find(p => p.id === voterId)}
                                                    <span class="px-2 py-1 bg-neutral-800 border border-neutral-600 flex items-center gap-2 text-base rounded-md" title={voter?.name}>
                                                        <div class="w-8 h-8 flex-shrink-0">
                                                            <PixelAvatar avatar={voter?.avatar} />
                                                        </div>
                                                        <span class="truncate">{voter?.name}</span>
                                                    </span>
                                                {/if}
                                            {/each}
                                        </div>
                                    </div>
                                </div>
                            {/each}
                         </div>
                         {#if winner}
                            <p class="text-center text-3xl text-accent mt-6 animate-pulse">{$t.winner}: {winner.name}!</p>
                         {:else if Object.values(battle.pointsAwarded || {}).every(v => v > 0)}
                            <p class="text-center text-3xl text-warning mt-6 animate-pulse">{$t.tie}!</p>
                         {:else}
                             <p class="text-center text-2xl text-neutral-400 mt-6">{$t.noWinner}</p>
                         {/if}

                         {#if battle.royalties && battle.royalties.length > 0}
                            <div class="mt-4 p-3 bg-neutral-900/90 border border-secondary/40 rounded-md text-sm text-neutral-300 flex flex-wrap items-center justify-center gap-2">
                                <span class="text-secondary font-bold">✨ {$t.wordRoyalties}:</span>
                                {#each battle.royalties as roy}
                                    <span class="bg-neutral-800 px-2.5 py-1 rounded border border-neutral-700">
                                        <span class="text-primary font-medium">{roy.authorName}</span> (+{roy.points} pts)
                                    </span>
                                {/each}
                            </div>
                         {/if}
                    </div>
                 {/if}
            </div>
        {:else if $gamePhase === 'results'}
            <div class="w-full text-center">
                <h1 class="text-4xl mb-4 text-warning" style="text-shadow: 0 0 10px #facc15;">{$t.finalScores}</h1>
                <div class="max-w-xl mx-auto mt-8 space-y-4">
                    {#each $gamePlayers as p, i (p.id)}
                        {@const isWinner = p.score > 0 && p.score === topScore}
                        <div class="panel-arcade flex items-center gap-4 text-left {isWinner ? 'final-winner-card' : ''}" style="--neon-color: var(--color-primary); --neon-color-rgb: var(--color-primary-rgb); animation-delay: {i * 0.1}s;">
                            <span class="font-display text-3xl w-12 text-center">{['🥇','🥈','🥉'][i] || i + 1}</span>
                             <div class="w-12 h-12 flex-shrink-0">
                                <PixelAvatar avatar={p.avatar} />
                            </div>
                            <span class="text-2xl font-bold flex-grow">{p.name}</span>
                            <span class="font-display text-3xl text-primary">{displayedScores[p.id] ?? p.score}</span>
                        </div>
                    {/each}
                </div>
                <div class="mt-12">
                    <button class="btn-arcade" style="--btn-color: var(--color-accent);" on:click={() => sendMessage('play-again', { gameId: $gameState.id, loading: true })}>{$t.playAgain}</button>
                </div>
            </div>
        {/if}
    </main>

     <!-- Flying Avatar Container -->
    <div class="absolute top-0 left-0 w-full h-full pointer-events-none">
        {#each $flyingEmojis as emoji (emoji.id)}
            {@const startX = Math.random() * 80 + 10}
            {@const endX = Math.random() * 80 + 10}
            {@const startRotate = Math.random() * 90 - 45}
            {@const endRotate = Math.random() * 540 - 270}
            <div
                class="flying-emoji"
                style="--start-x: {startX}%; --end-x: {endX}%; --start-rotate: {startRotate}deg; --end-rotate: {endRotate}deg;"
                on:animationend={() => removeEmoji(emoji.id)}
            >
                <PixelAvatar avatar={emoji.avatar} />
            </div>
        {/each}
    </div>

    <div class="fixed bottom-4 left-4 z-50 flex items-center gap-2">
        <button 
            on:click={toggleTvMode}
            class="px-3 py-1.5 bg-black/90 text-xs rounded border transition-all font-display flex items-center gap-2 {$tvMode ? 'border-primary text-primary shadow-sm shadow-primary/50' : 'border-neutral-700 text-neutral-400 hover:text-white'}"
            title={$t.tvModeDesc}
        >
            <span>📺</span>
            <span>{$t.tvMode}: {$tvMode ? 'ON' : 'OFF'}</span>
        </button>
    </div>

    <button 
        on:click={handleForceEndGame}
        class="fixed bottom-4 right-4 z-50 px-3 py-1 bg-black text-neutral-300 text-xs rounded border border-neutral-600 hover:bg-danger hover:text-white transition-colors font-display"
        title={$t.endGame}
    >
        {$t.endGame}
    </button>
</div>