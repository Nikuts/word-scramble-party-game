<!-- src/lib/views/HostLobby.svelte -->
<script>
    import { t, language, sendMessage, gameState, tvMode, toggleTvMode, musicMuted, toggleMusicMuted } from '../../stores.js';
    import { selectPluralForm } from '../../ui_text.js';
    import qrcode from 'qrcode-generator';
    import PixelAvatar from '../shared/PixelAvatar.svelte';
    import ArcadeIcon from '../shared/ArcadeIcon.svelte';
    import HexBadge from '../shared/HexBadge.svelte';
    import FlyingReactionsOverlay from '../shared/FlyingReactionsOverlay.svelte';
    import { MAX_PLAYERS, MIN_PLAYERS } from '../config.js';

    let qrElement;
    let connectURL = '';
    let showOrientationHint = true;

    $: gameLang = $gameState?.language || ($language === 'ua' || $language === 'uk' ? 'uk' : 'en');
    $: availableThemes = $gameState?.preGeneratedThemes?.[gameLang]
        || $gameState?.preGeneratedThemes?.[$language]
        || $gameState?.preGeneratedThemes?.['en']
        || $gameState?.preGeneratedThemes?.['uk']
        || $gameState?.preGeneratedThemes?.['ua']
        || [];

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

    $: playerList = $gameState?.players || [];
    $: totalPlayers = playerList.length;
    $: connectedPlayersCount = playerList.filter(p => !!p.socketId).length;
    $: isCompactRoster = totalPlayers > 8;
</script>

<div class="h-full max-h-full lg:h-screen-safe lg:max-h-screen-safe w-full flex flex-col justify-start lg:justify-between p-2 sm:p-3 2xl:p-5 max-w-[min(98vw,210vh)] mx-auto safe-top safe-bottom relative select-none font-sans overflow-y-auto lg:overflow-hidden box-border host-lobby-container gap-2 2xl:gap-3.5">

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
        <div class="flex-1 min-w-0 min-h-[38px] sm:min-h-[42px] 2xl:min-h-[48px] cut-sm host-hud-surface border border-[color:rgba(var(--color-primary-rgb),0.65)] px-2.5 sm:px-4 2xl:px-5 py-1.5 sm:py-2 2xl:py-2.5 flex items-center justify-between gap-2">
            <span class="sm:hidden font-display text-xs text-emerald-400 tracking-widest uppercase truncate">
                {$t.lobbyTag || 'LOBBY'}
            </span>
            <span class="hidden sm:inline font-display text-xs sm:text-sm lg:text-base 2xl:text-lg text-slate-200 tracking-widest uppercase truncate">
                {$t.appName || 'WORD SCRAMBLE'}
            </span>
        </div>

        <HexBadge
            borderClass="text-amber-400/90"
            className="px-4 sm:px-7 2xl:px-8 py-1.5 sm:py-2 flex items-center justify-center flex-shrink-0"
        >
            <span class="font-display text-sm sm:text-xl 2xl:text-2xl text-amber-300 tracking-widest leading-none">
                #{$gameState?.id || '----'}
            </span>
        </HexBadge>

        <div class="flex-1 min-w-0 min-h-[38px] sm:min-h-[42px] 2xl:min-h-[48px] cut-sm host-hud-surface border border-[color:rgba(var(--color-secondary-rgb),0.65)] px-1.5 sm:px-3 lg:px-4 2xl:px-5 py-1.5 sm:py-2 2xl:py-2.5 flex items-center justify-between gap-1 sm:gap-2">
            <span class="hidden sm:inline font-display text-xs sm:text-sm lg:text-base 2xl:text-lg text-emerald-400 tracking-widest uppercase truncate">
                {$t.lobbyTag || 'LOBBY'}
            </span>
            <div class="flex items-center gap-1 sm:gap-1.5 flex-shrink-0 ml-auto">
                <button
                    type="button"
                    on:click={toggleTvMode}
                    class="cut-sm p-1.5 sm:px-2.5 sm:py-1 lg:px-3 2xl:px-3.5 2xl:py-1.5 host-card-surface border text-xs sm:text-sm 2xl:text-base font-display transition-colors flex items-center justify-center gap-1.5 cursor-pointer flex-shrink-0 {$tvMode ? 'border-primary text-primary' : 'border-[color:var(--color-surface-border)] text-slate-300 hover:text-white'}"
                    title={$t.tvModeDesc}
                    aria-label={$t.tvLowPowerMode || 'Toggle TV Mode'}
                >
                    <ArcadeIcon name="tv" className="w-3.5 h-3.5 2xl:w-4 2xl:h-4" />
                    <span class="hidden sm:inline">{$tvMode ? ($t.tvOn || 'TV ON') : ($t.tvOff || 'TV OFF')}</span>
                </button>
                <button
                    type="button"
                    on:click={toggleMusicMuted}
                    class="cut-sm p-1.5 sm:px-2.5 sm:py-1.5 2xl:px-3 2xl:py-1.5 host-card-surface border transition-colors flex items-center justify-center cursor-pointer flex-shrink-0 {$musicMuted ? 'border-[color:var(--color-surface-border)] text-slate-400 hover:text-white' : 'border-emerald-400/70 text-emerald-300 hover:text-emerald-200'}"
                    title={$musicMuted ? ($t.musicOff || 'Music Off') : ($t.musicOn || 'Music On')}
                    aria-label={$t.toggleMusic || 'Toggle music'}
                    aria-pressed={!$musicMuted}
                    data-testid="music-toggle-btn"
                >
                    <ArcadeIcon name={$musicMuted ? 'music-off' : 'music'} className="w-3.5 h-3.5 2xl:w-4 2xl:h-4" />
                </button>
                <button
                    type="button"
                    on:click={handleCloseLobby}
                    class="cut-sm p-1.5 lg:px-3 lg:py-1 2xl:px-3.5 2xl:py-1.5 bg-rose-950/35 border border-rose-500/45 hover:border-danger hover:bg-rose-950/80 text-rose-200 text-xs sm:text-sm 2xl:text-base font-display transition-colors cursor-pointer flex items-center justify-center gap-1.5 flex-shrink-0"
                    title={$t.closeLobby}
                    aria-label={$t.closeLobby || 'Close Lobby'}
                >
                    <ArcadeIcon name="close" className="w-3.5 h-3.5 2xl:w-4 2xl:h-4" />
                    <span class="hidden lg:inline">{$t.closeTag || 'CLOSE'}</span>
                </button>
            </div>
        </div>
    </header>

    <!-- Prototype v5 3-Column Bento Grid -->
    <main class="lg:flex-1 lg:min-h-0 w-full grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3 2xl:gap-4 items-stretch">

        <!-- Left Column (3 cols): Scan to Join + Big Room Code -->
        <section class="lg:col-span-3 min-w-0 host-panel-surface border-2 border-[color:rgba(var(--color-primary-rgb),0.75)] cut-md p-3 sm:p-4 2xl:p-6 flex flex-col items-center justify-center text-center {!$tvMode ? 'shadow-[inset_0_0_32px_rgba(var(--color-primary-rgb),0.12)]' : ''}">
            <div
                bind:this={qrElement}
                class="flex items-center justify-center bg-white p-2 2xl:p-3 border-2 border-[color:var(--color-primary)] cut-sm w-36 h-36 sm:w-44 sm:h-44 lg:w-[min(17vw,29vh)] lg:h-[min(17vw,29vh)] aspect-square flex-shrink-0 overflow-hidden [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain {!$tvMode ? 'shadow-[0_0_24px_rgba(var(--color-primary-rgb),0.26)]' : ''}"
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

            <p class="mt-2 text-xs 2xl:text-sm font-mono font-bold text-primary break-all leading-tight px-1">
                {connectURL || '...'}
            </p>
        </section>

        <!-- Center Column (5 cols): Read-Only Round Theme Showcase + 3 Mode Status Cards -->
        <section class="lg:col-span-5 min-w-0 host-panel-surface border-2 border-[color:rgba(var(--color-secondary-rgb),0.7)] cut-md p-3 sm:p-4 2xl:p-6 flex flex-col justify-between gap-2.5 2xl:gap-4 lg:min-h-0 {!$tvMode ? 'shadow-[inset_0_0_36px_rgba(var(--color-secondary-rgb),0.12)]' : ''}">
            <div class="flex-1 flex flex-col justify-between gap-2.5 2xl:gap-3.5 lg:min-h-0">
                <div class="flex items-center justify-between gap-2 flex-wrap">
                    <span class="font-display text-xs sm:text-sm 2xl:text-base text-cyan-300 tracking-widest uppercase">
                        // {$t.roundTheme || 'ROUND THEME'}
                    </span>
                    <span class="font-mono text-[11px] sm:text-xs 2xl:text-sm text-slate-400 font-bold uppercase tracking-wider">
                        {$t.hostPicksOnDevice || 'HOST PICKS ON DEVICE'}
                    </span>
                </div>

                <!-- Read-Only Stacked Themes + 4th Custom Theme Showcase Card -->
                <div class="flex-1 flex flex-col justify-center gap-2.5 2xl:gap-3.5" aria-live="polite">
                    {#if $gameState?.isGeneratingThemes || availableThemes.length === 0}
                        <div class="cut-sm flex-1 w-full px-4 py-3 sm:py-3.5 2xl:px-5 2xl:py-5 border border-cyan-500/45 bg-[#0a0914] text-cyan-300 font-mono text-xs sm:text-sm lg:text-base 2xl:text-xl flex items-center gap-2.5">
                            <ArcadeIcon name="sparkles" className="w-4 h-4 sm:w-5 sm:h-5 2xl:w-6 2xl:h-6 animate-pulse flex-shrink-0" />
                            <span>{$t.generatingThemes || 'Generating new themes...'}</span>
                        </div>
                        <div class="cut-sm flex-1 w-full px-4 py-3 sm:py-3.5 2xl:px-5 2xl:py-5 border border-[#332e59]/70 bg-[#0a0914]/75 flex items-center">
                            <div class="h-3.5 sm:h-4 2xl:h-6 w-3/5 bg-[#231f42] rounded-sm animate-pulse"></div>
                        </div>
                        <div class="cut-sm flex-1 w-full px-4 py-3 sm:py-3.5 2xl:px-5 2xl:py-5 border border-[#332e59]/55 bg-[#0a0914]/60 flex items-center">
                            <div class="h-3.5 sm:h-4 2xl:h-6 w-2/5 bg-[#1e1a3a] rounded-sm animate-pulse"></div>
                        </div>
                    {:else}
                        {#each availableThemes.slice(0, 3) as themeOption}
                            {@const isActive = $gameState?.theme === themeOption}
                            <div
                                class="cut-sm flex-1 w-full px-4 py-3 sm:py-3.5 2xl:px-5 2xl:py-5 border text-left transition-colors flex items-center justify-between gap-3 {isActive
                                    ? 'bg-emerald-950/45 border-2 border-emerald-400 text-white'
                                    : 'bg-[#0a0914] border-[#332e59] text-slate-300'}"
                            >
                                <span class="font-sans font-bold text-xs sm:text-sm lg:text-lg 2xl:text-2xl leading-snug line-clamp-2">
                                    {themeOption}
                                </span>
                                {#if isActive}
                                    <span class="cut-sm px-2.5 py-0.5 2xl:px-3 2xl:py-1 bg-emerald-400/20 border border-emerald-400 text-emerald-300 font-display text-[10px] sm:text-xs 2xl:text-sm tracking-widest uppercase flex-shrink-0">
                                        {$t.active || 'ACTIVE'}
                                    </span>
                                {/if}
                            </div>
                        {/each}
                    {/if}

                    {#if $gameState}
                        {@const hasCustomActive = Boolean($gameState.theme && !availableThemes.includes($gameState.theme))}
                        <div
                            class="cut-sm flex-1 w-full px-4 py-3 sm:py-3.5 2xl:px-5 2xl:py-5 transition-colors flex items-center justify-between gap-3 {hasCustomActive
                                ? 'bg-emerald-950/45 border-2 border-emerald-400 text-white'
                                : 'bg-[#070610] border border-dashed border-[#433c78] text-slate-400'}"
                        >
                            <div class="flex items-center gap-2.5 2xl:gap-3.5 flex-1 min-w-0">
                                <ArcadeIcon name="edit" className="w-4 h-4 2xl:w-5 2xl:h-5 flex-shrink-0 {hasCustomActive ? 'text-emerald-300' : 'text-cyan-400/70'}" />
                                <span class="font-sans font-bold text-xs sm:text-sm lg:text-lg 2xl:text-2xl leading-snug line-clamp-2 {hasCustomActive ? 'text-white' : 'text-slate-500'}">
                                    {hasCustomActive ? $gameState.theme : ($t.customThemeHostHint || 'Custom theme (Host device)')}
                                </span>
                            </div>
                            {#if hasCustomActive}
                                <span class="cut-sm px-2.5 py-0.5 2xl:px-3 2xl:py-1 bg-emerald-400/20 border border-emerald-400 text-emerald-300 font-display text-[10px] sm:text-xs 2xl:text-sm tracking-widest uppercase flex-shrink-0">
                                    {$t.active || 'ACTIVE'}
                                </span>
                            {/if}
                        </div>
                    {/if}
                </div>
            </div>

            <!-- 3 Chamfered Mode Indicator Cards -->
            <div class="flex flex-col gap-1.5 flex-shrink-0 pt-1">
                <span class="font-display text-xs sm:text-sm 2xl:text-base text-fuchsia-300 tracking-widest uppercase">
                    // {$t.gameModes || 'GAME MODES'}
                </span>
                <div class="grid grid-cols-3 gap-2 2xl:gap-3">
                    <div class="cut-sm p-2 sm:p-2.5 2xl:p-3.5 border text-center flex flex-col items-center justify-center gap-1 {$gameState?.sillyMode ? 'bg-cyan-950/60 border-2 border-cyan-400 text-cyan-200' : 'bg-[#0a0914] border-[#332e59] text-slate-400'}">
                        <ArcadeIcon name="confetti" className="w-4 h-4 sm:w-5 sm:h-5 2xl:w-6 2xl:h-6 {$gameState?.sillyMode ? 'text-cyan-300' : 'text-slate-500'}" />
                        <span class="font-display text-[11px] sm:text-xs 2xl:text-sm tracking-wider uppercase leading-tight">
                            {$t.sillyMode}
                        </span>
                        <span class="cut-sm px-2 py-0.5 text-[10px] 2xl:text-xs font-display font-bold uppercase tracking-widest border {$gameState?.sillyMode ? 'bg-cyan-400/20 border-cyan-400/80 text-cyan-200' : 'bg-[#131126] border-[#332e59] text-slate-400'}">
                            {$gameState?.sillyMode ? ($t.modeOn || 'ON') : ($t.modeOff || 'OFF')}
                        </span>
                        <span class="text-[10px] 2xl:text-xs font-sans opacity-75 leading-tight hidden sm:block">
                            {$t.wackyPromptsDesc || 'Wacky Prompts'}
                        </span>
                    </div>

                    <div class="cut-sm p-2 sm:p-2.5 2xl:p-3.5 border text-center flex flex-col items-center justify-center gap-1 {$gameState?.is18PlusMode ? 'bg-rose-950/60 border-2 border-rose-400 text-rose-200' : 'bg-[#0a0914] border-[#332e59] text-slate-400'}">
                        <ArcadeIcon name="shield18" className="w-4 h-4 sm:w-5 sm:h-5 2xl:w-6 2xl:h-6 {$gameState?.is18PlusMode ? 'text-rose-300' : 'text-slate-500'}" />
                        <span class="font-display text-[11px] sm:text-xs 2xl:text-sm tracking-wider uppercase leading-tight">
                            {$t.is18PlusMode}
                        </span>
                        <span class="cut-sm px-2 py-0.5 text-[10px] 2xl:text-xs font-display font-bold uppercase tracking-widest border {$gameState?.is18PlusMode ? 'bg-rose-400/20 border-rose-400/80 text-rose-200' : 'bg-[#131126] border-[#332e59] text-slate-400'}">
                            {$gameState?.is18PlusMode ? ($t.modeOn || 'ON') : ($t.modeOff || 'OFF')}
                        </span>
                        <span class="text-[10px] 2xl:text-xs font-sans opacity-75 leading-tight hidden sm:block">
                            {$t.unfilteredDeckDesc || 'Unfiltered Deck'}
                        </span>
                    </div>

                    <div class="cut-sm p-2 sm:p-2.5 2xl:p-3.5 border text-center flex flex-col items-center justify-center gap-1 {$gameState?.slowpokeMode ? 'bg-teal-950/60 border-2 border-teal-400 text-teal-200' : 'bg-[#0a0914] border-[#332e59] text-slate-400'}">
                        <ArcadeIcon name="hourglass" className="w-4 h-4 sm:w-5 sm:h-5 2xl:w-6 2xl:h-6 {$gameState?.slowpokeMode ? 'text-teal-300' : 'text-slate-500'}" />
                        <span class="font-display text-[11px] sm:text-xs 2xl:text-sm tracking-wider uppercase leading-tight">
                            {$t.slowpokeMode}
                        </span>
                        <span class="cut-sm px-2 py-0.5 text-[10px] 2xl:text-xs font-display font-bold uppercase tracking-widest border {$gameState?.slowpokeMode ? 'bg-teal-400/20 border-teal-400/80 text-teal-200' : 'bg-[#131126] border-[#332e59] text-slate-400'}">
                            {$gameState?.slowpokeMode ? ($t.modeOn || 'ON') : ($t.modeOff || 'OFF')}
                        </span>
                        <span class="text-[10px] 2xl:text-xs font-sans opacity-75 leading-tight hidden sm:block">
                            {$t.slowTimerDesc || 'More Time'}
                        </span>
                    </div>
                </div>
            </div>
        </section>

        <!-- Right Column (4 cols): Fighters Roster + Host Start Hint -->
        <section class="lg:col-span-4 min-w-0 host-panel-surface border-2 border-[color:rgba(var(--color-accent-rgb),0.72)] cut-md p-3 sm:p-4 2xl:p-6 flex flex-col justify-between gap-2 2xl:gap-3.5 lg:min-h-0 {!$tvMode ? 'shadow-[inset_0_0_32px_rgba(var(--color-accent-rgb),0.1)]' : ''}">
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
                <p class="text-xs sm:text-sm 2xl:text-base text-emerald-300 font-display tracking-widest uppercase leading-snug">
                    {totalPlayers < MIN_PLAYERS
                        ? ($t.waitingForPlayers || 'Waiting for players...')
                        : ($t.hostStartHint || 'HOST CAN PRESS START ON PHONE')}
                </p>
            </div>
        </section>
    </main>

    <FlyingReactionsOverlay />
</div>
