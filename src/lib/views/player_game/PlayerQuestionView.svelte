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
</script>

<div class="w-full max-w-xl mx-auto h-full flex flex-col justify-between px-2 pb-2 relative select-none font-sans">
    {#if allQuestionsAnswered}
        <div class="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <SevenSegmentDisplay time={timer} />
            <h1 class="text-2xl sm:text-3xl font-display my-4 text-emerald-400">{$t.allAnswersSubmitted || 'READY!'}</h1>
            <p class="text-lg text-warning animate-pulse font-display">{$t.waitingForAnswers}</p>
        </div>
    {:else if currentQuestion}
        {@const totalQuestions = questions.length}
        {@const answeredCount = totalQuestions - unansweredQuestions.length}

        <!-- Stage Center Header: Timer & Centered Question Badge -->
        <div class="flex flex-col items-center justify-center mb-2.5 flex-shrink-0 relative z-10">
            <div class="scale-95 mb-1.5">
                <SevenSegmentDisplay time={timer} />
            </div>
            <!-- Centered Standardized Badge -->
            <div class="px-3 py-1 bg-black/80 border border-primary text-primary rounded font-display text-xs tracking-wider font-bold shadow-[0_0_10px_rgba(var(--color-primary-rgb),0.25)]">
                {$t.answeringQuestion ? $t.answeringQuestion.replace('{currentQ}', answeredCount + 1).replace('{totalQ}', totalQuestions) : `QUESTION ${answeredCount + 1}/${totalQuestions}`}
            </div>
        </div>

        <!-- Question Prompt Card with Re-Roll and +30s Boost (Single Line Micro-Badges) -->
        <div class="panel-arcade p-3 sm:p-3.5 rounded-lg mb-3 flex-shrink-0 relative z-10 transition-all duration-300 {isFlipping ? 'scale-95 opacity-40' : 'scale-100 opacity-100'}" style="--neon-color: var(--color-primary); --neon-color-rgb: var(--color-primary-rgb);">
            <div class="flex items-center justify-between text-[10px] font-display uppercase tracking-wider text-primary/80 mb-2 whitespace-nowrap">
                <span>{$t.prompt || 'Prompt'}</span>
                <div class="flex items-center gap-1.5 whitespace-nowrap">
                    <button 
                        on:click={handleRerollQuestion}
                        disabled={rerollsLeft === 0}
                        class="px-2 py-0.5 rounded font-mono text-[10px] font-bold transition-all whitespace-nowrap leading-none {
                            rerollsLeft === 0 
                            ? 'bg-neutral-900 border border-neutral-700 text-neutral-500 opacity-35 cursor-not-allowed' 
                            : 'bg-purple-950/70 border border-purple-400 text-purple-200 hover:bg-purple-900 shadow-sm cursor-pointer'
                        }"
                        title={$t.rerollQuestion || 'Re-Roll Question'}
                    >
                        {$t.reroll || 'Re-Roll'} ({rerollsLeft})
                    </button>
                    <button 
                        on:click={handleTimeBoost}
                        disabled={hasUsedTimeBoost}
                        class="px-2 py-0.5 rounded font-mono text-[10px] font-bold transition-all whitespace-nowrap leading-none {
                            hasUsedTimeBoost 
                            ? 'bg-neutral-900 border border-neutral-700 text-neutral-500 opacity-35 cursor-not-allowed' 
                            : 'bg-amber-950/70 border border-amber-400 text-amber-200 hover:bg-amber-900 shadow-sm cursor-pointer'
                        }"
                        title={hasUsedTimeBoost ? $t.timeBoostAlreadyUsed : $t.timeBoost}
                    >
                        +30s ({hasUsedTimeBoost ? '0' : '1'})
                    </button>
                </div>
            </div>
            <p class="text-xs sm:text-sm font-medium text-slate-100 leading-snug text-center py-0.5">
                {currentQuestion.text}
            </p>
        </div>

        <!-- Textarea with Clean Word Count Counter -->
        <div class="flex-1 flex flex-col justify-between mb-3 min-h-0 relative z-10">
            <div class="relative flex-1 flex flex-col">
                <textarea
                    rows="4"
                    class="w-full flex-1 p-3 bg-black/80 border-2 rounded-lg text-slate-100 font-mono text-sm sm:text-base resize-none focus:outline-none transition-all duration-200 {
                        isAnswerValid ? 'border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.3)]' : 'border-neutral-600 focus:border-primary'
                    }"
                    placeholder={$t.minWordsWarning || 'Type your funny answer here...'}
                    value={currentAnswerText}
                    on:input={(e) => handleAnswerInput(currentQuestion.id, e.target.value)}
                ></textarea>
            </div>

            <!-- Clean Word Counter (No redundant labels) -->
            <div class="flex items-center justify-between mt-2 px-1">
                <span class="text-xs font-mono font-semibold transition-colors duration-200 {
                    isAnswerValid ? 'text-emerald-400 font-bold' : 'text-amber-300'
                }">
                    {$t.words || 'Word count'}: {currentWordCount} (Min {MIN_ANSWER_WORDS})
                </span>
                <span class="text-[10px] font-display {isAnswerValid ? 'text-emerald-400' : 'text-slate-500'}">
                    {isAnswerValid ? 'VALID' : 'INCOMPLETE'}
                </span>
            </div>
        </div>

        <!-- Bottom Fixed Submit Button -->
        <div class="pt-1 flex-shrink-0 relative z-10">
            <button 
                disabled={!isAnswerValid}
                class="btn-arcade w-full py-2.5 text-sm sm:text-base font-display uppercase tracking-widest rounded-lg transition-all {
                    isAnswerValid ? 'shadow-[0_0_20px_rgba(57,255,20,0.5)] border-emerald-400 text-emerald-200' : 'opacity-40 cursor-not-allowed'
                }"
                style="--btn-color: {isAnswerValid ? 'var(--color-accent)' : '#4b5563'};"
                on:click={submitCurrentAnswer}
            >
                {$t.submit || 'SUBMIT ANSWER'}
            </button>
        </div>
    {:else}
        <div class="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <SevenSegmentDisplay time={timer} />
            <p class="mt-12 text-2xl text-warning animate-pulse font-display">{$t.waitingForAnswers}</p>
        </div>
    {/if}
</div>