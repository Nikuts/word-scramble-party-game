<!-- src/lib/views/player_game/PlayerQuestionView.svelte -->
<script>
    import { onMount, onDestroy } from 'svelte';
    import { t, language, sendMessage, sendReaction, getPartialAnswers, clearConsumedPartialAnswers, gameState, currentPlayer } from '../../../stores.js';
    import { formatWordsNeededLabel } from '../../../ui_text.js';
    import { MIN_ANSWER_WORDS } from '../../config.js';
    import SevenSegmentDisplay from '../../shared/SevenSegmentDisplay.svelte';
    import PixelAvatar from '../../shared/PixelAvatar.svelte';
    import ArcadeIcon from '../../shared/ArcadeIcon.svelte';

    export let timer;
    export let questions = [];

    let answers = {};
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

    $: if (questions && questions.length > 0) {
        let changed = false;
        const activeIds = new Set(questions.map(q => q.id));
        Object.keys(answers).forEach(existingId => {
            if (!activeIds.has(existingId)) {
                delete answers[existingId];
                changed = true;
            }
        });
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
            let consumedPartials = false;
            questions.forEach(q => {
                if (q.answer) {
                    answers[q.id] = { text: q.answer, submitted: true };
                    restored = true;
                } else {
                    const partial = partials[q.id];
                    if (partial) {
                        answers[q.id] = { text: partial, submitted: false };
                        restored = true;
                        consumedPartials = true;
                    }
                }
            });
            if (restored) answers = { ...answers };
            if (consumedPartials) clearConsumedPartialAnswers();
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
        answers = { ...answers };

        sendMessage('submit-answer', {
            gameId: $gameState.id,
            playerId: $currentPlayer.id,
            questionId: currentQuestion.id,
            answer: answerText
        });
    }

    function handleSendAvatarReaction() {
        if (!$currentPlayer || !$gameState?.id) return;
        sendReaction('avatar');
    }
</script>

<div class="w-full max-w-md md:max-w-4xl mx-auto h-full flex flex-col p-3 pb-6 select-none font-sans overflow-y-auto overscroll-contain box-border">
    {#if allQuestionsAnswered}
        <div class="flex-1 flex flex-col items-center justify-center p-6 text-center my-auto max-w-md mx-auto w-full">
            <div class="panel-arcade w-full flex flex-col items-center p-6" style="--neon-color: var(--color-accent);">
                <SevenSegmentDisplay time={timer} showLabel={false} size="md" />
                <h1 class="text-2xl sm:text-3xl font-display my-3 text-emerald-400">{$t.allAnswersSubmitted || 'READY!'}</h1>
                <p class="text-sm sm:text-base text-amber-300 font-display mb-6">{$t.waitingForAnswers}</p>

                <!-- Explicit Chamfered Avatar Reaction Button -->
                <button
                    type="button"
                    data-testid="send-reaction-btn"
                    on:click={handleSendAvatarReaction}
                    aria-label={$t.sendReaction || 'Send Reaction'}
                    class="cut-sm w-full py-2.5 px-4 bg-[#1c1936] hover:bg-pink-950/80 border-2 border-pink-400 text-pink-200 flex items-center justify-center gap-3 cursor-pointer transition-colors active:scale-95"
                >
                    <div class="w-8 h-8 flex-shrink-0">
                        <PixelAvatar avatar={currentPlayerObj?.avatar || '🦊'} />
                    </div>
                    <span class="font-display text-xs sm:text-sm uppercase tracking-wider">
                        {$t.sendAvatarReaction || $t.sendReaction || 'Send Avatar Reaction'}
                    </span>
                </button>
            </div>
        </div>
    {:else if currentQuestion}
        {@const totalQuestions = questions.length}
        {@const answeredCount = totalQuestions - unansweredQuestions.length}

        <header class="flex flex-col md:flex-row items-center justify-center md:justify-between gap-2 flex-shrink-0 pt-0.5 mb-3">
            <div class="fighter-crest bg-cyan-950/90 border border-cyan-400 text-cyan-300 text-xs sm:text-sm">
                <ArcadeIcon name="bolt" className="w-3.5 h-3.5" />
                <span>
                    {$t.answeringQuestion ? $t.answeringQuestion.replace('{currentQ}', answeredCount + 1).replace('{totalQ}', totalQuestions) : `QUESTION ${answeredCount + 1}/${totalQuestions}`}
                </span>
            </div>
            <SevenSegmentDisplay time={timer} showLabel={false} size="sm" />
        </header>

        <!-- Responsive 2-Column Layout on Tablet/PC, Stacked on Phone -->
        <div class="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-start content-start flex-1 min-h-0">
            <!-- Prompt & Powerups Column -->
            <div class="md:col-span-5 bg-[#131126] border-2 border-[#332e59] cut-md p-3.5 transition-all duration-300 {isFlipping ? 'scale-95 opacity-40' : 'scale-100 opacity-100'}">
                <div class="flex flex-wrap items-center justify-between gap-1.5 mb-2">
                    <span class="text-xs font-display text-cyan-300 uppercase tracking-widest">
                        {$t.prompt || 'PROMPT'}
                    </span>

                    <div class="flex items-center gap-1.5">
                        <button
                            type="button"
                            on:click={handleRerollQuestion}
                            disabled={rerollsLeft === 0}
                            class="cut-sm px-2.5 py-1 border font-mono text-xs font-bold uppercase transition-colors inline-flex items-center gap-1 {
                                rerollsLeft === 0
                                ? 'bg-neutral-900 border-neutral-700 text-neutral-500 opacity-65 cursor-not-allowed'
                                : 'bg-purple-950/80 border-purple-400 text-purple-200 hover:bg-purple-900 cursor-pointer'
                            }"
                        >
                            <ArcadeIcon name="refresh" className="w-3 h-3" />
                            <span>{$t.reroll || 'Re-Roll'} ({rerollsLeft})</span>
                        </button>

                        <button
                            type="button"
                            on:click={handleTimeBoost}
                            disabled={hasUsedTimeBoost}
                            class="cut-sm px-2.5 py-1 border font-mono text-xs font-bold uppercase transition-colors inline-flex items-center gap-1 {
                                hasUsedTimeBoost
                                ? 'bg-neutral-900 border-neutral-700 text-neutral-500 opacity-65 cursor-not-allowed'
                                : 'bg-amber-950/80 border-amber-400 text-amber-200 hover:bg-amber-900 cursor-pointer'
                            }"
                        >
                            <ArcadeIcon name="clock" className="w-3 h-3" />
                            <span>{$t.timeBoost || '+30s'} ({hasUsedTimeBoost ? '0' : '1'})</span>
                        </button>
                    </div>
                </div>

                <p class="text-base sm:text-lg font-sans font-bold text-slate-100 text-center md:text-left leading-snug py-2">
                    {currentQuestion.text}
                </p>
            </div>

            <!-- Answer Textarea & Submit Column -->
            <div class="md:col-span-7 flex flex-col">
                <div class="relative select-text mb-2">
                    <textarea
                        rows="4"
                        class="w-full p-4 bg-[#070610] cut-md border-2 text-slate-100 font-sans text-base sm:text-lg resize-none focus:outline-none transition-colors select-text min-h-[130px] md:min-h-[165px] {
                            isAnswerValid ? 'border-emerald-400' : 'border-[#332e59] focus:border-cyan-400'
                        }"
                        placeholder={$t.minWordsWarning || 'Type your funny answer here...'}
                        value={currentAnswerText}
                        on:input={(e) => handleAnswerInput(currentQuestion.id, e.target.value)}
                    ></textarea>
                </div>

                <div class="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 px-1 mb-3">
                    <span class="text-xs sm:text-sm font-mono font-bold {isAnswerValid ? 'text-emerald-400' : 'text-amber-300'}">
                        {$t.words || 'Words'}: {currentWordCount} ({$t.minWordsRequirement || 'min 5'})
                    </span>
                    {#if isAnswerValid}
                        <span class="text-xs sm:text-sm font-display text-emerald-400 inline-flex items-center gap-1">
                            <ArcadeIcon name="check" className="w-3.5 h-3.5" />
                            <span>{$t.readyToSubmit || 'READY'}</span>
                        </span>
                    {:else}
                        {@const neededCount = MIN_ANSWER_WORDS - currentWordCount}
                        <span class="text-xs sm:text-sm font-sans font-bold text-amber-300">
                            {formatWordsNeededLabel(neededCount, $t, $language)}
                        </span>
                    {/if}
                </div>

                <button
                    type="button"
                    disabled={!isAnswerValid}
                    on:click={submitCurrentAnswer}
                    class="btn-arcade w-full py-3.5 text-base sm:text-lg"
                    style="--btn-color: {isAnswerValid ? 'var(--color-accent)' : '#334155'};"
                >
                    <ArcadeIcon name="check" className="w-5 h-5" />
                    <span>{$t.submit || 'SUBMIT ANSWER'}</span>
                </button>
            </div>
        </div>
    {:else}
        <div class="flex-1 flex flex-col items-center justify-center p-6 text-center my-auto">
            <SevenSegmentDisplay time={timer} showLabel={false} />
            <p class="mt-6 text-xl text-amber-300 font-display">{$t.waitingForAnswers}</p>
        </div>
    {/if}
</div>
