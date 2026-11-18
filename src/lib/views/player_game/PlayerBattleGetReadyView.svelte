<script>
    import { t } from '../../../stores.js';
    import SevenSegmentDisplay from '../../shared/SevenSegmentDisplay.svelte';
    import ArcadeIcon from '../../shared/ArcadeIcon.svelte';
    export let timer = 0;
</script>

<div class="w-full h-full flex flex-col justify-center items-center p-4 max-w-md md:max-w-lg mx-auto select-none font-sans text-center">
    <div class="w-full panel-arcade p-6 cut-lg flex flex-col items-center justify-center" style="--neon-color: var(--color-secondary);">
        <div class="w-12 h-12 cut-sm bg-[#0a0914] border-2 border-secondary flex items-center justify-center mb-3 text-secondary">
            <ArcadeIcon name="sword" className="w-7 h-7" />
        </div>

        <h1 class="text-2xl sm:text-3xl font-display tracking-wider uppercase mb-1 text-white">
            {$t.battleGetReadyTitle || 'BATTLE INCOMING!'}
        </h1>

        <h2 class="text-sm sm:text-base font-display text-fuchsia-300 tracking-widest uppercase mb-4">
            {$t.battlePhase || 'BATTLE PHASE'}
        </h2>

        <div class="my-2">
            <SevenSegmentDisplay time={timer} showLabel={false} size="md" />
        </div>

        <p class="text-xs sm:text-sm font-sans text-slate-300 mt-3 leading-relaxed">
            {$t.instructions2Text || 'Combine opponents\' words to craft the funniest winning punchlines!'}
        </p>
    </div>
</div>
