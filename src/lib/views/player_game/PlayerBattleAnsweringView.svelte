<script>
    import { onMount } from 'svelte';
    import Sortable from 'sortablejs';
    import { t, sendMessage, getPartialAnswers, clearConsumedPartialAnswers, gameState, currentPlayer } from '../../../stores.js';
    import SevenSegmentDisplay from '../../shared/SevenSegmentDisplay.svelte';

    export let timer;
    export let battlesToAnswer = [];
    export let gameId;
    export let playerId;
    
    let battleForms = {}; // Holds state for each battle a player is in
    let showPromptTooltip = false;
    
    $: currentBattleToAnswer = battlesToAnswer[0]; // Always show the first unanswered battle

    $: allAssignedBattles = $gameState?.battleSchedule?.filter(b => b.competitors.includes(playerId)) || [];
    $: totalAssigned = allAssignedBattles.length || 1;
    $: currentBattleIndex = allAssignedBattles.findIndex(b => b.id === currentBattleToAnswer?.id);
    $: currentBattleNum = currentBattleIndex !== -1 ? currentBattleIndex + 1 : (totalAssigned - battlesToAnswer.length + 1);

    $: currentPlayerObj = $gameState?.players?.find(p => p.id === playerId);
    $: hasUsedTimeBoost = currentPlayerObj?.hasUsedTimeBoost || false;

    onMount(() => {
        if (typeof localStorage !== 'undefined') {
            const seen = localStorage.getItem('seenPromptWordTooltip');
            if (!seen) showPromptTooltip = true;
        }
    });

    function dismissPromptTooltip() {
        showPromptTooltip = false;
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('seenPromptWordTooltip', 'true');
        }
    }

    function handleTimeBoost() {
        if (hasUsedTimeBoost || !$gameState || !playerId) return;
        sendMessage('use-time-boost', {
            gameId: $gameState.id,
            playerId: playerId,
        });
    }
    
    $: if (battlesToAnswer && battlesToAnswer.length > 0 && playerId) {
        ensureBattleFormsInitialized(battlesToAnswer, playerId);
    }

    function tokenizeSimple(text) {
        if (!text) return [];
        const regex = /[\p{L}\p{N}'’`-]+|_{3,}|[.,!?;:()"]/gu;
        return text.match(regex) || [];
    }
    
    function ensureBattleFormsInitialized(battles, pId) {
        if (!battles || !battles.length || !pId) return;
        const uninitialized = battles.filter(b => !battleForms[b.id]);
        if (uninitialized.length === 0) return;

        const partials = getPartialAnswers();
        let consumedPartials = false;

        uninitialized.forEach(battle => {
            const partialKey = `b-${battle.id}-${pId}`;
            const partialAnswer = partials[partialKey];
            
            const promptWords = (battle.promptTokens || []).map((item, i) => {
                const text = typeof item === 'object' && item !== null ? item.text : item;
                return { id: `pt-${battle.id}-${i}`, text, authorId: null, isPrompt: true };
            });

            const rawBank = battle.wordBanks?.[pId] || [];
            const bankWords = rawBank.map((item, i) => {
                const text = typeof item === 'object' && item !== null ? item.text : item;
                const authorId = typeof item === 'object' && item !== null ? item.authorId : null;
                return { id: `wb-${battle.id}-${i}`, text, authorId, isPrompt: false };
            });

            const baseForm = {
                promptWords,
                wordBankWords: bankWords,
                undoStack: [],
            };

            const createWordsArray = (text) => text.split(' ').filter(Boolean).map((wordText, i) => ({ id: `ans-${Math.random()}-${i}`, text: wordText }));

            if (battle.genre || battle.formatConfig?.formatType === 'multi_line') { // Multi-line / Final battle format
                const premiseText = battle.formatConfig?.premise || battle.premise || '';
                const headerText = battle.formatConfig?.genre || battle.genre || '';
                const finalPromptTokens = tokenizeSimple(`${headerText} ${premiseText}`).map((tok, i) => ({
                    id: `fpt-${battle.id}-${i}`,
                    text: tok,
                    authorId: null,
                    isPrompt: true
                }));

                battleForms[battle.id] = {
                    ...baseForm,
                    promptWords: finalPromptTokens,
                    isFinal: true,
                    titleWords: partialAnswer?.title ? createWordsArray(partialAnswer.title) : [],
                    taglineWords: partialAnswer?.tagline ? createWordsArray(partialAnswer.tagline) : [],
                    activeLine: 'title',
                };
            } else {
                battleForms[battle.id] = {
                    ...baseForm,
                    isFinal: false,
                    answerWords: partialAnswer ? createWordsArray(partialAnswer) : [],
                };
            }
            if (partialAnswer) consumedPartials = true;
        });
        
        battleForms = {...battleForms};
        if (consumedPartials) {
            clearConsumedPartialAnswers();
        }
    }

    function sortableList(node, list) {
        let currentList = list;

        const sortable = new Sortable(node, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            filter: '.delete-word-btn',
            preventOnFilter: false,
            onEnd: (evt) => {
                const { oldIndex, newIndex } = evt;
                if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return;
                
                const reorderedList = [...currentList];
                const [movedItem] = reorderedList.splice(oldIndex, 1);
                reorderedList.splice(newIndex, 0, movedItem);

                node.dispatchEvent(new CustomEvent('listUpdated', {
                    detail: reorderedList
                }));
            }
        });

        return {
            update(newList) {
                currentList = newList;
            },
            destroy() {
                sortable.destroy();
            }
        };
    }
    
    function handleListUpdate(newList, battleId, lineType = null) {
        const form = battleForms[battleId];
        if (!form) return;

        const cleanNewList = newList.filter(Boolean);

        if (form.isFinal && lineType) {
            if (lineType === 'title') form.titleWords = cleanNewList;
            else if (lineType === 'tagline') form.taglineWords = cleanNewList;
        } else {
            form.answerWords = cleanNewList;
        }
        
        battleForms = { ...battleForms };
        saveBattlePartial(battleId);
    }
    
    function addWordToAnswer(word, battleId) {
        const form = battleForms[battleId];
        if (!form) return;
        
        const newAnswerWord = { ...word, id: `ans-${Math.random().toString(36).substring(2, 9)}` };
        const targetLine = form.isFinal ? form.activeLine : 'main';

        if (form.isFinal) {
            if (form.activeLine === 'title') {
                form.titleWords = [...form.titleWords, newAnswerWord];
            } else {
                form.taglineWords = [...form.taglineWords, newAnswerWord];
            }
        } else {
            form.answerWords = [...form.answerWords, newAnswerWord];
        }

        form.undoStack = [...(form.undoStack || []), { wordId: newAnswerWord.id, lineType: targetLine }];

        battleForms = {...battleForms};
        saveBattlePartial(battleId);
    }

    function undoLastWord(battleId) {
        const form = battleForms[battleId];
        if (!form || !form.undoStack || form.undoStack.length === 0) return;

        const lastAction = form.undoStack.pop();
        if (!lastAction) return;

        if (form.isFinal) {
            if (lastAction.lineType === 'title') {
                form.titleWords = form.titleWords.filter(w => w && w.id !== lastAction.wordId);
            } else {
                form.taglineWords = form.taglineWords.filter(w => w && w.id !== lastAction.wordId);
            }
        } else {
            form.answerWords = form.answerWords.filter(w => w && w.id !== lastAction.wordId);
        }

        form.undoStack = [...form.undoStack];
        battleForms = {...battleForms};
        saveBattlePartial(battleId);
    }

    function shuffleBank(battleId) {
        const form = battleForms[battleId];
        if (!form || !form.wordBankWords) return;

        const shuffled = [...form.wordBankWords];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        form.wordBankWords = shuffled;
        battleForms = {...battleForms};
    }

    function deleteWord(wordId, battleId) {
        const form = battleForms[battleId];
        if (!form) return;

        if (form.isFinal) {
            const initialLengthTitle = form.titleWords.length;
            form.titleWords = form.titleWords.filter(w => w && w.id !== wordId);
            
            if (form.titleWords.length === initialLengthTitle) {
                form.taglineWords = form.taglineWords.filter(w => w && w.id !== wordId);
            }
        } else {
            form.answerWords = form.answerWords.filter(w => w && w.id !== wordId);
        }

        if (form.undoStack) {
            form.undoStack = form.undoStack.filter(item => item.wordId !== wordId);
        }

        battleForms = {...battleForms};
        saveBattlePartial(battleId);
    }

    function clearLine(battleId, lineType = null) {
        const form = battleForms[battleId];
        if (!form) return;

        if (form.isFinal) {
            if (lineType === 'title') {
                form.titleWords = [];
                if (form.undoStack) form.undoStack = form.undoStack.filter(item => item.lineType !== 'title');
            } else if (lineType === 'tagline') {
                form.taglineWords = [];
                if (form.undoStack) form.undoStack = form.undoStack.filter(item => item.lineType !== 'tagline');
            } else {
                form.titleWords = [];
                form.taglineWords = [];
                form.undoStack = [];
            }
        } else {
            form.answerWords = [];
            form.undoStack = [];
        }

        battleForms = {...battleForms};
        saveBattlePartial(battleId);
    }

    function saveBattlePartial(battleId) {
        const form = battleForms[battleId];
        if (!form) return;
        
        let payload;
        if (form.isFinal) {
            payload = {
                type: 'final_battle',
                battleId: battleId,
                title: form.titleWords.filter(Boolean).map(w => w.text).join(' '),
                tagline: form.taglineWords.filter(Boolean).map(w => w.text).join(' '),
            };
        } else {
            payload = {
                type: 'battle',
                battleId: battleId,
                answer: form.answerWords.filter(Boolean).map(w => w.text).join(' '),
            };
        }

        sendMessage('update-partial-answer', { gameId: gameId, playerId: playerId, payload });
    }

    function submitBattleAnswer(battleId) {
        const form = battleForms[battleId];
        if (!form) return;
        
        let answer;
        if (form.isFinal) {
            const titleWords = form.titleWords.filter(Boolean);
            const taglineWords = form.taglineWords.filter(Boolean);
            if (titleWords.length === 0 && taglineWords.length === 0) return;
            answer = {
                title: titleWords.map(w => w.text).join(' '),
                tagline: taglineWords.map(w => w.text).join(' '),
            };
        } else {
             const answerWords = form.answerWords.filter(Boolean);
             if (answerWords.length === 0) return;
             answer = answerWords.map(w => w.text).join(' ');
        }
        
        sendMessage('submit-battle-answer', { gameId: gameId, playerId: playerId, battleId, answer });
    }
</script>

<style>
    .answer-word {
        cursor: grab;
        touch-action: none;
    }
    .answer-word:active {
        cursor: grabbing;
    }
    :global(.sortable-ghost) {
        opacity: 0.4;
    }
</style>
<div class="w-full h-full flex flex-col p-3 pb-10 max-w-md mx-auto select-none font-sans overflow-y-auto overscroll-contain box-border">
    {#if battlesToAnswer && battlesToAnswer.length > 0 && battleForms[battlesToAnswer[0].id]}
        {@const battle = battlesToAnswer[0]}
        {@const battleForm = battleForms[battle.id]}
        {@const hasAnswerWords = battleForm ? (battleForm.isFinal ? (battleForm.titleWords.length > 0 || battleForm.taglineWords.length > 0) : battleForm.answerWords.length > 0) : false}

        <!-- Top Header & Timer -->
        <header class="flex flex-col items-center justify-center flex-shrink-0 pt-0.5 mb-2">
            <div class="scale-90 mb-1">
                <SevenSegmentDisplay time={timer} showLabel={false} />
            </div>
            
            <!-- Battle Pill Indicator -->
            <div class="px-3.5 py-1 rounded-full bg-pink-950/80 border border-pink-500/50 shadow-[0_0_12px_rgba(236,72,153,0.3)]">
                <span class="text-xs font-display font-black text-pink-300 uppercase tracking-wider">
                    {battle.competitors.length > 2 ? ($t.brawlLabel || 'BRAWL') : (battle.isFinal ? ($t.finalBattle || 'FINAL MOVIE BATTLE') : ($t.battlePrompt || 'BATTLE'))} {currentBattleNum}/{totalAssigned}
                </span>
            </div>
        </header>

        {#if battleForm}
            <!-- Battle Prompt Card with Header +30s Badge and Word Tapping Hint -->
            <div class="bg-neutral-950/90 border border-neutral-800 rounded-2xl p-3 shadow-lg flex-shrink-0 mb-2.5">
                <div class="flex items-center justify-between mb-1.5">
                    <span class="text-xs font-display font-bold text-pink-400 uppercase tracking-widest">
                        {battleForm.isFinal ? ($t.movieGenre || 'MOVIE GENRE') : ($t.prompt || 'PROMPT')}
                    </span>
                    
                    <!-- +30s Time Boost Badge -->
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

                <!-- Prompt Words (Tappable into answer) -->
                <div class="text-sm sm:text-base font-sans font-medium text-slate-100 text-center leading-snug py-1">
                    {#if battleForm.isFinal && battle.genre}
                        <p class="font-display font-black text-sm text-amber-300 uppercase tracking-wider mb-1">{battle.genre}</p>
                    {/if}
                    <div class="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1.5">
                        {#each battleForm.promptWords as word (word.id)}
                            <button
                                type="button"
                                on:click={() => addWordToAnswer(word, battle.id)}
                                class="hover:text-cyan-300 hover:underline transition-colors cursor-pointer text-left inline bg-transparent p-0 border-0 font-bold text-sm sm:text-base"
                                title={$t.promptWordsLabel || 'Tap to use prompt word'}
                            >
                                {word.text}
                            </button>
                        {/each}
                    </div>
                </div>

                <!-- Subtle Prompt Words Helper Hint -->
                <div class="mt-1 pt-1 border-t border-neutral-900 text-center">
                    <span class="text-[10px] font-sans text-slate-400">
                        {$t.promptTappingHint || '💡 You can also tap words from the prompt above!'}
                    </span>
                </div>
            </div>

            <!-- Answer Dropzone (SortableJS Enabled) -->
            <div class="flex-shrink-0 mb-2.5">
                {#if battleForm.isFinal}
                    <!-- Movie Title -->
                    <div class="flex items-center justify-between text-xs font-display font-bold uppercase tracking-widest text-slate-400 mb-1">
                        <span class="{battleForm.activeLine === 'title' ? 'text-pink-400 font-black' : ''}">🎬 {$t.movieTitle || 'Movie Title'}</span>
                        {#if battleForm.titleWords.length > 0}
                            <button type="button" class="text-red-400 hover:text-red-300 font-sans text-xs cursor-pointer font-bold" on:click={() => clearLine(battle.id, 'title')}>✕ {$t.clear || 'Clear'}</button>
                        {/if}
                    </div>
                    <button
                        type="button"
                        aria-label="Select Movie Title for adding words"
                        use:sortableList={battleForm.titleWords}
                        on:listUpdated={e => handleListUpdate(e.detail, battle.id, 'title')}
                        class="w-full text-left min-h-[2.75rem] p-2.5 bg-neutral-950/90 border-2 border-dashed rounded-xl flex flex-wrap gap-2 items-center mb-2 {battleForm.activeLine === 'title' ? 'border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.3)] bg-pink-950/10' : 'border-neutral-800'}"
                        on:click={() => battleForms[battle.id].activeLine = 'title'}
                    >
                        {#if battleForm.titleWords.length === 0}
                            <span class="text-xs sm:text-sm text-slate-500 italic pl-1">{$t.clickWordsHintFinal || 'Tap words to assemble title'}</span>
                        {/if}
                        {#each battleForm.titleWords as word (word.id)}
                            <div class="answer-word px-2.5 py-1 bg-pink-950/80 border border-pink-400/90 text-pink-100 font-bold text-xs sm:text-sm rounded-lg shadow-sm flex items-center gap-1.5">
                                <span>{word.text}</span>
                                <button type="button" class="delete-word-btn text-pink-400 hover:text-white font-bold ml-1 cursor-pointer text-sm" on:click|stopPropagation={() => deleteWord(word.id, battle.id)}>&times;</button>
                            </div>
                        {/each}
                    </button>

                    <!-- Movie Tagline -->
                    <div class="flex items-center justify-between text-xs font-display font-bold uppercase tracking-widest text-slate-400 mb-1">
                        <span class="{battleForm.activeLine === 'tagline' ? 'text-pink-400 font-black' : ''}">💬 {$t.movieTagline || 'Tagline'}</span>
                        {#if battleForm.taglineWords.length > 0}
                            <button type="button" class="text-red-400 hover:text-red-300 font-sans text-xs cursor-pointer font-bold" on:click={() => clearLine(battle.id, 'tagline')}>✕ {$t.clear || 'Clear'}</button>
                        {/if}
                    </div>
                    <button
                        type="button"
                        aria-label="Select Movie Tagline for adding words"
                        use:sortableList={battleForm.taglineWords}
                        on:listUpdated={e => handleListUpdate(e.detail, battle.id, 'tagline')}
                        class="w-full text-left min-h-[2.75rem] p-2.5 bg-neutral-950/90 border-2 border-dashed rounded-xl flex flex-wrap gap-2 items-center {battleForm.activeLine === 'tagline' ? 'border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.3)] bg-pink-950/10' : 'border-neutral-800'}"
                        on:click={() => battleForms[battle.id].activeLine = 'tagline'}
                    >
                        {#if battleForm.taglineWords.length === 0}
                            <span class="text-xs sm:text-sm text-slate-500 italic pl-1">{$t.clickWordsHintFinal || 'Tap words to assemble tagline'}</span>
                        {/if}
                        {#each battleForm.taglineWords as word (word.id)}
                            <div class="answer-word px-2.5 py-1 bg-pink-950/80 border border-pink-400/90 text-pink-100 font-bold text-xs sm:text-sm rounded-lg shadow-sm flex items-center gap-1.5">
                                <span>{word.text}</span>
                                <button type="button" class="delete-word-btn text-pink-400 hover:text-white font-bold ml-1 cursor-pointer text-sm" on:click|stopPropagation={() => deleteWord(word.id, battle.id)}>&times;</button>
                            </div>
                        {/each}
                    </button>
                {:else}
                    <!-- Single Battle Answer Dropzone -->
                    <div class="flex items-center justify-between text-xs font-display font-bold uppercase tracking-widest text-slate-400 mb-1">
                        <span class="text-pink-400 font-bold">⚔️ {$t.yourAnswer || 'YOUR ANSWER'}</span>
                        <div class="flex items-center gap-2">
                            <span class="text-xs text-slate-400 font-mono">{battleForm.answerWords.length} {$t.words || 'WORDS'}</span>
                            {#if battleForm.answerWords.length > 0}
                                <button type="button" class="text-red-400 hover:text-red-300 font-sans text-xs cursor-pointer font-bold" on:click={() => clearLine(battle.id)}>✕ {$t.clear || 'Clear'}</button>
                            {/if}
                        </div>
                    </div>
                    <div
                        use:sortableList={battleForm.answerWords}
                        on:listUpdated={e => handleListUpdate(e.detail, battle.id)}
                        class="w-full min-h-[3.5rem] p-3 bg-neutral-950/90 border-2 border-dashed border-pink-500/70 rounded-2xl flex flex-wrap gap-2 items-center transition-all duration-200"
                    >
                        {#if battleForm.answerWords.length === 0}
                            <span class="text-xs sm:text-sm text-slate-500 italic pl-1">{$t.clickWordsHint || 'Tap words below to build your punchline!'}</span>
                        {/if}
                        {#each battleForm.answerWords as word (word.id)}
                            <div class="answer-word px-3 py-1 bg-pink-950/80 border border-pink-400/90 text-pink-100 font-bold text-xs sm:text-sm rounded-lg shadow-sm flex items-center gap-1.5">
                                <span>{word.text}</span>
                                <button type="button" class="delete-word-btn text-pink-400 hover:text-white font-bold ml-1 cursor-pointer text-sm" on:click|stopPropagation={() => deleteWord(word.id, battle.id)}>&times;</button>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>

            <!-- Word Bank Card with Undo & Shuffle (Expansive Natural Flow) -->
            <div class="flex-shrink-0 flex flex-col my-2">
                <div class="flex items-center justify-between text-xs font-display font-bold uppercase tracking-widest text-cyan-400 mb-1.5">
                    <span>🔤 {$t.wordBank || 'WORD BANK'}</span>
                    <div class="flex items-center gap-1.5">
                        <button
                            type="button"
                            on:click={() => undoLastWord(battle.id)}
                            disabled={!battleForm.undoStack || battleForm.undoStack.length === 0}
                            class="px-2.5 py-1 bg-neutral-900 border border-neutral-700 text-slate-200 font-display text-[10px] font-bold rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-800 cursor-pointer"
                        >
                            {$t.undo || 'Undo'}
                        </button>
                        <button
                            type="button"
                            on:click={() => shuffleBank(battle.id)}
                            class="px-2.5 py-1 bg-neutral-900 border border-neutral-700 text-slate-200 font-display text-[10px] font-bold rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                        >
                            {$t.shuffleBank || 'Shuffle'}
                        </button>
                    </div>
                </div>

                <!-- Word Tiles (Expanded Arcade Cyan Chips with Zero Inner Scroll Trap) -->
                <div class="p-3 bg-neutral-950/90 border border-neutral-800 rounded-2xl flex flex-wrap content-start gap-2 justify-center">
                    {#each battleForm.wordBankWords as word (word.id)}
                        <button
                            type="button"
                            data-testid="word-bank-chip"
                            on:click={() => addWordToAnswer(word, battle.id)}
                            class="word-bank-chip px-3 py-1.5 bg-cyan-950/70 hover:bg-cyan-900/90 border border-cyan-400/80 text-cyan-200 font-sans font-bold text-xs sm:text-sm rounded-xl shadow-sm active:scale-95 transition-all cursor-pointer"
                        >
                            {word.text}
                        </button>
                    {/each}
                </div>
            </div>

            <!-- Submit Button Inside Natural Scroll Flow -->
            <div class="flex-shrink-0 pt-3 pb-12">
                <button
                    type="button"
                    disabled={!hasAnswerWords}
                    on:click={() => submitBattleAnswer(battle.id)}
                    class="btn-arcade w-full py-4 px-6 rounded-xl font-display font-black text-sm sm:text-base uppercase tracking-wider transition-all cursor-pointer {
                        hasAnswerWords 
                        ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-[0_0_25px_rgba(236,72,153,0.5)] active:scale-98' 
                        : 'bg-neutral-900 border border-neutral-800 text-neutral-600 opacity-40 cursor-not-allowed'
                    }"
                >
                    ⚔️ {$t.submitBattleAnswer || 'SUBMIT BATTLE ANSWER'}
                </button>
            </div>
        {/if}
    {:else}
        <div class="flex-1 flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
            <SevenSegmentDisplay time={timer} />
            <p class="mt-12 text-2xl text-warning animate-pulse font-display">{$t.waitingForCompetitors}</p>
        </div>
    {/if}
</div>