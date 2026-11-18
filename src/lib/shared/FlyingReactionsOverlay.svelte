<!-- src/lib/shared/FlyingReactionsOverlay.svelte -->
<script>
    import { t, flyingEmojis } from '../../stores.js';
    import PixelAvatar from './PixelAvatar.svelte';
    import ArcadeIcon from './ArcadeIcon.svelte';

    function removeEmoji(id) {
        flyingEmojis.update(all => all.filter(e => e.id !== id));
    }

    const badgeMeta = {
        hype: { border: '#00e5ff', bg: '#082f49', text: '#67e8f9', labelKey: 'hype', fallback: 'HYPE' },
        lol: { border: '#ff2a85', bg: '#500724', text: '#f9a8d4', labelKey: 'lol', fallback: 'LOL' },
        poop: { border: '#f97316', bg: '#451a03', text: '#fdba74', labelKey: 'poop', fallback: 'POOP' },
        king: { border: '#facc15', bg: '#422006', text: '#fde047', labelKey: 'king', fallback: 'KING' }
    };
</script>

<div class="fixed inset-x-0 top-16 bottom-0 pointer-events-none overflow-hidden z-40" style="transform: translateZ(0); isolation: isolate;">
    {#each $flyingEmojis as item (item.id)}
        {@const startX = item.startX ?? 50}
        {@const endX = item.endX ?? startX}
        {@const startRotate = item.startRotate ?? 0}
        {@const endRotate = item.endRotate ?? 0}
        {@const reaction = item.reaction || 'avatar'}
        {@const badge = badgeMeta[reaction]}
        <div
            class="flying-emoji flex items-center justify-center"
            style="--start-x: {startX}vw; --end-x: {endX}vw; --start-rotate: {startRotate}deg; --end-rotate: {endRotate}deg;"
            on:animationend={() => removeEmoji(item.id)}
        >
            {#if badge}
                {@const label = $t[badge.labelKey] || badge.fallback}
                {@const badgeWidth = Math.max(128, label.length * 14 + 54)}
                <svg viewBox="0 0 {badgeWidth} 52" class="h-11 sm:h-12 w-auto overflow-visible select-none pointer-events-none" aria-label={label}>
                    <polygon
                        points="10,2 {badgeWidth - 4},2 {badgeWidth - 4},40 {badgeWidth - 12},50 4,50 4,12"
                        fill={badge.bg}
                        stroke={badge.border}
                        stroke-width="2.5"
                    />
                    <svg x="13" y="13" width="25" height="25" style="color: {badge.text};">
                        <ArcadeIcon name={reaction} className="w-full h-full" />
                    </svg>
                    <text
                        x={(badgeWidth + 32) / 2}
                        y="32"
                        text-anchor="middle"
                        fill={badge.text}
                        font-family="Russo One, JetBrains Mono, sans-serif"
                        font-size="18"
                        letter-spacing="1.2"
                    >{label}</text>
                </svg>
            {:else}
                <div class="w-16 h-16 sm:w-20 sm:h-20 select-none pointer-events-none">
                    <PixelAvatar avatar={item.avatar} className="w-full h-full" />
                </div>
            {/if}
        </div>
    {/each}
</div>
