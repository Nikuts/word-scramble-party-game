<script>
    import { t, showBattleHistory } from '../../../stores.js';
    import PixelAvatar from '../../shared/PixelAvatar.svelte';

    export let game;
    export const player = undefined;

    let savingImageId = null;

    function getPlayerById(id) {
        return game.players.find(p => p.id === id);
    }
    
    function renderAnswer(answer) {
        if (typeof answer === 'string') {
            if (answer === '::TIMEOUT::') return `(${$t.noAnswerSubmitted})`;
            return answer;
        }
        if (typeof answer === 'object' && answer !== null && (answer.title || answer.tagline)) {
            let title = (answer.title || '...').trim();
            let tagline = (answer.tagline || '...').trim();
            if (title === '::TIMEOUT::') title = `(${$t.noAnswerSubmitted})`;
            if (tagline === '::TIMEOUT::' || tagline === '') tagline = '...';
            return `Title: ${title}\nTagline: ${tagline}`;
        }
        return `(${$t.noAnswerSubmitted})`;
    }

    async function saveAsImage(elementId, battleId, orientation) {
        if (savingImageId) return;
        const element = document.getElementById(elementId);
        if (!element) return;

        savingImageId = `${battleId}-${orientation}`;

        const buttonContainer = element.querySelector('.save-btn-container');
        const gridElement = element.querySelector('.grid');
        const originalGridClass = gridElement ? gridElement.className : '';
        const originalWidth = element.style.width; // Store original inline width style

        if (buttonContainer) buttonContainer.style.visibility = 'hidden';
        
        if (orientation === 'landscape') {
            element.style.width = '960px'; // Force a wide container for capture
            if (gridElement) {
                gridElement.className = 'grid grid-cols-2 gap-4';
            }
        } else { // vertical
            if (gridElement) {
                gridElement.className = 'grid grid-cols-1 gap-4';
            }
        }

        // Pre-load fonts to ensure they are available for the canvas render
        const fontCssUrl = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap';
        let styleEl = document.createElement('style');
        
        try {
            const fontCss = await fetch(fontCssUrl).then(res => res.text()).catch(() => '');
            if (fontCss) {
                styleEl.textContent = fontCss;
                document.head.appendChild(styleEl);
                await new Promise(resolve => setTimeout(resolve, 80));
            }

            const html2canvasModule = await import('html2canvas');
            const html2canvas = html2canvasModule.default || html2canvasModule;

            const canvas = await html2canvas(element, {
                backgroundColor: '#0d0221', // The root background color
                scale: 2, // Higher resolution
                useCORS: true, // For loading images/fonts from other origins
                logging: false,
                removeContainer: true, // Cleans up the cloned DOM after capture
            });

            const fileName = `battle-recap-${battleId.replace(/[^a-z0-9]/gi, '_')}-${orientation}.png`;

            // On iOS Safari / mobile devices with Web Share support, trigger native share sheet
            if (navigator.canShare && canvas.toBlob) {
                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                if (blob) {
                    const file = new File([blob], fileName, { type: 'image/png' });
                    if (navigator.canShare({ files: [file] })) {
                        try {
                            await navigator.share({
                                files: [file],
                                title: 'Word Scramble Battle',
                                text: 'Check out this battle recap from Word Scramble!',
                            });
                            return;
                        } catch (shareErr) {
                            if (shareErr.name === 'AbortError') return;
                            console.warn('Web Share API failed, falling back to download:', shareErr);
                        }
                    }
                }
            }

            const link = document.createElement('a');
            link.download = fileName;
            link.href = canvas.toDataURL('image/png');
            link.click();
            
        } catch(e) {
            console.error("Failed to save image:", e);
            alert("Sorry, could not save the image.");
        } finally {
            if (buttonContainer) buttonContainer.style.visibility = 'visible';
            if (gridElement) gridElement.className = originalGridClass;
            element.style.width = originalWidth; // Restore the original width
            if (styleEl && document.head.contains(styleEl)) {
                document.head.removeChild(styleEl);
            }
            savingImageId = null;
        }
    }
</script>

<div class="w-full max-w-4xl mx-auto text-center flex-grow">
    <!-- Non-sticky top header as requested -->
    <div class="py-4 px-4 border-b-2 border-primary/50 mb-6">
        <h1 class="text-3xl sm:text-4xl mb-4 text-primary">{$t.battleHistory}</h1>
        <button on:click={() => showBattleHistory.set(false)} class="btn-arcade btn-neutral text-lg">
            &larr; {$t.backToScores}
        </button>
    </div>

    <div class="space-y-6 pb-8">
        {#each game.battleHistory as battle (battle.id)}
            {@const winnerId = battle.winnerId}
            {@const isFinalRound = !!battle.genre}
            {@const cardId = `battle-card-${battle.id}`}
            
            <div id={cardId} class="battle-card-history panel-arcade text-left relative" style="--neon-color: var(--color-primary); --neon-color-rgb: var(--color-primary-rgb);">
                 {#if isFinalRound}
                    <div class="text-neutral-300 text-lg leading-relaxed text-center mb-4 p-3 bg-neutral-900/50 border border-neutral-700 rounded-md">
                        <p class="mb-1 text-primary font-bold">{battle.genre}</p>
                        <p class="text-base">{battle.premise}</p>
                    </div>
                {:else}
                    <h3 class="font-bold text-xl text-primary text-center mb-4 break-words">{battle.prompt}</h3>
                {/if}

                <div class="grid grid-cols-1 {battle.competitors.length >= 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-2'} gap-4">
                    {#each battle.competitors as cId (cId)}
                        {@const competitor = getPlayerById(cId)}
                        {#if competitor}
                            <div class="bg-neutral-900/50 p-3 border-2 rounded-md {winnerId === competitor.id ? 'border-accent shadow-[0_0_10px_rgba(var(--color-accent-rgb),0.5)]' : 'border-neutral-700'}">
                                 <div class="flex items-center gap-3 text-base sm:text-lg font-bold mb-2">
                                    <div class="w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0">
                                        <PixelAvatar avatar={competitor.avatar} />
                                    </div>
                                    <span class="truncate">{competitor.name}</span>
                                    {#if winnerId === competitor.id}
                                        <span class="ml-auto text-xs px-2 py-0.5 bg-accent text-black font-bold rounded-sm">👑 {$t.winner}</span>
                                    {/if}
                                </div>
                                <p class="text-base sm:text-lg min-h-[5rem] bg-neutral-900 border border-neutral-600 p-2.5 whitespace-pre-wrap rounded-md leading-relaxed">{renderAnswer(battle.answers[competitor.id])}</p>
                            </div>
                        {/if}
                    {/each}
                </div>

                <div class="text-center mt-6 save-btn-container flex flex-wrap justify-center gap-4">
                    <button class="btn-arcade text-sm py-2 px-4" style="--btn-color: var(--color-accent);" on:click={() => saveAsImage(cardId, battle.id, 'vertical')} disabled={savingImageId}>
                        {#if savingImageId === `${battle.id}-vertical`}
                            {$t.saving}
                        {:else}
                            {$t.saveAsImageVertical}
                        {/if}
                    </button>
                    <button class="btn-arcade text-sm py-2 px-4" style="--btn-color: var(--color-primary);" on:click={() => saveAsImage(cardId, battle.id, 'landscape')} disabled={savingImageId}>
                        {#if savingImageId === `${battle.id}-landscape`}
                            {$t.saving}
                        {:else}
                            {$t.saveAsImageLandscape}
                        {/if}
                </div>
            </div>
        {/each}
    </div>
</div>