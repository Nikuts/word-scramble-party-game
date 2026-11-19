<!-- src/lib/views/PlayerLobby.svelte -->
<script>
    import { createEventDispatcher, onDestroy } from 'svelte';
    import { t, language, sendMessage, gameState, error, currentPlayerDetails, tvMode, toggleTvMode, sendReaction } from '../../stores.js';
    import { MIN_PLAYERS, MAX_PLAYERS } from '../config.js';
    import PixelAvatar from '../shared/PixelAvatar.svelte';
    import ArcadeIcon from '../shared/ArcadeIcon.svelte';
    import FlyingReactionsOverlay from '../shared/FlyingReactionsOverlay.svelte';

    const dispatch = createEventDispatcher();

    $: game = $gameState;
    $: player = $currentPlayerDetails;
    $: isHost = player?.isHost;
    $: isUkrainian = $language === 'ua' || $language === 'uk';

    let customTheme = '';
    let isInputFocused = false;

    $: gameLang = game?.language || ($language === 'ua' || $language === 'uk' ? 'uk' : 'en');
    $: availableThemes = game?.preGeneratedThemes?.[gameLang]
        || game?.preGeneratedThemes?.[$language]
        || game?.preGeneratedThemes?.['en']
        || game?.preGeneratedThemes?.['uk']
        || game?.preGeneratedThemes?.['ua']
        || [];

    $: {
        if (game?.isGeneratingThemes && !isInputFocused) {
            customTheme = '';
        } else if (!isInputFocused) {
            const currentTheme = game?.theme || '';
            const isPreset = availableThemes.includes(currentTheme);
            const targetCustom = isPreset ? '' : currentTheme;
            if (customTheme !== targetCustom) {
                customTheme = targetCustom;
            }
        }
    }

    $: connectedPlayers = (game?.players || []).filter(p => p.socketId);
    $: connectedPlayerCount = connectedPlayers.length;
    $: isApiDisabled = game ? game.geminiApiErrorCount >= 3 : false;
    $: canStart = connectedPlayerCount >= MIN_PLAYERS && connectedPlayerCount <= MAX_PLAYERS && (game?.theme || isApiDisabled);

    let playerCountMessage = '';
    $: {
        if (connectedPlayerCount < MIN_PLAYERS) {
            playerCountMessage = $t.notEnoughPlayers;
        } else if (connectedPlayerCount > MAX_PLAYERS) {
            playerCountMessage = $t.tooManyPlayers;
        } else {
            playerCountMessage = '';
        }
    }

    let canSendEmoji = true;
    function sendAvatarReaction() {
        if (!canSendEmoji || !game) return;
        sendReaction('avatar');
        canSendEmoji = false;
        setTimeout(() => { canSendEmoji = true; }, 450);
    }

    let themeDebounceTimer = null;
    onDestroy(() => {
        if (themeDebounceTimer) clearTimeout(themeDebounceTimer);
    });

    function handleThemeInput(e) {
        if (!game) return;
        const gameId = game.id;
        customTheme = e.target.value;
        if (themeDebounceTimer) clearTimeout(themeDebounceTimer);
        const trimmed = customTheme.trim();
        themeDebounceTimer = setTimeout(() => {
            sendMessage('set-theme', { gameId, theme: trimmed });
        }, 250);
    }

    function handleThemeClick(theme) {
        if (!game) return;
        if (themeDebounceTimer) clearTimeout(themeDebounceTimer);
        customTheme = '';
        sendMessage('set-theme', { gameId: game.id, theme: theme });
    }

    function handleColorThemeClick(theme) {
        if (!game) return;
        sendMessage('set-color-theme', { gameId: game.id, theme: theme });
    }

    function handleReloadThemes() {
        if (game && !game.isGeneratingThemes && !isApiDisabled) {
            sendMessage('reload-themes', { gameId: game.id });
        }
    }

    function handleToggleSilly() {
        if (!game) return;
        sendMessage('set-silly-mode', { gameId: game.id, sillyMode: !game.sillyMode });
    }

    function handleToggle18Plus() {
        if (!game) return;
        sendMessage('set-18plus-mode', { gameId: game.id, is18PlusMode: !game.is18PlusMode });
    }

    function handleToggleSlowpoke() {
        if (!game) return;
        sendMessage('set-slowpoke-mode', { gameId: game.id, slowpokeMode: !game.slowpokeMode });
    }

    function handleStartGame() {
        if (canStart && game) {
            sendMessage('start-game', { gameId: game.id, loading: true });
        }
    }
</script>

<div class="w-full h-screen-safe max-h-screen-safe min-h-0 flex flex-col justify-between p-3 sm:p-4 max-w-md md:max-w-4xl mx-auto safe-top safe-bottom select-none font-sans overflow-hidden box-border">
    
    <!-- Top Player HUD Card -->
    <header class="bg-[#131126] border-2 border-[#332e59] cut-md px-3.5 py-2 mb-2.5 flex items-center justify-between gap-3 flex-shrink-0">
        <div class="flex items-center gap-3 min-w-0">
            <div class="w-11 h-11 sm:w-12 sm:h-12 cut-sm bg-[#0a0914] border-2 border-cyan-400 p-1 flex items-center justify-center flex-shrink-0">
                {#if player?.avatar}
                    <PixelAvatar avatar={player.avatar} className="w-full h-full" />
                {/if}
            </div>

            <div class="text-left min-w-0">
                <div class="flex items-center gap-1.5">
                    <span class="font-display text-sm sm:text-base text-white truncate">{player?.name || ($t.player || 'Player')}</span>
                    {#if isHost}
                        <span class="cut-sm px-1.5 py-0.5 bg-amber-400 text-black text-[9px] font-display flex-shrink-0">{$t.host || 'HOST'}</span>
                    {/if}
                </div>
                <button
                    type="button"
                    on:click={() => dispatch('reselectAvatar')}
                    class="text-[11px] font-display text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 cursor-pointer mt-0.5"
                >
                    <ArcadeIcon name="edit" className="w-3 h-3" />
                    <span>{$t.editProfile || 'Edit Profile'}</span>
                </button>
            </div>
        </div>

        <div class="bg-[#0a0914] border border-[#332e59] cut-sm px-3 py-1 text-right flex-shrink-0">
            <span class="text-[9px] font-display text-slate-400 block uppercase">{$t.roomTag || 'ROOM'}</span>
            <span class="font-mono font-extrabold text-sm sm:text-base text-amber-300">#{game?.id || '----'}</span>
        </div>
    </header>

    {#if $error.message && !$error.fatal}
        <div class="mb-2 p-2.5 cut-sm bg-rose-950/90 border border-danger text-rose-200 text-xs font-bold text-center flex-shrink-0">
            {$error.message}
        </div>
    {/if}

    <!-- Adaptive Content Area: Stacked on Phone, 2 Columns on Tablet/PC -->
    <main class="flex-1 min-h-0 overflow-y-auto pr-0.5">
        <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
            <!-- Left / Top: Host Controls OR Guest Room Info -->
            <div class="md:col-span-7 space-y-3">
                {#if isHost}
                    <div class="bg-[#131126] border-2 border-amber-400/70 cut-md p-3.5 space-y-3">
                        <div class="flex items-center justify-between border-b border-[#332e59] pb-1.5">
                            <span class="text-xs font-display text-amber-300 uppercase tracking-wider inline-flex items-center gap-1.5">
                                <ArcadeIcon name="crown" className="w-3.5 h-3.5" />
                                <span>{$t.youAreTheHost || 'You are the Host!'}</span>
                            </span>
                            <span class="text-[11px] font-mono text-slate-400 font-bold">{connectedPlayerCount} / {MAX_PLAYERS} {$t.players || 'Players'}</span>
                        </div>

                        <!-- 1. Color Theme -->
                        <div>
                            <span class="text-[11px] font-display text-slate-300 uppercase inline-flex items-center gap-1 mb-1">
                                <ArcadeIcon name="palette" className="w-3.5 h-3.5 text-primary" />
                                <span>{$t.colorTheme || 'COLOR THEME'}:</span>
                            </span>
                            <div class="grid grid-cols-3 gap-1.5">
                                {#each ['arcade', 'vaporwave', 'outrun'] as themeName}
                                    <button
                                        type="button"
                                        on:click={() => handleColorThemeClick(themeName)}
                                        class="cut-sm py-1.5 px-1 text-center uppercase font-display text-[11px] tracking-tight border-2 transition-colors flex items-center justify-center cursor-pointer {
                                            game?.colorTheme === themeName
                                            ? 'bg-white text-black border-white'
                                            : 'bg-[#0a0914] border-[#332e59] text-slate-300 hover:border-slate-500'
                                        }"
                                    >
                                        <span>{themeName}</span>
                                    </button>
                                {/each}
                            </div>
                        </div>

                        <!-- 2. Game Theme Selection + Reload -->
                        <div>
                            <div class="flex items-center justify-between gap-2 mb-1.5">
                                <span class="text-[11px] font-display text-slate-300 uppercase">
                                    {$t.theme || 'THEME'}:
                                </span>
                                <button
                                    type="button"
                                    on:click={handleReloadThemes}
                                    disabled={isApiDisabled || game?.isGeneratingThemes}
                                    class="cut-sm border border-amber-400/70 hover:bg-amber-400 hover:text-black text-amber-300 px-2.5 py-0.5 text-[10px] font-display uppercase tracking-wider transition-colors whitespace-nowrap flex-shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
                                >
                                    <ArcadeIcon name="refresh" className="w-3 h-3" />
                                    <span>{$t.reloadThemes || 'Reload Themes'}</span>
                                </button>
                            </div>

                            {#if game?.isGeneratingThemes}
                                <div class="p-2.5 cut-sm bg-[#0a0914] border border-amber-400/50 text-center">
                                    <p class="text-amber-300 text-xs font-display animate-pulse">{$t.generatingThemes || 'Generating themes...'}</p>
                                </div>
                            {:else}
                                <div class="space-y-1.5">
                                    {#each availableThemes as th}
                                        <button
                                            type="button"
                                            on:click={() => handleThemeClick(th)}
                                            disabled={isApiDisabled}
                                            class="theme-card cut-sm w-full text-left px-3 py-2 text-xs sm:text-sm font-sans font-bold border-2 transition-colors cursor-pointer {
                                                game?.theme === th && !customTheme
                                                ? 'bg-amber-400/20 border-amber-400 text-amber-200'
                                                : 'bg-[#0a0914] border-[#332e59] text-slate-200 hover:border-slate-500'
                                            } disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {th}
                                        </button>
                                    {/each}
                                </div>
                            {/if}
                        </div>

                        <!-- 3. Custom Theme Input -->
                        <div>
                            <span class="text-[11px] font-display text-slate-300 uppercase block mb-1">
                                {$t.customTheme || 'OR ENTER CUSTOM THEME'}:
                            </span>
                            <div class="relative select-text">
                                <input
                                    type="text"
                                    bind:value={customTheme}
                                    on:input={handleThemeInput}
                                    on:focus={() => isInputFocused = true}
                                    on:blur={() => isInputFocused = false}
                                    placeholder={$t.customTheme || 'Custom Theme...'}
                                    class="w-full cut-sm bg-[#070610] border-2 border-[#332e59] focus:border-amber-400 text-white font-sans text-xs sm:text-sm px-3 py-2 focus:outline-none select-text"
                                    maxlength="50"
                                />
                                {#if customTheme}
                                    <button
                                        type="button"
                                        on:click={() => {
                                            customTheme = '';
                                            sendMessage('set-theme', { gameId: game.id, theme: '' });
                                        }}
                                        class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
                                        aria-label={$t.clear || 'Clear'}
                                    >
                                        <ArcadeIcon name="close" className="w-3.5 h-3.5" />
                                    </button>
                                {/if}
                            </div>
                        </div>

                        <!-- 4. Game Modes (3 Pills) + Synced TV Low-Power Toggle -->
                        <div>
                            <span class="text-[11px] font-display text-slate-300 uppercase block mb-1">
                                {$t.gameModes || 'GAME MODES'}:
                            </span>

                            <div class="grid grid-cols-3 gap-1.5 mb-2">
                                <button
                                    type="button"
                                    on:click={handleToggleSilly}
                                    class="cut-sm p-2 border-2 transition-colors flex flex-col items-center justify-center text-center cursor-pointer min-w-0 {
                                        game?.sillyMode
                                        ? 'bg-purple-950/90 border-purple-400 text-purple-200'
                                        : 'bg-[#0a0914] border-[#332e59] text-slate-400 hover:border-slate-500'
                                    }"
                                >
                                    <ArcadeIcon name="smile" className="w-4 h-4 mb-0.5" />
                                    <span class="font-display text-[10px] sm:text-xs uppercase leading-tight break-words w-full">{$t.sillyMode || 'Silly'}</span>
                                    <span class="text-[9px] font-mono font-bold mt-0.5 {game?.sillyMode ? 'text-purple-300' : 'text-slate-500'}">{game?.sillyMode ? ($t.modeOn || 'ON') : ($t.modeOff || 'OFF')}</span>
                                </button>

                                <button
                                    type="button"
                                    on:click={handleToggle18Plus}
                                    class="cut-sm p-2 border-2 transition-colors flex flex-col items-center justify-center text-center cursor-pointer min-w-0 {
                                        game?.is18PlusMode
                                        ? 'bg-rose-950/90 border-danger text-rose-200'
                                        : 'bg-[#0a0914] border-[#332e59] text-slate-400 hover:border-slate-500'
                                    }"
                                >
                                    <ArcadeIcon name="flame" className="w-4 h-4 mb-0.5" />
                                    <span class="font-display text-[10px] sm:text-xs uppercase leading-tight break-words w-full">{$t.is18PlusMode || '18+'}</span>
                                    <span class="text-[9px] font-mono font-bold mt-0.5 {game?.is18PlusMode ? 'text-rose-300' : 'text-slate-500'}">{game?.is18PlusMode ? ($t.modeOn || 'ON') : ($t.modeOff || 'OFF')}</span>
                                </button>

                                <button
                                    type="button"
                                    on:click={handleToggleSlowpoke}
                                    class="cut-sm p-2 border-2 transition-colors flex flex-col items-center justify-center text-center cursor-pointer min-w-0 {
                                        game?.slowpokeMode
                                        ? 'bg-cyan-950/90 border-cyan-400 text-cyan-200'
                                        : 'bg-[#0a0914] border-[#332e59] text-slate-400 hover:border-slate-500'
                                    }"
                                >
                                    <ArcadeIcon name="snail" className="w-4 h-4 mb-0.5" />
                                    <span class="font-display text-[10px] sm:text-xs uppercase leading-tight break-words w-full">{$t.slowpokeMode || 'Slowpoke'}</span>
                                    <span class="text-[9px] font-mono font-bold mt-0.5 {game?.slowpokeMode ? 'text-cyan-300' : 'text-slate-500'}">{game?.slowpokeMode ? ($t.modeOn || 'ON') : ($t.modeOff || 'OFF')}</span>
                                </button>
                            </div>

                            <!-- Synced TV Low-Power Control -->
                            <button
                                type="button"
                                on:click={toggleTvMode}
                                class="cut-sm w-full px-3 py-2 border-2 transition-colors flex items-center justify-between cursor-pointer {
                                    $tvMode
                                    ? 'bg-cyan-950/70 border-primary text-primary'
                                    : 'bg-[#0a0914] border-[#332e59] text-slate-300 hover:border-slate-500'
                                }"
                                title={$t.tvModeDesc}
                            >
                                <span class="font-display text-xs uppercase inline-flex items-center gap-1.5">
                                    <ArcadeIcon name="tv" className="w-4 h-4" />
                                    <span>{$t.tvLowPowerMode || $t.tvMode || 'TV Low-Power Mode'}</span>
                                </span>
                                <span class="font-mono text-xs font-extrabold px-2 py-0.5 cut-sm {$tvMode ? 'bg-primary text-black' : 'bg-neutral-800 text-slate-400'}">
                                    {$tvMode ? ($t.modeOn || 'ON') : ($t.modeOff || 'OFF')}
                                </span>
                            </button>
                        </div>

                        <!-- Start Game Button -->
                        <button
                            type="button"
                            on:click={handleStartGame}
                            disabled={!canStart}
                            class="btn-arcade w-full py-3.5 text-sm sm:text-base"
                            style="--btn-color: var(--color-warning);"
                        >
                            <ArcadeIcon name="bolt" className="w-5 h-5" />
                            <span>{$t.startGame || 'START GAME'}</span>
                        </button>
                        {#if !canStart}
                            <p class="text-center text-amber-300 font-display text-xs">
                                {!game?.theme && !isApiDisabled ? $t.themeNotSet : playerCountMessage}
                            </p>
                        {/if}
                    </div>
                {:else}
                    <!-- Guest Room Card with All Active Modes & Theme -->
                    <div class="bg-[#131126] border-2 border-[#332e59] cut-md p-2.5 text-center space-y-1.5">
                        <div class="flex items-center justify-center gap-1.5 flex-wrap">
                            <span class="text-[10px] font-display text-slate-400 uppercase tracking-widest">
                                {$t.chosenTheme || 'CHOSEN THEME'}:
                            </span>
                            <span class="font-display text-xs sm:text-sm text-cyan-300 leading-tight">
                                {game?.theme || ($t.waitingForTheme || '...')}
                            </span>
                        </div>
                        <div class="grid grid-cols-3 gap-1 pt-1.5 border-t border-[#332e59]">
                            <div class="cut-sm px-1 py-1 border flex flex-col items-center justify-center text-center min-w-0 {game?.sillyMode ? 'bg-purple-900/80 border-purple-400 text-purple-200' : 'bg-[#0a0914] border-[#332e59] text-slate-400'}">
                                <span class="font-display text-[9px] sm:text-[10px] uppercase leading-tight break-words w-full">{$t.sillyMode}</span>
                                <span class="font-mono text-[9px] font-extrabold mt-0.5 leading-none {game?.sillyMode ? 'text-purple-300' : 'text-slate-500'}">{game?.sillyMode ? ($t.modeOn || 'ON') : ($t.modeOff || 'OFF')}</span>
                            </div>
                            <div class="cut-sm px-1 py-1 border flex flex-col items-center justify-center text-center min-w-0 {game?.is18PlusMode ? 'bg-rose-900/80 border-danger text-rose-200' : 'bg-[#0a0914] border-[#332e59] text-slate-400'}">
                                <span class="font-display text-[9px] sm:text-[10px] uppercase leading-tight break-words w-full">{$t.is18PlusMode}</span>
                                <span class="font-mono text-[9px] font-extrabold mt-0.5 leading-none {game?.is18PlusMode ? 'text-rose-300' : 'text-slate-500'}">{game?.is18PlusMode ? ($t.modeOn || 'ON') : ($t.modeOff || 'OFF')}</span>
                            </div>
                            <div class="cut-sm px-1 py-1 border flex flex-col items-center justify-center text-center min-w-0 {game?.slowpokeMode ? 'bg-teal-900/80 border-teal-400 text-teal-200' : 'bg-[#0a0914] border-[#332e59] text-slate-400'}">
                                <span class="font-display text-[9px] sm:text-[10px] uppercase leading-tight break-words w-full">{$t.slowpokeMode}</span>
                                <span class="font-mono text-[9px] font-extrabold mt-0.5 leading-none {game?.slowpokeMode ? 'text-teal-300' : 'text-slate-500'}">{game?.slowpokeMode ? ($t.modeOn || 'ON') : ($t.modeOff || 'OFF')}</span>
                            </div>
                        </div>
                    </div>
                {/if}
            </div>

            <!-- Right / Bottom: Connected Players List -->
            <div class="md:col-span-5 bg-[#131126] border-2 border-[#332e59] cut-md p-3">
                <div class="flex items-center justify-between gap-2 mb-2">
                    <span class="text-[11px] font-display uppercase tracking-wider text-slate-400 truncate">
                        {$t.connectedPlayers || 'PLAYERS IN LOBBY'} ({game?.players?.length || 0})
                    </span>
                    <span class="text-[11px] font-mono text-emerald-400 font-bold flex-shrink-0">
                        {connectedPlayerCount} / {MAX_PLAYERS}
                    </span>
                </div>

                <div class="grid {(game?.players?.length || 0) > 6 ? 'grid-cols-2 gap-1.5' : 'grid-cols-1 gap-1.5'}">
                    {#each game?.players || [] as p (p.id)}
                        {@const isCurrent = p.id === player?.id}
                        {@const isAway = !p.socketId && p.isAway}
                        <div class="cut-sm flex items-center justify-between bg-[#0a0914] border {isCurrent ? 'border-cyan-400' : 'border-[#332e59]'} {(game?.players?.length || 0) > 6 ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs'} {!p.socketId && !isAway ? 'opacity-55' : 'opacity-100'}">
                            <div class="flex items-center gap-2 min-w-0">
                                <div class="w-6 h-6 sm:w-7 sm:h-7 flex-shrink-0">
                                    <PixelAvatar avatar={p.avatar} className="w-full h-full" />
                                </div>
                                <span class="font-display text-slate-200 truncate {isCurrent ? 'text-cyan-300' : ''}">
                                    {p.name}
                                </span>
                                {#if p.isHost}
                                    <span class="cut-sm px-1.5 py-0.5 bg-amber-400 text-black font-display text-[9px] leading-none flex-shrink-0 uppercase">
                                        {$t.host || 'HOST'}
                                    </span>
                                {/if}
                            </div>
                            {#if p.socketId}
                                <span class="w-5 h-5 cut-sm bg-emerald-950 border border-emerald-400 text-emerald-300 flex items-center justify-center flex-shrink-0">
                                    <ArcadeIcon name="check" className="w-3 h-3" />
                                </span>
                            {:else if isAway}
                                <span class="px-1.5 py-0.5 cut-sm bg-amber-950 border border-amber-400 text-amber-200 text-[9px] font-display flex-shrink-0">
                                    {$t.awayStatus || 'AWAY'}
                                </span>
                            {:else}
                                <span class="px-1.5 py-0.5 cut-sm bg-rose-950 border border-danger text-rose-200 text-[9px] font-display flex-shrink-0">
                                    {$t.disconnected || 'OFF'}
                                </span>
                            {/if}
                        </div>
                    {/each}
                </div>
            </div>
        </div>
    </main>

    <!-- Docked Bottom Bar: Prominent Avatar Reaction Button (+ Guest Status Note) -->
    <footer class="mt-2 pt-2 border-t border-[#332e59] flex-shrink-0 flex flex-col gap-1.5">
        {#if !isHost}
            <div class="w-full py-1.5 px-3 cut-sm bg-[#0a0914] border border-[#332e59] text-slate-300 font-display text-[11px] tracking-wider uppercase text-center">
                {$t.waitingForHostToStart || $t.waitingForHost || 'WAITING FOR THE HOST TO START THE GAME...'}
            </div>
        {/if}

        <button
            type="button"
            data-testid="send-reaction-btn"
            on:click={sendAvatarReaction}
            class="cut-sm w-full py-2 px-4 bg-[#1c1936] hover:bg-cyan-950/80 border-2 border-cyan-400 text-cyan-200 flex items-center justify-center gap-2.5 cursor-pointer transition-colors active:scale-98"
            title={$t.sendAvatarReaction || $t.sendReaction || 'Send Avatar Reaction'}
            aria-label={$t.sendReaction || 'Send Reaction'}
        >
            {#if player?.avatar}
                <div class="w-7 h-7 flex-shrink-0">
                    <PixelAvatar avatar={player.avatar} className="w-full h-full" />
                </div>
            {/if}
            <span class="font-display text-xs sm:text-sm uppercase tracking-wider">
                {$t.sendAvatarReaction || $t.sendReaction || 'Send Avatar Reaction'}
            </span>
        </button>
    </footer>
</div>

<FlyingReactionsOverlay />
