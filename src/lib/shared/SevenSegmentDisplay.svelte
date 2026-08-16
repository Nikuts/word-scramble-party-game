<script>
    import { t } from '../../stores.js';
    import SevenSegmentDigit from './SevenSegmentDigit.svelte';

    export let time = 0;

    let digits = [0, 0, 0];
    $: isLow = time <= 10 && time > 0;

    $: {
        const timeStr = String(time || 0).padStart(3, '0');
        digits = [parseInt(timeStr[0]), parseInt(timeStr[1]), parseInt(timeStr[2])];
    }
</script>

<div class="flex flex-col items-center my-4">
    <p class="font-display text-base text-yellow-400 mb-2">{$t.timeRemaining}</p>
    <div class="segment-display">
        <SevenSegmentDigit digit={digits[0]} {isLow} />
        <SevenSegmentDigit digit={digits[1]} {isLow} />
        <SevenSegmentDigit digit={digits[2]} {isLow} />
    </div>
</div>