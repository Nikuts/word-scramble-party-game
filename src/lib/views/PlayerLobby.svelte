<script>
    import { t, language, sendMessage, gameState, changeView, error, currentPlayerDetails } from '../../stores.js';
    import { MIN_PLAYERS, MAX_PLAYERS } from '../config.js';
    import ModeToggle from './shared/ModeToggle.svelte';
    import PixelAvatar from '../shared/PixelAvatar.svelte';

    $: game = $gameState;
    $: player = $currentPlayerDetails;

    $: isHost = player?.isHost;

    let customTheme = '';
    let isInputFocused = false;
    
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
<div class="p-4 sm:p-6 text-center">
    <div class="container mx-auto max-w-2xl">
        <div class="text-right mb-4">
            <button on:click={() => changeView('instructions')} class="px-4 py-2 bg-transparent border-2 border-primary text-primary hover:bg-primary hover:text-black transition-colors font-display text-sm rounded-md">
                {$t.howToPlay}
            </button>
        </div>
        {#if isHost}
            <h1 class="text-3xl mb-4 text-primary" style="text-shadow: 0 0 5px var(--color-primary);">{$t.youAreTheHost}</h1>
            
            {#if $error.message && !$error.fatal}
                <div class="my-4 p-3 bg-red-900/50 border-2 border-danger text-red-300 font-bold text-center rounded-md">
                    <p>{$error.message}</p>
                </div>
            {/if}

            <div class="w-full text-left panel-arcade p-4 mb-6" style="--neon-color: var(--color-primary); --neon-color-rgb: var(--color-primary-rgb);">
                <!-- Color Theme Selection -->
                <div class="mb-6">
                    <h3 class="font-display text-lg mb-2">{$t.colorTheme}</h3>
                    <div class="flex items-center justify-center gap-2">
                        {#each ['arcade', 'vaporwave', 'outrun'] as themeName}
                            <button 
                                on:click={() => handleColorThemeClick(themeName)}
                                class="w-full p-2 text-center uppercase font-display text-sm border-2 transition-all rounded-md {
                                    game?.colorTheme === themeName 
                                    ? 'bg-white text-black font-bold border-white' 
                                    : 'bg-neutral-900/50 border-neutral-600 hover:bg-neutral-700'
                                }"
                            >
                                {themeName}
                            </button>
                        {/each}
                    </div>
                </div>

                <div class="flex items-center justify-between mb-2">
                    <h3 class="font-display text-lg">{$t.theme}</h3>
                    <button 
                        type="button" 
                        on:click={() => {
                            const available = game?.preGeneratedThemes?.[$language] || [];
                            if (available.length > 0) {
                                const randomTheme = available[Math.floor(Math.random() * available.length)];
                                handleThemeClick(randomTheme);
                            }
                        }}
                        disabled={isApiDisabled || game?.isGeneratingThemes}
                        class="px-2 py-0.5 text-xs bg-neutral-800 hover:bg-accent hover:text-black border border-accent/50 rounded text-accent transition-all font-display cursor-pointer disabled:opacity-50"
                    >
                        🎲 {$language === 'uk' ? 'Випадкова' : 'Random'}
                    </button>
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
                <div class="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                    {#each (game?.preGeneratedThemes[$language] || []) as theme}
                        <button on:click={() => handleThemeClick(theme)} disabled={isApiDisabled || game?.isGeneratingThemes} class="p-3 text-sm text-center transition-all rounded-md cursor-pointer {game?.theme === theme ? 'bg-primary text-black font-bold ring-2 ring-white shadow-[0_0_8px_rgba(6,182,212,0.8)]' : 'bg-neutral-800 border border-neutral-600 hover:bg-neutral-700'} disabled:opacity-50 disabled:cursor-not-allowed">{theme}</button>
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