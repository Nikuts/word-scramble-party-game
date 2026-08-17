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

    function handlePickRandomTheme() {
        if (!$gameState) return;
        const available = $gameState?.preGeneratedThemes?.[$language] || [];
        if (available.length > 0) {
            const randomTheme = available[Math.floor(Math.random() * available.length)];
            handleSelectTheme(randomTheme);
        }
    }

    function handleReloadTopics() {
        if (!$gameState || $gameState.isGeneratingThemes) return;
        sendMessage('reload-themes', { gameId: $gameState.id });
    }
</script>

<div class="p-3 sm:p-6 flex flex-col md:flex-row gap-4 sm:gap-6 min-h-screen relative host-lobby-container">
    <!-- Left Side: How to Connect & Player List -->
    <div class="w-full md:w-1/3 lg:w-1/4 panel-arcade flex flex-col" style="--neon-color: var(--color-primary); --neon-color-rgb: var(--color-primary-rgb);">
        <h2 class="text-xl sm:text-2xl mb-3 text-primary" style="text-shadow: 0 0 5px var(--color-primary);">{$t.howToConnect}</h2>
        <div class="text-center bg-black/50 p-3 border-2 border-neutral-700 rounded-md mb-4">
            <p class="text-sm mb-1">{$t.openBrowserTo}</p>
            <p class="text-base font-mono font-bold text-accent break-words">{connectURL || '...'}</p>
            <p class="text-sm my-2">{$t.orEnterId}</p>
            <p class="font-display text-3xl sm:text-4xl tracking-widest text-white" style="text-shadow: 0 0 10px #fff;" data-testid="game-id">{$gameState.id}</p>
            <div class="mt-2 flex justify-center">
                <button 
                    type="button"
                    class="px-2.5 py-1 bg-neutral-800 hover:bg-primary hover:text-black border border-primary/60 rounded text-xs font-display transition-all cursor-pointer"
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
            <div bind:this={qrElement} class="mt-3 flex justify-center items-center bg-white p-2 border-2 w-full max-w-[180px] h-auto aspect-square mx-auto shadow-xl rounded-lg" style="border-color: var(--color-primary); box-shadow: 0 0 15px var(--color-primary);"></div>
        </div>
        <h2 class="text-xl sm:text-2xl mb-3 text-primary" style="text-shadow: 0 0 5px var(--color-primary);">{$t.players} ({$gameState.players.length})</h2>
        <div class="flex-grow overflow-y-auto pr-1">
            <ul class="space-y-2">
                {#each $gameState.players as p (p.id)}
                    <li class="flex items-center gap-3 bg-neutral-900/80 p-2.5 border border-neutral-700 rounded-md transition-opacity {p.socketId ? 'opacity-100' : 'opacity-60'}">
                        <div class="w-9 h-9 flex-shrink-0">
                            <PixelAvatar avatar={p.avatar} />
                        </div>
                        <span class="text-base font-medium flex-grow truncate">{p.name}</span>
                        {#if p.isHost}
                            <span class="px-1.5 py-0.5 bg-warning text-black text-[11px] font-display rounded-sm">{$t.host}</span>
                        {/if}
                         {#if !p.socketId}
                            <span class="px-1.5 py-0.5 bg-danger text-white text-[11px] font-display rounded-sm animate-pulse">{$t.disconnected}</span>
                        {/if}
                    </li>
                {/each}
            </ul>
        </div>
    </div>

    <!-- Right Side: Game Status & Theme Configuration -->
    <div class="w-full md:w-2/3 lg:w-3/4 panel-arcade flex flex-col items-center text-center py-4 sm:py-6" style="--neon-color: var(--color-secondary); --neon-color-rgb: var(--color-secondary-rgb);">
        <h1 class="text-2xl sm:text-4xl text-center mb-4 text-primary" style="text-shadow: 0 0 10px var(--color-primary), 0 0 20px var(--color-primary);">{$t.appName}</h1>
        <div class="w-full max-w-xl">
             {#if $gameState.isGeneratingThemes}
                <div class="p-4 bg-black/50 border-2 border-warning rounded-md mb-6">
                    <p class="text-xl text-warning animate-pulse">{$t.generatingThemes}...</p>
                </div>
             {:else}
                <div class="flex items-center justify-between mb-2">
                    <h3 class="text-lg sm:text-xl text-primary font-display">{$t.theme}</h3>
                    <div class="flex items-center gap-2">
                        <button 
                            type="button" 
                            on:click={handleReloadTopics}
                            class="px-2.5 py-1 text-xs bg-neutral-800 hover:bg-primary hover:text-black border border-primary/60 rounded text-primary transition-all font-display cursor-pointer flex items-center gap-1"
                            title="Generate 3 fresh themes"
                        >
                            <span>🔄</span> {$t.reloadTopics}
                        </button>
                        <button 
                            type="button" 
                            on:click={handlePickRandomTheme}
                            class="px-2.5 py-1 text-xs bg-neutral-800 hover:bg-accent hover:text-black border border-accent/60 rounded text-accent transition-all font-display cursor-pointer flex items-center gap-1"
                            title="Pick random suggested theme"
                        >
                            <span>🎲</span> {$language === 'uk' ? 'Випадкова' : 'Random'}
                        </button>
                    </div>
                </div>

                <!-- Theme Active Display -->
                <div class="p-4 bg-neutral-900 border-2 border-neutral-700 rounded-md mb-4 shadow-inner">
                    <p class="text-2xl text-primary font-bold min-h-8">{$gameState.theme ? $gameState.theme : $t.waitingForTheme}</p>
                </div>

                <!-- Suggested AI Theme Badges -->
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                    {#each ($gameState?.preGeneratedThemes?.[$language] || []) as themeOption}
                        <button 
                            type="button"
                            on:click={() => handleSelectTheme(themeOption)} 
                            class="p-2.5 text-xs sm:text-sm text-center transition-all rounded-md cursor-pointer border-2 {
                                $gameState?.theme === themeOption 
                                ? 'bg-primary text-black font-bold border-white shadow-[0_0_10px_rgba(6,182,212,0.8)]' 
                                : 'bg-neutral-800/80 border-neutral-600 hover:bg-neutral-700 text-gray-200'
                            }"
                        >
                            {themeOption}
                        </button>
                    {/each}
                </div>

                <!-- Custom Theme Text Input -->
                <div class="relative mb-6">
                    <input 
                        type="text" 
                        class="w-full bg-black/80 border-2 p-3 text-center focus:outline-none text-base sm:text-lg rounded-md transition-all font-mono" 
                        style="border-color: var(--color-primary); box-shadow: 0 0 8px var(--color-primary), inset 0 0 8px rgba(var(--color-primary-rgb), 0.2); color: var(--color-primary);"
                        placeholder={$t.customTheme} 
                        bind:value={hostCustomTheme} 
                        on:input={handleCustomThemeInput}
                        on:focus={() => isThemeInputFocused = true}
                        on:blur={() => isThemeInputFocused = false}
                    >
                </div>
                
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mb-6">
                    <div class="p-3 flex items-center gap-3 border-2 rounded-lg transition-all {$gameState.sillyMode ? 'bg-purple-900/50 border-purple-400' : 'bg-neutral-900/80 border-neutral-700'}">
                        <span class="text-3xl">🤡</span>
                        <div><p class="font-bold text-base text-left">{$t.sillyMode}</p></div>
                    </div>
                    <div class="p-3 flex items-center gap-3 border-2 rounded-lg transition-all {$gameState.is18PlusMode ? 'bg-red-900/50 border-red-400' : 'bg-neutral-900/80 border-neutral-700'}">
                        <span class="text-3xl">🌶️</span>
                        <div><p class="font-bold text-base text-left">{$t.is18PlusMode}</p></div>
                    </div>
                    <div class="p-3 flex items-center gap-3 border-2 rounded-lg transition-all {$gameState.slowpokeMode ? 'bg-teal-900/50 border-teal-400' : 'bg-neutral-900/80 border-neutral-700'}">
                        <span class="text-3xl">🐌</span>
                        <div><p class="font-bold text-base text-left">{$t.slowpokeMode}</p></div>
                    </div>
                </div>

                <div class="p-4 bg-black/50 border-2 border-warning rounded-md">
                    <p class="text-xl text-warning animate-pulse">{$t.waitingForHost}...</p>
                </div>
            {/if}
        </div>
    </div>

     <!-- Avatar Container -->
    <div class="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-30">
        {#each $flyingEmojis as emoji (emoji.id)}
            {@const startX = Math.random() * 80 + 10}
            {@const endX = Math.random() * 80 + 10}
            {@const startRotate = Math.random() * 90 - 45}
            {@const endRotate = Math.random() * 540 - 270}
            <div
                class="flying-emoji"
                style="--start-x: {startX}%; --end-x: {endX}%; --start-rotate: {startRotate}deg; --end-rotate: {endRotate}deg;"
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