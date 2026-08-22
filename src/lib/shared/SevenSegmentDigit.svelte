<!-- src/lib/shared/SevenSegmentDigit.svelte -->
<script>
    export let digit = 0;
    export let isLow = false;
    export let height = 46;

    const segmentMap = {
        0: [1, 1, 1, 1, 1, 1, 0], // a,b,c,d,e,f,g
        1: [0, 1, 1, 0, 0, 0, 0],
        2: [1, 1, 0, 1, 1, 0, 1],
        3: [1, 1, 1, 1, 0, 0, 1],
        4: [0, 1, 1, 0, 0, 1, 1],
        5: [1, 0, 1, 1, 0, 1, 1],
        6: [1, 0, 1, 1, 1, 1, 1],
        7: [1, 1, 1, 0, 0, 0, 0],
        8: [1, 1, 1, 1, 1, 1, 1],
        9: [1, 1, 1, 1, 0, 1, 1],
    };

    $: safeDigit = Number.isInteger(digit) ? Math.abs(digit) % 10 : (parseInt(digit, 10) || 0);
    $: segments = segmentMap[safeDigit] || segmentMap[0];

    // Colors: Lit segment color (Amber normally, Red when <= 10s), Unlit dark segment
    $: litColor = isLow ? '#ef4444' : '#facc15';
    $: unlitColor = '#1f1f23';
    $: glowFilter = isLow ? 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.8))' : 'drop-shadow(0 0 4px rgba(250, 204, 21, 0.7))';
</script>

<svg 
    viewBox="0 0 60 102" 
    style="height: {height}px; width: {Math.round(height * 0.58)}px;"
    class="select-none inline-block flex-shrink-0"
    class:animate-pulse={isLow}
    role="img"
    aria-label={String(safeDigit)}
>
    <!-- Segment A (Top) -->
    <polygon 
        points="10,9  16,3  44,3  50,9  44,15 16,15" 
        fill={segments[0] ? litColor : unlitColor} 
        style={segments[0] ? `filter: ${glowFilter};` : ''}
    />

    <!-- Segment B (Top-Right) -->
    <polygon 
        points="51,10 57,16 57,44 51,50 45,44 45,16" 
        fill={segments[1] ? litColor : unlitColor} 
        style={segments[1] ? `filter: ${glowFilter};` : ''}
    />

    <!-- Segment C (Bottom-Right) -->
    <polygon 
        points="51,52 57,58 57,86 51,92 45,86 45,58" 
        fill={segments[2] ? litColor : unlitColor} 
        style={segments[2] ? `filter: ${glowFilter};` : ''}
    />

    <!-- Segment D (Bottom) -->
    <polygon 
        points="10,93 16,87 44,87 50,93 44,99 16,99" 
        fill={segments[3] ? litColor : unlitColor} 
        style={segments[3] ? `filter: ${glowFilter};` : ''}
    />

    <!-- Segment E (Bottom-Left) -->
    <polygon 
        points="9,52 15,58 15,86 9,92 3,86 3,58" 
        fill={segments[4] ? litColor : unlitColor} 
        style={segments[4] ? `filter: ${glowFilter};` : ''}
    />

    <!-- Segment F (Top-Left) -->
    <polygon 
        points="9,10 15,16 15,44 9,50 3,44 3,16" 
        fill={segments[5] ? litColor : unlitColor} 
        style={segments[5] ? `filter: ${glowFilter};` : ''}
    />

    <!-- Segment G (Middle) -->
    <polygon 
        points="10,51 16,45 44,45 50,51 44,57 16,57" 
        fill={segments[6] ? litColor : unlitColor} 
        style={segments[6] ? `filter: ${glowFilter};` : ''}
    />
</svg>