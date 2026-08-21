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
>
    <!-- Horizontal segments -->
    <div class="segment h-segment seg-a" class:lit={segments[0] === 1}></div>
    <div class="segment h-segment seg-g" class:lit={segments[6] === 1}></div>
    <div class="segment h-segment seg-d" class:lit={segments[3] === 1}></div>

    <!-- Vertical segments -->
    <div class="segment v-segment seg-f" class:lit={segments[5] === 1}></div>
    <div class="segment v-segment seg-b" class:lit={segments[1] === 1}></div>
    <div class="segment v-segment seg-e" class:lit={segments[4] === 1}></div>
    <div class="segment v-segment seg-c" class:lit={segments[2] === 1}></div>
</div>