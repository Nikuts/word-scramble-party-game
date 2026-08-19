<script>
    import { t, showBattleHistory, sendMessage, resetToMenu, gameState, currentPlayer } from '../../../stores.js';
    import PixelAvatar from '../../shared/PixelAvatar.svelte';

    export let game;
    export let player;

    $: sortedPlayers = game?.players ? [...game.players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)) : [];
    $: myRankIndex = sortedPlayers.findIndex(p => p.id === player?.id);
    $: myRank = myRankIndex >= 0 ? myRankIndex + 1 : 4;
    $: isHost = player?.id === game?.hostPlayerId || player?.isHost || false;

    // Option 1 Emojis: Hype, Laugh, Skull, Poop, Vomit, Mindblown
    const reactionEmojis = ['🔥', '😂', '💀', '💩', '🤮', '🤯'];

    const rankTitles = {
        1: { border: 'border-amber-400', glow: 'shadow-[0_0_20px_rgba(251,191,36,0.5)]', bg: 'bg-amber-400 text-black', scoreColor: 'text-amber-400' },
        2: { border: 'border-slate-300', glow: 'shadow-[0_0_15px_rgba(203,213,225,0.3)]', bg: 'bg-slate-300 text-black', scoreColor: 'text-slate-200' },
        3: { border: 'border-amber-700', glow: 'shadow-[0_0_15px_rgba(180,83,9,0.3)]', bg: 'bg-amber-700 text-white', scoreColor: 'text-amber-500' },
        4: { border: 'border-cyan-700/60', glow: 'shadow-none', bg: 'bg-neutral-800 text-cyan-300', scoreColor: 'text-cyan-400' }
    };

    $: currentRankStyle = rankTitles[myRank] || rankTitles[4];

    function getRankTitle(rank) {
        if (rank === 1) return `👑 1ST PLACE - CHAMPION!`;
        if (rank === 2) return `🥈 2ND PLACE - RUNNER UP`;
        if (rank === 3) return `🥉 3RD PLACE - PODIUM`;
        return `🎮 #${rank} - PARTICIPANT`;
    }

    function getRankSubtitle(rank) {
        if (rank === 1) return $t.victoryRoyale || 'VICTORY ROYALE!';
        if (rank === 2) return $t.greatGame || 'GREAT GAME!';
        if (rank === 3) return $t.onThePodium || 'ON THE PODIUM!';
        return $t.wellPlayed || 'WELL PLAYED! (GG)';
    }

    function getMyBadges(superlatives, playerId, dict) {
        if (!superlatives) return [];
        if (Array.isArray(superlatives)) {
            return superlatives
                .filter(s => s?.playerId === playerId)
                .map(s => ({
                    title: s.title || s.title_uk || s.name || '',
                    desc: s.description || s.description_uk || s.desc || ''
                }));
        }
        return Object.entries(superlatives)
            .filter(([k, v]) => v?.playerId === playerId)
            .map(([k, v]) => ({
                title: dict[`${k}Title`] || k,
                desc: dict[`${k}Desc`] || (v?.value ? `+${v.value} pts` : '')
            }));
    }

    function sendReaction(emoji) {
        if (!game?.id) return;
        sendMessage('send-lobby-emoji', { gameId: game.id, emoji });
    }
</script>

<div class="w-full h-full max-h-screen flex flex-col justify-between p-3 max-w-md mx-auto safe-top safe-bottom select-none font-sans overflow-hidden box-border">
    
    <!-- 1. Main Card: Scrollable Content with Clean Inline Spacing -->
    <div class="flex-1 flex flex-col justify-between bg-neutral-950/95 border-2 {currentRankStyle.border} {currentRankStyle.glow} rounded-2xl p-3.5 mb-2 min-h-0 overflow-y-auto space-y-2">
        
        <!-- Top Hero Rank & Avatar -->
        <div class="text-center flex flex-col items-center justify-start flex-shrink-0 pt-0.5">
            <!-- Rank Pill Badge -->
            <div class="inline-block px-3.5 py-1 rounded-xl {currentRankStyle.bg} font-sans font-black text-xs uppercase tracking-wider mb-1 shadow-md">
                {getRankTitle(myRank)}
            </div>

            <span class="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-widest block mb-1">
                {getRankSubtitle(myRank)}
            </span>

            <!-- Avatar Hero (115px) -->
            <div class="w-[115px] h-[115px] mx-auto my-2 relative flex-shrink-0">
                <PixelAvatar avatar={player?.avatar || '🦊'} className="w-full h-full" />
                {#if myRank === 1}
                    <div class="absolute -top-4 -right-1 text-3xl animate-bounce">
                        👑
                    </div>
                {/if}
            </div>

            <!-- Final Score Section with larger vertical padding -->
            <div class="mt-2 mb-1.5 flex-shrink-0">
                <span class="text-[10px] sm:text-[11px] font-display font-bold uppercase tracking-widest text-slate-400 block mb-2 mt-1">
                    {$t.finalScores || 'FINAL SCORE'}
                </span>
                
                <!-- Seamless Inline Score & PTS -->
                <div class="flex items-baseline justify-center gap-2">
                    <span class="text-4xl sm:text-5xl font-display font-black {currentRankStyle.scoreColor} leading-none drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]">
                        {(player?.score || 0).toLocaleString()}
                    </span>
                    <span class="text-sm font-sans font-bold text-slate-400 uppercase leading-none">PTS</span>
                </div>
            </div>
        </div>

        <!-- 2. Personal Superlatives & Accolades Badges -->
        <div class="pt-2 border-t border-neutral-800 flex-shrink-0">
            <span class="text-[9px] font-display font-bold uppercase tracking-widest text-amber-400 block text-center mb-1">
                🎖️ {$t.superlativesTitle || 'ACCOLADES & AWARDS'}
            </span>
            
            {#if game?.superlatives}
                {@const myBadges = getMyBadges(game.superlatives, player?.id, $t)}
                {#if myBadges.length > 0}
                    <div class="space-y-1">
                        {#each myBadges as badge}
                            <div class="p-2 rounded-xl bg-amber-950/40 border border-amber-500/50 shadow-sm text-center">
                                <span class="font-display font-black text-xs text-amber-300 block mb-0.5 leading-tight">
                                    {badge.title}
                                </span>
                                <span class="text-[10px] text-slate-300 font-sans leading-tight block">
                                    {badge.desc}
                                </span>
                            </div>
                        {/each}
                    </div>
                {:else}
                    <div class="p-2 rounded-xl bg-cyan-950/30 border border-cyan-500/40 text-center">
                        <span class="text-xs text-slate-300 font-sans font-semibold">
                            🎮 {$t.thanksForPlaying || 'Great battle of words! Thank you for playing.'}
                        </span>
                    </div>
                {/if}
            {:else}
                <div class="p-2 rounded-xl bg-cyan-950/30 border border-cyan-500/40 text-center">
                    <span class="text-xs text-slate-300 font-sans font-semibold">
                        🎮 {$t.thanksForPlaying || 'Great battle of words! Thank you for playing.'}
                    </span>
                </div>
            {/if}
        </div>

        <!-- 3. Action Buttons with Role-Aware Host vs Participant Permissions -->
        <div class="space-y-1.5 pt-1.5 border-t border-neutral-800 flex-shrink-0 pb-0.5">
            {#if game?.battleHistory && game.battleHistory.length > 0}
                <button
                    type="button"
                    on:click={() => showBattleHistory.set(true)}
                    class="btn-arcade w-full py-2.5 px-4 rounded-xl bg-cyan-500/20 border border-cyan-400 text-cyan-300 font-display font-black text-xs uppercase tracking-wider hover:bg-cyan-500/30 active:scale-98 transition-all cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                >
                    📜 {$t.viewBattleHistory || 'VIEW BATTLE HISTORY'}
                </button>
            {/if}

            {#if isHost}
                <!-- Host Only: Play Again & Menu -->
                <div class="flex gap-2">
                    <button
                        type="button"
                        on:click={() => sendMessage('play-again', { gameId: game.id, loading: true })}
                        class="btn-arcade flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-black font-display font-black text-xs uppercase tracking-wider shadow-md active:scale-98 transition-all cursor-pointer"
                    >
                        🔄 {$t.playAgain || 'PLAY AGAIN'}
                    </button>
                    <button
                        type="button"
                        on:click={resetToMenu}
                        class="btn-arcade px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-slate-300 font-display font-bold text-xs uppercase hover:border-slate-500 active:scale-98 transition-all cursor-pointer"
                    >
                        🏠 {$t.mainMenu || 'MENU'}
                    </button>
                </div>
            {:else}
                <!-- Regular Participant: Waiting for Host Banner -->
                <div class="p-2 rounded-xl bg-neutral-900/90 border border-neutral-800 text-center flex items-center justify-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                    <span class="text-xs font-sans text-slate-300 font-medium">
                        {$t.waitingForHostToRestart || 'Waiting for host to start a new game...'}
                    </span>
                </div>
            {/if}
        </div>
    </div>

    <!-- 4. Docked Live Emoji Reaction Bar (Option 1: 🔥, 😂, 💀, 💩, 🤮, 🤯) -->
    <footer class="pt-1 border-t border-neutral-800 flex-shrink-0">
        <span class="text-[9px] font-display font-bold text-slate-400 uppercase tracking-widest block text-center mb-1">
            {$t.sendReaction || 'SEND LIVE REACTION'}
        </span>
        <div class="flex justify-center items-center gap-2">
            {#each reactionEmojis as emoji}
                <button
                    type="button"
                    on:click={() => sendReaction(emoji)}
                    class="w-9 h-9 rounded-full bg-neutral-900 border border-neutral-700 hover:border-cyan-400 active:scale-125 flex items-center justify-center text-base shadow-sm transition-transform cursor-pointer"
                >
                    {emoji}
                </button>
            {/each}
        </div>
    </footer>
</div>