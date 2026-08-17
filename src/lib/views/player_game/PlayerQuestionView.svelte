<script>
    import { onMount, onDestroy } from 'svelte';
    import { t, sendMessage, getPartialAnswers, clearConsumedPartialAnswers, gameState, currentPlayer } from '../../../stores.js';
    import { MIN_ANSWER_WORDS } from '../../config.js';
    import SevenSegmentDisplay from '../../shared/SevenSegmentDisplay.svelte';

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
                } else if (partials[q.id]) {
                    answers[q.id] = { text: partials[q.id], submitted: false };
                    restored = true;
                } else if (!answers[q.id]) {
                    answers[q.id] = { text: '', submitted: false };
                }
            });
            if (restored) {
                 answers = {...answers};
                 clearConsumedPartialAnswers();
            }
        }
    });

    function handleAnswerInput(questionId, text) {
        if (!answers[questionId]) answers[questionId] = { text: '', submitted: false };
        answers[questionId].text = text;
        answers = {...answers}; // Trigger instant local reactivity
        
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

<div class="w-full max-w-2xl text-center">
    {#if $gameState?.theme}
        <div class="flex justify-center mb-2">
            <div class="inline-flex items-center gap-1.5 px-3 py-1 bg-black/60 border border-primary/50 rounded-full text-xs font-bold text-primary max-w-[85%] truncate">
                <span>🎭</span> <span class="truncate">{$gameState.theme}</span>
            </div>
        </div>
    {/if}

    <SevenSegmentDisplay time={timer} />

    {#if allQuestionsAnswered}
        <h1 class="text-3xl mb-2">{$t.questionPhase}</h1>
        <p class="mt-12 text-2xl text-warning animate-pulse">{$t.waitingForAnswers}</p>
    {:else if currentQuestion}
        {@const totalQuestions = questions.length}
        {@const answeredCount = totalQuestions - unansweredQuestions.length}
        <h1 class="text-2xl sm:text-3xl mb-1">{$t.questionPhase}</h1>
        <div class="mb-4">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 border border-primary text-primary font-bold text-sm tracking-wide">
                📝 {$t.answeringQuestion.replace('{currentQ}', answeredCount + 1).replace('{totalQ}', totalQuestions)}
            </span>
        </div>
        
        <div class="bg-neutral-900/50 border border-neutral-700 p-4 sm:p-6 mb-4 rounded-md relative transition-all duration-300 {isFlipping ? 'scale-95 opacity-40' : 'scale-100 opacity-100'}">
            <div class="flex justify-between items-center mb-2 flex-wrap gap-2">
                <span class="text-xs font-semibold uppercase tracking-wider text-neutral-400">{$t.prompt}</span>
                <div class="flex items-center gap-2">
                    {#if rerollsLeft > 0}
                        <button 
                            class="text-xs px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-yellow-400 border border-yellow-500/50 rounded-full font-bold inline-flex items-center gap-1 shadow-sm transition-all hover:scale-105"
                            on:click={handleRerollQuestion}
                            title={$t.rerollQuestion}
                        >
                            <span>🎲</span> {$t.reroll} ({rerollsLeft})
                        </button>
                    {/if}
                    <button 
                        type="button"
                        on:click={handleTimeBoost}
                        disabled={hasUsedTimeBoost}
                        class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-display font-bold rounded-full border transition-all {hasUsedTimeBoost ? 'bg-neutral-800 border-neutral-700 text-neutral-500 opacity-50 cursor-not-allowed' : 'bg-yellow-950/80 border-yellow-400 text-yellow-300 shadow-[0_0_10px_rgba(250,204,21,0.4)] hover:scale-105 cursor-pointer'}"
                        title={hasUsedTimeBoost ? $t.timeBoostAlreadyUsed : $t.timeBoost}
                    >
                        <span>⏱️</span> <span>{$t.timeBoost}</span>
                    </button>
                </div>
            </div>
            <p class="text-xl sm:text-2xl min-h-[5rem] flex items-center justify-center font-medium leading-relaxed">{currentQuestion.text}</p>
        </div>
        <textarea
            class="w-full h-40 p-3 bg-black border-2 rounded-md text-lg focus:outline-none focus:border-primary focus:shadow-[0_0_15px_var(--color-primary)] transition-all"
            style="border-color: var(--color-secondary); box-shadow: 0 0 8px var(--color-secondary), inset 0 0 8px rgba(var(--color-secondary-rgb), 0.2); color: var(--color-secondary);"
            placeholder={$t.minWordsWarning}
            value={currentAnswerText}
            on:input={(e) => handleAnswerInput(currentQuestion.id, e.target.value)}
        ></textarea>
        <div class="text-right mt-1 flex justify-end items-center px-1">
            <p class="text-sm text-neutral-400">{$t.words}: {currentWordCount}</p>
        </div>

        <div class="flex justify-center items-center mt-6">
             <button class="btn-arcade text-xl" style="--btn-color: var(--color-accent);" on:click={submitCurrentAnswer} disabled={!isAnswerValid}>{$t.submit}</button>
        </div>
    {:else}
         <p class="mt-12 text-2xl text-warning animate-pulse">{$t.waitingForAnswers}</p>
    {/if}
</div>