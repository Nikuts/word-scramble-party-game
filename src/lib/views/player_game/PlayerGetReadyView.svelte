<script>
    import { t } from '../../../stores.js';
    import SevenSegmentDisplay from '../../shared/SevenSegmentDisplay.svelte';
    import ArcadeIcon from '../../shared/ArcadeIcon.svelte';
    export let timer = 0;
    export let round = 1;
</script>

<div class="w-full h-full flex flex-col justify-center items-center p-4 max-w-md md:max-w-lg mx-auto select-none font-sans text-center">
    <div class="w-full panel-arcade p-6 cut-lg flex flex-col items-center justify-center" style="--neon-color: var(--color-primary);">
        <div class="w-12 h-12 cut-sm bg-[#0a0914] border-2 border-primary flex items-center justify-center mb-3 text-primary">
            <ArcadeIcon name="bolt" className="w-7 h-7" />
        </div>

        <h1 class="text-2xl sm:text-3xl font-display tracking-wider uppercase mb-1 text-white">
            {$t.getReadyTitle || 'GET READY!'}
        </h1>

        <h2 class="text-sm sm:text-base font-display text-cyan-300 tracking-widest uppercase mb-4">
            {$t.getReadySubtitle?.replace('{currentRound}', round) || `ROUND ${round} IS COMING UP!`}
        </h2>

        <div class="my-2">
            <SevenSegmentDisplay time={timer} showLabel={false} size="md" />
        </div>

        <p class="text-xs sm:text-sm font-sans text-slate-300 mt-3 leading-relaxed">
            {$t.instructions1Text || 'Answer funny questions with at least 5 words to fuel the battle word banks!'}
        </p>
    </div>
</div>
