<script>
    export let digit = 0;
    export let isLow = false;

    const segmentMap = {
        '0': [1, 1, 1, 1, 1, 1, 0], // a,b,c,d,e,f,g
        '1': [0, 1, 1, 0, 0, 0, 0],
        '2': [1, 1, 0, 1, 1, 0, 1],
        '3': [1, 1, 1, 1, 0, 0, 1],
        '4': [0, 1, 1, 0, 0, 1, 1],
        '5': [1, 0, 1, 1, 0, 1, 1],
        '6': [1, 0, 1, 1, 1, 1, 1],
        '7': [1, 1, 1, 0, 0, 0, 0],
        '8': [1, 1, 1, 1, 1, 1, 1],
        '9': [1, 1, 1, 1, 0, 1, 1],
    };
    
    $: segments = segmentMap[digit] || segmentMap[0];
</script>

<div 
    class="digit" 
    class:flashing={isLow}
    style="--seg-a: {segments[0]}; --seg-b: {segments[1]}; --seg-c: {segments[2]}; --seg-d: {segments[3]}; --seg-e: {segments[4]}; --seg-f: {segments[5]}; --seg-g: {segments[6]};"
>
    <!-- Horizontal segments -->
    <div class="segment h-segment seg-a"></div>
    <div class="segment h-segment seg-g"></div>
    <div class="segment h-segment seg-d"></div>

    <!-- Vertical segments -->
    <div class="segment v-segment seg-f"></div>
    <div class="segment v-segment seg-b"></div>
    <div class="segment v-segment seg-e"></div>
    <div class="segment v-segment seg-c"></div>
</div>