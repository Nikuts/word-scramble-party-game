<script>
    import { onMount } from 'svelte';
    import Sortable from 'sortablejs';
    import { t, sendMessage, getPartialAnswers, clearConsumedPartialAnswers, gameState, currentPlayer } from '../../../stores.js';
    import SevenSegmentDisplay from '../../shared/SevenSegmentDisplay.svelte';
    import PixelAvatar from '../../shared/PixelAvatar.svelte';

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
    .sortable-ghost {
        opacity: 0.4;
    }
</style>

<div class="w-full max-w-xl mx-auto h-full flex flex-col justify-between px-2 pb-2 relative select-none font-sans">
    {#if currentBattleToAnswer}
        {@const battle = currentBattleToAnswer}
        {@const battleForm = battleForms[battle.id]}
        {@const hasAnswerWords = battleForm ? (battleForm.isFinal ? (battleForm.titleWords.length > 0 || battleForm.taglineWords.length > 0) : battleForm.answerWords.length > 0) : false}

        <!-- Stage Center Header: Timer & Centered Stage Badge -->
        <div class="flex flex-col items-center justify-center mb-2 flex-shrink-0 relative z-10">
            <div class="scale-95 mb-1.5">
                <SevenSegmentDisplay time={timer} />
            </div>
            <!-- Centered Standardized Badge -->
            <div class="px-3 py-1 bg-black/80 border border-secondary text-secondary rounded font-display text-xs tracking-wider font-bold shadow-[0_0_10px_rgba(var(--color-secondary-rgb),0.25)]">
                {battle.competitors.length > 2 ? $t.brawlLabel : (battle.isFinal ? $t.finalBattle : $t.battleStatusAnswering)} {currentBattleNum}/{totalAssigned}
            </div>
        </div>

        {#if battleForm}
            <!-- Battle Prompt Card with Natural Text Flow and Header +30s Badge -->
            <div class="panel-arcade p-2.5 sm:p-3 rounded-lg mb-2 flex-shrink-0 relative z-10" style="--neon-color: var(--color-primary); --neon-color-rgb: var(--color-primary-rgb);">
                <div class="flex items-center justify-between text-[10px] font-display uppercase tracking-wider text-primary/80 mb-1.5 whitespace-nowrap">
                    <span>{battleForm.isFinal ? ($t.finalBattle || 'Final Movie Battle') : ($t.battlePrompt || 'Battle Prompt')}</span>
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

                <!-- Natural flowing text (No boxes around words) -->
                <div class="text-xs sm:text-sm font-medium text-slate-100 leading-snug py-0.5">
                    {#if battleForm.isFinal}
                        <p class="font-bold text-secondary mb-1">{battle.genre || ''}</p>
                    {/if}
                    <div class="flex flex-wrap items-baseline gap-x-1 gap-y-0.5">
                        {#each battleForm.promptWords as word (word.id)}
                            <button 
                                type="button"
                                on:click={() => addWordToAnswer(word, battle.id)}
                                class="hover:text-primary hover:underline transition-colors cursor-pointer text-left inline bg-transparent p-0 border-0 font-medium"
                                title={$t.promptWordsLabel || 'Tap to use prompt word'}
                            >
                                {word.text}
                            </button>
                        {/each}
                    </div>
                </div>

                <!-- Single-Line Dismissible Green Tooltip -->
                {#if showPromptTooltip}
                    <div class="mt-2 px-2 py-1 bg-emerald-950/90 border border-emerald-500/60 rounded flex items-center justify-between text-[10px] text-emerald-200">
                        <span class="truncate">💡 {$t.promptTooltip || 'Tip: Tap prompt words to use them!'}</span>
                        <button 
                            on:click={dismissPromptTooltip}
                            class="ml-2 px-2 py-0.5 bg-emerald-500 text-black font-display text-[9px] font-bold rounded hover:bg-emerald-400 transition-colors flex-shrink-0 cursor-pointer"
                        >
                            {$t.gotIt || 'OK'}
                        </button>
                    </div>
                {/if}
            </div>

            <!-- Answer Dropzone (SortableJS Enabled) -->
            <div class="mb-2 flex-shrink-0 relative z-10">
                {#if battleForm.isFinal}
                    <div class="flex items-center justify-between text-[10px] font-display uppercase tracking-widest text-secondary mb-1">
                        <span>Movie Title</span>
                        {#if battleForm.titleWords.length > 0}
                            <button class="text-red-400 hover:text-red-300 font-sans text-xs" on:click={() => clearLine(battle.id, 'title')}>✕ {$t.clear}</button>
                        {/if}
                    </div>
                    <div 
                        use:sortableList={battleForm.titleWords}
                        on:listUpdated={e => handleListUpdate(e.detail, battle.id, 'title')}
                        class="min-h-[2.5rem] p-1.5 bg-black/80 border-2 border-dashed rounded-lg flex flex-wrap gap-1 items-center mb-2 {battleForm.activeLine === 'title' ? 'border-primary' : 'border-neutral-700'}"
                        on:click={() => battleForms[battle.id].activeLine = 'title'}
                    >
                        {#if battleForm.titleWords.length === 0}
                            <span class="text-[11px] text-slate-500 italic pl-1">{$t.clickWordsHintFinal || 'Click words to assemble title'}</span>
                        {/if}
                        {#each battleForm.titleWords as word (word.id)}
                            <div class="answer-word px-2 py-0.5 bg-pink-950/80 border border-pink-400/90 text-pink-100 font-semibold text-xs rounded-md shadow-sm flex items-center gap-1">
                                <span>{word.text}</span>
                                <button class="delete-word-btn text-pink-400 hover:text-white font-bold ml-1" on:click|stopPropagation={() => deleteWord(word.id, battle.id)}>&times;</button>
                            </div>
                        {/each}
                    </div>

                    <div class="flex items-center justify-between text-[10px] font-display uppercase tracking-widest text-secondary mb-1">
                        <span>Tagline</span>
                        {#if battleForm.taglineWords.length > 0}
                            <button class="text-red-400 hover:text-red-300 font-sans text-xs" on:click={() => clearLine(battle.id, 'tagline')}>✕ {$t.clear}</button>
                        {/if}
                    </div>
                    <div 
                        use:sortableList={battleForm.taglineWords}
                        on:listUpdated={e => handleListUpdate(e.detail, battle.id, 'tagline')}
                        class="min-h-[2.5rem] p-1.5 bg-black/80 border-2 border-dashed rounded-lg flex flex-wrap gap-1 items-center {battleForm.activeLine === 'tagline' ? 'border-primary' : 'border-neutral-700'}"
                        on:click={() => battleForms[battle.id].activeLine = 'tagline'}
                    >
                        {#if battleForm.taglineWords.length === 0}
                            <span class="text-[11px] text-slate-500 italic pl-1">{$t.clickWordsHintFinal || 'Click words to assemble tagline'}</span>
                        {/if}
                        {#each battleForm.taglineWords as word (word.id)}
                            <div class="answer-word px-2 py-0.5 bg-pink-950/80 border border-pink-400/90 text-pink-100 font-semibold text-xs rounded-md shadow-sm flex items-center gap-1">
                                <span>{word.text}</span>
                                <button class="delete-word-btn text-pink-400 hover:text-white font-bold ml-1" on:click|stopPropagation={() => deleteWord(word.id, battle.id)}>&times;</button>
                            </div>
                        {/each}
                    </div>
                {:else}
                    <div class="flex items-center justify-between text-[10px] font-display uppercase tracking-widest text-secondary mb-1">
                        <span>{$t.yourAnswer || 'YOUR ANSWER'}</span>
                        <div class="flex items-center gap-2">
                            <span class="text-[10px] text-slate-400 font-mono">{battleForm.answerWords.length} {$t.words || 'WORDS'}</span>
                            {#if battleForm.answerWords.length > 0}
                                <button class="text-red-400 hover:text-red-300 font-sans text-xs" on:click={() => clearLine(battle.id)}>✕ {$t.clear}</button>
                            {/if}
                        </div>
                    </div>
                    <div 
                        use:sortableList={battleForm.answerWords}
                        on:listUpdated={e => handleListUpdate(e.detail, battle.id)}
                        class="min-h-[3.25rem] p-2 bg-black/80 border-2 border-dashed border-secondary/80 rounded-lg flex flex-wrap gap-1.5 items-center transition-all duration-200"
                    >
                        {#if battleForm.answerWords.length === 0}
                            <span class="text-xs text-slate-500 italic pl-1">{$t.clickWordsHint || 'Click words to build your answer'}</span>
                        {/if}
                        {#each battleForm.answerWords as word (word.id)}
                            <div class="answer-word px-2 py-0.5 bg-pink-950/80 border border-pink-400/90 text-pink-100 font-semibold text-xs rounded-md shadow-sm flex items-center gap-1.5 transition-transform">
                                <span>{word.text}</span>
                                <button class="delete-word-btn text-pink-400 hover:text-white font-bold ml-1" on:click|stopPropagation={() => deleteWord(word.id, battle.id)}>&times;</button>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>

            <!-- Word Bank Card with Undo & Shuffle -->
            <div class="flex-1 flex flex-col min-h-0 mb-2 relative z-10">
                <div class="flex items-center justify-between text-[10px] font-display uppercase tracking-widest text-primary mb-1">
                    <span>{$t.wordBank || 'WORD BANK'}</span>
                    <div class="flex items-center gap-1">
                        <button 
                            on:click={() => undoLastWord(battle.id)}
                            disabled={!battleForm.undoStack || battleForm.undoStack.length === 0}
                            class="px-2 py-0.5 bg-neutral-900 border border-neutral-700 text-slate-200 font-display text-[9px] font-bold rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-800"
                        >
                            {$t.undo || 'Undo'}
                        </button>
                        <button 
                            on:click={() => shuffleBank(battle.id)}
                            class="px-2 py-0.5 bg-neutral-900 border border-neutral-700 text-slate-200 font-display text-[9px] font-bold rounded hover:bg-neutral-800 transition-colors"
                        >
                            {$t.shuffleBank || 'Shuffle'}
                        </button>
                    </div>
                </div>

                <!-- Word Tiles (Reusable) -->
                <div class="flex-1 overflow-y-auto p-1.5 bg-black/60 border border-neutral-800 rounded-lg flex flex-wrap content-start gap-1 justify-center">
                    {#each battleForm.wordBankWords as word (word.id)}
                        <button 
                            on:click={() => addWordToAnswer(word, battle.id)}
                            class="px-2 py-1 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-400/80 text-cyan-200 font-medium text-xs rounded-md shadow-sm transition-transform active:scale-95 cursor-pointer"
                        >
                            {word.text}
                        </button>
                    {/each}
                </div>
            </div>

            <!-- Bottom Fixed Submit Button -->
            <div class="pt-1 flex-shrink-0 relative z-10">
                <button 
                    disabled={!hasAnswerWords}
                    class="btn-arcade w-full py-2.5 text-sm sm:text-base font-display uppercase tracking-widest rounded-lg transition-all {
                        hasAnswerWords ? 'shadow-[0_0_20px_rgba(57,255,20,0.5)] border-emerald-400 text-emerald-200' : 'opacity-40 cursor-not-allowed'
                    }"
                    style="--btn-color: {hasAnswerWords ? 'var(--color-accent)' : '#4b5563'};"
                    on:click={() => submitBattleAnswer(battle.id)}
                >
                    {$t.submitBattleAnswer || 'SUBMIT ANSWER'}
                </button>
            </div>
        {/if}
    {:else}
        <div class="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <SevenSegmentDisplay time={timer} />
            <p class="mt-12 text-2xl text-warning animate-pulse font-display">{$t.waitingForCompetitors}</p>
        </div>
    {/if}
</div>