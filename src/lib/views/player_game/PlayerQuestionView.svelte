<script>
    import { onMount, onDestroy } from 'svelte';
    import { t, sendMessage, getPartialAnswers, gameState, currentPlayer } from '../../../stores.js';
    import { MIN_ANSWER_WORDS } from '../../config.js';
    import SevenSegmentDisplay from '../../shared/SevenSegmentDisplay.svelte';
    import PixelAvatar from '../../shared/PixelAvatar.svelte';

    export let timer;
    export let questions = [];
    
    let answers = {}; // { questionId: { text: '...', submitted: boolean } }
    let debounceTimer = null;
    
    $: unansweredQuestions = questions.filter(q => !answers[q.id]?.submitted);
    $: currentQuestion = unansweredQuestions[0];
    $: currentAnswerText = currentQuestion ? (answers[currentQuestion.id]?.text || '') : '';
    
    let currentWordCount = 0;
    $: currentWordCount = currentAnswerText.trim().split(/\s+/).filter(Boolean).length;
    $: isAnswerValid = currentWordCount >= MIN_ANSWER_WORDS;
    $: allQuestionsAnswered = questions.length > 0 && questions.every(q => answers[q.id]?.submitted);

    $: currentPlayerObj = $gameState?.players?.find(p => p.id === $currentPlayer?.id);
    $: hasUsedTimeBoost = currentPlayerObj?.hasUsedTimeBoost || false;

    // Reactively hydrate answers whenever questions change or are loaded
    $: if (questions && questions.length > 0) {
        let changed = false;
        questions.forEach(q => {
            if (q.answer && (!answers[q.id] || !answers[q.id].submitted)) {
                answers[q.id] = { text: q.answer, submitted: true };
                changed = true;
            } else if (!answers[q.id]) {
                answers[q.id] = { text: '', submitted: false };
                changed = true;
            }
        });
        if (changed) answers = { ...answers };
    }

    onDestroy(() => {
        if (debounceTimer) clearTimeout(debounceTimer);
    });

    onMount(() => {
        const partials = getPartialAnswers();
        if (questions.length > 0) {
            let restored = false;
            questions.forEach(q => {
                if (q.answer) {
                    answers[q.id] = { text: q.answer, submitted: true };
                    restored = true;
                } else {
                    const partial = partials[q.id];
                    if (partial) {
                        answers[q.id] = { text: partial, submitted: false };
                        restored = true;
                    }
                }
            });
            if (restored) answers = { ...answers };
        }
    });

    function handleAnswerInput(questionId, text) {
        if (!answers[questionId]) answers[questionId] = { text: '', submitted: false };
        answers[questionId].text = text;
        answers = { ...answers };
        
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            sendMessage('update-partial-answer', {
                gameId: $gameState.id,
                playerId: $currentPlayer.id,
                payload: { type: 'question', questionId: questionId, text: text }
            });
        }, 200);
    }

    $: rerollsLeft = $gameState?.playerAnswers?.[$currentPlayer?.id]?.rerollsLeft ?? 0;
    let isFlipping = false;

    function handleRerollQuestion() {
        if (!currentQuestion || rerollsLeft <= 0 || isFlipping) return;
        isFlipping = true;
        
        if (debounceTimer) {
            clearTimeout(debounceTimer);
            debounceTimer = null;
        }

        if (answers[currentQuestion.id]) {
            answers[currentQuestion.id].text = '';
            answers = { ...answers };
        }
        
        sendMessage('reroll-question', {
            gameId: $gameState.id,
            playerId: $currentPlayer.id,
            questionId: currentQuestion.id
        });

        setTimeout(() => { isFlipping = false; }, 400);
    }

    function handleTimeBoost() {
        if (hasUsedTimeBoost || !$gameState || !$currentPlayer) return;
        sendMessage('use-time-boost', {
            gameId: $gameState.id,
            playerId: $currentPlayer.id,
        });
    }

    function submitCurrentAnswer() {
        if (!currentQuestion || !isAnswerValid) return;

        if (debounceTimer) {
            clearTimeout(debounceTimer);
            debounceTimer = null;
        }

        const answerText = answers[currentQuestion.id].text;
        answers[currentQuestion.id].submitted = true;
        answers = {...answers}; // Trigger reactivity

        sendMessage('submit-answer', {
            gameId: $gameState.id,
            playerId: $currentPlayer.id,
            questionId: currentQuestion.id,
            answer: answerText
        });
    }

    function handleSendReaction() {
        if (!$currentPlayer || !$gameState?.id) return;
        sendMessage('send-emoji', {
            gameId: $gameState.id,
            playerId: $currentPlayer.id,
            emoji: $currentPlayer.avatar
        });
    }
</script>

<div class="w-full max-w-md mx-auto h-full flex flex-col p-3 pb-8 select-none font-sans overflow-y-auto overscroll-contain box-border">
    {#if allQuestionsAnswered}
        <div class="flex-1 flex flex-col items-center justify-center p-6 text-center my-auto">
            <SevenSegmentDisplay time={timer} showLabel={false} size="md" />
            <h1 class="text-2xl sm:text-3xl font-display my-3 text-emerald-400">{$t.allAnswersSubmitted || 'READY!'}</h1>
            <p class="text-sm sm:text-base text-warning animate-pulse font-display mb-6">{$t.waitingForAnswers}</p>

            <!-- Interactive Live Emoji Reaction Button while waiting -->
            <div class="flex flex-col items-center gap-2 mt-2">
                <span class="text-xs font-display text-slate-400 uppercase tracking-widest">
                    {$t.sendReaction || 'Send Reaction'}
                </span>
                <button 
                    type="button"
                    class="w-16 h-16 rounded-full border-2 border-pink-500 bg-pink-950/80 shadow-[0_0_25px_rgba(236,72,153,0.7)] flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all"
                    on:click={handleSendReaction}
                    aria-label={$t.sendReaction || 'Send Reaction'}
                >
                    <div class="w-10 h-10">
                        <PixelAvatar avatar={$currentPlayer?.avatar || '🦊'} />
                    </div>
                </button>
            </div>
        </div>
    {:else if currentQuestion}
        {@const totalQuestions = questions.length}
        {@const answeredCount = totalQuestions - unansweredQuestions.length}

        <!-- Top Header & Timer -->
        <header class="flex flex-col items-center justify-center flex-shrink-0 pt-0.5 mb-2">
            <div class="mb-1">
                <SevenSegmentDisplay time={timer} showLabel={false} size="sm" />
            </div>
            
            <!-- Question Pill Indicator -->
            <div class="px-3.5 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
                <span class="text-xs font-display font-black text-cyan-300 uppercase tracking-wider">
                    {$t.answeringQuestion ? $t.answeringQuestion.replace('{currentQ}', answeredCount + 1).replace('{totalQ}', totalQuestions) : `QUESTION ${answeredCount + 1}/${totalQuestions}`}
                </span>
            </div>
        </header>

        <!-- Question Prompt Card with Re-Roll and +30s Boost Buttons -->
        <div class="bg-neutral-950/90 border border-neutral-800 rounded-2xl p-3.5 shadow-lg flex-shrink-0 mb-3 transition-all duration-300 {isFlipping ? 'scale-95 opacity-40' : 'scale-100 opacity-100'}">
            <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-display font-bold text-cyan-400 uppercase tracking-widest">
                    {$t.prompt || 'PROMPT'}
                </span>
                
                <div class="flex items-center gap-1.5">
                    <button
                        type="button"
                        on:click={handleRerollQuestion}
                        disabled={rerollsLeft === 0}
                        class="px-2.5 py-1 rounded-lg border font-mono text-xs font-bold uppercase transition-all {
                            rerollsLeft === 0 
                            ? 'bg-neutral-900 border-neutral-800 text-neutral-600 opacity-40 cursor-not-allowed' 
                            : 'bg-purple-950/80 border-purple-500/60 text-purple-200 hover:bg-purple-900 shadow-sm cursor-pointer'
                        }"
                    >
                        {$t.reroll || 'Re-Roll'} ({rerollsLeft})
                    </button>
                    
                    <button
                        type="button"
                        on:click={handleTimeBoost}
                        disabled={hasUsedTimeBoost}
                        class="px-2.5 py-1 rounded-lg border font-mono text-xs font-bold uppercase transition-all {
                            hasUsedTimeBoost 
                            ? 'bg-neutral-900 border-neutral-800 text-neutral-600 opacity-40 cursor-not-allowed' 
                            : 'bg-amber-950/80 border-amber-500/60 text-amber-200 hover:bg-amber-900 shadow-sm cursor-pointer'
                        }"
                    >
                        +30s ({hasUsedTimeBoost ? '0' : '1'})
                    </button>
                </div>
            </div>

            <!-- Question Prompt Text -->
            <p class="text-base sm:text-lg font-sans font-bold text-slate-100 text-center leading-snug py-2">
                {currentQuestion.text}
            </p>
        </div>

        <!-- Answer Input Textarea & Status Bar -->
        <div class="flex flex-col mb-4">
            <div class="relative select-text mb-2">
                <textarea
                    rows="4"
                    class="w-full p-4 bg-neutral-950/90 border-2 rounded-2xl text-slate-100 font-sans text-base sm:text-lg resize-none focus:outline-none transition-all duration-200 select-text min-h-[120px] {
                        isAnswerValid ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'border-neutral-800 focus:border-cyan-500'
                    }"
                    placeholder={$t.minWordsWarning || 'Type your funny answer here...'}
                    value={currentAnswerText}
                    on:input={(e) => handleAnswerInput(currentQuestion.id, e.target.value)}
                ></textarea>
            </div>

            <!-- Status Badge -->
            <div class="flex items-center justify-between px-2 flex-shrink-0">
                <span class="text-xs sm:text-sm font-mono font-bold {isAnswerValid ? 'text-emerald-400' : 'text-amber-400'}">
                    ✍️ {$t.words || 'Words'}: {currentWordCount} ({$t.minWordsRequirement || 'min 5'})
                </span>
                {#if isAnswerValid}
                    <span class="text-xs sm:text-sm font-sans font-bold text-emerald-400 animate-pulse">
                        ✓ {$t.readyToSubmit || 'READY'}
                    </span>
                {:else}
                    <span class="text-xs sm:text-sm font-sans font-bold text-amber-400">
                        {MIN_ANSWER_WORDS - currentWordCount} {$t.wordsNeeded || 'more words needed'}
                    </span>
                {/if}
            </div>
        </div>

        <!-- Submit Button in Flow -->
        <div class="pt-2 pb-6 flex-shrink-0">
            <button
                type="button"
                disabled={!isAnswerValid}
                on:click={submitCurrentAnswer}
                class="btn-arcade w-full py-4 px-6 rounded-2xl font-display font-black text-base sm:text-lg uppercase tracking-wider transition-all cursor-pointer {
                    isAnswerValid 
                    ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-black shadow-[0_0_25px_rgba(16,185,129,0.5)] active:scale-98' 
                    : 'bg-neutral-900 border border-neutral-800 text-neutral-600 opacity-40 cursor-not-allowed'
                }"
            >
                🚀 {$t.submit || 'SUBMIT ANSWER'}
            </button>
        </div>
    {:else}
        <div class="flex-1 flex flex-col items-center justify-center p-6 text-center my-auto">
            <SevenSegmentDisplay time={timer} showLabel={false} />
            <p class="mt-8 text-xl text-warning animate-pulse font-display">{$t.waitingForAnswers}</p>
        </div>
    {/if}
</div>