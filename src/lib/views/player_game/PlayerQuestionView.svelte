<script>
    import { onMount, onDestroy } from 'svelte';
    import { t, sendMessage, getPartialAnswers, clearConsumedPartialAnswers, gameState, currentPlayer } from '../../../stores.js';
    import { MIN_ANSWER_WORDS } from '../../config.js';
    import SevenSegmentDisplay from '../../shared/SevenSegmentDisplay.svelte';

    export let timer;
    export let questions = [];
    
    let answers = {}; // { questionId: 'text' }
    let debounceTimer = null;
    
    $: unansweredQuestions = questions.filter(q => !answers[q.id]?.submitted);
    $: currentQuestion = unansweredQuestions[0];
    $: currentAnswerText = currentQuestion ? (answers[currentQuestion.id]?.text || '') : '';
    
    let currentWordCount = 0;
    $: currentWordCount = currentAnswerText.trim().split(/\s+/).filter(Boolean).length;
    $: isAnswerValid = currentWordCount >= MIN_ANSWER_WORDS;
    $: allQuestionsAnswered = questions.length > 0 && questions.every(q => answers[q.id]?.submitted);

    onDestroy(() => {
        if (debounceTimer) clearTimeout(debounceTimer);
    });

    onMount(() => {
        const partials = getPartialAnswers();
        if (questions.length > 0) {
            let restored = false;
            questions.forEach(q => {
                const partialAnswer = partials[q.id];
                if (partialAnswer) {
                     answers[q.id] = { text: partialAnswer, submitted: false };
                     restored = true;
                } else if (!answers[q.id]) {
                    answers[q.id] = { text: '', submitted: false };
                }
            });
            if (restored) {
                 answers = {...answers};
                 clearConsumedPartialAnswers();
            } else {
                // Initialize if no partials
                questions.forEach(q => {
                    if (!answers[q.id]) {
                        answers[q.id] = { text: '', submitted: false };
                    }
                });
                answers = {...answers};
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
    <SevenSegmentDisplay time={timer} />
    {#if allQuestionsAnswered}
        <h1 class="text-3xl mb-2">{$t.questionPhase}</h1>
        <p class="mt-12 text-2xl text-warning animate-pulse">{$t.waitingForAnswers}</p>
    {:else if currentQuestion}
        {@const totalQuestions = questions.length}
        {@const answeredCount = totalQuestions - unansweredQuestions.length}
        <h1 class="text-3xl mb-2">{$t.questionPhase}</h1>
        <h2 class="text-xl text-primary mb-6">{$t.answeringQuestion.replace('{currentQ}', answeredCount + 1).replace('{totalQ}', totalQuestions)}</h2>
        
        <div class="bg-neutral-900/50 border border-neutral-700 p-6 mb-4 rounded-md">
            <p class="text-xl sm:text-2xl min-h-[6rem] flex items-center justify-center">{currentQuestion.text}</p>
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