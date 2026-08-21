<script>
    import { onDestroy } from 'svelte';
    import { t, flyingEmojis, sendMessage, gameState, gamePhase, gamePlayers, phaseTimer, currentRound, tvMode, toggleTvMode, activeTimeBoostNotice } from '../../stores.js';
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
            if (answer === '::TIMEOUT::') return `(${$t.noAnswerSubmitted || 'No answer submitted'})`;
            return answer;
        }
        if (typeof answer === 'object' && answer !== null && (answer.title || answer.tagline)) {
            let title = (answer.title || '...').trim();
            let tagline = (answer.tagline || '...').trim();
            if (title === '::TIMEOUT::') title = `(${$t.noAnswerSubmitted || 'No answer submitted'})`;
            if (tagline === '::TIMEOUT::' || tagline === '') tagline = '...';
            return `Title: ${title}\nTagline: ${tagline}`;
        }
        return `(${$t.noAnswerSubmitted || 'No answer submitted'})`;
    }

    function getWordColorClass(authorIndex) {
        if (authorIndex === 0) return 'text-cyan-300 font-bold';
        if (authorIndex === 1) return 'text-pink-300 font-bold';
        if (authorIndex === 2) return 'text-emerald-300 font-bold';
        if (authorIndex === 3) return 'text-amber-300 font-bold';
        if (authorIndex === 4) return 'text-purple-300 font-bold';
        return 'text-neutral-300';
    }

    const cardStyles = [
        { border: 'border-cyan-400', text: 'text-cyan-400', bg: 'bg-cyan-950/30' },
        { border: 'border-fuchsia-400', text: 'text-fuchsia-400', bg: 'bg-fuchsia-950/30' },
        { border: 'border-amber-400', text: 'text-amber-400', bg: 'bg-amber-950/30' },
        { border: 'border-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-950/30' }
    ];
</script>

<!-- Full-Width Host Game Arena Layout (Zero Scroll 100% Viewport Height Clamping) -->
<div class="w-full h-screen max-h-[100dvh] flex flex-col justify-between p-2 sm:p-3.5 lg:p-4 max-w-7xl mx-auto safe-top safe-bottom relative select-none font-sans host-game-container overflow-hidden box-border pb-11">
    {#if $activeTimeBoostNotice}
        <div class="fixed top-6 right-6 z-50 animate-bounce bg-yellow-400 text-black px-4 py-2 rounded-lg font-display font-extrabold shadow-[0_0_20px_rgba(250,204,21,0.8)] border-2 border-white flex items-center gap-2">
            <span class="text-xl">⏱️</span>
            <span>{$t.timeBoostUsed.replace('{name}', $activeTimeBoostNotice.playerName)}</span>
        </div>
    {/if}

    <!-- Top Prominent Neon Theme Marquee (Shown across all active phases) -->
    <header class="flex-shrink-0 mb-1.5 sm:mb-2 text-center">
        <div class="px-5 py-1.5 sm:py-2 inline-block max-w-4xl mx-auto rounded-lg bg-black/80 border-2 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
            <span class="text-[9px] sm:text-[10px] font-display uppercase tracking-widest text-cyan-400/80 font-bold block mb-0.5">
                {$t.chosenTheme || 'CHOSEN THEME'}
            </span>
            <span class="font-bold text-amber-300 font-display text-sm sm:text-base lg:text-lg tracking-wide drop-shadow-[0_0_10px_rgba(252,211,77,0.5)]">
                {$gameState.theme || '...'}
            </span>
        </div>
    </header>

    {#if $gamePhase === 'generating_round'}
        <!-- Phase: Generating Round -->
        <main class="flex-1 flex items-center justify-center my-auto">
            <LoadingSpinner message={loadingMessage} />
        </main>

    {:else if $gamePhase === 'get_ready' || $gamePhase === 'battle_get_ready' || $gamePhase === 'voting_get_ready'}
        <!-- Phase: Get Ready Splashes -->
        {@const isBattleGetReady = $gamePhase === 'battle_get_ready'}
        {@const isVotingGetReady = $gamePhase === 'voting_get_ready'}
        {@const titleText = isBattleGetReady 
            ? ($t.battleGetReadyTitle || 'BATTLE INCOMING!') 
            : (isVotingGetReady ? ($t.votingGetReadyTitle || 'GET READY TO VOTE!') : ($t.getReadyTitle || 'GET READY!'))}
        {@const subtitleText = isBattleGetReady 
            ? ($t.battlePhase || 'BATTLE PHASE') 
            : (isVotingGetReady ? ($t.votingPhase || 'VOTING PHASE') : ($t.getReadySubtitle?.replace('{currentRound}', $currentRound) || `ROUND ${$currentRound} IS COMING UP!`))}
        {@const phaseIcon = isBattleGetReady ? '⚔️' : (isVotingGetReady ? '🗳️' : '⚡')}
        {@const themeBorderColor = isBattleGetReady ? 'border-fuchsia-500 text-fuchsia-400' : (isVotingGetReady ? 'border-emerald-500 text-emerald-400' : 'border-cyan-400 text-cyan-400')}

        <main class="flex-1 flex flex-col items-center justify-center my-auto py-2">
            <div class="w-full max-w-xl bg-neutral-950/80 border-2 {themeBorderColor} rounded-2xl p-6 md:p-8 shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-md flex flex-col items-center text-center my-auto">
                <div class="text-4xl md:text-5xl mb-2 animate-bounce">{phaseIcon}</div>
                <h1 class="text-2xl md:text-4xl font-display font-black tracking-wider uppercase mb-1 text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]">{titleText}</h1>
                <h2 class="text-base md:text-xl font-display font-bold text-cyan-300 tracking-widest uppercase mb-4">{subtitleText}</h2>
                <div class="scale-100 mb-2">
                    <SevenSegmentDisplay time={$phaseTimer} />
                </div>
                <p class="text-[10px] md:text-xs font-mono text-slate-400 uppercase tracking-widest mt-1 animate-pulse">
                    {$t.prepareControllers || 'Prepare your controllers'}
                </p>
            </div>
        </main>

    {:else if $gamePhase === 'question' || $gamePhase === 'battle_answering'}
        <!-- Phase: Question & Battle Answering (Option 1 Adaptive Grid) -->
        <div class="flex-shrink-0 text-center mb-2 sm:mb-3">
            <div class="scale-75 sm:scale-90 -my-1">
                <SevenSegmentDisplay time={$phaseTimer} />
            </div>
            <h1 class="text-lg sm:text-xl lg:text-2xl font-display font-black tracking-wider text-primary drop-shadow-[0_0_12px_rgba(var(--color-primary-rgb),0.6)] mt-1">
                {$t.roundStatus ? $t.roundStatus.replace('{currentRound}', $currentRound) : `ROUND ${$currentRound}`} · {$gamePhase === 'question' ? ($t.questionPhase || 'QUESTION').toUpperCase() : ($currentRound === 3 ? ($t.finalRound || 'FINAL BATTLE').toUpperCase() : ($t.battlePhase || 'BATTLE').toUpperCase())}
            </h1>
        </div>

        <main class="flex-1 flex items-center justify-center min-h-0 py-1">
            <div class="w-full grid gap-2.5 sm:gap-3.5 {$gamePlayers.length <= 6 ? 'grid-cols-2 md:grid-cols-3 max-w-4xl' : 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 max-w-6xl'} mx-auto">
                {#each $gamePlayers as p (p.id)}
                    {@const isConnected = !!p.socketId}
                    {@const isQuestionPhase = $gamePhase === 'question'}
                    {@const totalItems = isQuestionPhase 
                        ? ($gameState.playerAnswers?.[p.id]?.questions?.length || 3) 
                        : ($gameState.battleSchedule?.filter(b => b.competitors?.includes(p.id))?.length || 1)}
                    {@const answeredItems = isQuestionPhase 
                        ? ($gameState.playerAnswers?.[p.id]?.questions?.filter(q => !!q.answer)?.length || 0) 
                        : ($gameState.battleSchedule?.filter(b => b.competitors?.includes(p.id) && !!b.answers?.[p.id])?.length || 0)}
                    {@const isComplete = isConnected && answeredItems >= totalItems && totalItems > 0}
                    {@const isWorking = isConnected && answeredItems > 0 && !isComplete}
                    {@const progressPct = totalItems > 0 ? Math.round((answeredItems / totalItems) * 100) : 0}

                    <div class="panel-arcade p-2.5 sm:p-3 rounded-lg flex flex-col justify-between border-neutral-700/90 bg-black/85 shadow-md transition-all duration-300">
                        <div class="flex items-center gap-2 mb-1.5">
                            <div class="{$gamePlayers.length > 8 ? 'w-8 h-8 sm:w-10 sm:h-10' : 'w-10 h-10 sm:w-12 sm:h-12'} flex-shrink-0">
                                <PixelAvatar avatar={p.avatar} />
                            </div>
                            <div class="min-w-0 flex-1 text-left">
                                <div class="flex items-center gap-1">
                                    <p class="font-bold text-xs sm:text-sm text-slate-100 whitespace-nowrap">{p.name}</p>
                                    {#if p.isHost}
                                        <span class="px-1 py-0.2 bg-warning text-black text-[8px] font-display rounded font-bold flex-shrink-0">{$t.host || 'HOST'}</span>
                                    {/if}
                                </div>
                                <p class="text-primary font-mono font-bold text-xs leading-tight">
                                    {Math.round($animatedScores[p.id] || p.score)} <span class="text-[9px] text-slate-400 font-display">{$t.pts || 'PTS'}</span>
                                </p>
                            </div>
                        </div>

                        <div class="w-full mt-auto pt-1">
                            <div class="flex items-center justify-between text-[9px] sm:text-[10px] font-display font-bold mb-1">
                                {#if !isConnected}
                                    <span class="text-danger animate-pulse font-bold">{$t.disconnected || 'OFFLINE'}</span>
                                {:else if isComplete}
                                    <span class="text-emerald-400 flex items-center gap-1 font-black">
                                        ✓ {$t.ready || 'READY!'}
                                    </span>
                                {:else if isWorking}
                                    <span class="text-cyan-300 flex items-center gap-1 animate-pulse">
                                        ✍️ {$t.answering || 'Assembling...'}
                                    </span>
                                {:else}
                                    <span class="text-amber-300 flex items-center gap-1">
                                        💭 {$t.thinking || 'Thinking...'}
                                    </span>
                                {/if}
                                <span class="font-mono text-slate-400">{answeredItems}/{totalItems}</span>
                            </div>

                            <div class="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden border border-neutral-700/60">
                                <div 
                                    class="h-full transition-all duration-500 {
                                        !isConnected ? 'bg-red-500' : (isComplete ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : (isWorking ? 'bg-cyan-400' : 'bg-amber-400'))
                                    }" 
                                    style="width: {isConnected ? progressPct : 0}%;"
                                ></div>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        </main>

    {:else if $gamePhase === 'battle_voting'}
        <!-- Phase: Battle Voting Arena -->
        {@const battle = $gameState.battleSchedule?.[$gameState.currentVotingBattleIndex]}
        {#if battle}
            {@const isQuad = battle.competitors?.length === 4}
            {@const isTrio = battle.competitors?.length === 3}
            {@const isFinal = !!battle.genre}
            {@const formatBadgeText = isQuad ? ($t.quadLabel || '🔥 4-WAY BRAWL') : (isTrio ? ($t.brawlLabel || '💥 3-WAY BRAWL') : ($t.showdownLabel || '⚡ 1-ON-1 SHOWDOWN'))}
            {@const formatBadgeColor = isQuad ? 'bg-orange-950/90 border-orange-400 text-orange-200' : (isTrio ? 'bg-purple-950/90 border-purple-400 text-purple-200' : 'bg-cyan-950/90 border-cyan-400 text-cyan-200')}

            <!-- Stage Header: Timer & Format Badge -->
            <div class="flex flex-col items-center mb-1.5 flex-shrink-0">
                <div class="scale-75 -my-1">
                    <SevenSegmentDisplay time={$phaseTimer} />
                </div>
                <div class="flex items-center gap-2 mt-1">
                    <span class="px-2.5 py-0.5 rounded-full text-[11px] font-display font-black tracking-wider uppercase border shadow-md {formatBadgeColor}">
                        {formatBadgeText}
                    </span>
                    <span class="text-[11px] font-display font-bold text-slate-300 tracking-widest uppercase">
                        {$t.voteForBestAnswer || 'VOTE FOR THE FUNNIEST ANSWER'}
                    </span>
                </div>
            </div>

            <!-- Prompt Banner Card -->
            <div class="w-full max-w-5xl bg-neutral-950/80 border-2 border-cyan-400/60 rounded-xl px-4 py-2 mb-2 shadow-[0_0_20px_rgba(6,182,212,0.15)] text-center backdrop-blur-md flex-shrink-0">
                <span class="text-[9px] font-display font-bold text-cyan-400 uppercase tracking-widest block">
                    {isFinal ? ($t.finalBattleTheme || 'FINAL BATTLE PREMISE') : ($t.battlePrompt || 'BATTLE PROMPT')}
                </span>
                {#if isFinal}
                    <p class="text-sm font-bold text-amber-300 mb-0.5">{battle.genre}</p>
                    <p class="text-base md:text-lg font-sans font-bold text-white leading-snug">{battle.premise}</p>
                {:else}
                    <p class="text-base md:text-lg font-sans font-bold text-white leading-snug">{battle.prompt}</p>
                {/if}
            </div>

            <!-- Full-Width Wider Answer Arena Cards -->
            <main class="w-full max-w-7xl grid grid-cols-1 {isQuad ? 'md:grid-cols-4 gap-3' : (isTrio ? 'md:grid-cols-3 gap-4' : 'md:grid-cols-2 gap-6')} mb-2 flex-1 items-stretch px-2">
                {#each battle.competitors as c_id, i (c_id)}
                    {@const style = cardStyles[i] || cardStyles[0]}
                    {@const answerLabel = i === 0 ? ($t.answerA || 'OPTION A') : (i === 1 ? ($t.answerB || 'OPTION B') : (i === 2 ? ($t.answerC || 'OPTION C') : ($t.answerD || 'OPTION D')))}
                    {@const answer = renderAnswer(battle.answers?.[c_id])}
                    <div class="bg-neutral-950/80 border-2 {style.border} {style.bg} rounded-xl p-3.5 md:p-4 shadow-[0_0_15px_rgba(0,0,0,0.5)] flex flex-col justify-between backdrop-blur-sm">
                        <div>
                            <div class="flex items-center justify-between border-b border-neutral-800 pb-1.5 mb-2">
                                <span class="font-display font-black text-xs md:text-sm {style.text} tracking-wider">{answerLabel}</span>
                                <span class="text-[9px] font-mono text-slate-400 uppercase tracking-widest">{$t.anonymous || 'ANONYMOUS'}</span>
                            </div>
                            <p class="text-sm md:text-base font-sans font-medium text-slate-100 leading-relaxed text-center py-2 whitespace-pre-wrap">
                                "{answer}"
                            </p>
                        </div>
                        <div class="pt-2 border-t border-neutral-800/80 mt-1 flex justify-center">
                            <span class="text-[10px] font-display font-bold {style.text} uppercase tracking-wider">
                                {$t.tapOptionOnPhone ? $t.tapOptionOnPhone.replace('{label}', answerLabel) : `Tap ${answerLabel} on Phone`}
                            </span>
                        </div>
                    </div>
                {/each}
            </main>

            <!-- Anonymous Live Voter Gauge -->
            {@const eligibleVoters = $gamePlayers.filter(p => !battle.competitors.includes(p.id))}
            {@const votedCount = Object.keys(battle.votes || {}).length}
            {@const totalVoters = eligibleVoters.length}
            {@const percentage = totalVoters > 0 ? Math.round((votedCount / totalVoters) * 100) : 0}
            <div class="w-full max-w-sm bg-neutral-950/80 border border-neutral-700/80 rounded-xl px-4 py-1.5 mb-1.5 shadow-sm flex flex-col gap-1 flex-shrink-0 mx-auto">
                <div class="flex items-center justify-between text-[10px]">
                    <span class="font-display font-bold text-cyan-400">🗳️ {$t.votesLockedIn || 'VOTES LOCKED IN'}:</span>
                    <span class="font-mono font-bold text-white">{votedCount} / {totalVoters} {$t.voters || 'VOTERS'}</span>
                </div>
                <div class="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden border border-neutral-700">
                    <div class="bg-gradient-to-r from-cyan-400 to-emerald-400 h-full rounded-full transition-all duration-300" style="width: {percentage}%;"></div>
                </div>
            </div>
        {/if}

    {:else if $gamePhase === 'battle_result_reveal'}
        <!-- Phase: Battle Result Reveal Arena -->
        {@const battle = $gameState.battleSchedule?.[$gameState.currentVotingBattleIndex]}
        {#if battle}
            {@const isQuad = battle.competitors?.length === 4}
            {@const isTrio = battle.competitors?.length === 3}
            {@const isFinal = !!battle.genre}
            {@const formatBadgeText = isQuad ? `${$t.quadLabel || '4-WAY BRAWL'} ${$t.results || 'RESULTS'}` : (isTrio ? `${$t.brawlLabel || '3-WAY BRAWL'} ${$t.results || 'RESULTS'}` : `${$t.showdownLabel || '1-ON-1 SHOWDOWN'} ${$t.results || 'RESULTS'}`)}

            <!-- Stage Header: Timer & Battle Reveal Banner -->
            <div class="flex flex-col items-center mb-1.5 flex-shrink-0">
                <div class="scale-75 -my-1">
                    <SevenSegmentDisplay time={$phaseTimer} />
                </div>
                <div class="flex items-center gap-2 mt-0.5">
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] md:text-[11px] font-display font-black tracking-wider uppercase bg-fuchsia-950/90 border border-fuchsia-400 text-fuchsia-300 shadow-md">
                        {formatBadgeText}
                    </span>
                </div>
            </div>

            <!-- Prompt Banner Card -->
            <div class="w-full max-w-5xl bg-neutral-950/80 border-2 border-cyan-400/60 rounded-xl px-4 py-1.5 mb-2 shadow-[0_0_20px_rgba(6,182,212,0.15)] text-center backdrop-blur-md flex-shrink-0">
                <span class="text-[8px] font-display font-bold text-cyan-400 uppercase tracking-widest block">
                    {isFinal ? ($t.finalBattleTheme || 'FINAL BATTLE PREMISE') : ($t.battlePrompt || 'BATTLE PROMPT')}
                </span>
                {#if isFinal}
                    <p class="text-xs font-bold text-amber-300 mb-0.5">{battle.genre}</p>
                    <p class="text-sm md:text-base font-sans font-bold text-white leading-snug">{battle.premise}</p>
                {:else}
                    <p class="text-sm md:text-base font-sans font-bold text-white leading-snug">{battle.prompt}</p>
                {/if}
            </div>

            <!-- Full-Width Wider Reveal Cards -->
            <main class="w-full max-w-7xl grid grid-cols-1 {isQuad ? 'md:grid-cols-4 gap-3' : (isTrio ? 'md:grid-cols-3 gap-4' : 'md:grid-cols-2 gap-6')} mb-2 flex-1 items-stretch px-2">
                {#each battle.competitors as c_id (c_id)}
                    {@const p = $gamePlayers.find(x => x.id === c_id)}
                    {@const isWinner = battle.winnerId === c_id}
                    {@const isTie = !battle.winnerId && battle.pointsAwarded?.[c_id] > 0}
                    {@const bdown = battle.scoreBreakdown?.[c_id]}
                    {@const hasRainbow = bdown?.rainbowBonus > 0}
                    {@const answer = battle.answers?.[c_id]}

                    <div class="bg-neutral-950/90 border-2 {isWinner ? 'border-yellow-400 shadow-[0_0_25px_rgba(250,204,21,0.6)] ring-2 ring-yellow-400/30' : (isTie ? 'ring-2 ring-yellow-500 border-neutral-700/80' : 'border-neutral-700/80 shadow-[0_0_12px_rgba(0,0,0,0.5)]')} rounded-xl p-3.5 md:p-4 flex flex-col justify-between backdrop-blur-sm relative transition-all">
                        {#if isWinner}
                            <div class="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-black px-2.5 py-0.2 rounded-full font-display font-black text-[10px] tracking-wider shadow-lg flex items-center gap-1 border border-yellow-200">
                                <span>👑</span> <span>{$t.winner || 'WINNER!'}</span>
                            </div>
                        {/if}

                        <div>
                            <!-- Card Header: Avatar & Name -->
                            <div class="flex items-center gap-2.5 pb-2 mb-2 border-b border-neutral-800">
                                <div class="{isQuad ? 'w-8 h-8' : 'w-10 h-10'} flex-shrink-0">
                                    <PixelAvatar avatar={p?.avatar || '❓'} />
                                </div>
                                <div class="min-w-0 flex-grow text-left">
                                    <span class="font-display font-bold {isQuad ? 'text-sm md:text-base' : 'text-base md:text-lg'} text-white block leading-tight whitespace-nowrap">{p?.name || $t.disconnected}</span>
                                    <span class="text-[10px] md:text-xs font-mono text-slate-400 font-semibold">{Math.round($animatedScores[c_id] || p?.score || 0)} PTS</span>
                                </div>
                            </div>

                            <!-- Word Highlight Sentence -->
                            <div class="bg-black/75 border border-neutral-700/80 rounded-lg p-2.5 text-xs md:text-sm text-center leading-relaxed min-h-[4rem] flex items-center justify-center">
                                {#if battle.annotatedAnswers?.[c_id]}
                                    {@const annotated = battle.annotatedAnswers[c_id]}
                                    {#if annotated.isFinal}
                                        <div class="text-left w-full">
                                            <div class="mb-1"><span class="font-bold text-primary mr-1">Title:</span>{#each annotated.title as tok}<span class="{getWordColorClass(tok.authorIndex)}">{tok.text}</span>{' '}{/each}</div>
                                            <div><span class="font-bold text-primary mr-1">Tagline:</span>{#each annotated.tagline as tok}<span class="{getWordColorClass(tok.authorIndex)}">{tok.text}</span>{' '}{/each}</div>
                                        </div>
                                    {:else}
                                        <p class="text-center w-full">
                                            {#each annotated.words as tok}
                                                <span class="{getWordColorClass(tok.authorIndex)}">{tok.text}</span>{' '}
                                            {/each}
                                        </p>
                                    {/if}
                                {:else}
                                    <span class="whitespace-pre-wrap">{renderAnswer(answer)}</span>
                                {/if}
                            </div>

                            <!-- Points & Badges Section (Centered) -->
                            <div class="flex flex-col items-center justify-center my-2 text-center w-full">
                                {#if hasRainbow}
                                    <div class="w-full flex justify-center mb-1.5">
                                        <span class="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] md:text-[11px] font-display font-extrabold tracking-wide bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-cyan-500/20 border border-pink-400 text-pink-300 shadow-[0_0_10px_rgba(236,72,153,0.4)] animate-pulse">
                                            🌈 {$t.rainbowBadge || 'RAINBOW VARIETY'} (+{bdown.rainbowBonus})
                                        </span>
                                    </div>
                                {/if}
                                {#if battle.pointsAwarded?.[c_id] > 0}
                                    <span class="font-display font-black text-2xl md:text-3xl text-amber-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]">
                                        +{battle.pointsAwarded[c_id]} PTS
                                    </span>
                                    {#if bdown}
                                        <div class="flex flex-wrap items-center justify-center gap-1.5 mt-1.5 text-[10px] md:text-[11px] font-mono">
                                            {#if bdown.votePoints > 0}
                                                <span class="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-300 font-medium">
                                                    🗳️ {bdown.votes} {$t.votesBreakdown || 'Votes'} (+{bdown.votePoints})
                                                </span>
                                            {/if}
                                            {#if bdown.winBonus > 0}
                                                <span class="px-2 py-0.5 rounded bg-yellow-950/80 border border-yellow-500 text-yellow-300 font-bold">
                                                    🏆 {$t.winBonusBreakdown || 'Win Bonus'} (+{bdown.winBonus})
                                                </span>
                                            {/if}
                                            {#if bdown.sweepBonus > 0}
                                                <span class="px-2 py-0.5 rounded bg-purple-950/80 border border-purple-500 text-purple-300 font-bold">
                                                    🧹 {$t.sweepBonusBreakdown || 'Sweep Bonus'} (+{bdown.sweepBonus})
                                                </span>
                                            {/if}
                                        </div>
                                    {/if}
                                {/if}
                            </div>
                        </div>

                        <!-- Voter Chips -->
                        <div class="pt-2 border-t border-neutral-800/80 text-left">
                            <span class="text-[10px] font-display font-bold text-slate-400 uppercase block mb-1">
                                {$t.votedForYou || 'VOTED FOR THIS'}:
                            </span>
                            <div class="flex flex-wrap gap-1.5">
                                {#each Object.entries(battle.votes || {}) as [voterId, votedFor]}
                                    {#if votedFor === c_id}
                                        {@const voter = $gamePlayers.find(p => p.id === voterId)}
                                        <div class="flex items-center gap-1.5 bg-neutral-900 border border-neutral-700 px-2 py-0.5 rounded-md text-[11px] font-display text-slate-200 shadow-sm" title={voter?.name}>
                                            <div class="w-4 h-4 flex-shrink-0">
                                                <PixelAvatar avatar={voter?.avatar || '❓'} />
                                            </div>
                                            <span class="font-medium whitespace-nowrap">{voter?.name}</span>
                                        </div>
                                    {/if}
                                {/each}
                                {#if !Object.values(battle.votes || {}).includes(c_id)}
                                    <span class="text-[10px] font-mono text-slate-500 italic">{$t.noVotes || 'No votes'}</span>
                                {/if}
                            </div>
                        </div>
                    </div>
                {/each}
            </main>

            {#if battle.royalties && battle.royalties.length > 0}
                <div class="my-1 p-2 bg-neutral-900/90 border border-secondary/40 rounded-lg text-xs text-neutral-300 flex flex-wrap items-center justify-center gap-2 max-w-2xl mx-auto flex-shrink-0">
                    <span class="text-secondary font-bold">✨ {$t.wordRoyalties || 'Word Royalties'}:</span>
                    {#each battle.royalties as roy}
                        <span class="bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700 font-mono text-xs">
                            <span class="text-primary font-medium">{roy.authorName}</span> (+{roy.points} pts)
                        </span>
                    {/each}
                </div>
            {/if}
        {/if}

    {:else if $gamePhase === 'results'}
        {@const sortedPlayers = [...$gamePlayers].sort((a, b) => ((displayedScores[b.id] ?? b.score) || 0) - ((displayedScores[a.id] ?? a.score) || 0))}
        {@const firstPlace = sortedPlayers[0]}
        {@const secondPlace = sortedPlayers[1]}
        {@const thirdPlace = sortedPlayers[2]}
        {@const restOfPlayers = sortedPlayers.slice(3)}
        {@const maxScore = Math.max(1, (displayedScores[firstPlace?.id] ?? firstPlace?.score) || 1)}
        {@const getPodiumHeight = (place, score) => {
            const ratio = Math.max(0, Math.min(1, ((score ?? 0) / maxScore)));
            if (place === 1) {
                return Math.round(140 + (ratio * 35)); // 140px -> 175px
            } else if (place === 2) {
                return Math.round(96 + (ratio * 30));  // 96px -> 126px
            } else {
                return Math.round(68 + (ratio * 20));  // 68px -> 88px
            }
        }}
        {@const sups = $gameState?.superlatives}

        <!-- Phase: Final Results Split-Stage Olympic Podium & Adaptive Roster -->
        <div class="w-full h-full max-h-[100dvh] flex flex-col justify-between p-2.5 sm:p-4 select-none font-sans overflow-hidden box-border max-w-6xl mx-auto flex-1">
            
            <!-- 1. Stage Header: Glowing Trophy & Title -->
            <header class="text-center flex-shrink-0 pt-1 pb-1">
                <h1 class="text-xl sm:text-2xl lg:text-3xl font-display font-black text-amber-300 uppercase tracking-widest drop-shadow-[0_0_20px_rgba(251,191,36,0.8)]">
                    🏆 {$t.finalScores || 'FINAL SCORES & CHAMPIONS'}
                </h1>
            </header>

            <!-- 2. Main Stage: Split Screen or Grand Centered Podium -->
            <div class="flex-1 flex {restOfPlayers.length > 0 ? 'flex-col lg:flex-row items-center justify-between' : 'items-center justify-center'} gap-4 sm:gap-6 min-h-0 my-auto w-full px-1">
                
                <!-- Podium Column (Centered when 3P, Left side when 4P+) -->
                <div class="{restOfPlayers.length > 0 ? 'w-full lg:w-1/2' : 'max-w-2xl w-full mx-auto'} flex items-end justify-center gap-2 sm:gap-4 px-1 pb-1">
                    
                    <!-- 🥈 2nd Place Podium (Left - Dynamic Height) -->
                    {#if secondPlace}
                        {@const pScore = displayedScores[secondPlace.id] ?? secondPlace.score ?? 0}
                        <div class="flex-1 max-w-[150px] sm:max-w-[180px] flex flex-col items-center">
                            <div class="w-13 h-13 sm:w-16 sm:h-16 mb-1 relative">
                                <PixelAvatar avatar={secondPlace.avatar} className="w-full h-full" />
                            </div>
                            <span class="font-display font-black text-xs sm:text-sm text-slate-200 truncate max-w-full text-center block">
                                {secondPlace.name}
                            </span>
                            <span class="font-mono text-xs sm:text-sm font-black text-slate-300 block mb-1">
                                {pScore.toLocaleString()} <span class="text-[9px] text-slate-500 font-sans">PTS</span>
                            </span>

                            <!-- Silver Podium Block with Dynamic Score Height -->
                            <div
                                style="height: {getPodiumHeight(2, pScore)}px"
                                class="w-full rounded-t-2xl bg-gradient-to-b from-slate-300 to-slate-600 border-2 border-slate-200 flex flex-col items-center justify-start pt-2 pb-1.5 shadow-[0_0_20px_rgba(203,213,225,0.4)] transition-all duration-700 ease-out"
                            >
                                <span class="font-display font-black text-2xl sm:text-3xl text-black drop-shadow-sm leading-none">2</span>
                                <span class="font-sans font-bold text-[9px] sm:text-[10px] text-slate-900 uppercase tracking-wider mt-0.5">{$t.runnerUp || 'RUNNER UP'}</span>
                            </div>
                        </div>
                    {/if}

                    <!-- 🥇 1st Place Champion Podium (Center - Tallest Dynamic Height) -->
                    {#if firstPlace}
                        {@const pScore = displayedScores[firstPlace.id] ?? firstPlace.score ?? 0}
                        <div class="flex-1 max-w-[170px] sm:max-w-[210px] flex flex-col items-center z-10">
                            <div class="w-16 h-16 sm:w-22 sm:h-22 mb-1 relative">
                                <PixelAvatar avatar={firstPlace.avatar} className="w-full h-full" />
                                <div class="absolute -top-3.5 left-1/2 -translate-x-1/2 text-xl sm:text-2xl animate-bounce drop-shadow-[0_0_15px_rgba(251,191,36,0.8)]">
                                    👑
                                </div>
                            </div>
                            <span class="font-display font-black text-sm sm:text-base text-amber-300 truncate max-w-full text-center block drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]">
                                {firstPlace.name}
                            </span>
                            <span class="font-mono text-sm sm:text-base font-black text-amber-400 block mb-1 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]">
                                {pScore.toLocaleString()} <span class="text-[10px] text-amber-200 font-sans">PTS</span>
                            </span>

                            <!-- Gold Champion Podium Block with Dynamic Max Score Height -->
                            <div
                                style="height: {getPodiumHeight(1, pScore)}px"
                                class="w-full rounded-t-2xl bg-gradient-to-b from-amber-300 via-amber-400 to-yellow-600 border-2 border-amber-200 flex flex-col items-center justify-start pt-2.5 pb-2 shadow-[0_0_35px_rgba(251,191,36,0.7)] transition-all duration-700 ease-out"
                            >
                                <span class="font-display font-black text-3xl sm:text-4xl text-black drop-shadow-sm leading-none">1</span>
                                <span class="font-sans font-black text-[10px] sm:text-[11px] text-amber-950 uppercase tracking-widest mt-0.5">{$t.champion || 'CHAMPION'}</span>
                            </div>
                        </div>
                    {/if}

                    <!-- 🥉 3rd Place Podium (Right - Dynamic Height) -->
                    {#if thirdPlace}
                        {@const pScore = displayedScores[thirdPlace.id] ?? thirdPlace.score ?? 0}
                        <div class="flex-1 max-w-[150px] sm:max-w-[180px] flex flex-col items-center">
                            <div class="w-13 h-13 sm:w-16 sm:h-16 mb-1 relative">
                                <PixelAvatar avatar={thirdPlace.avatar} className="w-full h-full" />
                            </div>
                            <span class="font-display font-black text-xs sm:text-sm text-amber-500 truncate max-w-full text-center block">
                                {thirdPlace.name}
                            </span>
                            <span class="font-mono text-xs sm:text-sm font-black text-amber-600 block mb-1">
                                {pScore.toLocaleString()} <span class="text-[9px] text-slate-500 font-sans">PTS</span>
                            </span>

                            <!-- Bronze Podium Block with Dynamic Score Height -->
                            <div
                                style="height: {getPodiumHeight(3, pScore)}px"
                                class="w-full rounded-t-2xl bg-gradient-to-b from-amber-600 to-amber-900 border-2 border-amber-500 flex flex-col items-center justify-start pt-2 pb-1.5 shadow-[0_0_20px_rgba(180,83,9,0.4)] transition-all duration-700 ease-out"
                            >
                                <span class="font-display font-black text-2xl sm:text-3xl text-amber-100 drop-shadow-sm leading-none">3</span>
                                <span class="font-sans font-bold text-[9px] sm:text-[10px] text-amber-200 uppercase tracking-wider mt-0.5">{$t.podium || 'PODIUM'}</span>
                            </div>
                        </div>
                    {/if}
                </div>

                <!-- Right Side: Clean Proportional Leaderboard (Compact Pills for 4-6P, 2-Col for 7-14P) -->
                {#if restOfPlayers.length > 0}
                    <div class="w-full lg:w-1/2 bg-neutral-950/85 border border-neutral-800 rounded-3xl p-3 sm:p-4 shadow-xl flex flex-col justify-start min-h-0">
                        <div class="flex items-center justify-between border-b border-neutral-800 pb-1.5 mb-2.5 flex-shrink-0">
                            <span class="text-xs sm:text-sm font-display font-bold uppercase tracking-wider text-slate-300">
                                🎮 {$t.leaderboardRoster || 'LEADERBOARD ROSTER'}
                            </span>
                            <span class="text-[10px] font-mono text-cyan-400 font-bold px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40">
                                {restOfPlayers.length} {$t.players || 'PLAYERS'}
                            </span>
                        </div>

                        <!-- Clean Adaptive Grid (1-Col stack for 1-3 players, 2-Col grid for 4-11 players) -->
                        <div class="grid {restOfPlayers.length > 3 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'} gap-2 w-full">
                            {#each restOfPlayers as p, idx (p.id)}
                                {@const pScore = displayedScores[p.id] ?? p.score}
                                <div class="flex items-center justify-between px-3 py-2 rounded-2xl bg-neutral-900/90 border border-neutral-800 hover:border-cyan-500/50 transition-colors shadow-sm min-w-0">
                                    <div class="flex items-center gap-2.5 min-w-0">
                                        <span class="font-mono text-xs font-bold text-slate-400 flex-shrink-0">
                                            #{idx + 4}
                                        </span>
                                        <div class="w-7 h-7 flex-shrink-0">
                                            <PixelAvatar avatar={p.avatar} className="w-full h-full" />
                                        </div>
                                        <div class="min-w-0 text-left">
                                            <span class="font-display font-bold text-xs sm:text-sm text-slate-100 truncate block">
                                                {p.name}
                                            </span>
                                        </div>
                                    </div>
                                    <span class="font-mono text-xs font-bold text-cyan-400 flex-shrink-0 pl-1">
                                        {pScore.toLocaleString()} <span class="text-[9px] text-slate-500 font-sans">PTS</span>
                                    </span>
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}
            </div>

            <!-- 3. Special Accolades Showcase (5 Superlative Cards) -->
            {#if sups && Object.keys(sups).length > 0}
                <div class="w-full bg-neutral-950/90 border border-neutral-800 rounded-2xl p-2 sm:p-2.5 flex-shrink-0 shadow-lg mt-2">
                    <h2 class="text-xs font-display font-black text-amber-400 uppercase tracking-widest text-center mb-1.5">
                        🎖️ {$t.superlativesTitle || 'ACCOLADES & AWARDS'}
                    </h2>
                    <div class="flex flex-wrap items-stretch justify-center gap-2 text-center">
                        {#if sups.ammoFactory}
                            {@const p = $gamePlayers.find(pl => pl.id === sups.ammoFactory.playerId)}
                            {#if p}
                                <div class="flex-1 min-w-[160px] max-w-[210px] p-1.5 sm:p-2 rounded-xl bg-neutral-900/90 border border-neutral-800 hover:border-amber-500/50 transition-colors flex flex-col justify-between items-center text-center">
                                    <div class="w-full flex flex-col items-center">
                                        <div class="flex items-center justify-center gap-1.5 mb-0.5">
                                            <div class="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0"><PixelAvatar avatar={p.avatar} /></div>
                                            <span class="font-display font-bold text-[11px] text-slate-200 truncate max-w-[120px]">{p.name}</span>
                                        </div>
                                        <span class="font-display font-black text-[11px] text-amber-300 block mb-0.5">{$t.ammoFactoryTitle || '🎯 The Ammo Factory'}</span>
                                        <span class="text-[9px] text-slate-300 font-sans leading-tight block">{$t.ammoFactoryDesc || 'Words powered winning battles'} (+{sups.ammoFactory.value} pts)</span>
                                    </div>
                                </div>
                            {/if}
                        {/if}
                        {#if sups.rainbowAlchemist}
                            {@const p = $gamePlayers.find(pl => pl.id === sups.rainbowAlchemist.playerId)}
                            {#if p}
                                <div class="flex-1 min-w-[160px] max-w-[210px] p-1.5 sm:p-2 rounded-xl bg-neutral-900/90 border border-neutral-800 hover:border-amber-500/50 transition-colors flex flex-col justify-between items-center text-center">
                                    <div class="w-full flex flex-col items-center">
                                        <div class="flex items-center justify-center gap-1.5 mb-0.5">
                                            <div class="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0"><PixelAvatar avatar={p.avatar} /></div>
                                            <span class="font-display font-bold text-[11px] text-slate-200 truncate max-w-[120px]">{p.name}</span>
                                        </div>
                                        <span class="font-display font-black text-[11px] text-amber-300 block mb-0.5">{$t.rainbowAlchemistTitle || '🌈 The Rainbow Alchemist'}</span>
                                        <span class="text-[9px] text-slate-300 font-sans leading-tight block">{$t.rainbowAlchemistDesc || 'Combined words from 3+ players'} ({sups.rainbowAlchemist.value}x)</span>
                                    </div>
                                </div>
                            {/if}
                        {/if}
                        {#if sups.cleanSweeper}
                            {@const p = $gamePlayers.find(pl => pl.id === sups.cleanSweeper.playerId)}
                            {#if p}
                                <div class="flex-1 min-w-[160px] max-w-[210px] p-1.5 sm:p-2 rounded-xl bg-neutral-900/90 border border-neutral-800 hover:border-amber-500/50 transition-colors flex flex-col justify-between items-center text-center">
                                    <div class="w-full flex flex-col items-center">
                                        <div class="flex items-center justify-center gap-1.5 mb-0.5">
                                            <div class="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0"><PixelAvatar avatar={p.avatar} /></div>
                                            <span class="font-display font-bold text-[11px] text-slate-200 truncate max-w-[120px]">{p.name}</span>
                                        </div>
                                        <span class="font-display font-black text-[11px] text-amber-300 block mb-0.5">{$t.cleanSweeperTitle || '🧹 The Clean Sweeper'}</span>
                                        <span class="text-[9px] text-slate-300 font-sans leading-tight block">{$t.cleanSweeperDesc || 'Unanimous 100% battle wins'} ({sups.cleanSweeper.value}x)</span>
                                    </div>
                                </div>
                            {/if}
                        {/if}
                        {#if sups.minimalist}
                            {@const p = $gamePlayers.find(pl => pl.id === sups.minimalist.playerId)}
                            {#if p}
                                <div class="flex-1 min-w-[160px] max-w-[210px] p-1.5 sm:p-2 rounded-xl bg-neutral-900/90 border border-neutral-800 hover:border-amber-500/50 transition-colors flex flex-col justify-between items-center text-center">
                                    <div class="w-full flex flex-col items-center">
                                        <div class="flex items-center justify-center gap-1.5 mb-0.5">
                                            <div class="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0"><PixelAvatar avatar={p.avatar} /></div>
                                            <span class="font-display font-bold text-[11px] text-slate-200 truncate max-w-[120px]">{p.name}</span>
                                        </div>
                                        <span class="font-display font-black text-[11px] text-amber-300 block mb-0.5">{$t.minimalistTitle || '🪶 The Minimalist'}</span>
                                        <span class="text-[9px] text-slate-300 font-sans leading-tight block">{$t.minimalistDesc || 'Shortest winning punchline'} ({sups.minimalist.count} words)</span>
                                    </div>
                                </div>
                            {/if}
                        {/if}
                        {#if sups.shakespeare}
                            {@const p = $gamePlayers.find(pl => pl.id === sups.shakespeare.playerId)}
                            {#if p}
                                <div class="flex-1 min-w-[160px] max-w-[210px] p-1.5 sm:p-2 rounded-xl bg-neutral-900/90 border border-neutral-800 hover:border-amber-500/50 transition-colors flex flex-col justify-between items-center text-center">
                                    <div class="w-full flex flex-col items-center">
                                        <div class="flex items-center justify-center gap-1.5 mb-0.5">
                                            <div class="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0"><PixelAvatar avatar={p.avatar} /></div>
                                            <span class="font-display font-bold text-[11px] text-slate-200 truncate max-w-[120px]">{p.name}</span>
                                        </div>
                                        <span class="font-display font-black text-[11px] text-amber-300 block mb-0.5">{$t.shakespeareTitle || '💬 The Shakespeare'}</span>
                                        <span class="text-[9px] text-slate-300 font-sans leading-tight block">{$t.shakespeareDesc || 'Most epic long masterpiece'} ({sups.shakespeare.count} words)</span>
                                    </div>
                                </div>
                            {/if}
                        {/if}
                    </div>
                </div>
            {/if}
        </div>
    {/if}

    <!-- Bottom Live Players Score Ribbon (Rendered for Get Ready, Voting, Reveal) -->
    {#if $gamePhase !== 'question' && $gamePhase !== 'battle_answering' && $gamePhase !== 'generating_round' && $gamePhase !== 'results'}
        {@const isReveal = $gamePhase === 'battle_result_reveal'}
        {@const currentBattle = $gameState.battleSchedule?.[$gameState.currentVotingBattleIndex]}
        <footer class="w-full flex items-center justify-center gap-2 flex-wrap pt-1 flex-shrink-0 max-w-6xl mx-auto">
            {#each $gamePlayers as p (p.id)}
                {@const isWinner = isReveal && currentBattle?.winnerId === p.id}
                <div class="flex items-center gap-1.5 bg-neutral-900/90 border {isWinner ? 'border-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]' : 'border-neutral-700/80'} px-2.5 py-1 rounded-lg shadow-sm" data-player-id={p.id}>
                    <div class="w-5 h-5 flex-shrink-0">
                        <PixelAvatar avatar={p.avatar} />
                    </div>
                    <span class="font-display text-xs text-slate-100 font-bold whitespace-nowrap">{p.name}</span>
                    {#if isWinner}
                        <span class="text-[10px]">👑</span>
                    {/if}
                    <span class="font-mono text-xs text-cyan-400 font-bold ml-0.5">
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

    <!-- Host TV Controls -->
    <div class="fixed bottom-3 left-3 z-50 flex items-center gap-2">
        <button 
            on:click={toggleTvMode}
            class="px-2.5 py-1 bg-black/90 text-[11px] rounded border transition-all font-display flex items-center gap-1.5 {$tvMode ? 'border-primary text-primary shadow-sm shadow-primary/50' : 'border-neutral-700 text-neutral-400 hover:text-white'}"
            title={$t.tvModeDesc}
        >
            <span>📺</span>
            <span>{$t.tvMode || 'TV MODE'}: {$tvMode ? 'ON' : 'OFF'}</span>
        </button>
    </div>

    <button 
        on:click={handleForceEndGame}
        class="fixed bottom-3 right-3 z-50 px-2.5 py-1 bg-black text-neutral-300 text-[11px] rounded border border-neutral-600 hover:bg-danger hover:text-white transition-colors font-display"
        title={$t.endGame}
    >
        {$t.endGame || 'END GAME'}
    </button>
</div>