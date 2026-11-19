<!-- src/lib/shared/SevenSegmentDisplay.svelte -->
<script>
    import { t } from '../../stores.js';
    import SevenSegmentDigit from './SevenSegmentDigit.svelte';
    import HexBadge from './HexBadge.svelte';

    export let time = 0;
    export let showLabel = true;
    export let size = 'md'; // 'sm' (32px), 'md' (44px), 'lg' (60px), 'xl' (80px)
    export let disableLowWarning = false;
    export let hex = false;

    $: height = hex ? 32 : (size === 'sm' ? 32 : (size === 'lg' ? 60 : (size === 'xl' ? 80 : 44)));

    let digits = [0, 0, 0];
    $: isLow = !disableLowWarning && time <= 10 && time > 0;

    $: {
        const safeTime = Math.max(0, Math.min(999, parseInt(time, 10) || 0));
        const timeStr = String(safeTime).padStart(3, '0');
        digits = [parseInt(timeStr[0], 10), parseInt(timeStr[1], 10), parseInt(timeStr[2], 10)];
    }
</script>

<div class="flex flex-col items-center select-none {showLabel && !hex ? 'my-1.5' : ''}">
    {#if showLabel && !hex}
        <p class="font-display text-xs sm:text-sm text-amber-300 mb-1 uppercase tracking-widest">{$t.timeRemaining || 'Time Remaining'}</p>
    {/if}
    {#if hex}
        <HexBadge
            bgClass="bg-[#070610]"
            borderClass={isLow ? 'text-danger' : 'text-amber-400/90'}
            className="px-6 sm:px-7 py-2"
        >
            <SevenSegmentDigit digit={digits[0]} {isLow} {height} />
            <SevenSegmentDigit digit={digits[1]} {isLow} {height} />
            <SevenSegmentDigit digit={digits[2]} {isLow} {height} />
        </HexBadge>
    {:else}
        <div class="cut-sm px-3 py-1.5 bg-[#070610] border-2 shadow-inner flex items-center gap-1.5 sm:gap-2 {isLow ? 'border-danger' : 'border-[#332e59]'}">
            <SevenSegmentDigit digit={digits[0]} {isLow} {height} />
            <SevenSegmentDigit digit={digits[1]} {isLow} {height} />
            <SevenSegmentDigit digit={digits[2]} {isLow} {height} />
        </div>
    {/if}
</div>
