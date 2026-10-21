<script>
    import { t, gamePhase, phaseTimer, currentRound } from '../../../stores.js';
    import SevenSegmentDisplay from '../../shared/SevenSegmentDisplay.svelte';

    $: isBattleGetReady = $gamePhase === 'battle_get_ready';
    $: isVotingGetReady = $gamePhase === 'voting_get_ready';
    $: titleText = isBattleGetReady 
        ? ($t.battleGetReadyTitle || 'BATTLE INCOMING!') 
        : (isVotingGetReady ? ($t.votingGetReadyTitle || 'GET READY TO VOTE!') : ($t.getReadyTitle || 'GET READY!'));
    $: subtitleText = isBattleGetReady 
        ? ($t.battlePhase || 'BATTLE PHASE') 
        : (isVotingGetReady ? ($t.votingPhase || 'VOTING PHASE') : ($t.getReadySubtitle?.replace('{currentRound}', $currentRound) || `ROUND ${$currentRound} IS COMING UP!`));
    $: phaseIcon = isBattleGetReady ? '⚔️' : (isVotingGetReady ? '🗳️' : '⚡');
    $: themeBorderColor = isBattleGetReady ? 'border-fuchsia-500 text-fuchsia-400' : (isVotingGetReady ? 'border-emerald-500 text-emerald-400' : 'border-cyan-400 text-cyan-400');
</script>

<!-- Phase: Get Ready Splashes -->
<main class="flex-1 flex flex-col items-center justify-center my-auto py-2 min-h-0">
    <div class="w-full max-w-2xl bg-neutral-950/90 border-2 {themeBorderColor} rounded-3xl p-6 sm:p-8 md:p-10 shadow-[0_0_40px_rgba(0,0,0,0.9)] backdrop-blur-md flex flex-col items-center text-center my-auto">
        <div class="text-4xl sm:text-5xl md:text-6xl mb-2 sm:mb-3 animate-bounce">{phaseIcon}</div>
        <h1 class="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-display font-black tracking-wider uppercase mb-1 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">{titleText}</h1>
        <h2 class="text-base sm:text-lg md:text-xl lg:text-2xl font-display font-bold text-cyan-300 tracking-widest uppercase mb-4">{subtitleText}</h2>
        <div class="mb-2 sm:mb-3">
            <SevenSegmentDisplay time={$phaseTimer} size="lg" />
        </div>
        <p class="text-[11px] sm:text-xs md:text-sm font-mono text-slate-300 uppercase tracking-widest mt-1 animate-pulse font-bold">
            {$t.prepareControllers || 'Prepare your controllers'}
        </p>
    </div>
</main>
