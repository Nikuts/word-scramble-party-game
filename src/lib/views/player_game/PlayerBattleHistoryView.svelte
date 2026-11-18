<script>
    import { t, language, showBattleHistory } from '../../../stores.js';
    import { formatVotesLabel } from '../../../ui_text.js';
    import PixelAvatar from '../../shared/PixelAvatar.svelte';
    import ArcadeIcon from '../../shared/ArcadeIcon.svelte';
    import { renderBattleRecapCanvas, getWordAuthorHex } from '../../battleRecapCanvas.js';
    import { TIMEOUT_ANSWER_PLACEHOLDER } from '../../../../shared/config.js';

    export let game;
    export let player = undefined;

    let savingImageId = null;
    let historyFilter = 'all'; // 'all' | 'mine'

    $: allHistory = Array.isArray(game?.battleHistory) ? game.battleHistory : [];
    $: myHistory = player?.id ? allHistory.filter(b => b.competitors?.includes(player.id)) : [];
    $: filteredHistory = historyFilter === 'mine' ? myHistory : allHistory;

    function getPlayerById(id) {
        return game.players.find(p => p.id === id);
    }

    function getBattleRoundBadge(battle, index) {
        const match = String(battle?.id || '').match(/b-(?:g\d+-)?(\d+)-(\d+)/);
        const rNum = battle?.round || (match ? Number(match[1]) : null);
        const bLabel = $t.battleLabel ? $t.battleLabel.replace('{n}', index + 1) : `#${index + 1}`;
        if (battle?.genre) return `${($t.finalTag || 'FINAL').toUpperCase()} · ${bLabel}`;
        if (rNum) return `${($t.roundShort || 'R{n}').replace('{n}', rNum)} · ${bLabel}`;
        return bLabel;
    }

    function getVoteCount(battle, competitorId) {
        if (typeof battle?.scoreBreakdown?.[competitorId]?.votes === 'number') {
            return battle.scoreBreakdown[competitorId].votes;
        }
        return Object.values(battle?.votes || {}).filter(v => v === competitorId).length;
    }

    function renderAnswer(answer) {
        if (typeof answer === 'string') {
            if (answer === TIMEOUT_ANSWER_PLACEHOLDER) return `(${$t.noAnswerSubmitted})`;
            return answer;
        }
        if (typeof answer === 'object' && answer !== null && (answer.title || answer.tagline)) {
            let title = (answer.title || '...').trim();
            let tagline = (answer.tagline || '...').trim();
            if (title === TIMEOUT_ANSWER_PLACEHOLDER) title = `(${$t.noAnswerSubmitted})`;
            if (tagline === TIMEOUT_ANSWER_PLACEHOLDER || tagline === '') tagline = '...';
            return `${$t.title || 'Title'}: ${title}\n${$t.tagline || 'Tagline'}: ${tagline}`;
        }
        return `(${$t.noAnswerSubmitted})`;
    }

    async function saveAsImage(battle, roundLabel, orientation) {
        if (savingImageId || !battle) return;
        savingImageId = `${battle.id}-${orientation}`;

        try {
            const blob = await renderBattleRecapCanvas({
                battle,
                players: game.players || [],
                gameId: game.id || '',
                roundLabel,
                dict: $t,
                lang: $language,
                orientation
            });

            const fileName = `battle-recap-${battle.id.replace(/[^a-z0-9]/gi, '_')}-${orientation}.png`;

            if (navigator.canShare) {
                const file = new File([blob], fileName, { type: 'image/png' });
                if (navigator.canShare({ files: [file] })) {
                    try {
                        await navigator.share({
                            files: [file],
                            title: $t.appName || 'Word Scramble Party Game',
                            text: $t.shareBattleText || ($t.appName ? `${$t.appName} — ${roundLabel}` : 'Check out this battle recap!'),
                        });
                        return;
                    } catch (shareErr) {
                        if (shareErr.name === 'AbortError') return;
                        console.warn('Web Share API failed, falling back to download:', shareErr);
                    }
                }
            }

            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = fileName;
            link.href = objectUrl;
            link.click();
            setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
        } catch (e) {
            console.error("Failed to save image:", e);
            alert($t.saveError || "Sorry, could not save the image.");
        } finally {
            savingImageId = null;
        }
    }
</script>

<div class="w-full max-w-4xl mx-auto text-center flex-grow overflow-y-auto h-full px-3 sm:px-4 pb-12">
    <!-- Sticky Header & Filter Bar -->
    <div class="sticky top-0 z-20 bg-[#090814]/95 border-b-2 border-[#332e59] py-2.5 sm:py-3 px-1 mb-4">
        <div class="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 mb-2">
            <button type="button" on:click={() => showBattleHistory.set(false)} class="btn-arcade btn-neutral text-xs sm:text-sm py-1.5 px-2.5 sm:px-4 flex-shrink-0 order-1">
                <ArcadeIcon name="arrow-left" className="w-4 h-4" />
                <span>{$t.backToScores}</span>
            </button>
            <h1 class="w-full sm:w-auto sm:flex-1 text-base sm:text-2xl text-primary text-center tracking-wide uppercase sm:truncate order-3 sm:order-2 leading-tight">{$t.battleHistory}</h1>
            <span class="cut-sm px-2.5 py-1 bg-[#131126] border border-cyan-500/50 text-cyan-300 font-mono text-xs font-bold flex-shrink-0 order-2 sm:order-3">
                {filteredHistory.length} / {allHistory.length}
            </span>
        </div>

        {#if player?.id}
            <div class="flex items-center justify-center gap-2">
                <button
                    type="button"
                    on:click={() => historyFilter = 'all'}
                    class="cut-sm px-3 py-1 border font-display text-xs uppercase tracking-wider cursor-pointer transition-colors {historyFilter === 'all' ? 'bg-cyan-950/90 border-cyan-400 text-cyan-200' : 'bg-[#131126] border-[#332e59] text-slate-400 hover:text-white'}"
                >
                    {$t.allBattles || 'ALL BATTLES'} ({allHistory.length})
                </button>
                <button
                    type="button"
                    on:click={() => historyFilter = 'mine'}
                    class="cut-sm px-3 py-1 border font-display text-xs uppercase tracking-wider cursor-pointer transition-colors {historyFilter === 'mine' ? 'bg-fuchsia-950/90 border-fuchsia-400 text-fuchsia-200' : 'bg-[#131126] border-[#332e59] text-slate-400 hover:text-white'}"
                >
                    {$t.myBattles || 'MY BATTLES'} ({myHistory.length})
                </button>
            </div>
        {/if}
    </div>

    <div class="space-y-4 sm:space-y-5 pb-8">
        {#each filteredHistory as battle, idx (battle.id)}
            {@const winnerId = battle.winnerId}
            {@const isFinalRound = !!battle.genre}
            {@const cardId = `battle-card-${battle.id}`}
            {@const roundLabel = getBattleRoundBadge(battle, allHistory.indexOf(battle) >= 0 ? allHistory.indexOf(battle) : idx)}

            <div id={cardId} class="battle-card-history panel-arcade text-left relative !p-3 sm:!p-4" style="--neon-color: var(--color-primary);">
                <div class="flex items-center justify-between gap-2 mb-2">
                    <span class="cut-sm px-2 py-0.5 bg-[#0a0914] border border-cyan-500/60 text-cyan-300 font-display text-[10px] sm:text-xs uppercase tracking-wider">
                        {roundLabel}
                    </span>
                </div>

                {#if isFinalRound}
                    <div class="text-slate-200 text-sm sm:text-base leading-snug text-center mb-3 p-2.5 cut-sm bg-[#0a0914] border border-[#332e59]">
                        <p class="mb-0.5 text-primary font-display text-xs sm:text-sm">{battle.genre}</p>
                        <p class="text-sm sm:text-base break-words">{battle.premise}</p>
                    </div>
                {:else}
                    <h3 class="font-display text-sm sm:text-lg text-primary text-center mb-3 break-words leading-snug">{battle.prompt}</h3>
                {/if}

                <div class="grid grid-cols-1 {battle.competitors.length === 3 ? 'sm:grid-cols-3' : (battle.competitors.length >= 4 ? 'sm:grid-cols-2' : 'md:grid-cols-2')} gap-2.5 sm:gap-3.5">
                    {#each battle.competitors as cId (cId)}
                        {@const competitor = getPlayerById(cId)}
                        {@const isSoloWinner = winnerId === competitor?.id}
                        {@const isTieWinner = !winnerId && (battle.scoreBreakdown?.[competitor?.id]?.winBonus ?? 0) > 0}
                        {@const compPts = battle.pointsAwarded?.[cId] || 0}
                        {@const compVotes = getVoteCount(battle, cId)}
                        {@const annotated = battle.annotatedAnswers?.[cId]}
                        {#if competitor}
                            <div class="bg-[#0a0914] p-2.5 sm:p-3 border-2 cut-sm flex flex-col justify-between gap-2 {isSoloWinner || isTieWinner ? 'border-amber-400' : 'border-[#332e59]'}">
                                <div class="flex items-center gap-2.5 text-sm sm:text-base font-display">
                                    <div class="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0">
                                        <PixelAvatar avatar={competitor.avatar} />
                                    </div>
                                    <span class="truncate">{competitor.name}</span>
                                    {#if isSoloWinner}
                                        <span class="ml-auto fighter-crest text-[10px] sm:text-xs bg-amber-400 text-black flex-shrink-0">
                                            <ArcadeIcon name="crown" className="w-3.5 h-3.5" />
                                            <span>{$t.winner}</span>
                                        </span>
                                    {:else if isTieWinner}
                                        <span class="ml-auto fighter-crest text-[10px] sm:text-xs bg-amber-400 text-black flex-shrink-0">
                                            {$t.tie || 'TIE'}
                                        </span>
                                    {/if}
                                </div>

                                <div class="text-sm sm:text-base min-h-[2.75rem] bg-[#131126] border border-[#332e59] cut-sm p-2.5 whitespace-pre-wrap break-words leading-snug">
                                    {#if annotated?.isFinal}
                                        <div class="space-y-1">
                                            <div>
                                                <span class="font-display text-primary text-xs mr-1">{$t.title || 'Title'}:</span>
                                                {#each annotated.title || [] as tok, ti}{#if ti > 0 && !/^[.,!?:;…]+$/.test(tok.text)}{' '}{/if}<span style="color: {getWordAuthorHex(tok.authorIndex)};" class="font-bold">{tok.text}</span>{/each}
                                            </div>
                                            <div>
                                                <span class="font-display text-primary text-xs mr-1">{$t.tagline || 'Tagline'}:</span>
                                                {#each annotated.tagline || [] as tok, ti}{#if ti > 0 && !/^[.,!?:;…]+$/.test(tok.text)}{' '}{/if}<span style="color: {getWordAuthorHex(tok.authorIndex)};" class="font-bold">{tok.text}</span>{/each}
                                            </div>
                                        </div>
                                    {:else if annotated?.words?.length > 0}
                                        {#each annotated.words as tok, ti}{#if ti > 0 && !/^[.,!?:;…]+$/.test(tok.text)}{' '}{/if}<span style="color: {getWordAuthorHex(tok.authorIndex)};" class="font-bold">{tok.text}</span>{/each}
                                    {:else}
                                        {renderAnswer(battle.answers[competitor.id])}
                                    {/if}
                                </div>

                                <div class="flex items-center justify-between text-[11px] font-mono pt-0.5">
                                    <span class="text-slate-400">{compVotes} {formatVotesLabel(compVotes, $t, $language)}</span>
                                    <span class="font-bold {compPts > 0 ? 'text-amber-300' : 'text-slate-500'}">+{compPts.toLocaleString()} {$t.pts || 'PTS'}</span>
                                </div>
                            </div>
                        {/if}
                    {/each}
                </div>

                <div class="text-center mt-3 save-btn-container grid grid-cols-2 sm:flex sm:flex-wrap sm:justify-center gap-2 sm:gap-2.5">
                    <button type="button" class="btn-arcade text-[11px] sm:text-sm py-1.5 px-2 sm:px-3.5" style="--btn-color: var(--color-accent);" on:click={() => saveAsImage(battle, roundLabel, 'vertical')} disabled={Boolean(savingImageId)}>
                        {savingImageId === `${battle.id}-vertical` ? $t.saving : $t.saveAsImageVertical}
                    </button>
                    <button type="button" class="btn-arcade text-[11px] sm:text-sm py-1.5 px-2 sm:px-3.5" style="--btn-color: var(--color-primary);" on:click={() => saveAsImage(battle, roundLabel, 'landscape')} disabled={Boolean(savingImageId)}>
                        {savingImageId === `${battle.id}-landscape` ? $t.saving : $t.saveAsImageLandscape}
                    </button>
                </div>
            </div>
        {:else}
            <div class="panel-arcade p-6 text-slate-300 text-sm">
                {$t.noPersonalBattles || 'No personal battles in this match.'}
            </div>
        {/each}
    </div>
</div>
