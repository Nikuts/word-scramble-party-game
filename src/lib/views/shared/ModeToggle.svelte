<script>
    import { createEventDispatcher } from 'svelte';

    export let label = '';
    export let description = '';
    export let icon = '';
    export let color = '#39FF14'; // neon-green default
    export let checked = false;

    const dispatch = createEventDispatcher();

    function handleChange(e) {
        dispatch('change', e.currentTarget.checked);
    }
</script>

<label 
    class="flex items-center p-3 cursor-pointer transition-all duration-200 border-2 rounded-lg {
        !checked ? 'bg-black/50 border-slate-700 hover:bg-slate-800/50' : ''
    }"
    style={checked ? `--neon-color: ${color}; border-color: ${color}; box-shadow: 0 0 10px ${color}; background-color: ${color}20;` : ''}
>
    <div class="flex-shrink-0 text-3xl mr-4">{icon}</div>
    <div class="flex-grow text-left">
        <p class="font-bold font-display text-lg leading-tight">{label}</p>
        <p class="text-xs text-slate-400">{description}</p>
    </div>
    <div class="relative">
        <input type="checkbox" class="sr-only" {checked} on:change={handleChange}>
        <div class="block bg-slate-600 w-14 h-8 rounded-full"></div>
        <div 
            class="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform duration-300"
            style="transform: {checked ? `translateX(1.5rem)` : 'translateX(0)'}; background-color: {checked ? color : '#e2e8f0'};"
        ></div>
    </div>
</label>