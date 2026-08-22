<!-- src/lib/shared/SevenSegmentDisplay.svelte -->
<script>
    import { t } from '../../stores.js';
    import SevenSegmentDigit from './SevenSegmentDigit.svelte';

    export let time = 0;
    export let showLabel = true;
    export let size = 'md'; // 'sm' (32px), 'md' (44px), 'lg' (60px), 'xl' (80px)

    $: height = size === 'sm' ? 32 : (size === 'lg' ? 60 : (size === 'xl' ? 80 : 44));

    let digits = [0, 0, 0];
    $: isLow = time <= 10 && time > 0;

    $: {
        const safeTime = Math.max(0, Math.min(999, parseInt(time, 10) || 0));
        const timeStr = String(safeTime).padStart(3, '0');
        digits = [parseInt(timeStr[0], 10), parseInt(timeStr[1], 10), parseInt(timeStr[2], 10)];
    }
</script>

<div class="flex flex-col items-center select-none {showLabel ? 'my-2' : ''}">
    {#if showLabel}
        <p class="font-display text-xs sm:text-sm text-yellow-400 mb-1.5 uppercase tracking-widest">{$t.timeRemaining || 'Time Remaining'}</p>
    {/if}
    <div class="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 bg-neutral-950/90 border-2 border-neutral-800 rounded-2xl shadow-inner backdrop-blur-md">
        <SevenSegmentDigit digit={digits[0]} {isLow} {height} />
        <SevenSegmentDigit digit={digits[1]} {isLow} {height} />
        <SevenSegmentDigit digit={digits[2]} {isLow} {height} />
    </div>
</div>