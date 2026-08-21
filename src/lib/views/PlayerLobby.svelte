<!-- src/lib/views/PlayerLobby.svelte -->
<script>
    import { createEventDispatcher } from 'svelte';
    import { t, language, sendMessage, gameState, error, currentPlayerDetails } from '../../stores.js';
    import { MIN_PLAYERS, MAX_PLAYERS } from '../config.js';
    import PixelAvatar from '../shared/PixelAvatar.svelte';

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

    // Sync local customTheme with game state
    $: {
        if (game?.isGeneratingThemes) {
            customTheme = '';
        } else if (game?.theme !== customTheme && !isInputFocused) {
            customTheme = game?.theme || '';
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
    function sendEmoji() {
        if (!canSendEmoji || !game) return;
        sendMessage('send-lobby-emoji', { gameId: game.id });
        canSendEmoji = false;
        setTimeout(() => { canSendEmoji = true; }, 500);
    }

    function handleThemeInput(e) {
        if (!game) return;
        customTheme = e.target.value;
        sendMessage('set-theme', { gameId: game.id, theme: customTheme.trim() });
    }

    function handleThemeClick(theme) {
        if (!game) return;
        customTheme = theme;
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

<div class="w-full h-[100dvh] max-h-[100dvh] min-h-0 flex flex-col justify-between p-3.5 sm:p-4 max-w-md mx-auto safe-top safe-bottom select-none font-sans overflow-hidden box-border">
    
    <!-- Top Player HUD Card (Fixed Height, Aligned Badges) -->
    <header class="bg-neutral-950/90 border border-neutral-800 rounded-xl px-3.5 py-2.5 shadow-md mb-2.5 flex items-center justify-between flex-shrink-0">
        <div class="flex items-center gap-3 min-w-0">
            <button 
                type="button" 
                on:click={sendEmoji}
                class="w-12 h-12 rounded-xl bg-neutral-900 border border-cyan-400 p-1 shadow-sm flex items-center justify-center flex-shrink-0 cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                title={$t.sendReaction || 'Send Reaction'}
                aria-label={$t.sendReaction || 'Send Reaction'}
            >
                {#if player?.avatar}
                    <PixelAvatar avatar={player.avatar} className="w-full h-full" />
                {/if}
            </button>

            <div class="text-left min-w-0">
                <div class="flex items-center gap-1.5">
                    <span class="font-display font-bold text-sm text-white truncate">{player?.name || 'Player'}</span>
                    {#if isHost}
                        <span class="px-1.5 py-0.2 bg-amber-400 text-black text-[9px] font-display font-black rounded flex-shrink-0">HOST</span>
                    {/if}
                </div>
                <button
                    type="button"
                    on:click={() => dispatch('reselectAvatar')}
                    class="text-[10px] font-display font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5 cursor-pointer mt-0.5"
                >
                    <span>✏️</span>
                    <span>{$t.editProfile || (isUkrainian ? 'Редагувати профіль' : 'Edit Profile')}</span>
                </button>
            </div>
        </div>

        <!-- Room Code Badge (Compact & Aligned) -->
        <div class="bg-black/80 border border-neutral-700 px-3 py-1.5 rounded-lg text-right flex-shrink-0">
            <span class="text-[8px] font-display text-slate-400 block uppercase">{isUkrainian ? 'КОД' : 'ROOM'}</span>
            <span class="font-mono font-black text-sm text-amber-300">#{game?.id || '----'}</span>
        </div>
    </header>

    {#if $error.message && !$error.fatal}
        <div class="mb-2 p-2.5 bg-red-950/80 border border-red-500/60 text-red-300 text-xs font-bold text-center rounded-xl flex-shrink-0">
            {$error.message}
        </div>
    {/if}

    <!-- Scrollable Main Container: Host Controls FIRST, then Players List -->
    <main class="flex-1 min-h-0 overflow-y-auto space-y-3 pr-0.5">
        
        {#if isHost}
            <!-- 👑 HOST CONTROLS FIRST -->
            <div class="bg-neutral-950/90 border-2 border-amber-400/50 rounded-2xl p-3.5 shadow-md space-y-3">
                <div class="flex items-center justify-between border-b border-neutral-800 pb-1.5">
                    <span class="text-[11px] font-display font-black text-amber-300 uppercase tracking-wider flex items-center gap-1">
                        👑 {$t.youAreTheHost || 'HOST CONTROLS'}
                    </span>
                    <span class="text-[10px] font-mono text-slate-400 font-bold">{connectedPlayerCount} / {MAX_PLAYERS} Players</span>
                </div>

                <!-- 1. Color Theme Selection -->
                <div>
                    <span class="text-[10px] font-display font-bold text-slate-300 uppercase block mb-1">
                        🎨 {$t.colorTheme || 'COLOR THEME'}:
                    </span>
                    <div class="grid grid-cols-3 gap-1.5">
                        {#each ['arcade', 'vaporwave', 'outrun'] as themeName}
                            <button
                                type="button"
                                on:click={() => handleColorThemeClick(themeName)}
                                class="py-1 px-1 text-center uppercase font-display text-[7.5px] sm:text-[8px] font-black tracking-tight border-2 rounded-lg transition-all flex items-center justify-center cursor-pointer {
                                    game?.colorTheme === themeName
                                    ? 'bg-white text-black font-black border-white shadow-[0_0_10px_rgba(255,255,255,0.7)]'
                                    : 'bg-neutral-900 border-neutral-700 text-slate-300 hover:border-slate-500'
                                }"
                            >
                                <span>{themeName}</span>
                            </button>
                        {/each}
                    </div>
                </div>

                <!-- 2. Game Theme Selection & Single-Line Outline Reload Button -->
                <div>
                    <div class="flex items-center justify-between gap-2 mb-1.5">
                        <span class="text-[10px] font-display font-bold text-slate-300 uppercase">
                            {$t.theme || 'THEME'}:
                        </span>
                        <button
                            type="button"
                            on:click={handleReloadThemes}
                            disabled={isApiDisabled || game?.isGeneratingThemes}
                            class="border border-amber-400/70 hover:bg-amber-400 hover:text-black text-amber-300 px-2 py-0.5 rounded text-[9px] font-display font-bold uppercase tracking-wider transition-colors whitespace-nowrap flex-shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {$t.reloadThemes || 'Reload Themes'}
                        </button>
                    </div>

                    {#if game?.isGeneratingThemes}
                        <div class="p-2.5 bg-neutral-900 border border-amber-400/50 rounded-lg text-center">
                            <p class="text-amber-300 text-xs font-display animate-pulse">{$t.generatingThemes || 'Generating themes...'}</p>
                        </div>
                    {:else}
                        <div class="space-y-1.5">
                            {#each availableThemes as th}
                                <button
                                    type="button"
                                    on:click={() => handleThemeClick(th)}
                                    disabled={isApiDisabled}
                                    class="theme-card w-full text-left px-3 py-2 rounded-lg text-xs font-medium border-2 transition-all cursor-pointer {
                                        game?.theme === th && !customTheme
                                        ? 'bg-amber-400/20 border-amber-400 text-amber-200 font-bold shadow-sm' 
                                        : 'bg-neutral-900 border-neutral-700 text-slate-300 hover:border-slate-500'
                                    } disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {th}
                                </button>
                            {/each}
                        </div>
                    {/if}
                </div>

                <!-- 3. Custom Theme Text Field -->
                <div>
                    <span class="text-[10px] font-display font-bold text-slate-300 uppercase block mb-1">
                        ✍️ {$t.customTheme || 'OR ENTER CUSTOM THEME'}:
                    </span>
                    <div class="relative select-text">
                        <input 
                            type="text"
                            bind:value={customTheme}
                            on:input={handleThemeInput}
                            on:focus={() => isInputFocused = true}
                            on:blur={() => isInputFocused = false}
                            placeholder={$t.customTheme || (isUkrainian ? 'Власна тема...' : 'Custom Theme...')}
                            class="w-full bg-neutral-900 border-2 border-neutral-700 focus:border-amber-400 text-white font-sans text-xs px-3 py-2 rounded-lg focus:outline-none select-text"
                            maxlength="50"
                        />
                        {#if customTheme}
                            <button 
                                type="button" 
                                on:click={() => {
                                    customTheme = '';
                                    sendMessage('set-theme', { gameId: game.id, theme: '' });
                                }}
                                class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                            >
                                ✕
                            </button>
                        {/if}
                    </div>
                </div>

                <!-- 4. Game Modes (Sleek Horizontal 3-Pill Toggles) -->
                <div>
                    <span class="text-[10px] font-display font-bold text-slate-300 uppercase block mb-1">
                        ⚙️ {$t.gameModes || (isUkrainian ? 'РЕЖИМИ ГРИ' : 'GAME MODES')}:
                    </span>
                    
                    <div class="grid grid-cols-3 gap-1.5">
                        <!-- Silly Mode Pill -->
                        <button
                            type="button"
                            on:click={handleToggleSilly}
                            class="p-2 rounded-xl border-2 transition-all flex flex-col items-center justify-center text-center cursor-pointer {
                                game?.sillyMode 
                                ? 'bg-purple-950/80 border-purple-400 text-purple-200 shadow-[0_0_10px_rgba(168,85,247,0.4)]' 
                                : 'bg-neutral-900 border-neutral-800 text-slate-400 hover:border-slate-600'
                            }"
                        >
                            <span class="text-base mb-0.5">🤡</span>
                            <span class="font-display font-bold text-[10px] uppercase leading-tight">{$t.sillyMode || 'Silly'}</span>
                            <span class="text-[8px] font-mono font-bold mt-0.5 {game?.sillyMode ? 'text-purple-300' : 'text-slate-500'}">{game?.sillyMode ? 'ON' : 'OFF'}</span>
                        </button>

                        <!-- 18+ Mode Pill -->
                        <button
                            type="button"
                            on:click={handleToggle18Plus}
                            class="p-2 rounded-xl border-2 transition-all flex flex-col items-center justify-center text-center cursor-pointer {
                                game?.is18PlusMode 
                                ? 'bg-red-950/80 border-red-400 text-red-200 shadow-[0_0_10px_rgba(239,68,68,0.4)]' 
                                : 'bg-neutral-900 border-neutral-800 text-slate-400 hover:border-slate-600'
                            }"
                        >
                            <span class="text-base mb-0.5">🌶️</span>
                            <span class="font-display font-bold text-[10px] uppercase leading-tight">{$t.is18PlusMode || '18+'}</span>
                            <span class="text-[8px] font-mono font-bold mt-0.5 {game?.is18PlusMode ? 'text-red-300' : 'text-slate-500'}">{game?.is18PlusMode ? 'ON' : 'OFF'}</span>
                        </button>

                        <!-- Slowpoke Mode Pill -->
                        <button
                            type="button"
                            on:click={handleToggleSlowpoke}
                            class="p-2 rounded-xl border-2 transition-all flex flex-col items-center justify-center text-center cursor-pointer {
                                game?.slowpokeMode 
                                ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.4)]' 
                                : 'bg-neutral-900 border-neutral-800 text-slate-400 hover:border-slate-600'
                            }"
                        >
                            <span class="text-base mb-0.5">🐌</span>
                            <span class="font-display font-bold text-[10px] uppercase leading-tight">{$t.slowpokeMode || 'Slowpoke'}</span>
                            <span class="text-[8px] font-mono font-bold mt-0.5 {game?.slowpokeMode ? 'text-cyan-300' : 'text-slate-500'}">{game?.slowpokeMode ? 'ON' : 'OFF'}</span>
                        </button>
                    </div>
                </div>

                <!-- Start Game Button (Directly Below Host Settings) -->
                <button
                    type="button"
                    on:click={handleStartGame}
                    disabled={!canStart}
                    class="btn-arcade w-full py-3.5 bg-gradient-to-r from-amber-400 to-orange-500 text-black font-display font-black text-sm tracking-wider uppercase rounded-xl shadow-[0_0_20px_rgba(251,191,36,0.7)] active:scale-98 transition-all cursor-pointer mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    🚀 {$t.startGame || 'START GAME'}
                </button>
                {#if !canStart}
                    <p class="text-center mt-1 text-amber-400 font-display text-[10px] font-bold">
                        {!game?.theme && !isApiDisabled ? $t.themeNotSet : playerCountMessage}
                    </p>
                {/if}
            </div>
        {:else}
            <!-- Non-Host Theme Summary Card -->
            <div class="bg-neutral-950/90 border border-neutral-800 rounded-2xl p-4 text-center shadow-md">
                <span class="text-[10px] font-display font-bold text-slate-400 uppercase tracking-widest block mb-1">
                    {$t.chosenTheme || 'CHOSEN THEME'}:
                </span>
                <p class="font-display font-bold text-sm sm:text-base text-cyan-300">
                    {game?.theme || '...'}
                </p>
            </div>
        {/if}

        <!-- 👥 CONNECTED PLAYERS LIST (BELOW HOST CONTROLS) -->
        <div class="bg-neutral-950/80 border border-neutral-800 rounded-2xl p-3.5 shadow-inner">
            <div class="flex items-center justify-between mb-2.5">
                <span class="text-[10px] font-display font-bold uppercase tracking-wider text-slate-400">
                    {$t.connectedPlayers || 'PLAYERS IN LOBBY'} ({game?.players?.length || 0})
                </span>
                <span class="text-[10px] font-mono text-emerald-400 font-bold">
                    {connectedPlayerCount} / {MAX_PLAYERS} {isUkrainian ? 'Гравців' : 'Players'}
                </span>
            </div>

            <div class="grid {(game?.players?.length || 0) > 6 ? 'grid-cols-2 gap-2' : 'grid-cols-1 gap-2'}">
                {#each game?.players || [] as p (p.id)}
                    {@const isCurrent = p.id === player?.id}
                    <div class="flex items-center justify-between bg-neutral-900/90 border {isCurrent ? 'border-cyan-400/80 bg-cyan-950/20' : 'border-neutral-800'} {(game?.players?.length || 0) > 6 ? 'px-2 py-1.5 text-[11px]' : 'px-3 py-2 text-xs'} rounded-xl {p.socketId ? 'opacity-100' : 'opacity-60'}">
                        <div class="flex items-center gap-2 min-w-0">
                            <div class="w-6 h-6 sm:w-7 sm:h-7 flex-shrink-0">
                                <PixelAvatar avatar={p.avatar} className="w-full h-full" />
                            </div>
                            <span class="font-display font-semibold text-slate-200 truncate {isCurrent ? 'text-cyan-300 font-bold' : ''}">
                                {p.name}
                            </span>
                        </div>
                        {#if p.socketId}
                            <span class="w-4 h-4 rounded-full text-[9px] font-display font-black bg-emerald-950 border border-emerald-400 text-emerald-300 flex items-center justify-center flex-shrink-0">
                                ✓
                            </span>
                        {:else}
                            <span class="px-1.5 py-0.2 bg-red-950 border border-red-500 text-red-300 text-[8px] font-display rounded-sm flex-shrink-0">
                                {$t.disconnected || 'OFF'}
                            </span>
                        {/if}
                    </div>
                {/each}
            </div>
        </div>
    </main>

    <!-- Bottom Status Banner for Non-Host Players -->
    {#if !isHost}
        <footer class="mt-2.5 pt-1.5 border-t border-neutral-800 flex-shrink-0">
            <div class="w-full py-2.5 bg-neutral-900/80 border border-neutral-800 text-slate-300 font-display font-bold text-xs tracking-wider uppercase rounded-xl text-center flex items-center justify-center gap-2">
                <span>⏳</span>
                <span>{$t.waitingForHost || 'WAITING FOR THE HOST TO START THE GAME...'}</span>
            </div>
        </footer>
    {/if}
</div>

<!-- Floating Reaction Emoji Button (Bottom Right) -->
<div class="fixed bottom-4 right-4 z-20">
    <button 
        type="button"
        on:click={sendEmoji} 
        disabled={!canSendEmoji || !player} 
        class="w-12 h-12 rounded-full flex justify-center items-center p-1.5 bg-secondary border-2 border-white shadow-[0_0_15px_rgba(255,0,168,0.7)] transition-transform transform hover:scale-110 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
        title={$t.sendReaction || 'Send Reaction'}
        aria-label={$t.sendReaction || 'Send Reaction'}
    >
        {#if player?.avatar}
            <PixelAvatar avatar={player.avatar} className="w-full h-full" />
        {/if}
    </button>
</div>