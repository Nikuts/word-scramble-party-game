<script>
    import { t } from '../../../stores.js';
    import SevenSegmentDisplay from '../../shared/SevenSegmentDisplay.svelte';
    export let timer = 0;
</script>

<div class="w-full h-full flex flex-col justify-center items-center p-4 max-w-md mx-auto select-none font-sans text-center">
    <div class="w-full panel-arcade p-6 rounded-3xl border-2 border-fuchsia-400/80 bg-neutral-950/90 shadow-[0_0_25px_rgba(236,72,153,0.4)] flex flex-col items-center justify-center backdrop-blur-md">
        <div class="text-4xl sm:text-5xl mb-2 animate-bounce">⚔️</div>
        
        <h1 class="text-2xl sm:text-3xl font-display font-black tracking-wider uppercase mb-1 text-white drop-shadow-[0_0_15px_rgba(236,72,153,0.8)]">
            {$t.battleGetReadyTitle || 'BATTLE INCOMING!'}
        </h1>
        
        <h2 class="text-sm sm:text-base font-display font-bold text-fuchsia-300 tracking-widest uppercase mb-4">
            {$t.battlePhase || 'BATTLE PHASE'}
        </h2>
        
        <div class="scale-90 my-2">
            <SevenSegmentDisplay time={timer} showLabel={false} />
        </div>
        
        <p class="text-xs font-sans text-slate-300 mt-3 leading-relaxed">
            💥 {$t.instructions2Text || 'Combine opponents\' words to craft the funniest winning punchlines!'}
        </p>
    </div>
</div>