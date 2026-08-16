<script>
    import { t } from '../../../stores.js';
    import SevenSegmentDisplay from '../../shared/SevenSegmentDisplay.svelte';

    export let timer;
</script>

<div class="w-full max-w-4xl mx-auto text-center flex-grow flex flex-col justify-center items-center py-8">
    <SevenSegmentDisplay time={timer} />
    <h1 class="font-display text-3xl sm:text-5xl my-4 text-accent" style="text-shadow: 0 0 10px var(--color-accent);">{$t.battleReveal}</h1>
    <p class="mt-8 text-xl sm:text-2xl font-display text-primary animate-pulse">{$t.pleaseWait}</p>
</div>