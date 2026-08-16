<script>
    import { t } from '../../../stores.js';
    import SevenSegmentDisplay from '../../shared/SevenSegmentDisplay.svelte';
    export let timer;
</script>

<div class="flex flex-col justify-center items-center w-full h-full flex-grow text-center py-8">
    <SevenSegmentDisplay time={timer} />
    <h1 class="font-display text-2xl sm:text-4xl md:text-5xl my-4 text-primary animate-pulse" style="text-shadow: 0 0 10px var(--color-primary);">{$t.votingGetReadyTitle}</h1>
    <h2 class="font-display text-lg sm:text-2xl md:text-3xl text-accent" style="text-shadow: 0 0 8px var(--color-accent);">{$t.votingPhase}</h2>
</div>