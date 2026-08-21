<!-- src/lib/views/player_game/PlayerBattleRevealView.svelte -->
<script>
    import { t, sendMessage } from '../../../stores.js';
    import SevenSegmentDisplay from '../../shared/SevenSegmentDisplay.svelte';
    import PixelAvatar from '../../shared/PixelAvatar.svelte';

    export let timer;
    export let battle = null;
    export let player = null;
    export let players = [];

    $: isCompetitor = battle && player && battle.competitors?.includes(player.id);
    $: isWinner = isCompetitor && (battle.winnerId === player.id || (Array.isArray(battle.winnerId) && battle.winnerId.includes(player.id)));
    
    $: myScoreBreakdown = (isCompetitor && battle?.scoreBreakdown?.[player.id]) || {
        votes: 0,
        votePoints: 0,
        winBonus: 0,
        sweepBonus: 0,
        rainbowBonus: 0,
        total: 0
    };

    $: pointsAwarded = (isCompetitor && battle?.pointsAwarded?.[player.id]) || 0;
    
    // Players who voted for me
    $: votersForMe = Object.entries(battle?.votes || {})
        .filter(([_, votedForId]) => votedForId === player?.id)
        .map(([voterId, _]) => players.find(p => p.id === voterId))
        .filter(Boolean);

    function renderAnswer(answer) {
        if (typeof answer === 'string') {
            if (answer === '::TIMEOUT::') return `(${$t.noAnswerSubmitted || 'No answer'})`;
            return answer;
        }
        if (typeof answer === 'object' && answer !== null && (answer.title || answer.tagline)) {
            let title = (answer.title || '').trim();
            let tagline = (answer.tagline || '').trim();
            if (title === '::TIMEOUT::') title = `(${$t.noAnswerSubmitted || 'No answer'})`;
            return `"${title}"\n${tagline}`;
        }
        return `(${$t.noAnswerSubmitted || 'No answer'})`;
    }

    const reactionEmojis = ['🔥', '😂', '💀', '💩', '🤮', '🤯'];

    function sendReaction(emoji) {
        if (!battle || !player) return;
        sendMessage('send-lobby-emoji', {
            emoji: emoji
        });
    }
</script>

<div class="w-full h-full max-h-full min-h-0 flex flex-col justify-between p-3 pb-[max(8px,env(safe-area-inset-bottom))] max-w-md mx-auto select-none font-sans overflow-hidden box-border">
    
    <!-- Top Header: Bounded Format Badge & Countdown Timer -->
    <header class="flex items-center justify-between gap-2 mb-2 flex-shrink-0 bg-neutral-950/90 border border-neutral-800 rounded-xl px-3 py-1.5 backdrop-blur-md">
        <span class="inline-flex items-center justify-center px-3 py-0.5 rounded-full text-[11px] font-display font-black uppercase tracking-wider bg-purple-950 text-purple-300 border border-purple-500/50 flex-shrink-0">
            {#if battle?.competitors?.length === 4}
                {$t.quadLabel || '🔥 4-WAY BRAWL'}
            {:else if battle?.competitors?.length === 3}
                {$t.brawlLabel || '💥 3-WAY BRAWL'}
            {:else}
                {$t.duoLabel || '⚡ 1-ON-1 SHOWDOWN'}
            {/if}
        </span>
        <div class="flex-shrink-0 scale-75 origin-right">
            <SevenSegmentDisplay time={timer} showLabel={false} />
        </div>
    </header>

    <!-- Battle Prompt -->
    {#if battle?.prompt}
        <div class="bg-neutral-950/90 border border-neutral-800 rounded-2xl p-3 mb-2.5 text-center shadow-md flex-shrink-0">
            <span class="text-xs font-display font-bold text-cyan-400 uppercase tracking-widest block mb-1">
                {$t.battlePrompt || 'BATTLE PROMPT'}
            </span>
            <p class="text-sm sm:text-base font-bold text-slate-100 leading-snug">
                {battle.prompt}
            </p>
        </div>
    {/if}

    {#if isCompetitor}
        <!-- 🏆 Competitor Results Card (Winner or Runner-up) -->
        <main class="flex-1 flex flex-col justify-between p-4 bg-neutral-950/90 border-2 {isWinner ? 'border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.5)]' : 'border-slate-600'} rounded-2xl overflow-y-auto">
            
            <div>
                <!-- Status Banner -->
                <div class="w-full py-1.5 px-3 rounded-xl text-center font-display font-black text-sm sm:text-base uppercase tracking-wider mb-2.5 {
                    isWinner 
                    ? 'bg-amber-400 text-black shadow-md' 
                    : 'bg-neutral-800 text-slate-300'
                }">
                    <span>{isWinner ? ($t.youWonTheBattle || '👑 YOU WON THE BATTLE!') : ($t.runnerUp || 'RUNNER-UP')}</span>
                </div>

                <!-- Punchline -->
                <div class="text-center my-2">
                    <span class="text-[10px] font-display font-bold text-slate-400 uppercase tracking-widest block mb-1">
                        {$t.yourAnswer || 'Your Punchline'}
                    </span>
                    <div class="bg-black/80 border border-neutral-700 rounded-xl p-3 text-sm sm:text-base font-bold text-white leading-relaxed">
                        {renderAnswer(battle?.answers?.[player?.id])}
                    </div>
                </div>

                <!-- Points Breakdown -->
                <div class="flex flex-col items-center justify-center my-2.5 text-center">
                    <span class="font-display font-black text-3xl sm:text-4xl text-amber-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]">
                        +{pointsAwarded.toLocaleString()} PTS
                    </span>
                    
                    {#if myScoreBreakdown.rainbowBonus > 0}
                        <div class="flex justify-center my-1.5">
                            <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-display font-black tracking-wide bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-cyan-500/20 border border-pink-400 text-pink-300 shadow-[0_0_10px_rgba(236,72,153,0.4)] animate-pulse">
                                {$t.rainbowBadge || '🌈 Rainbow Bonus'} (+{myScoreBreakdown.rainbowBonus})
                            </span>
                        </div>
                    {/if}

                    <div class="flex flex-wrap items-center justify-center gap-2 mt-1.5 text-xs font-mono">
                        <span class="px-2.5 py-1 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-200 font-bold">
                            🗳️ {myScoreBreakdown.votes} {myScoreBreakdown.votes === 1 ? ($t.vote || 'Vote') : ($t.votes || 'Votes')} (+{myScoreBreakdown.votePoints})
                        </span>
                        {#if myScoreBreakdown.winBonus > 0}
                            <span class="px-2.5 py-1 rounded-lg bg-amber-950 border border-amber-500 text-amber-300 font-bold">
                                🏆 {$t.winBonus || 'Win Bonus'} (+{myScoreBreakdown.winBonus})
                            </span>
                        {/if}
                        {#if myScoreBreakdown.sweepBonus > 0}
                            <span class="px-2.5 py-1 rounded-lg bg-purple-950 border border-purple-500 text-purple-300 font-bold">
                                🧹 {$t.sweepBonus || 'Clean Sweep'} (+{myScoreBreakdown.sweepBonus})
                            </span>
                        {/if}
                    </div>
                </div>
            </div>

            <!-- Voters List -->
            {#if votersForMe.length > 0}
                <div class="border-t border-neutral-800 pt-2 mt-2">
                    <span class="text-[9px] font-display font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        {$t.votedForYou || 'VOTED FOR YOU'}:
                    </span>
                    <div class="flex flex-wrap gap-1.5">
                        {#each votersForMe as voter}
                            <div class="flex items-center gap-1 bg-neutral-900 border border-neutral-700 px-2 py-0.5 rounded-lg text-xs font-semibold text-slate-200">
                                <div class="w-4 h-4 flex-shrink-0">
                                    <PixelAvatar avatar={voter.avatar} className="w-full h-full" />
                                </div>
                                <span>{voter.name}</span>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}
        </main>
    {:else}
        <!-- 📺 Spectator / Voter View during Reveal -->
        <main class="flex-1 flex flex-col justify-center items-center text-center p-4 bg-neutral-950/80 border border-neutral-800 rounded-2xl my-auto">
            <h2 class="text-xl sm:text-2xl font-display font-black text-amber-400 uppercase tracking-wider mb-2">
                {$t.battleReveal || 'BATTLE RESULTS'}
            </h2>
            <p class="text-xs sm:text-sm text-slate-300 font-sans max-w-xs animate-pulse">
                {$t.lookAtHostScreen || 'Watch the host screen to see the winning punchline and points breakdown!'}
            </p>
        </main>
    {/if}

    <!-- Docked Live Emoji Reaction Bar -->
    <footer class="mt-2.5 pt-2 border-t border-neutral-800 flex-shrink-0">
        <span class="text-[9px] font-display font-bold text-slate-400 uppercase tracking-widest block text-center mb-1.5">
            {$t.sendReaction || 'REACT LIVE'}
        </span>
        <div class="flex justify-center items-center gap-2">
            {#each reactionEmojis as emoji}
                <button
                    type="button"
                    on:click={() => sendReaction(emoji)}
                    class="w-10 h-10 rounded-full bg-neutral-900 border border-neutral-700 hover:border-cyan-400 active:scale-125 flex items-center justify-center text-lg shadow-sm transition-transform cursor-pointer"
                >
                    {emoji}
                </button>
            {/each}
        </div>
    </footer>
</div>