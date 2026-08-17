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
    }
    .answer-word:active {
        cursor: grabbing;
    }
</style>

<div class="w-full max-w-4xl mx-auto text-center px-2">
    {#if $gameState?.theme}
        <div class="flex justify-center mb-2">
            <div class="inline-flex items-center gap-1.5 px-3 py-1 bg-black/60 border border-primary/50 rounded-full text-xs font-bold text-primary max-w-[85%] truncate">
                <span>🎭</span> <span class="truncate">{$gameState.theme}</span>
            </div>
        </div>
    {/if}

    <SevenSegmentDisplay time={timer} />
    
    {#if currentBattleToAnswer}
        {@const battle = currentBattleToAnswer}
        {@const battleForm = battleForms[battle.id]}
        
        <h1 class="text-2xl sm:text-3xl mb-1">{battle.isFinal ? $t.finalBattle : $t.battlePhase}</h1>
        <div class="mb-3">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 border border-primary text-primary font-bold text-sm tracking-wide">
                ⚔️ {battle.competitors.length > 2 ? $t.brawlLabel : $t.battleStatusAnswering} {currentBattleNum}/{totalAssigned}
            </span>
        </div>

        <div class="panel-arcade" style="--neon-color: var(--color-primary);">
            {#if battleForm}
                <!-- PROMPT / SCENARIO AREA -->
                <div class="text-left mb-4">
                    {#if battleForm.isFinal}
                        <div class="text-neutral-200 mb-3 p-4 bg-neutral-900 border border-neutral-700 rounded-md">
                            <div class="flex justify-between items-center mb-2">
                                <p class="text-primary font-bold text-lg">{battle.genre}</p>
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
                            <div class="flex flex-wrap gap-1.5 items-baseline leading-relaxed text-base sm:text-lg mb-3">
                                {#each battleForm.promptWords as word (word.id)}
                                    <button 
                                        type="button"
                                        class="hover:text-primary hover:bg-primary/20 px-1 py-0.5 rounded transition-all cursor-pointer inline text-left font-medium"
                                        on:click={() => addWordToAnswer(word, battle.id)}
                                        title={$t.promptWordsLabel}
                                    >
                                        {word.text}
                                    </button>
                                {/each}
                            </div>
                            {#if showPromptTooltip}
                                <div class="mt-2 p-2 bg-neutral-800 border border-accent/50 rounded-md flex items-center justify-between text-xs text-accent gap-2">
                                    <span>{$t.promptTooltip}</span>
                                    <button 
                                        type="button" 
                                        class="px-2 py-0.5 bg-accent text-black font-bold rounded text-[11px] hover:scale-105 transition-all cursor-pointer flex-shrink-0"
                                        on:click={dismissPromptTooltip}
                                    >
                                        {$t.gotIt}
                                    </button>
                                </div>
                            {/if}
                        </div>
                    {:else}
                        <div class="p-4 bg-neutral-900/90 border border-neutral-700 rounded-lg mb-2 shadow-md">
                            <div class="flex justify-between items-center mb-2">
                                <span class="text-xs font-semibold uppercase tracking-wider text-neutral-400">❓ {$t.battlePrompt}</span>
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
                            <div class="flex flex-wrap gap-1.5 items-baseline leading-relaxed text-lg sm:text-xl font-medium text-neutral-100">
                                {#each battleForm.promptWords as word (word.id)}
                                    <button 
                                        type="button"
                                        class="hover:text-primary hover:bg-primary/20 px-1.5 py-0.5 rounded transition-all cursor-pointer inline text-left font-medium"
                                        on:click={() => addWordToAnswer(word, battle.id)}
                                        title={$t.promptWordsLabel}
                                    >
                                        {word.text}
                                    </button>
                                {/each}
                            </div>
                            {#if showPromptTooltip}
                                <div class="mt-3 p-2 bg-neutral-800 border border-accent/50 rounded-md flex items-center justify-between text-xs text-accent gap-2">
                                    <span>{$t.promptTooltip}</span>
                                    <button 
                                        type="button" 
                                        class="px-2 py-0.5 bg-accent text-black font-bold rounded text-[11px] hover:scale-105 transition-all cursor-pointer flex-shrink-0"
                                        on:click={dismissPromptTooltip}
                                    >
                                        {$t.gotIt}
                                    </button>
                                </div>
                            {/if}
                        </div>
                    {/if}
                </div>

                <!-- ANSWER AREA(S) -->
                {#if battleForm.isFinal}
                    <div class="flex items-center justify-between mb-1">
                        <h3 class="font-bold text-neutral-300">Movie Title</h3>
                        {#if battleForm.titleWords.length > 0}
                            <button 
                                class="text-xs text-red-400 hover:text-red-300 underline font-medium"
                                on:click={() => clearLine(battle.id, 'title')}
                            >
                                ✕ {$t.clear}
                            </button>
                        {/if}
                    </div>
                    <div 
                        use:sortableList={battleForm.titleWords}
                        on:listUpdated={e => handleListUpdate(e.detail, battle.id, 'title')}
                        role="button"
                        aria-label="Select Movie Title for adding words"
                        tabindex="0"
                        on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { battleForms[battle.id].activeLine = 'title'; } }}
                        class="p-3 bg-black/50 min-h-[4rem] border-2 border-dashed flex flex-wrap gap-2 items-center mb-4 rounded-md cursor-pointer transition-colors {battleForm.activeLine === 'title' ? 'border-primary ring-1 ring-primary/50' : 'border-neutral-600'}"
                        on:click={() => battleForms[battle.id].activeLine = 'title'}
                    >
                        {#if battleForm.titleWords.length === 0}
                            <span class="text-neutral-500 pointer-events-none w-full text-left text-sm">{$t.clickWordsHintFinal}</span>
                        {/if}
                        {#each battleForm.titleWords as word (word.id)}
                            <div class="answer-word bg-primary text-black font-semibold pl-3 pr-1 py-1 text-base shadow-md inline-flex items-center rounded-md">
                                <span>{word.text}</span>
                                <button class="delete-word-btn !text-red-900 hover:!bg-red-500 hover:!text-white ml-2 rounded" title="Remove word" on:click|stopPropagation={() => deleteWord(word.id, battle.id)}>&times;</button>
                            </div>
                        {/each}
                    </div>
                    
                    <div class="flex items-center justify-between mb-1">
                        <h3 class="font-bold text-neutral-300">Tagline</h3>
                        {#if battleForm.taglineWords.length > 0}
                            <button 
                                class="text-xs text-red-400 hover:text-red-300 underline font-medium"
                                on:click={() => clearLine(battle.id, 'tagline')}
                            >
                                ✕ {$t.clear}
                            </button>
                        {/if}
                    </div>
                     <div 
                        use:sortableList={battleForm.taglineWords}
                        on:listUpdated={e => handleListUpdate(e.detail, battle.id, 'tagline')}
                        role="button"
                        aria-label="Select Movie Tagline for adding words"
                        tabindex="0"
                        on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { battleForms[battle.id].activeLine = 'tagline'; } }}
                        class="p-3 bg-black/50 min-h-[4rem] border-2 border-dashed flex flex-wrap gap-2 items-center mb-4 rounded-md cursor-pointer transition-colors {battleForm.activeLine === 'tagline' ? 'border-primary ring-1 ring-primary/50' : 'border-neutral-600'}"
                        on:click={() => battleForms[battle.id].activeLine = 'tagline'}
                    >
                        {#if battleForm.taglineWords.length === 0}
                            <span class="text-neutral-500 pointer-events-none w-full text-left text-sm">{$t.clickWordsHintFinal}</span>
                        {/if}
                        {#each battleForm.taglineWords as word (word.id)}
                            <div class="answer-word bg-primary text-black font-semibold pl-3 pr-1 py-1 text-base shadow-md inline-flex items-center rounded-md">
                                <span>{word.text}</span>
                                <button class="delete-word-btn !text-red-900 hover:!bg-red-500 hover:!text-white ml-2 rounded" title="Remove word" on:click|stopPropagation={() => deleteWord(word.id, battle.id)}>&times;</button>
                            </div>
                        {/each}
                    </div>

                {:else}
                    <div class="flex items-center justify-between mb-2">
                        <h3 class="font-bold text-neutral-300 font-display">{$t.yourAnswer}</h3>
                        {#if battleForm.answerWords.length > 0}
                            <button 
                                class="text-xs text-red-400 hover:text-red-300 underline font-medium"
                                on:click={() => clearLine(battle.id)}
                            >
                                ✕ {$t.clear}
                            </button>
                        {/if}
                    </div>
                    <div
                        use:sortableList={battleForm.answerWords}
                        on:listUpdated={e => handleListUpdate(e.detail, battle.id)}
                        class="p-3 bg-black/50 min-h-[5rem] border-2 border-dashed border-primary flex flex-wrap gap-2 items-center mb-6 rounded-md"
                    >
                        {#if battleForm.answerWords.length === 0}
                            <span class="text-neutral-500 pointer-events-none w-full text-left text-sm">{$t.clickWordsHint}</span>
                        {/if}
                        {#each battleForm.answerWords as word (word.id)}
                           <div class="answer-word bg-primary text-black font-semibold pl-3 pr-1 py-1 text-lg shadow-md inline-flex items-center rounded-md">
                                <span>{word.text}</span>
                                <button class="delete-word-btn !text-red-900 hover:!bg-red-500 hover:!text-white ml-2 rounded" title="Remove word" on:click|stopPropagation={() => deleteWord(word.id, battle.id)}>&times;</button>
                            </div>
                        {/each}
                    </div>
                {/if}

                <!-- WORD BANK -->
                <div>
                    <div class="flex items-center justify-between mb-2">
                        <h3 class="font-bold text-neutral-300 font-display text-left">{$t.wordBank}</h3>
                        <div class="flex items-center gap-2">
                            <button 
                                class="text-xs px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-cyan-300 border border-cyan-500/50 rounded font-semibold transition-all inline-flex items-center gap-1 {(!battleForm.undoStack || battleForm.undoStack.length === 0) ? 'opacity-40 pointer-events-none' : 'hover:scale-105'}"
                                on:click={() => undoLastWord(battle.id)}
                                title={$t.undo}
                            >
                                <span>↩</span> {$t.undo}
                            </button>
                            <button 
                                class="text-xs px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-yellow-300 border border-yellow-500/50 rounded font-semibold transition-all hover:scale-105 inline-flex items-center gap-1"
                                on:click={() => shuffleBank(battle.id)}
                                title={$t.shuffleBank}
                            >
                                <span>🔀</span> {$t.shuffleBank}
                            </button>
                        </div>
                    </div>
                    <div class="p-3 bg-neutral-900 border border-neutral-700 max-h-64 sm:max-h-72 overflow-y-auto flex flex-wrap gap-2 justify-center items-start select-none rounded-md">
                        {#each battleForm.wordBankWords as word (word.id)}
                            <button 
                                class="bg-neutral-800 text-white font-medium px-3 py-1 border border-neutral-600 text-base transition-transform transform hover:scale-105 hover:bg-secondary hover:text-white rounded-md"
                                on:click={() => addWordToAnswer(word, battle.id)}
                            >
                                {word.text}
                            </button>
                        {/each}
                    </div>
                </div>
                
                <button class="mt-6 w-full btn-arcade text-xl" style="--btn-color: var(--color-accent);" on:click={() => submitBattleAnswer(battle.id)}>{$t.submitBattleAnswer}</button>
            {/if}
        </div>
    {:else}
        <p class="mt-12 text-2xl text-warning animate-pulse">{$t.waitingForCompetitors}</p>
    {/if}
</div>