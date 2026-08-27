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
        if ($gameState?.isGeneratingThemes && !isThemeInputFocused) {
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
                qrElement.innerHTML = qr.createSvgTag({cellSize: 6, margin: 2});
            } catch (e) {
                console.error("QR Code generation failed:", e);
                qrElement.innerHTML = `<p class="text-xs text-danger">QR error</p>`;
            }
        }
    }
    
    // Regenerate the QR code whenever the connectURL or game ID changes.
    $: if (qrElement && connectURL) {
        const urlForQr = $gameState && $gameState.id ? `${connectURL}/?gameId=${$gameState.id}&lang=${$language}` : connectURL;
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

    let showOrientationHint = true;

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

<!-- Full-Width Harmonized Host Lobby Arena (Zero Scroll on Desktop/TV, Smooth Touch Scroll on Tablet/Mobile) -->
<div class="min-h-screen lg:h-screen lg:max-h-[100dvh] w-full flex flex-col justify-between p-2 sm:p-3 lg:p-4 max-w-7xl mx-auto safe-top safe-bottom relative select-none font-sans overflow-y-auto lg:overflow-hidden box-border pb-3 sm:pb-4 host-lobby-container">

    <!-- Subtle Orientation Hint on Portrait Screens -->
    {#if showOrientationHint}
        <div class="lg:hidden w-full bg-cyan-950/90 border border-cyan-400 text-cyan-200 px-3 py-1.5 rounded-xl mb-1.5 flex items-center justify-between text-xs font-display shadow-md flex-shrink-0 animate-fade-in">
            <div class="flex items-center gap-2">
                <span class="text-sm">🔄</span>
                <span>{$t.rotateDeviceHint || 'Tip: Rotate device to landscape for full TV display view'}</span>
            </div>
            <button 
                type="button" 
                class="text-cyan-400 hover:text-white px-1.5 py-0.5 text-xs font-bold cursor-pointer" 
                on:click={() => showOrientationHint = false}
                aria-label="Dismiss orientation hint"
            >
                ✕
            </button>
        </div>
    {/if}
    
    <!-- Top Showcase Stage: Brand & Theme on Left + Large Scannable QR Join Tile on Right -->
    <header class="w-full grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3.5 bg-neutral-950/90 border-2 border-cyan-400/80 rounded-2xl p-2.5 sm:p-4 shadow-[0_0_25px_rgba(6,182,212,0.25)] backdrop-blur-md flex-shrink-0">
        
        <!-- Left Column: Brand & Active Theme Selection (7 cols) -->
        <div class="lg:col-span-7 flex flex-col justify-between space-y-1.5 sm:space-y-2">
            <!-- Brand Bar -->
            <div class="flex flex-wrap items-center justify-between gap-1.5 border-b border-neutral-800/80 pb-1.5">
                <div>
                    <h1 class="text-xl sm:text-2xl lg:text-3xl font-display font-black text-primary drop-shadow-[0_0_10px_rgba(var(--color-primary-rgb),0.8)] tracking-wide leading-none">
                        {$t.appName}
                    </h1>
                    <p class="text-[9px] sm:text-xs text-slate-400 font-mono tracking-widest uppercase mt-0.5">
                        {$t.realTimePartyGame || 'REAL-TIME MULTIPLAYER PARTY GAME'}
                    </p>
                </div>
                <div class="flex flex-wrap items-center gap-1.5 sm:gap-2 flex-shrink-0">
                    <button 
                        type="button" 
                        on:click={toggleTvMode}
                        class="px-2 sm:px-2.5 py-1 bg-neutral-900 border text-[10px] sm:text-xs rounded-lg transition-all font-display flex items-center gap-1 cursor-pointer {$tvMode ? 'border-primary text-primary shadow-sm shadow-primary/50' : 'border-neutral-700 text-neutral-400 hover:text-white'}"
                        title={$t.tvModeDesc}
                    >
                        <span>📺</span>
                        <span>{$t.tvMode || 'TV MODE'}: {$tvMode ? 'ON' : 'OFF'}</span>
                    </button>
                    <button 
                        type="button"
                        class="px-2 sm:px-2.5 py-1 bg-neutral-900 border border-cyan-500/50 hover:bg-cyan-950/70 text-cyan-300 font-display text-[10px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1"
                        on:click={handleReloadTopics}
                        disabled={$gameState?.isGeneratingThemes}
                    >
                        <span>🔄</span>
                        <span>{$t.reloadThemes || 'Reload Themes'}</span>
                    </button>
                    <button 
                        type="button"
                        class="px-2 sm:px-2.5 py-1 bg-neutral-900 border border-purple-500/50 hover:bg-purple-950/70 text-purple-300 font-display text-[10px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1"
                        on:click={handlePickRandomTheme}
                    >
                        <span>🎲</span>
                        <span>{$t.randomTheme || 'Random'}</span>
                    </button>
                    <button 
                        type="button"
                        on:click={handleCloseLobby}
                        class="px-2 sm:px-2.5 py-1 bg-neutral-900 border border-neutral-700 hover:border-danger/80 hover:bg-danger/20 text-neutral-400 hover:text-danger text-[10px] sm:text-xs rounded-lg transition-colors font-display cursor-pointer flex items-center gap-1"
                        title={$t.closeLobby}
                    >
                        <span>🛑</span>
                        <span>{$t.closeLobby || 'Close Lobby'}</span>
                    </button>
                </div>
            </div>

            <!-- Active Theme Banner -->
            <div class="bg-neutral-900/90 border border-neutral-700/80 rounded-xl p-2 sm:p-2.5 text-center">
                <span class="text-[9px] sm:text-xs font-display font-bold text-amber-400 uppercase tracking-widest block mb-0.5">
                    ✨ {$t.theme || 'THEME'}:
                </span>
                <p class="text-sm sm:text-base lg:text-lg font-display font-black text-amber-300 truncate leading-snug drop-shadow-[0_0_10px_rgba(252,211,77,0.4)]">
                    {$gameState.theme || ($t.waitingForTheme || 'Waiting for the Host to select ...')}
                </p>
            </div>

            <!-- Pre-Generated Quick-Select Theme Tiles (Desktop/TV) -->
            {#if availableThemes.length > 0}
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                    {#each availableThemes.slice(0, 3) as themeOption}
                        <button
                            type="button"
                            class="p-1.5 sm:p-2 text-[10px] sm:text-xs font-sans font-bold rounded-lg border text-center transition-all cursor-pointer truncate {
                                $gameState.theme === themeOption 
                                ? 'bg-amber-400/20 border-amber-400 text-amber-200 shadow-[0_0_10px_rgba(251,191,36,0.3)]' 
                                : 'bg-neutral-900/60 border-neutral-800 text-slate-300 hover:border-cyan-400/60 hover:text-white'
                            }"
                            on:click={() => handleSelectTheme(themeOption)}
                        >
                            {themeOption}
                        </button>
                    {/each}
                </div>
            {/if}

            <!-- Custom Theme Input Option -->
            {#if $gameState}
                <div class="w-full">
                    <input 
                        type="text" 
                        class="w-full bg-black/80 border border-cyan-500/60 py-1 px-3 text-center focus:outline-none text-[11px] sm:text-xs rounded-lg transition-all font-mono text-cyan-200 select-text placeholder:text-neutral-500" 
                        placeholder={$t.customTheme || 'Or type a custom theme...'} 
                        bind:value={hostCustomTheme} 
                        on:input={handleCustomThemeInput}
                        on:focus={() => isThemeInputFocused = true}
                        on:blur={() => isThemeInputFocused = false}
                    />
                </div>
            {/if}

            <!-- Mode Pills -->
            <div class="flex items-center justify-center gap-1.5 pt-0.5">
                <div class="px-2 py-0.5 flex items-center gap-1 border rounded-full text-[9px] sm:text-[10px] font-display transition-all {$gameState.sillyMode ? 'bg-purple-900/60 border-purple-400 text-purple-200' : 'bg-neutral-900/60 border-neutral-700 text-neutral-400'}">
                    <span>🤡</span>
                    <span class="font-bold">{$t.sillyMode}</span>
                </div>
                <div class="px-2 py-0.5 flex items-center gap-1 border rounded-full text-[9px] sm:text-[10px] font-display transition-all {$gameState.is18PlusMode ? 'bg-red-900/60 border-red-400 text-red-200' : 'bg-neutral-900/60 border-neutral-700 text-neutral-400'}">
                    <span>🌶️</span>
                    <span class="font-bold">{$t.is18PlusMode}</span>
                </div>
                <div class="px-2 py-0.5 flex items-center gap-1 border rounded-full text-[9px] sm:text-[10px] font-display transition-all {$gameState.slowpokeMode ? 'bg-teal-900/60 border-teal-400 text-teal-200' : 'bg-neutral-900/60 border-neutral-700 text-neutral-400'}">
                    <span>🐌</span>
                    <span class="font-bold">{$t.slowpokeMode}</span>
                </div>
            </div>
        </div>

        <!-- Right Column: Prominent Scannable Join Information & Large QR Tile (5 cols) -->
        <div class="lg:col-span-5 bg-black/85 border-2 border-cyan-400/90 rounded-xl p-2.5 sm:p-3.5 flex flex-col items-center justify-between text-center shadow-lg">
            
            <div class="w-full">
                <p class="text-[11px] sm:text-xs font-display text-slate-300 uppercase tracking-wider">
                    {$t.joinOnYourPhone || $t.openBrowserTo || 'Join on your phone at'}
                </p>
                <p class="text-xs sm:text-sm font-mono font-bold text-accent break-all leading-tight my-0.5">
                    {connectURL || '...'}
                </p>
            </div>

            <!-- Prominent Large QR Code Tile (Crisp & Viewport Sized) -->
            <div 
                bind:this={qrElement} 
                class="my-1 sm:my-1.5 flex items-center justify-center bg-white p-1.5 border-2 border-cyan-400 rounded-2xl w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 aspect-square shadow-[0_0_20px_rgba(6,182,212,0.6)] flex-shrink-0 overflow-hidden [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain"
            ></div>

            <!-- Room Code Badge -->
            <div class="w-full flex items-center justify-center gap-2 pt-0.5">
                <span class="text-xs text-slate-400 font-mono">{$t.orEnterId || 'ROOM'}:</span>
                <span class="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-amber-300 tracking-widest leading-none drop-shadow-[0_0_15px_rgba(252,211,77,0.9)]" data-testid="game-id">
                    {$gameState.id}
                </span>
                <button 
                    type="button"
                    class="px-2.5 py-1 bg-neutral-800 hover:bg-primary hover:text-black border border-primary/60 rounded text-[10px] font-display font-bold transition-all cursor-pointer"
                    on:click={() => {
                        const shareUrl = $gameState?.id ? `${connectURL}/?gameId=${$gameState.id}&lang=${$language}` : connectURL;
                        if (navigator.clipboard) {
                            navigator.clipboard.writeText(shareUrl).then(() => {
                                alert($t.linkCopied || 'Link copied to clipboard!');
                            }).catch(() => {
                                prompt($t.copyGameLink || 'Copy game link:', shareUrl);
                            });
                        } else {
                            prompt($t.copyGameLink || 'Copy game link:', shareUrl);
                        }
                    }}
                >
                    📋 {$t.copy || 'Copy'}
                </button>
            </div>
        </div>
    </header>

    <!-- Players Arena Grid (Full-Width Responsive Cards Scaling from 3 to 14 Players) -->
    <section class="w-full flex-1 min-h-0 flex flex-col justify-start my-2 sm:my-2.5">
        <div class="flex items-center justify-between mb-1.5 sm:mb-2 px-1 flex-shrink-0">
            <span class="text-xs sm:text-sm lg:text-base font-display font-black text-cyan-400 tracking-widest uppercase">
                👥 {$t.players || 'PLAYERS'} ({$gameState.players.length})
            </span>
            <span class="text-xs sm:text-sm font-mono text-slate-300 font-bold">
                {$gameState.players.filter(p => !!p.socketId).length} / {$gameState.players.length} {$t.connected || 'CONNECTED'}
            </span>
        </div>

        <div class="flex-1 min-h-0 overflow-y-auto pr-1">
            <div class="grid gap-2 sm:gap-3 {$gameState.players.length <= 4 ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : ($gameState.players.length <= 6 ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' : ($gameState.players.length <= 8 ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'))}">
                {#each $gameState.players as p (p.id)}
                    <div class="panel-arcade {$gameState.players.length <= 6 ? 'p-3 sm:p-4' : 'p-2 sm:p-3'} rounded-2xl flex items-center gap-3 border-neutral-700/80 bg-neutral-950/90 shadow-lg transition-all {p.socketId ? 'opacity-100' : 'opacity-50'}">
                        <div class="{$gameState.players.length <= 6 ? 'w-12 h-12 sm:w-14 sm:h-14' : 'w-10 h-10 sm:w-12 sm:h-12'} flex-shrink-0">
                            <PixelAvatar avatar={p.avatar} />
                        </div>
                        <div class="min-w-0 flex-1 text-left">
                            <p class="font-black {$gameState.players.length <= 6 ? 'text-base sm:text-lg' : 'text-sm sm:text-base'} text-slate-100 truncate">{p.name}</p>
                            <div class="flex items-center gap-1.5 mt-0.5">
                                {#if p.isHost}
                                    <span class="px-1.5 py-0.5 bg-warning text-black text-[9px] sm:text-[10px] font-display rounded font-black">{$t.host || 'HOST'}</span>
                                {/if}
                                {#if p.socketId}
                                    <span class="text-[11px] sm:text-xs font-display text-emerald-400 font-black">✓ {$t.ready || 'Ready'}</span>
                                {:else}
                                    <span class="text-[11px] sm:text-xs font-display text-danger animate-pulse font-bold">{$t.disconnected || 'OFFLINE'}</span>
                                {/if}
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    </section>

    <!-- Bottom Status Banner -->
    <footer class="w-full flex-shrink-0 pt-0.5">
        <div class="p-1.5 sm:p-2 bg-black/70 border-2 border-warning rounded-xl text-center shadow-[0_0_15px_rgba(234,179,8,0.3)]">
            <p class="text-xs sm:text-sm lg:text-base text-warning animate-pulse font-display font-bold tracking-widest uppercase truncate">
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
</div>