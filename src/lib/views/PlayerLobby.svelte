<script>
    import { createEventDispatcher } from 'svelte';
    import { t, language, sendMessage, gameState, changeView, error, currentPlayerDetails } from '../../stores.js';
    import { MIN_PLAYERS, MAX_PLAYERS } from '../config.js';
    import ModeToggle from './shared/ModeToggle.svelte';
    import PixelAvatar from '../shared/PixelAvatar.svelte';

    const dispatch = createEventDispatcher();

    $: game = $gameState;
    $: player = $currentPlayerDetails;

    $: isHost = player?.isHost;

    let customTheme = '';
    let isInputFocused = false;
    let isEditingName = false;
    let editNameValue = '';

    function startNameEdit() {
        editNameValue = player?.name || '';
        isEditingName = true;
    }

    function saveNameEdit() {
        if (!game || !editNameValue.trim()) return;
        sendMessage('change-name', { gameId: game.id, newName: editNameValue.trim() });
        isEditingName = false;
    }

    function cancelNameEdit() {
        isEditingName = false;
    }
    
    // Sync local customTheme with game state
    $: {
        if (game?.isGeneratingThemes) {
            customTheme = '';
        } else if (game?.theme !== customTheme && !isInputFocused) {
            customTheme = game?.theme || '';
        }
    }

    $: connectedPlayerCount = game ? game.players.filter(p => p.socketId).length : 0;
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
</script>
<div class="p-4 sm:p-6 text-center pt-[max(16px,env(safe-area-inset-top))]">
    <div class="container mx-auto max-w-2xl">
        <div class="grid grid-cols-2 gap-3 mb-5">
            <button 
                on:click={() => dispatch('reselectAvatar')} 
                class="w-full py-2.5 px-3 bg-neutral-900/80 border-2 border-secondary text-secondary hover:bg-secondary hover:text-black transition-all font-display text-xs rounded-lg shadow-sm flex items-center justify-center min-h-[44px] tracking-wider"
            >
                {$t.changeCharacter}
            </button>
            <button 
                on:click={() => changeView('instructions')} 
                class="w-full py-2.5 px-3 bg-neutral-900/80 border-2 border-primary text-primary hover:bg-primary hover:text-black transition-all font-display text-xs rounded-lg shadow-sm flex items-center justify-center min-h-[44px] tracking-wider"
            >
                {$t.howToPlay}
            </button>
        </div>

        {#if $error.message && !$error.fatal}
            <div class="my-4 p-3 bg-red-900/50 border-2 border-danger text-red-300 font-bold text-center rounded-md font-display text-sm">
                <p>{$error.message}</p>
            </div>
        {/if}

        <!-- My Profile Card with Inline Name Edit -->
        <div class="panel-arcade p-3 sm:p-4 mb-6 flex items-center justify-between gap-4" style="--neon-color: var(--color-secondary); --neon-color-rgb: var(--color-secondary-rgb);">
            <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-full bg-neutral-900 border-2 border-secondary flex items-center justify-center shadow-md flex-shrink-0" style="box-shadow: 0 0 8px var(--color-secondary);">
                    {#if player?.avatar}
                        <PixelAvatar avatar={player.avatar} />
                    {/if}
                </div>
                <div class="text-left">
                    {#if isEditingName}
                        <div class="flex items-center gap-2">
                            <input 
                                type="text" 
                                bind:value={editNameValue} 
                                class="bg-black border border-secondary p-1 text-sm rounded text-secondary focus:outline-none w-32 sm:w-44"
                                maxlength="25"
                                on:keydown={(e) => { if (e.key === 'Enter') saveNameEdit(); if (e.key === 'Escape') cancelNameEdit(); }}
                            />
                            <button on:click={saveNameEdit} class="px-2 py-1 bg-accent text-black font-display text-xs rounded hover:opacity-90">{$t.save}</button>
                            <button on:click={cancelNameEdit} class="px-2 py-1 bg-neutral-800 text-neutral-300 font-display text-xs rounded hover:bg-neutral-700">{$t.cancel}</button>
                        </div>
                    {:else}
                        <div class="flex items-center gap-2">
                            <span class="text-lg font-bold font-display text-secondary">{player?.name}</span>
                            <button on:click={startNameEdit} class="text-neutral-400 hover:text-white text-sm" title={$t.editName} aria-label={$t.editName}>
                                ✏️
                            </button>
                        </div>
                    {/if}
                </div>
            </div>
            {#if player?.isHost}
                <span class="px-2 py-1 bg-warning text-black text-xs font-display rounded-sm flex-shrink-0">{$t.host}</span>
            {/if}
        </div>
        {#if isHost}
            <h1 class="text-3xl mb-4 text-primary" style="text-shadow: 0 0 5px var(--color-primary);">{$t.youAreTheHost}</h1>

            <div class="w-full text-left panel-arcade p-4 mb-6 space-y-4" style="--neon-color: var(--color-primary); --neon-color-rgb: var(--color-primary-rgb);">
                <!-- Color Theme Selection (Neatly Encapsulated) -->
                <div class="p-3 bg-black/40 border border-neutral-700/60 rounded-lg">
                    <h3 class="font-display text-xs sm:text-sm uppercase tracking-wider text-primary mb-2.5">{$t.colorTheme}</h3>
                    <div class="grid grid-cols-3 gap-2">
                        {#each ['arcade', 'vaporwave', 'outrun'] as themeName}
                            <button 
                                on:click={() => handleColorThemeClick(themeName)}
                                class="w-full py-2 px-1 text-center uppercase font-display text-[9px] sm:text-[11px] tracking-tight border-2 transition-all rounded-md truncate {
                                    game?.colorTheme === themeName 
                                    ? 'bg-white text-black font-bold border-white shadow-[0_0_8px_rgba(255,255,255,0.7)]' 
                                    : 'bg-neutral-900/80 border-neutral-600 hover:bg-neutral-700 text-gray-200'
                                }"
                            >
                                {themeName}
                            </button>
                        {/each}
                    </div>
                </div>

                <div class="flex items-center justify-between mb-2">
                    <h3 class="font-display text-lg">{$t.theme}</h3>
                    <div>
                        <button 
                            type="button" 
                            on:click={() => {
                                if (game && !game.isGeneratingThemes) {
                                    sendMessage('reload-themes', { gameId: game.id });
                                }
                            }}
                            disabled={isApiDisabled || game?.isGeneratingThemes}
                            class="px-3 py-1 text-xs bg-neutral-900/90 hover:bg-primary hover:text-black border border-primary/50 rounded text-primary transition-all font-display uppercase tracking-wider cursor-pointer disabled:opacity-50"
                        >
                            {$t.reloadThemes}
                        </button>
                    </div>
                </div>
                 {#if game?.isGeneratingThemes}
                    <div class="p-3 bg-neutral-900 border border-warning mb-3 text-center rounded-md">
                        <p class="text-warning animate-pulse">{$t.generatingThemes}</p>
                    </div>
                 {:else if isApiDisabled}
                    <div class="p-3 bg-neutral-900 border border-yellow-500/50 mb-3 rounded-md">
                        <p class="text-warning text-sm text-center">AI content generation failed. A random built-in theme will be chosen automatically when you start the game.</p>
                    </div>
                {/if}
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                    {#each (game?.preGeneratedThemes[$language] || []) as theme}
                        <button 
                            type="button"
                            on:click={() => handleThemeClick(theme)} 
                            disabled={isApiDisabled || game?.isGeneratingThemes} 
                            class="p-3 text-sm text-center transition-all rounded-md cursor-pointer border-2 {
                                game?.theme === theme 
                                ? 'bg-primary text-black font-bold border-white shadow-[0_0_8px_rgba(6,182,212,0.8)]' 
                                : 'bg-neutral-800 border-neutral-600 hover:bg-neutral-700 text-gray-200'
                            } disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {theme}
                        </button>
                    {/each}
                </div>
                <div class="relative mb-6">
                    <input 
                        type="text" 
                        class="w-full bg-black border-2 p-3 focus:outline-none text-base sm:text-lg rounded-md font-mono" 
                        style="border-color: var(--color-primary); box-shadow: 0 0 8px var(--color-primary), inset 0 0 8px rgba(var(--color-primary-rgb), 0.2); color: var(--color-primary);"
                        placeholder={$t.customTheme} 
                        bind:value={customTheme} 
                        on:input={handleThemeInput} 
                        on:focus={() => isInputFocused = true}
                        on:blur={() => isInputFocused = false}
                        disabled={isApiDisabled || game?.isGeneratingThemes}
                    >
                    {#if customTheme && customTheme.trim()}
                        <button
                            type="button"
                            on:click={() => {
                                customTheme = '';
                                sendMessage('set-theme', { gameId: game.id, theme: '' });
                            }}
                            class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-sm bg-neutral-800 rounded-full w-6 h-6 flex items-center justify-center cursor-pointer"
                            title="Clear theme"
                        >
                            ✕
                        </button>
                    {/if}
                </div>
                
                <div class="flex flex-col gap-4 mb-6">
                    <ModeToggle
                        icon="🤡"
                        label={$t.sillyMode}
                        description={$t.sillyModeDesc}
                        color="#a855f7"
                        checked={game?.sillyMode}
                        on:change={(e) => sendMessage('set-silly-mode', { gameId: game.id, sillyMode: e.detail })}
                    />
                    <ModeToggle
                        icon="🌶️"
                        label={$t.is18PlusMode}
                        description={$t.is18PlusModeDesc}
                        color="#ef4444"
                        checked={game?.is18PlusMode}
                        on:change={(e) => sendMessage('set-18plus-mode', { gameId: game.id, is18PlusMode: e.detail })}
                    />
                    <ModeToggle
                        icon="🐌"
                        label={$t.slowpokeMode}
                        description={$t.slowpokeModeDesc}
                        color="#2dd4bf"
                        checked={game?.slowpokeMode}
                        on:change={(e) => sendMessage('set-slowpoke-mode', { gameId: game.id, slowpokeMode: e.detail })}
                    />
                </div>
                
                {#if game?.is18PlusMode}
                    <p class="text-center text-warning mb-4 text-sm">{$t.is18PlusModeWarning}</p>
                {/if}
            </div>
                
            <button on:click={() => sendMessage('start-game', { gameId: game.id, loading: true })} class="btn-arcade w-full text-2xl" style="--btn-color: var(--color-accent);" disabled={!canStart}>{$t.startGame}</button>
            {#if !canStart}
                <p class="text-center mt-2 text-warning font-display text-sm">{!game?.theme && !isApiDisabled ? $t.themeNotSet : playerCountMessage}</p>
            {/if}
        {:else}
            <h1 class="text-3xl mb-2 animate-pulse">{$t.waitingForHost}</h1>
            <p class="mb-2 text-lg">{$t.chosenTheme}:</p>
            <p class="text-3xl font-bold text-primary mb-8" style="text-shadow: 0 0 5px var(--color-primary);">{game?.theme ? game.theme : '...'}</p>
        {/if}

        <h2 class="text-2xl mt-8 mb-4">{$t.players} ({game?.players.length || 0})</h2>
        <ul class="space-y-3 max-w-md mx-auto">
            {#each game?.players || [] as p (p.id)}
                <li class="flex items-center gap-4 bg-neutral-900/70 border border-neutral-700 p-3 rounded-md transition-opacity {p.socketId ? 'opacity-100' : 'opacity-60'}">
                    <div class="w-10 h-10 flex-shrink-0">
                        <PixelAvatar avatar={p.avatar} />
                    </div>
                    <span class="text-lg font-medium flex-grow text-left truncate">{p.name}</span>
                    {#if p.socketId}
                        <span class="px-2 py-0.5 bg-emerald-950/80 border border-emerald-400 text-emerald-300 text-xs font-display rounded-sm shadow-[0_0_8px_rgba(52,211,153,0.4)]">✓ {$language === 'uk' ? 'Готовий' : 'Ready'}</span>
                    {/if}
                    {#if p.isHost}
                        <span class="px-2 py-1 bg-warning text-black text-xs font-display rounded-sm">{$t.host}</span>
                    {/if}
                    {#if !p.socketId}
                        <span class="px-2 py-1 bg-danger text-white text-xs font-display rounded-sm animate-pulse">{$t.disconnected}</span>
                    {/if}
                </li>
            {/each}
        </ul>
    </div>
</div>

<div class="fixed bottom-6 right-6 z-20">
    <button 
        on:click={sendEmoji} 
        disabled={!canSendEmoji || !player} 
        class="w-20 h-20 rounded-full flex justify-center items-center p-2 shadow-lg transition-transform transform hover:scale-110 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
        style="background-color: var(--color-secondary); box-shadow: 0 0 15px var(--color-secondary);"
        title={$t.sendReaction}
        aria-label={$t.sendReaction}
    >
        {#if player}
            <PixelAvatar avatar={player.avatar} />
        {/if}
    </button>
</div>