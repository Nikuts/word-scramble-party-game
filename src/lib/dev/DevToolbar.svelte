<!-- src/lib/dev/DevToolbar.svelte -->
<script>
    import { createEventDispatcher } from 'svelte';
    import confetti from 'canvas-confetti';

    export let activeScreen = 'player_battle_single';
    export let language = 'en';
    export let viewport = 'mobile';
    export let tileCount = 35;
    export let playerCount = 6;
    export let playerIndex = 0;
    export let isTvMode = false;
    export let colorTheme = 'default';
    export let hideToolbar = false;

    const dispatch = createEventDispatcher();
    let isCollapsed = false;

    const screens = [
        { id: 'player_lobby', label: '📱 Player Lobby', category: 'Player' },
        { id: 'player_avatar', label: '📱 Avatar Select & Profile', category: 'Player' },
        { id: 'player_question', label: '📱 Question Answering', category: 'Player' },
        { id: 'player_battle_single', label: '📱 Battle: Single Line', category: 'Player' },
        { id: 'player_battle_movie', label: '📱 Battle: Movie 2-Part', category: 'Player' },
        { id: 'player_voting', label: '📱 Voting (3-Way)', category: 'Player' },
        { id: 'player_reveal', label: '📱 Battle Winner Reveal', category: 'Player' },
        { id: 'player_results', label: '📱 Player Final Results', category: 'Player' },
        { id: 'player_history', label: '📱 Battle History Recap', category: 'Player' },
        { id: 'host_lobby', label: '📺 Host Lobby (QR & Grid)', category: 'Host' },
        { id: 'host_question', label: '📺 Host Question Arena', category: 'Host' },
        { id: 'host_voting', label: '📺 Host Voting Brawl (3-Way)', category: 'Host' },
        { id: 'host_reveal', label: '📺 Host Reveal & Royalties', category: 'Host' },
        { id: 'host_podium', label: '📺 Host Winner Podium', category: 'Host' },
        { id: 'instructions', label: '📖 How to Play (Instructions)', category: 'Showcase' },
        { id: 'avatar_gallery', label: '🎨 Pixel Avatars Gallery', category: 'Showcase' }
    ];

    function triggerConfetti() {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
    }

    function toggleCollapse() {
        isCollapsed = !isCollapsed;
    }
</script>

{#if !hideToolbar}
<div class="fixed bottom-3 right-3 z-50 font-sans text-xs select-none">
    {#if isCollapsed}
        <button
            on:click={toggleCollapse}
            class="bg-fuchsia-700 hover:bg-fuchsia-600 text-white font-bold px-3 py-2 rounded-full shadow-2xl border-2 border-fuchsia-400 flex items-center gap-1.5 transition-all transform hover:scale-105"
            title="Open UI Dev Harness"
        >
            <span class="text-base">🧪</span>
            <span>UI Harness</span>
        </button>
    {:else}
        <div class="bg-gray-950/95 border border-fuchsia-500/60 rounded-xl p-3 shadow-2xl backdrop-blur-md text-white max-w-sm w-80 space-y-2.5">
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-gray-800 pb-1.5">
                <div class="flex items-center gap-1.5">
                    <span class="text-sm">🧪</span>
                    <span class="font-bold text-fuchsia-400 uppercase tracking-wider text-[11px]">UI Dev Harness</span>
                    <span class="bg-fuchsia-950 text-fuchsia-300 text-[9px] px-1.5 py-0.5 rounded border border-fuchsia-800">HMR Active</span>
                </div>
                <button
                    on:click={toggleCollapse}
                    class="text-gray-400 hover:text-white text-xs px-1.5 py-0.5 rounded hover:bg-gray-800"
                >
                    ✕
                </button>
            </div>

            <!-- Screen Selector -->
            <div>
                <label for="dev-screen-select" class="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Preview Screen</label>
                <select
                    id="dev-screen-select"
                    bind:value={activeScreen}
                    on:change={() => dispatch('changeScreen', activeScreen)}
                    class="w-full bg-gray-900 border border-fuchsia-600/50 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-fuchsia-400"
                >
                    <optgroup label="✨ Phase 3B Mobile Prototypes">
                        {#each screens.filter(s => s.category === 'Phase 3B') as s}
                            <option value={s.id}>{s.label}</option>
                        {/each}
                    </optgroup>
                    <optgroup label="📱 Mobile Player Screens">
                        {#each screens.filter(s => s.category === 'Player') as s}
                            <option value={s.id}>{s.label}</option>
                        {/each}
                    </optgroup>
                    <optgroup label="📺 Host TV Screens">
                        {#each screens.filter(s => s.category === 'Host') as s}
                            <option value={s.id}>{s.label}</option>
                        {/each}
                    </optgroup>
                    <optgroup label="🎨 Design Showcase">
                        {#each screens.filter(s => s.category === 'Showcase') as s}
                            <option value={s.id}>{s.label}</option>
                        {/each}
                    </optgroup>
                </select>
            </div>

            <!-- Language & Viewport Grid -->
            <div class="grid grid-cols-2 gap-2">
                <!-- Language Toggle -->
                <div>
                    <span class="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Language</span>
                    <div class="flex rounded-lg overflow-hidden border border-gray-800 bg-gray-900">
                        <button
                            class="flex-1 py-1 text-center font-bold {language === 'en' ? 'bg-fuchsia-600 text-white' : 'text-gray-400 hover:text-white'}"
                            on:click={() => { language = 'en'; dispatch('changeLang', 'en'); }}
                        >
                            EN
                        </button>
                        <button
                            class="flex-1 py-1 text-center font-bold {language === 'ua' ? 'bg-fuchsia-600 text-white' : 'text-gray-400 hover:text-white'}"
                            on:click={() => { language = 'ua'; dispatch('changeLang', 'ua'); }}
                        >
                            UA
                        </button>
                    </div>
                </div>

                <!-- Viewport Preset -->
                <div>
                    <span class="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Device Frame</span>
                    <div class="flex rounded-lg overflow-hidden border border-gray-800 bg-gray-900">
                        <button
                            class="flex-1 py-1 text-center {viewport === 'mobile' ? 'bg-cyan-600 text-white font-bold' : 'text-gray-400 hover:text-white'}"
                            on:click={() => { viewport = 'mobile'; dispatch('changeViewport', 'mobile'); }}
                            title="Mobile Phone (375x667)"
                        >
                            📱
                        </button>
                        <button
                            class="flex-1 py-1 text-center {viewport === 'tablet' ? 'bg-cyan-600 text-white font-bold' : 'text-gray-400 hover:text-white'}"
                            on:click={() => { viewport = 'tablet'; dispatch('changeViewport', 'tablet'); }}
                            title="Tablet (768x1024)"
                        >
                            📱+
                        </button>
                        <button
                            class="flex-1 py-1 text-center {viewport === 'full' ? 'bg-cyan-600 text-white font-bold' : 'text-gray-400 hover:text-white'}"
                            on:click={() => { viewport = 'full'; dispatch('changeViewport', 'full'); }}
                            title="Full Screen / TV"
                        >
                            📺
                        </button>
                    </div>
                </div>
            </div>

            <!-- Player Count Preset -->
            <div class="border-t border-gray-800 pt-1.5">
                <span class="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Match Scale (Player Count)</span>
                <div class="flex rounded-lg overflow-hidden border border-gray-800 bg-gray-900">
                    <button
                        class="flex-1 py-1 text-center font-bold {playerCount === 3 ? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-white'}"
                        on:click={() => { playerCount = 3; dispatch('changePlayerCount', 3); }}
                        title="3 Players (Includes 0-pts 3rd place)"
                    >
                        3P (0 pts)
                    </button>
                    <button
                        class="flex-1 py-1 text-center font-bold {playerCount === 6 ? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-white'}"
                        on:click={() => { playerCount = 6; dispatch('changePlayerCount', 6); }}
                        title="6 Players Standard"
                    >
                        6P
                    </button>
                    <button
                        class="flex-1 py-1 text-center font-bold {playerCount === 14 ? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-white'}"
                        on:click={() => { playerCount = 14; dispatch('changePlayerCount', 14); }}
                        title="14 Players Max Grid"
                    >
                        14P
                    </button>
                </div>
            </div>

            {#if activeScreen === 'player_results'}
                <!-- Mobile Result Rank Switcher -->
                <div class="border-t border-gray-800 pt-1.5">
                    <span class="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Player Rank Perspective</span>
                    <div class="grid grid-cols-4 gap-1">
                        <button
                            class="py-1 text-center font-bold rounded text-[10px] {playerIndex === 0 ? 'bg-amber-400 text-black shadow' : 'bg-gray-900 text-gray-400 border border-gray-800'}"
                            on:click={() => { playerIndex = 0; dispatch('changePlayerIndex', 0); }}
                        >
                            🥇 #1
                        </button>
                        <button
                            class="py-1 text-center font-bold rounded text-[10px] {playerIndex === 1 ? 'bg-slate-300 text-black shadow' : 'bg-gray-900 text-gray-400 border border-gray-800'}"
                            on:click={() => { playerIndex = 1; dispatch('changePlayerIndex', 1); }}
                        >
                            🥈 #2
                        </button>
                        <button
                            class="py-1 text-center font-bold rounded text-[10px] {playerIndex === 2 ? 'bg-amber-700 text-white shadow' : 'bg-gray-900 text-gray-400 border border-gray-800'}"
                            on:click={() => { playerIndex = 2; dispatch('changePlayerIndex', 2); }}
                        >
                            🥉 #3
                        </button>
                        <button
                            class="py-1 text-center font-bold rounded text-[10px] {playerIndex === 3 ? 'bg-cyan-600 text-white shadow' : 'bg-gray-900 text-gray-400 border border-gray-800'}"
                            on:click={() => { playerIndex = 3; dispatch('changePlayerIndex', 3); }}
                        >
                            🎮 #4
                        </button>
                    </div>
                </div>
            {/if}

            <!-- TV Mode & Theme Selector -->
            <div class="grid grid-cols-2 gap-2 border-t border-gray-800 pt-1.5">
                <div>
                    <label for="dev-theme-select" class="block text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Theme</label>
                    <select
                        id="dev-theme-select"
                        bind:value={colorTheme}
                        on:change={() => dispatch('changeTheme', colorTheme)}
                        class="w-full bg-gray-900 border border-gray-800 rounded px-1.5 py-1 text-white text-[11px]"
                    >
                        <option value="default">Default</option>
                        <option value="silly">Silly</option>
                        <option value="nsfw">18+ Mode</option>
                    </select>
                </div>
                <div>
                    <span class="block text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">TV Mode</span>
                    <button
                        on:click={() => { isTvMode = !isTvMode; dispatch('toggleTvMode', isTvMode); }}
                        class="w-full py-1 px-1.5 rounded border text-[11px] font-bold flex items-center justify-center gap-1 transition-all {isTvMode ? 'bg-amber-600 border-amber-400 text-white' : 'bg-gray-900 border-gray-800 text-gray-400'}"
                    >
                        <span>📺</span>
                        <span>{isTvMode ? 'ON' : 'OFF'}</span>
                    </button>
                </div>
            </div>

            <!-- Word Bank Tiles Count (for battle screens) -->
            {#if activeScreen.includes('battle')}
                <div class="border-t border-gray-800 pt-1.5">
                    <div class="flex justify-between text-[10px] text-gray-400 mb-0.5">
                        <span>Word Bank Tiles:</span>
                        <span class="font-bold text-fuchsia-300">{tileCount} tiles</span>
                    </div>
                    <input
                        type="range"
                        min="10"
                        max="60"
                        step="5"
                        bind:value={tileCount}
                        on:input={() => dispatch('changeTileCount', tileCount)}
                        class="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-fuchsia-500"
                    />
                </div>
            {/if}

            <!-- Quick Action Buttons -->
            <div class="flex gap-1.5 pt-1 border-t border-gray-800">
                <button
                    on:click={triggerConfetti}
                    class="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold py-1 px-2 rounded text-[10px] shadow"
                >
                    🎉 Confetti
                </button>
                <button
                    on:click={() => dispatch('resetState')}
                    class="bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white py-1 px-2 rounded text-[10px]"
                    title="Reset mock state"
                >
                    ↺ Reset
                </button>
                <button
                    on:click={() => window.location.href = '/'}
                    class="bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white py-1 px-2 rounded text-[10px]"
                    title="Exit debug harness and return to game"
                >
                    Exit
                </button>
            </div>
        </div>
    {/if}
</div>
{/if}
