<script>
    import { onMount } from 'svelte';
    import { t, language, flyingEmojis, sendMessage, gameState, tvMode, toggleTvMode } from '../../stores.js';
    import qrcode from 'qrcode-generator';
    import PixelAvatar from '../shared/PixelAvatar.svelte';

    let qrElement;
    let connectURL = '';
    let hostCustomTheme = '';
    let isThemeInputFocused = false;

    $: {
        if ($gameState?.isGeneratingThemes) {
            hostCustomTheme = '';
        } else if ($gameState?.theme !== hostCustomTheme && !isThemeInputFocused) {
            hostCustomTheme = $gameState?.theme || '';
        }
    }

    // This reactive block builds the connection URL.
    $: {
        if (typeof window !== 'undefined') {
            const origin = window.location.origin;
            const hostname = window.location.hostname;
            // If running on localhost or 127.0.0.1 and server provided a LAN IP, use LAN IP for local device access.
            // If running on a public domain (like Google AI Studio/Cloud Run: *.run.app), use window.location.origin.
            if ((hostname === 'localhost' || hostname === '127.0.0.1') && $gameState?.serverIP) {
                const protocol = window.location.protocol;
                const port = window.location.port ? `:${window.location.port}` : '';
                connectURL = `${protocol}//${$gameState.serverIP}${port}`;
            } else {
                connectURL = origin;
            }
        }
    }

    function generateQRCode(url) {
        if (qrElement && url) {
             try {
                qrElement.innerHTML = '';
                const typeNumber = 0; // auto
                const errorCorrectionLevel = 'L';
                const qr = qrcode(typeNumber, errorCorrectionLevel);
                qr.addData(url);
                qr.make();
                qrElement.innerHTML = qr.createSvgTag({cellSize: 6, margin: 4});
            } catch (e) {
                console.error("QR Code generation failed:", e);
                qrElement.innerHTML = `<p class="text-xs text-danger">QR code error</p>`;
            }
        }
    }
    
    // Regenerate the QR code whenever the connectURL or game ID changes.
    $: if (qrElement && connectURL) {
        const urlForQr = $gameState && $gameState.id ? `${connectURL}/?gameId=${$gameState.id}` : connectURL;
        generateQRCode(urlForQr);
    }

    function removeEmoji(id) {
        flyingEmojis.update(all => all.filter(e => e.id !== id));
    }

    function handleCloseLobby() {
        if (confirm($t.confirmCloseLobby)) {
            sendMessage('force-end-game', { gameId: $gameState.id });
        }
    }

    function handleSelectTheme(theme) {
        if (!$gameState) return;
        hostCustomTheme = theme;
        sendMessage('set-theme', { gameId: $gameState.id, theme });
    }

    function handleCustomThemeInput(e) {
        if (!$gameState) return;
        hostCustomTheme = e.target.value;
        sendMessage('set-theme', { gameId: $gameState.id, theme: hostCustomTheme.trim() });
    }

    $: gameLang = $gameState?.language || ($language === 'ua' || $language === 'uk' ? 'uk' : 'en');
    $: availableThemes = $gameState?.preGeneratedThemes?.[gameLang] 
        || $gameState?.preGeneratedThemes?.[$language] 
        || $gameState?.preGeneratedThemes?.['en'] 
        || $gameState?.preGeneratedThemes?.['uk'] 
        || $gameState?.preGeneratedThemes?.['ua'] 
        || [];

    function handlePickRandomTheme() {
        if (!$gameState) return;
        if (availableThemes.length > 0) {
            const randomTheme = availableThemes[Math.floor(Math.random() * availableThemes.length)];
            handleSelectTheme(randomTheme);
        }
    }

    function handleReloadTopics() {
        if (!$gameState || $gameState.isGeneratingThemes) return;
        sendMessage('reload-themes', { gameId: $gameState.id });
    }
</script>

<div class="p-3 sm:p-4 lg:p-5 flex flex-col md:flex-row gap-3 sm:gap-4 h-screen max-h-[100dvh] w-full overflow-hidden box-border relative host-lobby-container pb-12">
    <!-- Left Side: How to Connect & Player List -->
    <div class="w-full md:w-1/3 lg:w-1/4 panel-arcade flex flex-col h-full min-h-0 overflow-hidden p-3 sm:p-4" style="--neon-color: var(--color-primary); --neon-color-rgb: var(--color-primary-rgb);">
        <h2 class="text-lg sm:text-xl mb-2 text-primary font-display flex-shrink-0" style="text-shadow: 0 0 5px var(--color-primary);">{$t.howToConnect}</h2>
        <div class="text-center bg-black/60 p-2.5 sm:p-3 border-2 border-neutral-700 rounded-xl mb-2 sm:mb-3 flex-shrink-0">
            <p class="text-xs text-slate-300 mb-0.5">{$t.openBrowserTo}</p>
            <p class="text-sm sm:text-base font-mono font-bold text-accent break-all">{connectURL || '...'}</p>
            <p class="text-xs text-slate-300 my-1">{$t.orEnterId}</p>
            <p class="font-display text-2xl sm:text-3xl tracking-widest text-white leading-none" style="text-shadow: 0 0 10px #fff;" data-testid="game-id">{$gameState.id}</p>
            <div class="mt-1.5 flex justify-center">
                <button 
                    type="button"
                    class="px-2 py-0.5 bg-neutral-800 hover:bg-primary hover:text-black border border-primary/60 rounded text-[10px] font-display transition-all cursor-pointer"
                    on:click={() => {
                        const shareUrl = $gameState?.id ? `${connectURL}/?gameId=${$gameState.id}` : connectURL;
                        if (navigator.clipboard) {
                            navigator.clipboard.writeText(shareUrl).then(() => {
                                alert('Link copied to clipboard!');
                            }).catch(() => {
                                prompt('Copy game link:', shareUrl);
                            });
                        } else {
                            prompt('Copy game link:', shareUrl);
                        }
                    }}
                >
                    📋 Copy Game Link
                </button>
            </div>
            <div bind:this={qrElement} class="mt-2 flex justify-center items-center bg-white p-1.5 border-2 w-full max-w-[130px] sm:max-w-[150px] aspect-square mx-auto shadow-xl rounded-lg" style="border-color: var(--color-primary); box-shadow: 0 0 15px var(--color-primary);"></div>
        </div>
        <h2 class="text-base sm:text-lg mb-2 text-primary font-display flex-shrink-0" style="text-shadow: 0 0 5px var(--color-primary);">{$t.players} ({$gameState.players.length})</h2>
        <div class="flex-1 min-h-0 overflow-y-auto pr-1">
            <ul class="space-y-1.5">
                {#each $gameState.players as p (p.id)}
                    <li class="flex items-center gap-2.5 bg-neutral-900/80 p-2 border border-neutral-700 rounded-lg transition-opacity {p.socketId ? 'opacity-100' : 'opacity-60'}">
                        <div class="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0">
                            <PixelAvatar avatar={p.avatar} />
                        </div>
                        <span class="text-sm font-medium flex-grow truncate">{p.name}</span>
                        {#if p.socketId}
                            <span class="px-1.5 py-0.5 bg-emerald-950/80 border border-emerald-400 text-emerald-300 text-[10px] font-display rounded shadow-[0_0_6px_rgba(52,211,153,0.3)]">✓ {$language === 'uk' ? 'Готовий' : 'Ready'}</span>
                        {/if}
                        {#if p.isHost}
                            <span class="px-1.5 py-0.5 bg-warning text-black text-[10px] font-display rounded">{$t.host}</span>
                        {/if}
                         {#if !p.socketId}
                            <span class="px-1.5 py-0.5 bg-danger text-white text-[10px] font-display rounded animate-pulse">{$t.disconnected}</span>
                        {/if}
                    </li>
                {/each}
            </ul>
        </div>
    </div>

    <!-- Right Side: Game Status & Theme Configuration -->
    <div class="w-full md:w-2/3 lg:w-3/4 panel-arcade flex flex-col justify-between items-center text-center p-3 sm:p-5 lg:p-6 h-full min-h-0 overflow-y-auto" style="--neon-color: var(--color-secondary); --neon-color-rgb: var(--color-secondary-rgb);">
        <h1 class="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl text-center mb-2 lg:mb-3 text-primary font-display flex-shrink-0" style="text-shadow: 0 0 10px var(--color-primary), 0 0 20px var(--color-primary);">{$t.appName}</h1>
        
        <div class="w-full max-w-3xl lg:max-w-4xl xl:max-w-5xl flex-1 flex flex-col justify-around py-1">
             {#if $gameState.isGeneratingThemes}
                <div class="p-6 lg:p-8 bg-black/50 border-2 border-warning rounded-xl my-auto">
                    <p class="text-xl sm:text-2xl lg:text-3xl text-warning animate-pulse font-display">{$t.generatingThemes}...</p>
                </div>
             {:else}
                <div>
                    <div class="flex items-center justify-between mb-1.5">
                        <h3 class="text-base sm:text-lg lg:text-xl text-primary font-display">{$t.theme}</h3>
                        <div class="flex items-center gap-2">
                            <button 
                                type="button" 
                                on:click={handleReloadTopics}
                                disabled={$gameState.isGeneratingThemes}
                                class="px-2 py-0.5 text-xs bg-neutral-800 hover:bg-primary hover:text-black border border-primary/60 rounded text-primary transition-all font-display cursor-pointer flex items-center gap-1 disabled:opacity-50"
                                title="Generate fresh suggested themes"
                            >
                                <span>🔄</span> {$t.reloadThemes || 'Reload Themes'}
                            </button>
                            <button 
                                type="button" 
                                on:click={handlePickRandomTheme}
                                class="px-2 py-0.5 text-xs bg-neutral-800 hover:bg-accent hover:text-black border border-accent/60 rounded text-accent transition-all font-display cursor-pointer flex items-center gap-1"
                                title="Pick random suggested theme"
                            >
                                <span>🎲</span> {$language === 'uk' ? 'Випадкова' : 'Random'}
                            </button>
                        </div>
                    </div>

                    <!-- Theme Active Display -->
                    <div class="p-3 sm:p-4 lg:p-5 bg-neutral-900/90 border-2 border-neutral-700 rounded-xl mb-2 sm:mb-3 shadow-inner">
                        <p class="text-xl sm:text-2xl lg:text-3xl xl:text-4xl text-primary font-bold min-h-6 leading-tight break-words">{$gameState.theme ? $gameState.theme : $t.waitingForTheme}</p>
                    </div>

                    <!-- Suggested AI Theme Badges (Display Grid & Clickable) -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3 mb-2 sm:mb-3">
                        {#each availableThemes as themeOption}
                            <button 
                                type="button"
                                on:click={() => handleSelectTheme(themeOption)}
                                class="p-2.5 sm:p-3 lg:p-4 text-xs sm:text-sm lg:text-base font-bold text-center rounded-xl border-2 flex items-center justify-center min-h-[56px] sm:min-h-[64px] lg:min-h-[76px] transition-all cursor-pointer {
                                    $gameState?.theme === themeOption 
                                    ? 'bg-primary text-black font-bold border-white shadow-[0_0_15px_rgba(6,182,212,0.9)] scale-[1.01]' 
                                    : 'bg-neutral-900/90 border-neutral-600 hover:border-slate-300 text-slate-200 active:scale-98'
                                }"
                            >
                                <span class="line-clamp-2">{themeOption}</span>
                            </button>
                        {/each}
                    </div>

                    <!-- Custom Theme Text Input -->
                    <div class="relative mb-2 select-text">
                        <input 
                            type="text" 
                            class="w-full bg-black/80 border-2 p-2 sm:p-2.5 text-center focus:outline-none text-sm sm:text-base rounded-xl transition-all font-mono select-text" 
                            style="border-color: var(--color-primary); box-shadow: 0 0 8px var(--color-primary), inset 0 0 8px rgba(var(--color-primary-rgb), 0.2); color: var(--color-primary);"
                            placeholder={$t.customTheme || 'Or type custom theme...'} 
                            bind:value={hostCustomTheme} 
                            on:input={handleCustomThemeInput}
                            on:focus={() => isThemeInputFocused = true}
                            on:blur={() => isThemeInputFocused = false}
                        >
                    </div>

                    <!-- Custom Theme Info Hint for Players/Host -->
                    <div class="mb-2 sm:mb-3 p-2 bg-black/40 border border-dashed border-neutral-600/80 rounded-lg text-center">
                        <p class="text-[11px] sm:text-xs text-slate-300 font-mono tracking-wide truncate">
                            ✨ {$t.customThemeHostHint}
                        </p>
                    </div>
                </div>
                
                <div>
                    <!-- Mode Badges -->
                    <div class="grid grid-cols-3 gap-2 sm:gap-3 w-full mb-2 sm:mb-3">
                        <div class="p-2 sm:p-2.5 flex items-center justify-center gap-2 border-2 rounded-xl transition-all {$gameState.sillyMode ? 'bg-purple-900/50 border-purple-400' : 'bg-neutral-900/80 border-neutral-700'}">
                            <span class="text-xl sm:text-2xl">🤡</span>
                            <p class="font-bold text-xs sm:text-sm truncate">{$t.sillyMode}</p>
                        </div>
                        <div class="p-2 sm:p-2.5 flex items-center justify-center gap-2 border-2 rounded-xl transition-all {$gameState.is18PlusMode ? 'bg-red-900/50 border-red-400' : 'bg-neutral-900/80 border-neutral-700'}">
                            <span class="text-xl sm:text-2xl">🌶️</span>
                            <p class="font-bold text-xs sm:text-sm truncate">{$t.is18PlusMode}</p>
                        </div>
                        <div class="p-2 sm:p-2.5 flex items-center justify-center gap-2 border-2 rounded-xl transition-all {$gameState.slowpokeMode ? 'bg-teal-900/50 border-teal-400' : 'bg-neutral-900/80 border-neutral-700'}">
                            <span class="text-xl sm:text-2xl">🐌</span>
                            <p class="font-bold text-xs sm:text-sm truncate">{$t.slowpokeMode}</p>
                        </div>
                    </div>

                    <!-- Bottom Status Banner -->
                    <div class="p-2.5 sm:p-3 bg-black/60 border-2 border-warning rounded-xl">
                        <p class="text-sm sm:text-base lg:text-lg text-warning animate-pulse font-display tracking-wider truncate">{$t.waitingForHost}...</p>
                    </div>
                </div>
            {/if}
        </div>
    </div>

     <!-- Flying Reactions Overlay -->
    <div class="fixed inset-0 w-full h-full pointer-events-none overflow-hidden z-50">
        {#each $flyingEmojis as emoji (emoji.id)}
            {@const startX = emoji.startX ?? (Math.random() * 75 + 10)}
            {@const endX = emoji.endX ?? startX}
            {@const startRotate = emoji.startRotate ?? 0}
            {@const endRotate = emoji.endRotate ?? 0}
            <div
                class="flying-emoji"
                style="--start-x: {startX}vw; --end-x: {endX}vw; --start-rotate: {startRotate}deg; --end-rotate: {endRotate}deg;"
                on:animationend={() => removeEmoji(emoji.id)}
            >
                {#if emoji.emoji}
                    <div class="flex flex-col items-center select-none pointer-events-none">
                        <span class="text-5xl sm:text-6xl filter drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] leading-none">{emoji.emoji}</span>
                        {#if emoji.avatar}
                            <div class="w-6 h-6 -mt-1.5 opacity-90 scale-90 rounded-full bg-black/60 p-0.5 border border-white/40 shadow-sm">
                                <PixelAvatar avatar={emoji.avatar} />
                            </div>
                        {/if}
                    </div>
                {:else}
                    <PixelAvatar avatar={emoji.avatar} />
                {/if}
            </div>
        {/each}
    </div>

    <div class="fixed bottom-4 left-4 z-50 flex items-center gap-2">
        <button 
            on:click={toggleTvMode}
            class="px-3 py-1.5 bg-black/90 text-xs rounded border transition-all font-display flex items-center gap-2 {$tvMode ? 'border-primary text-primary shadow-sm shadow-primary/50' : 'border-neutral-700 text-neutral-400 hover:text-white'}"
            title={$t.tvModeDesc}
        >
            <span>📺</span>
            <span>{$t.tvMode}: {$tvMode ? 'ON' : 'OFF'}</span>
        </button>
    </div>

    <button 
        on:click={handleCloseLobby}
        class="fixed bottom-4 right-4 z-50 px-3 py-1 bg-black text-neutral-300 text-xs rounded border border-neutral-600 hover:bg-danger hover:text-white transition-colors font-display"
        title={$t.closeLobby}
    >
        {$t.closeLobby}
    </button>
</div>