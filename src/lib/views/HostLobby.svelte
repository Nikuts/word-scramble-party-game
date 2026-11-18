<!-- src/lib/views/HostLobby.svelte -->
<script>
    import { onDestroy, tick } from 'svelte';
    import { t, language, sendMessage, gameState, tvMode, toggleTvMode } from '../../stores.js';
    import { selectPluralForm } from '../../ui_text.js';
    import qrcode from 'qrcode-generator';
    import PixelAvatar from '../shared/PixelAvatar.svelte';
    import ArcadeIcon from '../shared/ArcadeIcon.svelte';
    import FlyingReactionsOverlay from '../shared/FlyingReactionsOverlay.svelte';
    import { MAX_PLAYERS, MIN_PLAYERS } from '../config.js';

    let qrElement;
    let connectURL = '';
    let hostCustomTheme = '';
    let isThemeInputFocused = false;
    let customThemeInputEl;
    let showOrientationHint = true;

    async function focusCustomThemeInput() {
        isThemeInputFocused = true;
        await tick();
        customThemeInputEl?.focus();
    }

    $: gameLang = $gameState?.language || ($language === 'ua' || $language === 'uk' ? 'uk' : 'en');
    $: availableThemes = $gameState?.preGeneratedThemes?.[gameLang]
        || $gameState?.preGeneratedThemes?.[$language]
        || $gameState?.preGeneratedThemes?.['en']
        || $gameState?.preGeneratedThemes?.['uk']
        || $gameState?.preGeneratedThemes?.['ua']
        || [];

    $: {
        if ($gameState?.isGeneratingThemes && !isThemeInputFocused) {
            hostCustomTheme = '';
        } else if (!isThemeInputFocused) {
            const currentTheme = $gameState?.theme || '';
            const isPreset = availableThemes.includes(currentTheme);
            const targetCustom = isPreset ? '' : currentTheme;
            if (hostCustomTheme !== targetCustom) {
                hostCustomTheme = targetCustom;
            }
        }
    }

    $: {
        if (typeof window !== 'undefined') {
            const origin = window.location.origin;
            const hostname = window.location.hostname;
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
                const qr = qrcode(0, 'L');
                qr.addData(url);
                qr.make();
                qrElement.innerHTML = qr.createSvgTag({ cellSize: 6, margin: 2 });
            } catch (e) {
                console.error("QR Code generation failed:", e);
                qrElement.innerHTML = `<p class="text-xs text-danger">QR error</p>`;
            }
        }
    }

    let lastQrUrl = '';
    $: if (qrElement && connectURL) {
        const urlForQr = $gameState?.id ? `${connectURL}/?gameId=${$gameState.id}&lang=${$language}` : connectURL;
        if (urlForQr !== lastQrUrl) {
            lastQrUrl = urlForQr;
            generateQRCode(urlForQr);
        }
    }

    function handleCloseLobby() {
        if (confirm($t.confirmCloseLobby)) {
            sendMessage('force-end-game', { gameId: $gameState.id });
        }
    }

    let themeDebounceTimer = null;
    onDestroy(() => {
        if (themeDebounceTimer) clearTimeout(themeDebounceTimer);
    });

    function handleSelectTheme(theme) {
        if (!$gameState) return;
        if (themeDebounceTimer) clearTimeout(themeDebounceTimer);
        hostCustomTheme = '';
        sendMessage('set-theme', { gameId: $gameState.id, theme });
    }

    function handleCustomThemeInput(e) {
        if (!$gameState) return;
        const gameId = $gameState.id;
        hostCustomTheme = e.target.value;
        if (themeDebounceTimer) clearTimeout(themeDebounceTimer);
        const trimmed = hostCustomTheme.trim();
        themeDebounceTimer = setTimeout(() => {
            sendMessage('set-theme', { gameId, theme: trimmed });
        }, 250);
    }

    function handlePickRandomTheme() {
        if (!$gameState || availableThemes.length === 0) return;
        const randomTheme = availableThemes[Math.floor(Math.random() * availableThemes.length)];
        handleSelectTheme(randomTheme);
    }

    function handleReloadTopics() {
        if (!$gameState || $gameState.isGeneratingThemes) return;
        sendMessage('reload-themes', { gameId: $gameState.id });
    }

    $: playerList = $gameState?.players || [];
    $: totalPlayers = playerList.length;
    $: connectedPlayersCount = playerList.filter(p => !!p.socketId).length;
    $: isCompactRoster = totalPlayers > 8;
</script>

<div class="h-full max-h-full lg:h-screen-safe lg:max-h-screen-safe w-full flex flex-col justify-start lg:justify-between p-2 sm:p-3 2xl:p-5 max-w-[1920px] mx-auto safe-top safe-bottom relative select-none font-sans overflow-y-auto lg:overflow-hidden box-border host-lobby-container gap-2 2xl:gap-3.5">

    {#if showOrientationHint}
        <div class="lg:hidden w-full cut-sm bg-cyan-950/90 border border-cyan-400 text-cyan-200 px-3 py-1.5 flex items-center justify-between text-xs font-display flex-shrink-0">
            <div class="flex items-center gap-2">
                <ArcadeIcon name="rotate" className="w-3.5 h-3.5" />
                <span>{$t.rotateDeviceHint || 'Tip: Rotate device to landscape for full display view'}</span>
            </div>
            <button
                type="button"
                class="text-cyan-300 hover:text-white px-1.5 py-0.5 text-xs font-bold cursor-pointer"
                on:click={() => showOrientationHint = false}
                aria-label="Dismiss orientation hint"
            >
                <ArcadeIcon name="close" className="w-3.5 h-3.5" />
            </button>
        </div>
    {/if}

    <!-- Prototype v5 Unified Top HUD Bar -->
    <header class="flex-shrink-0 w-full flex items-center justify-between gap-2">
        <div class="flex-1 min-w-0 cut-sm bg-[#131126] border border-cyan-500/60 px-3 sm:px-4 2xl:px-5 py-1.5 sm:py-2 2xl:py-2.5 flex items-center justify-between gap-2">
            <button
                type="button"
                on:click={toggleTvMode}
                class="cut-sm px-2.5 sm:px-3 2xl:px-3.5 py-1 2xl:py-1.5 bg-[#0a0914] border text-xs sm:text-sm 2xl:text-base font-display transition-colors flex items-center gap-1.5 cursor-pointer flex-shrink-0 {$tvMode ? 'border-primary text-primary' : 'border-[#332e59] text-slate-300 hover:text-white'}"
                title={$t.tvModeDesc}
                aria-label={$t.tvLowPowerMode || 'Toggle TV Mode'}
            >
                <ArcadeIcon name="tv" className="w-3.5 h-3.5 2xl:w-4 2xl:h-4" />
                <span>{$tvMode ? ($t.tvOn || 'TV ON') : ($t.tvOff || 'TV OFF')}</span>
            </button>
            <span class="hidden lg:inline font-display text-xs sm:text-sm lg:text-base 2xl:text-lg text-slate-200 tracking-widest uppercase truncate">
                {$t.appName || 'WORD SCRAMBLE'}
            </span>
        </div>

        <div class="cut-hex bg-[#0e0b22] border-2 border-amber-400/90 px-4 sm:px-7 2xl:px-8 py-1.5 sm:py-2 flex items-center justify-center flex-shrink-0">
            <span class="font-display text-sm sm:text-xl 2xl:text-2xl text-amber-300 tracking-widest leading-none">
                #{$gameState?.id || '----'}
            </span>
        </div>

        <div class="flex-1 min-w-0 cut-sm bg-[#131126] border border-fuchsia-500/60 px-3 sm:px-4 2xl:px-5 py-1.5 sm:py-2 2xl:py-2.5 flex items-center justify-between gap-2">
            <span class="font-display text-xs sm:text-sm lg:text-base 2xl:text-lg text-emerald-400 tracking-widest uppercase truncate">
                {$t.lobbyTag || 'LOBBY'}
            </span>
            <button
                type="button"
                on:click={handleCloseLobby}
                class="cut-sm px-2.5 sm:px-3 2xl:px-3.5 py-1 2xl:py-1.5 bg-rose-950/35 border border-rose-500/45 hover:border-danger hover:bg-rose-950/80 text-rose-200 text-xs sm:text-sm 2xl:text-base font-display transition-colors cursor-pointer flex items-center gap-1.5 flex-shrink-0"
                title={$t.closeLobby}
                aria-label={$t.closeLobby || 'Close Lobby'}
            >
                <ArcadeIcon name="close" className="w-3.5 h-3.5 2xl:w-4 2xl:h-4" />
                <span class="hidden sm:inline">{$t.closeTag || 'CLOSE'}</span>
            </button>
        </div>
    </header>

    <!-- Prototype v5 3-Column Bento Grid -->
    <main class="lg:flex-1 lg:min-h-0 w-full grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3 2xl:gap-4 items-stretch">

        <!-- Left Column (3 cols): Scan to Join + Big Room Code -->
        <section class="lg:col-span-3 min-w-0 bg-[#100e22] border-2 border-cyan-500/70 cut-md p-3 sm:p-4 2xl:p-6 flex flex-col items-center justify-center text-center {!$tvMode ? 'shadow-[inset_0_0_32px_rgba(0,229,255,0.08)]' : ''}">
            <div
                bind:this={qrElement}
                class="flex items-center justify-center bg-white p-2 border-2 border-cyan-400 cut-sm w-36 h-36 sm:w-44 sm:h-44 xl:w-56 xl:h-56 2xl:w-72 2xl:h-72 aspect-square flex-shrink-0 overflow-hidden [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain {!$tvMode ? 'shadow-[0_0_24px_rgba(0,229,255,0.18)]' : ''}"
            ></div>

            <p class="mt-3 sm:mt-4 text-[11px] sm:text-xs 2xl:text-sm font-display text-slate-300 tracking-widest uppercase">
                {$t.scanToJoin || 'SCAN TO JOIN GAME'}
            </p>

            <span
                class="mt-1 font-display text-3xl sm:text-4xl xl:text-5xl 2xl:text-6xl text-amber-300 tracking-widest leading-none"
                data-testid="game-id"
            >
                {$gameState?.id || '----'}
            </span>

            <p class="mt-2 text-xs 2xl:text-sm font-mono font-bold text-cyan-300 break-all leading-tight px-1">
                {connectURL || '...'}
            </p>
        </section>

        <!-- Center Column (5 cols): Select Round Theme + 3 Mode Toggle Display Cards -->
        <section class="lg:col-span-5 min-w-0 bg-[#100e22] border-2 border-fuchsia-500/60 cut-md p-3 sm:p-4 2xl:p-6 flex flex-col justify-between gap-2.5 2xl:gap-4 lg:min-h-0 {!$tvMode ? 'shadow-[inset_0_0_36px_rgba(217,70,239,0.08)]' : ''}">
            <div class="flex-1 flex flex-col justify-between gap-2.5 2xl:gap-3.5 lg:min-h-0">
                <div class="flex items-center justify-between gap-2 flex-wrap">
                    <span class="font-display text-xs sm:text-sm 2xl:text-base text-cyan-300 tracking-widest uppercase">
                        // {$t.selectRoundTheme || 'SELECT ROUND THEME'}
                    </span>
                    <div class="flex items-center gap-1.5 flex-shrink-0">
                        <button
                            type="button"
                            class="cut-sm px-2.5 py-1 2xl:px-3.5 2xl:py-1.5 bg-[#0a0914] border border-[#332e59] hover:border-purple-400 text-slate-200 hover:text-purple-200 font-display text-xs 2xl:text-sm transition-colors cursor-pointer flex items-center gap-1"
                            on:click={handlePickRandomTheme}
                        >
                            <ArcadeIcon name="dice" className="w-3.5 h-3.5 2xl:w-4 2xl:h-4" />
                            <span>{$t.randomTheme || 'Random'}</span>
                        </button>
                        <button
                            type="button"
                            class="cut-sm px-2.5 py-1 2xl:px-3.5 2xl:py-1.5 bg-[#0a0914] border border-[#332e59] hover:border-cyan-400 text-slate-200 hover:text-cyan-200 font-display text-xs 2xl:text-sm transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                            on:click={handleReloadTopics}
                            disabled={$gameState?.isGeneratingThemes}
                        >
                            <ArcadeIcon name="refresh" className="w-3.5 h-3.5 2xl:w-4 2xl:h-4" />
                            <span>{$t.reloadThemes || 'Reload'}</span>
                        </button>
                    </div>
                </div>

                <!-- Vertical Stacked Themes + Unified Custom Theme Row (Option A: Equal-Height Flex Cards) -->
                <div class="flex-1 flex flex-col justify-center gap-2.5 2xl:gap-3.5">
                    {#each availableThemes.slice(0, 3) as themeOption}
                        {@const isActive = $gameState?.theme === themeOption}
                        <button
                            type="button"
                            class="cut-sm flex-1 w-full px-4 py-3 sm:py-3.5 2xl:px-5 2xl:py-5 border text-left transition-colors cursor-pointer flex items-center justify-between gap-2 {isActive
                                ? 'bg-emerald-950/45 border-2 border-emerald-400 text-white'
                                : 'bg-[#0a0914] border-[#332e59] text-slate-300 hover:border-cyan-400 hover:text-white'}"
                            on:click={() => handleSelectTheme(themeOption)}
                        >
                            <span class="font-sans font-bold text-xs sm:text-sm lg:text-lg 2xl:text-2xl leading-snug line-clamp-2">
                                {themeOption}
                            </span>
                        </button>
                    {:else}
                        <div class="flex flex-col gap-2" aria-live="polite">
                            <div class="cut-sm w-full px-3.5 py-2.5 border border-cyan-500/40 bg-[#0a0914] text-cyan-300 font-mono text-xs sm:text-sm flex items-center gap-2">
                                <ArcadeIcon name="sparkles" className="w-4 h-4 animate-pulse flex-shrink-0" />
                                <span>{$t.generatingThemes || 'Generating new themes...'}</span>
                            </div>
                            <div class="cut-sm w-full h-10 bg-[#0a0914]/70 border border-[#332e59]/70 animate-pulse"></div>
                            <div class="cut-sm w-full h-10 bg-[#0a0914]/50 border border-[#332e59]/50 animate-pulse"></div>
                        </div>
                    {/each}

                    {#if $gameState}
                        {@const hasCustomActive = Boolean($gameState.theme && !availableThemes.includes($gameState.theme))}
                        {#if hasCustomActive && !isThemeInputFocused}
                            <button
                                type="button"
                                class="cut-sm flex-1 w-full px-4 py-3 sm:py-3.5 2xl:px-5 2xl:py-5 bg-emerald-950/45 border-2 border-emerald-400 text-white text-left transition-colors cursor-pointer flex items-center justify-between gap-2.5"
                                on:click={focusCustomThemeInput}
                            >
                                <div class="flex items-center gap-2.5 2xl:gap-3.5 flex-1 min-w-0">
                                    <ArcadeIcon name="edit" className="w-4 h-4 2xl:w-5 2xl:h-5 flex-shrink-0 text-emerald-300" />
                                    <span class="font-sans font-bold text-xs sm:text-sm lg:text-lg 2xl:text-2xl leading-snug line-clamp-2">
                                        {$gameState.theme}
                                    </span>
                                </div>
                            </button>
                        {:else}
                            <div class="cut-sm flex-1 w-full px-4 py-3 sm:py-3.5 2xl:px-5 2xl:py-5 transition-colors flex items-center justify-between gap-2.5 {hasCustomActive
                                ? 'bg-emerald-950/45 border-2 border-emerald-400 text-white'
                                : 'bg-[#070610] border border-dashed border-[#433c78] focus-within:border-solid focus-within:border-cyan-400 text-slate-300'}">
                                <div class="flex items-center gap-2.5 2xl:gap-3.5 flex-1 min-w-0">
                                    <ArcadeIcon name="edit" className="w-4 h-4 2xl:w-5 2xl:h-5 flex-shrink-0 {hasCustomActive ? 'text-emerald-300' : 'text-cyan-400/80'}" />
                                    <input
                                        bind:this={customThemeInputEl}
                                        type="text"
                                        class="w-full bg-transparent text-left focus:outline-none font-sans font-bold text-xs sm:text-sm lg:text-lg 2xl:text-2xl leading-snug select-text placeholder:text-slate-500 {hasCustomActive ? 'text-white' : 'text-cyan-200'}"
                                        placeholder={$t.customTheme || 'Or enter a custom round theme...'}
                                        bind:value={hostCustomTheme}
                                        on:input={handleCustomThemeInput}
                                        on:focus={() => isThemeInputFocused = true}
                                        on:blur={() => isThemeInputFocused = false}
                                        maxlength="50"
                                    />
                                </div>
                            </div>
                        {/if}
                    {/if}
                </div>
            </div>

            <!-- 3 Chamfered Mode Indicator Cards -->
            <div class="flex flex-col gap-1.5 flex-shrink-0 pt-1">
                <span class="font-display text-xs sm:text-sm 2xl:text-base text-fuchsia-300 tracking-widest uppercase">
                    // {$t.gameModes || 'GAME MODES'}
                </span>
                <div class="grid grid-cols-3 gap-2 2xl:gap-3">
                    <div class="cut-sm p-2 sm:p-2.5 2xl:p-3.5 border text-center flex flex-col items-center justify-center gap-0.5 2xl:gap-1 {$gameState?.sillyMode ? 'bg-cyan-950/60 border-2 border-cyan-400 text-cyan-200' : 'bg-[#0a0914] border-[#332e59] text-slate-400'}">
                        <ArcadeIcon name="confetti" className="w-4 h-4 sm:w-5 sm:h-5 2xl:w-6 2xl:h-6 {$gameState?.sillyMode ? 'text-cyan-300' : 'text-slate-500'}" />
                        <span class="font-display text-[11px] sm:text-xs 2xl:text-sm tracking-wider uppercase leading-tight">
                            {$t.sillyMode} · {$gameState?.sillyMode ? ($t.modeOn || 'ON') : ($t.modeOff || 'OFF')}
                        </span>
                        <span class="text-[10px] 2xl:text-xs font-sans opacity-75 leading-tight hidden sm:block">
                            {$t.wackyPromptsDesc || 'Wacky Prompts'}
                        </span>
                    </div>

                    <div class="cut-sm p-2 sm:p-2.5 2xl:p-3.5 border text-center flex flex-col items-center justify-center gap-0.5 2xl:gap-1 {$gameState?.is18PlusMode ? 'bg-rose-950/60 border-2 border-rose-400 text-rose-200' : 'bg-[#0a0914] border-[#332e59] text-slate-400'}">
                        <ArcadeIcon name="shield18" className="w-4 h-4 sm:w-5 sm:h-5 2xl:w-6 2xl:h-6 {$gameState?.is18PlusMode ? 'text-rose-300' : 'text-slate-500'}" />
                        <span class="font-display text-[11px] sm:text-xs 2xl:text-sm tracking-wider uppercase leading-tight">
                            {$t.is18PlusMode} · {$gameState?.is18PlusMode ? ($t.modeOn || 'ON') : ($t.modeOff || 'OFF')}
                        </span>
                        <span class="text-[10px] 2xl:text-xs font-sans opacity-75 leading-tight hidden sm:block">
                            {$t.unfilteredDeckDesc || 'Unfiltered Deck'}
                        </span>
                    </div>

                    <div class="cut-sm p-2 sm:p-2.5 2xl:p-3.5 border text-center flex flex-col items-center justify-center gap-0.5 2xl:gap-1 {$gameState?.slowpokeMode ? 'bg-teal-950/60 border-2 border-teal-400 text-teal-200' : 'bg-[#0a0914] border-[#332e59] text-slate-400'}">
                        <ArcadeIcon name="hourglass" className="w-4 h-4 sm:w-5 sm:h-5 2xl:w-6 2xl:h-6 {$gameState?.slowpokeMode ? 'text-teal-300' : 'text-slate-500'}" />
                        <span class="font-display text-[11px] sm:text-xs 2xl:text-sm tracking-wider uppercase leading-tight">
                            {$t.slowpokeMode} · {$gameState?.slowpokeMode ? ($t.modeOn || 'ON') : ($t.modeOff || 'OFF')}
                        </span>
                        <span class="text-[10px] 2xl:text-xs font-sans opacity-75 leading-tight hidden sm:block">
                            {$t.slowTimerDesc || '+50% Timer'}
                        </span>
                    </div>
                </div>
            </div>
        </section>

        <!-- Right Column (4 cols): Fighters Roster + Host Start Hint -->
        <section class="lg:col-span-4 min-w-0 bg-[#100e22] border-2 border-emerald-400/70 cut-md p-3 sm:p-4 2xl:p-6 flex flex-col justify-between gap-2 2xl:gap-3.5 lg:min-h-0 {!$tvMode ? 'shadow-[inset_0_0_32px_rgba(16,185,129,0.08)]' : ''}">
            <div class="flex items-center justify-between gap-2 flex-shrink-0">
                <span class="font-display text-xs sm:text-sm 2xl:text-base text-emerald-400 tracking-widest uppercase">
                    // {$t.fighters || 'FIGHTERS'} ({totalPlayers} / {MAX_PLAYERS})
                </span>
                <span class="font-mono text-xs 2xl:text-sm text-slate-300 font-bold uppercase">
                    {connectedPlayersCount} {selectPluralForm(connectedPlayersCount, $language, { one: $t.ready || 'READY', few: $t.readyPlural || 'READY', many: $t.readyPlural || 'READY' })}
                </span>
            </div>

            <div class="lg:flex-1 lg:min-h-0 lg:overflow-y-auto pr-0.5">
                <div class="grid grid-cols-2 {isCompactRoster ? 'gap-1.5 2xl:gap-2.5' : 'gap-2.5 2xl:gap-3.5'}">
                    {#each playerList as p (p.id)}
                        {@const isAway = !p.socketId && p.isAway}
                        <div
                            class="cut-sm bg-[#0a0914] border {p.isHost ? 'border-amber-400/90' : (p.socketId ? 'border-emerald-500/60' : (isAway ? 'border-amber-400/60' : 'border-danger/60 opacity-60'))} {isCompactRoster ? 'px-2 py-1 2xl:px-3 2xl:py-2' : 'px-3 py-3 lg:py-3.5 2xl:px-4 2xl:py-5'} flex items-center justify-between gap-1.5 min-w-0"
                        >
                            <div class="flex items-center gap-2 2xl:gap-3 min-w-0">
                                <div class="{isCompactRoster ? 'w-7 h-7 2xl:w-10 2xl:h-10' : 'w-10 h-10 sm:w-11 sm:h-11 2xl:w-16 2xl:h-16'} flex-shrink-0">
                                    <PixelAvatar avatar={p.avatar} />
                                </div>
                                <div class="min-w-0 text-left">
                                    <p class="font-display {isCompactRoster ? 'text-xs 2xl:text-sm' : 'text-xs sm:text-base 2xl:text-xl'} text-white truncate leading-tight">
                                        {p.name}
                                    </p>
                                    <span class="font-display {isCompactRoster ? 'text-[9px] 2xl:text-[11px]' : 'text-[10px] 2xl:text-xs'} tracking-wider uppercase leading-none block mt-0.5 {p.isHost ? 'text-amber-300' : (p.socketId ? 'text-emerald-400' : (isAway ? 'text-amber-300' : 'text-danger'))}">
                                        {p.isHost ? ($t.host || 'HOST') : (p.socketId ? ($t.ready || 'READY') : (isAway ? ($t.awayStatus || 'AWAY') : ($t.disconnected || 'OFFLINE')))}
                                    </span>
                                </div>
                            </div>
                            {#if p.socketId}
                                <ArcadeIcon name="check" className="{isCompactRoster ? 'w-3.5 h-3.5 2xl:w-4 2xl:h-4' : 'w-4 h-4 2xl:w-5 2xl:h-5'} text-emerald-400 flex-shrink-0" />
                            {/if}
                        </div>
                    {/each}
                </div>
            </div>

            <div class="cut-sm py-2 px-3 2xl:py-3 2xl:px-4 bg-emerald-950/40 border border-emerald-400/80 text-center flex-shrink-0">
                <p class="text-xs sm:text-sm 2xl:text-base text-emerald-300 font-display tracking-widest uppercase truncate">
                    {totalPlayers < MIN_PLAYERS
                        ? ($t.waitingForPlayers || 'Waiting for players...')
                        : ($t.hostStartHint || 'HOST CAN PRESS START ON PHONE')}
                </p>
            </div>
        </section>
    </main>

    <FlyingReactionsOverlay />
</div>
