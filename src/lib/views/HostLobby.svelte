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
                qrElement.innerHTML = qr.createSvgTag({cellSize: 3, margin: 2});
            } catch (e) {
                console.error("QR Code generation failed:", e);
                qrElement.innerHTML = `<p class="text-xs text-danger">QR error</p>`;
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

<!-- Full-Width Harmonized Host Lobby Arena (Zero Scroll 100% Viewport Clamping) -->
<div class="h-screen max-h-[100dvh] w-full flex flex-col justify-between p-3 sm:p-4 lg:p-5 max-w-7xl mx-auto safe-top safe-bottom relative select-none font-sans overflow-hidden box-border pb-12 host-lobby-container">
    
    <!-- Top Header: Title & Sleek Join Information Capsule -->
    <header class="w-full flex flex-col md:flex-row items-center justify-between gap-3 bg-neutral-950/85 border-2 border-cyan-400/80 rounded-2xl p-3 sm:p-4 shadow-[0_0_20px_rgba(6,182,212,0.25)] backdrop-blur-md flex-shrink-0">
        <!-- Brand Title -->
        <div class="text-center md:text-left">
            <h1 class="text-xl sm:text-2xl lg:text-3xl font-display font-black text-primary drop-shadow-[0_0_12px_rgba(var(--color-primary-rgb),0.8)] tracking-wide leading-tight">
                {$t.appName}
            </h1>
            <p class="text-[10px] sm:text-xs text-slate-300 font-mono tracking-widest uppercase mt-0.5">
                {$language === 'uk' ? 'ГРА ДЛЯ ВЕЧІРОК' : 'REAL-TIME MULTIPLAYER PARTY GAME'}
            </p>
        </div>

        <!-- Integrated Join Capsule & QR Code -->
        <div class="flex items-center gap-3 sm:gap-4 bg-black/80 border border-neutral-700/90 rounded-xl px-3 py-1.5 sm:px-4 sm:py-2">
            <div class="text-right">
                <p class="text-[10px] sm:text-xs text-slate-300">{$t.openBrowserTo || 'Join at'}</p>
                <p class="text-xs sm:text-sm font-mono font-bold text-accent break-all">{connectURL || '...'}</p>
                <div class="flex items-center justify-end gap-2 mt-0.5">
                    <span class="text-[10px] text-slate-400 font-mono">{$t.orEnterId || 'ROOM'}:</span>
                    <span class="font-display font-black text-lg sm:text-xl text-white tracking-widest leading-none drop-shadow-[0_0_8px_#fff]" data-testid="game-id">
                        {$gameState.id}
                    </span>
                    <button 
                        type="button"
                        class="px-1.5 py-0.5 bg-neutral-800 hover:bg-primary hover:text-black border border-primary/60 rounded text-[9px] font-display transition-all cursor-pointer"
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
                        📋 Copy
                    </button>
                </div>
            </div>
            <div bind:this={qrElement} class="flex items-center justify-center bg-white p-1 border-2 border-cyan-400 rounded-lg w-16 h-16 sm:w-20 sm:h-20 aspect-square shadow-[0_0_10px_rgba(6,182,212,0.5)] flex-shrink-0 overflow-hidden [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain"></div>
        </div>
    </header>

    <!-- Center Stage: Theme Showcase & Mode Badges -->
    <section class="w-full my-auto flex flex-col items-center justify-center py-2 flex-shrink-0">
        {#if $gameState.isGeneratingThemes}
            <div class="p-6 bg-black/60 border-2 border-warning rounded-2xl text-center w-full max-w-xl shadow-lg">
                <p class="text-xl sm:text-2xl text-warning animate-pulse font-display">{$t.generatingThemes}...</p>
            </div>
        {:else}
            <!-- Theme Card -->
            <div class="w-full max-w-4xl bg-neutral-950/85 border-2 border-fuchsia-500/80 rounded-2xl p-3 sm:p-4 shadow-[0_0_25px_rgba(217,70,239,0.2)] backdrop-blur-md text-center mb-2">
                <div class="flex items-center justify-between mb-1.5 px-1">
                    <span class="text-xs sm:text-sm font-display font-bold text-fuchsia-400 tracking-wider uppercase">
                        ✨ {$t.theme || 'CHOSEN THEME'}
                    </span>
                    <div class="flex items-center gap-2">
                        <button 
                            type="button" 
                            on:click={handleReloadTopics}
                            disabled={$gameState.isGeneratingThemes}
                            class="px-2 py-0.5 text-xs bg-neutral-900 hover:bg-fuchsia-500 hover:text-white border border-fuchsia-500/60 rounded text-fuchsia-300 transition-all font-display cursor-pointer flex items-center gap-1 disabled:opacity-50"
                        >
                            <span>🔄</span> {$t.reloadThemes || 'Reload'}
                        </button>
                        <button 
                            type="button" 
                            on:click={handlePickRandomTheme}
                            class="px-2 py-0.5 text-xs bg-neutral-900 hover:bg-accent hover:text-black border border-accent/60 rounded text-accent transition-all font-display cursor-pointer flex items-center gap-1"
                        >
                            <span>🎲</span> {$language === 'uk' ? 'Випадкова' : 'Random'}
                        </button>
                    </div>
                </div>

                <!-- Theme Name Display -->
                <div class="p-2.5 sm:p-3 bg-black/70 border border-neutral-700/80 rounded-xl mb-2">
                    <p class="text-lg sm:text-xl lg:text-2xl xl:text-3xl text-amber-300 font-display font-bold leading-tight drop-shadow-[0_0_10px_rgba(252,211,77,0.5)] break-words">
                        {$gameState.theme ? $gameState.theme : $t.waitingForTheme}
                    </p>
                </div>

                <!-- Suggested AI Theme Chips -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                    {#each availableThemes as themeOption}
                        <button 
                            type="button"
                            on:click={() => handleSelectTheme(themeOption)}
                            class="p-2 sm:p-2.5 text-xs sm:text-sm font-bold text-center rounded-xl border transition-all cursor-pointer flex items-center justify-center min-h-[44px] sm:min-h-[50px] {
                                $gameState?.theme === themeOption 
                                ? 'bg-fuchsia-500 text-white font-bold border-white shadow-[0_0_12px_rgba(217,70,239,0.8)] scale-[1.01]' 
                                : 'bg-neutral-900/90 border-neutral-700 hover:border-slate-300 text-slate-200 active:scale-98'
                            }"
                        >
                            <span class="line-clamp-2">{themeOption}</span>
                        </button>
                    {/each}
                </div>

                <!-- Custom Theme Input -->
                <div class="relative select-text">
                    <input 
                        type="text" 
                        class="w-full bg-black/80 border border-fuchsia-500/60 p-2 text-center focus:outline-none text-xs sm:text-sm rounded-xl transition-all font-mono select-text text-fuchsia-300" 
                        placeholder={$t.customTheme || 'Or type custom theme...'} 
                        bind:value={hostCustomTheme} 
                        on:input={handleCustomThemeInput}
                        on:focus={() => isThemeInputFocused = true}
                        on:blur={() => isThemeInputFocused = false}
                    >
                </div>
            </div>
        {/if}

        <!-- Mode Pills -->
        <div class="flex items-center justify-center gap-2 sm:gap-3 w-full max-w-2xl">
            <div class="px-3 py-1 flex items-center gap-1.5 border rounded-full text-xs font-display transition-all {$gameState.sillyMode ? 'bg-purple-900/60 border-purple-400 text-purple-200' : 'bg-neutral-900/60 border-neutral-700 text-neutral-400'}">
                <span>🤡</span>
                <span class="font-bold">{$t.sillyMode}</span>
            </div>
            <div class="px-3 py-1 flex items-center gap-1.5 border rounded-full text-xs font-display transition-all {$gameState.is18PlusMode ? 'bg-red-900/60 border-red-400 text-red-200' : 'bg-neutral-900/60 border-neutral-700 text-neutral-400'}">
                <span>🌶️</span>
                <span class="font-bold">{$t.is18PlusMode}</span>
            </div>
            <div class="px-3 py-1 flex items-center gap-1.5 border rounded-full text-xs font-display transition-all {$gameState.slowpokeMode ? 'bg-teal-900/60 border-teal-400 text-teal-200' : 'bg-neutral-900/60 border-neutral-700 text-neutral-400'}">
                <span>🐌</span>
                <span class="font-bold">{$t.slowpokeMode}</span>
            </div>
        </div>
    </section>

    <!-- Players Arena Grid (Full-Width Responsive Cards) -->
    <section class="w-full flex-1 min-h-0 flex flex-col justify-start overflow-hidden my-1">
        <div class="flex items-center justify-between mb-1.5 px-1 flex-shrink-0">
            <span class="text-xs sm:text-sm font-display font-bold text-cyan-400 tracking-widest uppercase">
                👥 {$t.players || 'PLAYERS'} ({$gameState.players.length})
            </span>
            <span class="text-[10px] font-mono text-slate-400">
                {$gameState.players.filter(p => !!p.socketId).length} / {$gameState.players.length} {$language === 'uk' ? 'ПІДКЛЮЧЕНО' : 'CONNECTED'}
            </span>
        </div>

        <div class="flex-1 min-h-0 overflow-y-auto pr-1">
            <div class="grid gap-2 sm:gap-2.5 {$gameState.players.length <= 6 ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6' : 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-7'}">
                {#each $gameState.players as p (p.id)}
                    <div class="panel-arcade p-2 sm:p-2.5 rounded-xl flex items-center gap-2.5 border-neutral-700/80 bg-neutral-950/80 shadow-md transition-all {p.socketId ? 'opacity-100' : 'opacity-50'}">
                        <div class="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0">
                            <PixelAvatar avatar={p.avatar} />
                        </div>
                        <div class="min-w-0 flex-1 text-left">
                            <p class="font-bold text-xs sm:text-sm text-slate-100 truncate">{p.name}</p>
                            <div class="flex items-center gap-1 mt-0.5">
                                {#if p.isHost}
                                    <span class="px-1 py-0.2 bg-warning text-black text-[8px] font-display rounded font-bold">{$t.host || 'HOST'}</span>
                                {/if}
                                {#if p.socketId}
                                    <span class="text-[9px] font-display text-emerald-400 font-bold">✓ {$language === 'uk' ? 'Готовий' : 'Ready'}</span>
                                {:else}
                                    <span class="text-[9px] font-display text-danger animate-pulse font-bold">{$t.disconnected || 'OFFLINE'}</span>
                                {/if}
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    </section>

    <!-- Bottom Status Banner -->
    <footer class="w-full flex-shrink-0 pt-1">
        <div class="p-2 sm:p-2.5 bg-black/70 border-2 border-warning rounded-xl text-center shadow-[0_0_15px_rgba(234,179,8,0.3)]">
            <p class="text-xs sm:text-sm lg:text-base text-warning animate-pulse font-display tracking-widest uppercase truncate">
                {$t.waitingForHost || 'Waiting for the Host to start the game'}...
            </p>
        </div>
    </footer>

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

    <!-- Host TV Controls -->
    <div class="fixed bottom-3 left-3 z-50 flex items-center gap-2">
        <button 
            on:click={toggleTvMode}
            class="px-2.5 py-1 bg-black/90 text-[11px] rounded border transition-all font-display flex items-center gap-1.5 {$tvMode ? 'border-primary text-primary shadow-sm shadow-primary/50' : 'border-neutral-700 text-neutral-400 hover:text-white'}"
            title={$t.tvModeDesc}
        >
            <span>📺</span>
            <span>{$t.tvMode || 'TV MODE'}: {$tvMode ? 'ON' : 'OFF'}</span>
        </button>
    </div>

    <button 
        on:click={handleCloseLobby}
        class="fixed bottom-3 right-3 z-50 px-2.5 py-1 bg-black text-neutral-300 text-[11px] rounded border border-neutral-600 hover:bg-danger hover:text-white transition-colors font-display"
        title={$t.closeLobby}
    >
        {$t.closeLobby || 'Close Lobby'}
    </button>
</div>