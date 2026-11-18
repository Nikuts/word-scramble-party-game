<!-- src/lib/shared/SvgReactionButtons.svelte -->
<script>
    import { createEventDispatcher } from 'svelte';
    import { t, sendReaction } from '../../stores.js';
    import ArcadeIcon from './ArcadeIcon.svelte';

    export let compact = false;

    const dispatch = createEventDispatcher();

    let cooldown = false;

    $: reactionButtons = [
        { id: 'hype', label: $t.hype || 'HYPE', icon: 'hype', colorClass: 'border-cyan-400/80 bg-cyan-950/70 text-cyan-300 hover:bg-cyan-900/90' },
        { id: 'lol', label: $t.lol || 'LOL', icon: 'lol', colorClass: 'border-pink-400/80 bg-pink-950/70 text-pink-300 hover:bg-pink-900/90' },
        { id: 'poop', label: $t.poop || 'POOP', icon: 'poop', colorClass: 'border-orange-500/80 bg-orange-950/75 text-orange-300 hover:bg-orange-900/90' },
        { id: 'king', label: $t.king || 'KING', icon: 'king', colorClass: 'border-amber-400/80 bg-amber-950/70 text-amber-300 hover:bg-amber-900/90' }
    ];

    function triggerReaction(id) {
        if (cooldown) return;
        sendReaction(id);
        dispatch('react', { reaction: id });
        cooldown = true;
        setTimeout(() => { cooldown = false; }, 380);
    }
</script>

<div class="w-full flex flex-col items-center">
    <span class="text-[9px] sm:text-[10px] font-display text-slate-400 uppercase tracking-widest block text-center mb-1.5">
        {$t.liveReactions || 'LIVE REACTIONS'}
    </span>
    <div class="grid grid-cols-4 gap-1.5 sm:gap-2 w-full max-w-sm">
        {#each reactionButtons as btn (btn.id)}
            <button
                type="button"
                data-testid="send-reaction-btn"
                data-reaction={btn.id}
                aria-label={`${btn.label} reaction`}
                on:click={() => triggerReaction(btn.id)}
                class="cut-sm border-2 {btn.colorClass} {compact ? 'py-1.5 px-1 gap-1' : 'py-2 px-1.5 gap-1.5'} flex flex-col items-center justify-center transition-all active:scale-95 cursor-pointer select-none shadow-sm"
            >
                <ArcadeIcon name={btn.icon} className="w-5 h-5 sm:w-6 sm:h-6" />
                <span class="font-display text-[10px] sm:text-xs tracking-wider leading-none">{btn.label}</span>
            </button>
        {/each}
    </div>
</div>
