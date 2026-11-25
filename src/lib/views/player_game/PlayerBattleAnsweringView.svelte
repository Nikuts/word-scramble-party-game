<!-- src/lib/views/player_game/PlayerBattleAnsweringView.svelte -->
<script>
    import Sortable from 'sortablejs';
    import { t, language, sendMessage, sendReaction, getPartialAnswers, clearConsumedPartialAnswers, gameState } from '../../../stores.js';
    import { formatWordsLabel } from '../../../ui_text.js';
    import { formatAnswerText } from '../../utils.js';
    import SevenSegmentDisplay from '../../shared/SevenSegmentDisplay.svelte';
    import PixelAvatar from '../../shared/PixelAvatar.svelte';
    import ArcadeIcon from '../../shared/ArcadeIcon.svelte';

    export let timer;
    export let battlesToAnswer = [];
    export let gameId;
    export let playerId;

    let battleForms = {};
    let nextAnswerWordSeq = 0;

    $: currentBattleToAnswer = battlesToAnswer[0];

    $: allAssignedBattles = $gameState?.battleSchedule?.filter(b => b.competitors.includes(playerId)) || [];
    $: totalAssigned = allAssignedBattles.length || 1;
    $: currentBattleIndex = allAssignedBattles.findIndex(b => b.id === currentBattleToAnswer?.id);
    $: currentBattleNum = currentBattleIndex !== -1 ? currentBattleIndex + 1 : (totalAssigned - battlesToAnswer.length + 1);

    $: currentPlayerObj = $gameState?.players?.find(p => p.id === playerId);
    $: hasUsedTimeBoost = currentPlayerObj?.hasUsedTimeBoost || false;

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
        const regex = /[\p{L}\p{N}'’`ʼ-]+|_{3,}|[.,!?;:()"-]/gu;
        return text.match(regex) || [];
    }

    function countVocabularyWords(words) {
        return (words || []).filter(w => w && /[\p{L}\p{N}]/u.test(w.text)).length;
    }

    function formatWordTokens(tokens) {
        if (!tokens || tokens.length === 0) return '';
        const raw = tokens.filter(Boolean).map(w => w.text).join(' ');
        return formatAnswerText(raw);
    }

    const TRAILING_PUNCT_REGEX = /^[.,!?:;…»”)\]]+$/;

    function getPromptWordGroups(promptWords, battle, isFinal) {
        let words = promptWords || [];
        const genre = battle?.genre || battle?.formatConfig?.genre;
        if (isFinal && genre && words.length > 0) {
            const colonIdx = words.findIndex(w => w?.text === ':');
            if (colonIdx > 0 && colonIdx <= 6) {
                const prefix = words.slice(0, colonIdx).map(w => w.text).join(' ').toLowerCase().replace(/[^a-zа-яіїєґ0-9]+/gi, '');
                const cleanGenre = String(genre).toLowerCase().replace(/[^a-zа-яіїєґ0-9]+/gi, '');
                if (cleanGenre && (prefix === cleanGenre || cleanGenre.startsWith(prefix))) {
                    words = words.slice(colonIdx + 1);
                }
            }
        }
        const groups = [];
        for (const w of words) {
            if (!w) continue;
            if (groups.length > 0 && TRAILING_PUNCT_REGEX.test(w.text)) {
                groups[groups.length - 1].push(w);
            } else {
                groups.push([w]);
            }
        }
        return groups;
    }

    function getWordCountLabel(count, dict) {
        return formatWordsLabel(count, dict, $language);
    }

    function ensureBattleFormsInitialized(battles, pId) {
        if (!battles || !battles.length || !pId) return;
        const activeScheduleIds = new Set(($gameState?.battleSchedule || battles).map(b => b.id));
        Object.keys(battleForms).forEach(existingId => {
            if (!activeScheduleIds.has(existingId)) {
                delete battleForms[existingId];
            }
        });
        const uninitialized = battles.filter(b => !battleForms[b.id]);
        if (uninitialized.length === 0) return;

        const partials = getPartialAnswers();
        let consumedPartials = false;

        uninitialized.forEach(battle => {
            const partialKey = `b-${battle.id}-${pId}`;
            const partialAnswer = partials[partialKey];
            const isMultiLine = Boolean(battle.genre || battle.formatConfig?.formatType === 'multi_line');

            let promptWords = [];
            if (battle.promptTokens && battle.promptTokens.length > 0) {
                promptWords = battle.promptTokens.map((item, i) => {
                    const isObj = typeof item === 'object' && item !== null;
                    const text = isObj ? item.text : String(item);
                    const tileId = isObj && item.id ? item.id : `p_${i}`;
                    return { id: `pt-${battle.id}-${i}`, tileId, text, authorId: null, isPrompt: true };
                });
            } else {
                const premiseText = battle.formatConfig?.premise || battle.premise || '';
                const headerText = battle.formatConfig?.genre || battle.genre || '';
                const fallbackPrompt = isMultiLine ? `${headerText} ${premiseText}`.trim() : (battle.prompt || '');
                promptWords = tokenizeSimple(fallbackPrompt).map((tok, i) => ({
                    id: `pt-${battle.id}-${i}`,
                    tileId: `p_${i}`,
                    text: tok,
                    authorId: null,
                    isPrompt: true
                }));
            }

            const rawBank = battle.wordBanks?.[pId] || [];
            const bankWords = rawBank.map((item, i) => {
                const isObj = typeof item === 'object' && item !== null;
                const text = isObj ? (item.text ?? item.word) : String(item);
                const tileId = isObj && item.id ? item.id : `b_${i}`;
                const authorId = isObj ? item.authorId : null;
                return { id: `wb-${battle.id}-${i}`, tileId, text, authorId, isPrompt: false };
            });

            const allSourceTiles = [...promptWords, ...bankWords];
            const hydrateWordsArray = (rawSource) => {
                if (!rawSource) return [];
                if (Array.isArray(rawSource)) {
                    return rawSource.map((tid, i) => {
                        const found = allSourceTiles.find(t => t.tileId === tid);
                        return found
                            ? { ...found, id: `ans-${++nextAnswerWordSeq}-${i}` }
                            : null;
                    }).filter(Boolean);
                }
                if (typeof rawSource === 'string' && rawSource.trim()) {
                    return rawSource.split(' ').filter(Boolean).map((wordText, i) => {
                        const found = allSourceTiles.find(t => String(t.text).toLowerCase() === wordText.toLowerCase());
                        return {
                            id: `ans-${++nextAnswerWordSeq}-${i}`,
                            tileId: found?.tileId || null,
                            text: wordText
                        };
                    });
                }
                return [];
            };

            const baseForm = {
                promptWords,
                wordBankWords: bankWords,
                undoStack: [],
            };

            if (isMultiLine) {
                const titleSource = partialAnswer?.tileIds?.title ?? partialAnswer?.title;
                const taglineSource = partialAnswer?.tileIds?.tagline ?? partialAnswer?.tagline;
                battleForms[battle.id] = {
                    ...baseForm,
                    isFinal: true,
                    titleWords: hydrateWordsArray(titleSource),
                    taglineWords: hydrateWordsArray(taglineSource),
                    activeLine: 'title',
                };
            } else {
                const singleSource = Array.isArray(partialAnswer)
                    ? partialAnswer
                    : (partialAnswer?.tileIds ?? partialAnswer?.answer ?? partialAnswer);
                battleForms[battle.id] = {
                    ...baseForm,
                    isFinal: false,
                    answerWords: hydrateWordsArray(singleSource),
                };
            }
            if (partialAnswer) consumedPartials = true;
        });

        battleForms = { ...battleForms };
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
                node.dispatchEvent(new CustomEvent('listUpdated', { detail: reorderedList }));
            }
        });

        return {
            update(newList) { currentList = newList; },
            destroy() { sortable.destroy(); }
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

        const newAnswerWord = { ...word, id: `ans-${++nextAnswerWordSeq}` };
        const targetLine = form.isFinal ? form.activeLine : 'main';

        if (form.isFinal) {
            if (form.activeLine === 'title') form.titleWords = [...form.titleWords, newAnswerWord];
            else form.taglineWords = [...form.taglineWords, newAnswerWord];
        } else {
            form.answerWords = [...form.answerWords, newAnswerWord];
        }

        form.undoStack = [...(form.undoStack || []), { wordId: newAnswerWord.id, lineType: targetLine }];
        battleForms = { ...battleForms };
        saveBattlePartial(battleId);
    }

    function undoLastWord(battleId) {
        const form = battleForms[battleId];
        if (!form || !form.undoStack || form.undoStack.length === 0) return;

        const lastAction = form.undoStack.pop();
        if (!lastAction) return;

        if (form.isFinal) {
            if (lastAction.lineType === 'title') form.titleWords = form.titleWords.filter(w => w && w.id !== lastAction.wordId);
            else form.taglineWords = form.taglineWords.filter(w => w && w.id !== lastAction.wordId);
        } else {
            form.answerWords = form.answerWords.filter(w => w && w.id !== lastAction.wordId);
        }

        form.undoStack = [...form.undoStack];
        battleForms = { ...battleForms };
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
        battleForms = { ...battleForms };
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

        battleForms = { ...battleForms };
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

        battleForms = { ...battleForms };
        saveBattlePartial(battleId);
    }

    function saveBattlePartial(battleId) {
        const form = battleForms[battleId];
        if (!form) return;

        let payload;
        if (form.isFinal) {
            const titleIds = (form.titleWords || []).map(w => w?.tileId).filter(Boolean);
            const taglineIds = (form.taglineWords || []).map(w => w?.tileId).filter(Boolean);
            payload = {
                type: 'final_battle',
                battleId: battleId,
                tileIds: { title: titleIds, tagline: taglineIds },
                title: formatWordTokens(form.titleWords),
                tagline: formatWordTokens(form.taglineWords),
            };
        } else {
            const tileIds = (form.answerWords || []).map(w => w?.tileId).filter(Boolean);
            payload = {
                type: 'battle',
                battleId: battleId,
                tileIds,
                answer: formatWordTokens(form.answerWords),
            };
        }

        sendMessage('update-partial-answer', { gameId: gameId, playerId: playerId, payload });
    }

    function submitBattleAnswer(battleId) {
        const form = battleForms[battleId];
        if (!form) return;

        let answer;
        let tileIds;
        if (form.isFinal) {
            const titleWords = form.titleWords.filter(Boolean);
            const taglineWords = form.taglineWords.filter(Boolean);
            if (countVocabularyWords(titleWords) === 0 || countVocabularyWords(taglineWords) === 0) return;
            tileIds = {
                title: titleWords.map(w => w.tileId).filter(Boolean),
                tagline: taglineWords.map(w => w.tileId).filter(Boolean),
            };
            answer = {
                title: formatWordTokens(titleWords),
                tagline: formatWordTokens(taglineWords),
            };
        } else {
            const answerWords = form.answerWords.filter(Boolean);
            if (countVocabularyWords(answerWords) === 0) return;
            tileIds = answerWords.map(w => w.tileId).filter(Boolean);
            answer = formatWordTokens(answerWords);
        }

        sendMessage('submit-battle-answer', { gameId: gameId, playerId: playerId, battleId, tileIds, answer });
    }

    function handleSendAvatarReaction() {
        const activeGameId = gameId || $gameState?.id;
        if (!activeGameId) return;
        sendReaction('avatar');
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

<div class="w-full h-full flex flex-col p-3 pb-8 max-w-md md:max-w-5xl mx-auto select-none font-sans overflow-y-auto overscroll-contain box-border">
    {#if battlesToAnswer && battlesToAnswer.length > 0 && battleForms[battlesToAnswer[0].id]}
        {@const battle = battlesToAnswer[0]}
        {@const battleForm = battleForms[battle.id]}
        {@const hasAnswerWords = battleForm ? (battleForm.isFinal ? (countVocabularyWords(battleForm.titleWords) > 0 && countVocabularyWords(battleForm.taglineWords) > 0) : countVocabularyWords(battleForm.answerWords) > 0) : false}

        <header class="flex flex-row items-center justify-between gap-2 flex-shrink-0 pt-0.5 mb-2.5">
            <div class="fighter-crest bg-pink-950/90 border border-pink-400 text-pink-200 text-xs sm:text-sm">
                <ArcadeIcon name="sword" className="w-3.5 h-3.5" />
                <span>
                    {battleForm.isFinal ? ($t.finalBattle || 'FINAL MOVIE BATTLE') : (battle.competitors.length === 4 ? ($t.quadLabel || '4-WAY BRAWL') : (battle.competitors.length === 3 ? ($t.brawlLabel || '3-WAY BRAWL') : ($t.battleShort || 'BATTLE')))} {currentBattleNum}/{totalAssigned}
                </span>
            </div>
            <SevenSegmentDisplay time={timer} showLabel={false} size="sm" />
        </header>

        {#if battleForm}
            <!-- Responsive: Single Col on Phone, 2 Cols (Composer Left + Word Bank Right) on Tablet/PC -->
            <div class="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-start pb-6">
                <!-- Prompt + Answer Dropzone(s) -->
                <div class="order-1 md:col-span-5 md:col-start-1 md:row-start-1 space-y-2.5">
                    <div class="bg-[#131126] border-2 border-[#332e59] cut-md p-3">
                        <div class="flex items-center justify-between mb-1.5">
                            <span class="text-xs font-display text-pink-300 uppercase tracking-widest">
                                {battleForm.isFinal ? ($t.movieGenre || 'MOVIE GENRE') : ($t.prompt || 'PROMPT')}
                            </span>

                            <button
                                type="button"
                                on:click={handleTimeBoost}
                                disabled={hasUsedTimeBoost}
                                class="cut-sm px-2.5 py-1 border font-mono text-xs font-bold uppercase transition-colors inline-flex items-center gap-1 {
                                    hasUsedTimeBoost
                                    ? 'bg-neutral-900 border-neutral-600 text-slate-400 opacity-75 cursor-not-allowed'
                                    : 'bg-amber-950/80 border-amber-400 text-amber-200 hover:bg-amber-900 cursor-pointer'
                                }"
                            >
                                <ArcadeIcon name="clock" className="w-3 h-3" />
                                <span>{$t.timeBoost || '+30s'} ({hasUsedTimeBoost ? '0' : '1'})</span>
                            </button>
                        </div>

                        <div class="text-sm sm:text-base font-sans font-bold text-slate-100 text-center leading-snug py-1">
                            {#if battleForm.isFinal && (battle.genre || battle.formatConfig?.genre)}
                                <p class="font-display text-sm text-amber-300 uppercase tracking-wider mb-1">{battle.genre || battle.formatConfig?.genre}</p>
                            {/if}
                            <div class="flex flex-wrap items-baseline justify-center gap-x-1.5 gap-y-1">
                                {#each getPromptWordGroups(battleForm.promptWords, battle, battleForm.isFinal) as group (group[0].id)}
                                    <span class="inline-flex items-baseline">
                                        {#each group as word (word.id)}
                                            <button
                                                type="button"
                                                on:click={() => addWordToAnswer(word, battle.id)}
                                                class="hover:text-cyan-300 hover:underline transition-colors cursor-pointer text-left inline bg-transparent p-0 border-0 font-bold text-sm sm:text-base"
                                                title={$t.promptWordsLabel || 'Tap to use prompt word'}
                                            >
                                                {word.text}
                                            </button>
                                        {/each}
                                    </span>
                                {/each}
                            </div>
                        </div>

                        <div class="mt-1 pt-1 border-t border-[#332e59] text-center">
                            <span class="text-[11px] font-sans text-slate-400">
                                {$t.promptTappingHint || 'Tap words from the prompt above!'}
                            </span>
                        </div>
                    </div>

                    <!-- Answer Dropzone -->
                    <div>
                        {#if battleForm.isFinal}
                            {@const finalVocabCount = countVocabularyWords([...battleForm.titleWords, ...battleForm.taglineWords])}
                            <div class="flex items-center justify-between text-xs font-display uppercase tracking-widest text-slate-400 mb-1">
                                <span class="{battleForm.activeLine === 'title' ? 'text-pink-300' : ''}">{$t.movieTitle || 'Movie Title'}</span>
                                <div class="flex items-center gap-2">
                                    <span class="text-xs text-slate-400 font-mono">{finalVocabCount} {getWordCountLabel(finalVocabCount, $t)}</span>
                                    {#if battleForm.titleWords.length > 0}
                                        <button type="button" class="text-rose-400 hover:text-rose-300 font-sans text-xs cursor-pointer font-bold" on:click={() => clearLine(battle.id, 'title')}>✕ {$t.clear || 'Clear'}</button>
                                    {/if}
                                </div>
                            </div>
                            <div
                                role="button"
                                tabindex="0"
                                aria-label="Select Movie Title for adding words"
                                use:sortableList={battleForm.titleWords}
                                on:listUpdated={e => handleListUpdate(e.detail, battle.id, 'title')}
                                class="w-full text-left min-h-[3rem] p-2.5 cut-sm bg-[#070610] border-2 border-dashed flex flex-wrap gap-1.5 items-center mb-2 cursor-pointer {battleForm.activeLine === 'title' ? 'border-pink-400 bg-pink-950/15' : 'border-[#332e59]'}"
                                on:click={() => battleForms[battle.id].activeLine = 'title'}
                                on:keydown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); battleForms[battle.id].activeLine = 'title'; } }}
                            >
                                {#if battleForm.titleWords.length === 0}
                                    <span class="text-xs sm:text-sm text-slate-500 italic pl-1">{$t.clickWordsHintFinal || 'Tap words to assemble title'}</span>
                                {/if}
                                {#each battleForm.titleWords as word (word.id)}
                                    <div class="answer-word keycap-answer">
                                        <span>{word.text}</span>
                                        <button type="button" class="delete-word-btn text-pink-300 hover:text-white font-bold ml-1 cursor-pointer text-sm" on:click|stopPropagation={() => deleteWord(word.id, battle.id)}>&times;</button>
                                    </div>
                                {/each}
                            </div>

                            <div class="flex items-center justify-between text-xs font-display uppercase tracking-widest text-slate-400 mb-1">
                                <span class="{battleForm.activeLine === 'tagline' ? 'text-pink-300' : ''}">{$t.movieTagline || 'Tagline'}</span>
                                {#if battleForm.taglineWords.length > 0}
                                    <button type="button" class="text-rose-400 hover:text-rose-300 font-sans text-xs cursor-pointer font-bold" on:click={() => clearLine(battle.id, 'tagline')}>✕ {$t.clear || 'Clear'}</button>
                                {/if}
                            </div>
                            <div
                                role="button"
                                tabindex="0"
                                aria-label="Select Movie Tagline for adding words"
                                use:sortableList={battleForm.taglineWords}
                                on:listUpdated={e => handleListUpdate(e.detail, battle.id, 'tagline')}
                                class="w-full text-left min-h-[3rem] p-2.5 cut-sm bg-[#070610] border-2 border-dashed flex flex-wrap gap-1.5 items-center cursor-pointer {battleForm.activeLine === 'tagline' ? 'border-pink-400 bg-pink-950/15' : 'border-[#332e59]'}"
                                on:click={() => battleForms[battle.id].activeLine = 'tagline'}
                                on:keydown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); battleForms[battle.id].activeLine = 'tagline'; } }}
                            >
                                {#if battleForm.taglineWords.length === 0}
                                    <span class="text-xs sm:text-sm text-slate-500 italic pl-1">{$t.clickWordsHintFinal || 'Tap words to assemble tagline'}</span>
                                {/if}
                                {#each battleForm.taglineWords as word (word.id)}
                                    <div class="answer-word keycap-answer">
                                        <span>{word.text}</span>
                                        <button type="button" class="delete-word-btn text-pink-300 hover:text-white font-bold ml-1 cursor-pointer text-sm" on:click|stopPropagation={() => deleteWord(word.id, battle.id)}>&times;</button>
                                    </div>
                                {/each}
                            </div>
                        {:else}
                            <div class="flex items-center justify-between text-xs font-display uppercase tracking-widest text-slate-400 mb-1">
                                <span class="text-pink-300">{$t.yourAnswer || 'YOUR ANSWER'}</span>
                                <div class="flex items-center gap-2">
                                    <span class="text-xs text-slate-400 font-mono">{countVocabularyWords(battleForm.answerWords)} {getWordCountLabel(countVocabularyWords(battleForm.answerWords), $t)}</span>
                                    {#if battleForm.answerWords.length > 0}
                                        <button type="button" class="text-rose-400 hover:text-rose-300 font-sans text-xs cursor-pointer font-bold" on:click={() => clearLine(battle.id)}>✕ {$t.clear || 'Clear'}</button>
                                    {/if}
                                </div>
                            </div>
                            <div
                                use:sortableList={battleForm.answerWords}
                                on:listUpdated={e => handleListUpdate(e.detail, battle.id)}
                                class="w-full min-h-[3.75rem] p-3 cut-md bg-[#070610] border-2 border-dashed border-pink-400/75 flex flex-wrap gap-1.5 items-center"
                            >
                                {#if battleForm.answerWords.length === 0}
                                    <span class="text-xs sm:text-sm text-slate-500 italic pl-1">{$t.clickWordsHint || 'Tap words below to build your punchline!'}</span>
                                {/if}
                                {#each battleForm.answerWords as word (word.id)}
                                    <div class="answer-word keycap-answer">
                                        <span>{word.text}</span>
                                        <button type="button" class="delete-word-btn text-pink-300 hover:text-white font-bold ml-1 cursor-pointer text-base" on:click|stopPropagation={() => deleteWord(word.id, battle.id)}>&times;</button>
                                    </div>
                                {/each}
                            </div>
                        {/if}
                    </div>

                </div>

                <!-- Right Column (Mobile Order 2): Word Bank Keycaps + Undo/Shuffle -->
                <div class="order-2 md:col-span-7 md:col-start-6 md:row-start-1 md:row-span-2 flex flex-col">
                    <div class="flex flex-wrap items-center justify-between gap-1.5 text-xs font-display uppercase tracking-widest text-cyan-300 mb-2">
                        <span>{$t.wordBank || 'WORD BANK'}</span>
                        <div class="flex items-center gap-1.5">
                            <button
                                type="button"
                                on:click={() => undoLastWord(battle.id)}
                                disabled={!battleForm.undoStack || battleForm.undoStack.length === 0}
                                class="cut-sm px-2.5 py-1 bg-[#131126] border border-[#332e59] text-slate-200 font-display text-xs transition-colors disabled:opacity-50 disabled:text-slate-400 disabled:cursor-not-allowed hover:border-cyan-400 cursor-pointer inline-flex items-center gap-1"
                            >
                                <ArcadeIcon name="undo" className="w-3.5 h-3.5" />
                                <span>{$t.undo || 'Undo'}</span>
                            </button>
                            <button
                                type="button"
                                on:click={() => shuffleBank(battle.id)}
                                class="cut-sm px-2.5 py-1 bg-[#131126] border border-[#332e59] text-slate-200 font-display text-xs hover:border-cyan-400 transition-colors cursor-pointer inline-flex items-center gap-1"
                            >
                                <ArcadeIcon name="shuffle" className="w-3.5 h-3.5" />
                                <span>{$t.shuffleBank || 'Shuffle'}</span>
                            </button>
                        </div>
                    </div>

                    <div class="p-3.5 cut-md bg-[#131126] border-2 border-[#332e59] flex flex-wrap content-start gap-2 justify-center">
                        {#each battleForm.wordBankWords as word (word.id)}
                            <button
                                type="button"
                                data-testid="word-bank-chip"
                                on:click={() => addWordToAnswer(word, battle.id)}
                                class="word-bank-chip keycap-bank"
                            >
                                {word.text}
                            </button>
                        {/each}
                    </div>
                </div>

                <!-- Single Unified Submit Button (Order 3 on Phone, Left Column under Answer on Tablet/PC) -->
                <div class="order-3 md:col-span-5 md:col-start-1 md:row-start-2 pt-1">
                    <button
                        type="button"
                        disabled={!hasAnswerWords}
                        on:click={() => submitBattleAnswer(battle.id)}
                        class="btn-arcade w-full py-3.5 text-base"
                        style="--btn-color: {hasAnswerWords ? 'var(--color-secondary)' : '#334155'};"
                    >
                        <ArcadeIcon name="sword" className="w-5 h-5" />
                        <span>{$t.submitBattleAnswer || 'SUBMIT BATTLE ANSWER'}</span>
                    </button>
                </div>
            </div>
        {/if}
    {:else}
        <div class="flex-1 flex flex-col items-center justify-center p-6 text-center overflow-y-auto my-auto max-w-md mx-auto w-full">
            <div class="panel-arcade w-full flex flex-col items-center p-6" style="--neon-color: var(--color-accent);">
                <SevenSegmentDisplay time={timer} size="md" />
                <h1 class="text-2xl sm:text-3xl font-display my-3 text-emerald-400">{$t.allAnswersSubmitted || 'READY!'}</h1>
                <p class="text-sm sm:text-base text-amber-300 font-display mb-6">{$t.waitingForCompetitors}</p>

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
    {/if}
</div>
