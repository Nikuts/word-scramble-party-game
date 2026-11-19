<!-- src/lib/shared/HexBadge.svelte -->
<script>
    export let borderClass = 'text-amber-400/90';
    export let bgClass = 'bg-[#0e0b22]';
    export let className = '';
</script>

<div class="relative cut-hex {bgClass} {className} flex items-center justify-center">
    <svg
        class="absolute inset-0 w-full h-full pointer-events-none {borderClass}"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
    >
        <polygon
            points="14,1.5 86,1.5 98.8,50 86,98.5 14,98.5 1.2,50"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            vector-effect="non-scaling-stroke"
            stroke-linejoin="miter"
        />
    </svg>
    <div class="relative z-10 flex items-center justify-center gap-1.5">
        <slot />
    </div>
</div>
