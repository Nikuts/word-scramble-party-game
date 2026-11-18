<!-- src/lib/shared/ArcadeIcon.svelte -->
<script>
    import { t } from '../../stores.js';
    export let name = 'bolt';
    export let className = 'w-4 h-4';
</script>

<svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2.1"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="inline-block flex-shrink-0 {className}"
    aria-hidden="true"
>
    {#if name === 'sword'}
        <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
        <path d="M13 19l6-6" />
        <path d="M16 16l4 4" />
        <path d="M19 21l2-2" />
    {:else if name === 'bolt'}
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    {:else if name === 'clock'}
        <circle cx="12" cy="12" r="9" />
        <polyline points="12 7 12 12 15.5 14" />
    {:else if name === 'trophy'}
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    {:else if name === 'crown'}
        <path d="M2 18h20l-2-10-4.5 4-3.5-7-3.5 7L4 8l-2 10z" />
        <path d="M4 21h16" />
    {:else if name === 'vote'}
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    {:else if name === 'palette'}
        <circle cx="13.5" cy="6.5" r="1.2" fill="currentColor" />
        <circle cx="17.5" cy="10.5" r="1.2" fill="currentColor" />
        <circle cx="8.5" cy="7.5" r="1.2" fill="currentColor" />
        <circle cx="6.5" cy="12.5" r="1.2" fill="currentColor" />
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.6-.7 1.6-1.6 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.6 1.6-1.6H16c3.3 0 6-2.7 6-6 0-4.9-4.5-8.6-10-8.6Z" />
    {:else if name === 'sparkles'}
        <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
        <path d="M5 3v4" />
        <path d="M3 5h4" />
        <path d="M19 17v4" />
        <path d="M17 19h4" />
    {:else if name === 'snail'}
        <path d="M2 14a8 8 0 0 1 16 0v2H4a2 2 0 0 1-2-2Z" />
        <circle cx="10" cy="12" r="3" />
        <path d="M18 16h3a1 1 0 0 0 1-1v-2a2 2 0 0 0-2-2h-1" />
        <path d="M20 7l1 4" />
    {:else if name === 'flame' || name === 'hype'}
        <path
            d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5Z"
            fill={name === 'hype' ? 'currentColor' : 'none'}
            fill-opacity={name === 'hype' ? '0.28' : undefined}
        />
    {:else if name === 'smile'}
        <circle cx="12" cy="12" r="9" />
        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
        <line x1="9" y1="9" x2="9.01" y2="9" />
        <line x1="15" y1="9" x2="15.01" y2="9" />
    {:else if name === 'refresh'}
        <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
        <path d="M3 21v-5h5" />
    {:else if name === 'plus'}
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
    {:else if name === 'tv'}
        <rect x="2" y="7" width="20" height="13" rx="2" />
        <polyline points="17 2 12 7 7 2" />
    {:else if name === 'shuffle'}
        <polyline points="16 3 21 3 21 8" />
        <line x1="4" y1="20" x2="21" y2="3" />
        <polyline points="21 16 21 21 16 21" />
        <line x1="15" y1="15" x2="21" y2="21" />
        <line x1="4" y1="4" x2="9" y2="9" />
    {:else if name === 'undo'}
        <path d="M3 7v6h6" />
        <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
    {:else if name === 'trash'}
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
    {:else if name === 'history'}
        <path d="M3 3v5h5" />
        <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
        <path d="M12 7v5l4 2" />
    {:else if name === 'arrow-left'}
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
    {:else if name === 'home'}
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
    {:else if name === 'check'}
        <polyline points="20 6 9 17 4 12" />
    {:else if name === 'warning'}
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
    {:else if name === 'copy'}
        <rect x="9" y="9" width="13" height="13" rx="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    {:else if name === 'book'}
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    {:else if name === 'close'}
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    {:else if name === 'rotate'}
        <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
    {:else if name === 'users'}
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    {:else if name === 'edit'}
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    {:else if name === 'lol'}
        <path d="M4 3.5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4a2 2 0 0 1-2-2v-10a2 2 0 0 1 2-2Z" fill="currentColor" fill-opacity="0.22" />
        <text
            x="12"
            y="13.5"
            text-anchor="middle"
            fill="currentColor"
            stroke="none"
            font-family="Russo One, system-ui, sans-serif"
            font-weight="900"
            font-size="9.5"
            letter-spacing="0.4"
        >{$t.lolBubble || 'HA'}</text>
    {:else if name === 'poop'}
        <path d="M5.5 20h13a2.5 2.5 0 0 0 0-5h-13a2.5 2.5 0 0 0 0 5Z" fill="currentColor" fill-opacity="0.3" />
        <path d="M7.5 15h9a2 2 0 0 0 0-4h-9a2 2 0 0 0 0 4Z" fill="currentColor" fill-opacity="0.24" />
        <path d="M9.5 11h5a1.5 1.5 0 0 0 0-3h-1c0-1.5 1-2.5 1.5-3.5-2.5.2-4.5 1.8-4.5 3.5h-1a1.5 1.5 0 0 0 0 3Z" fill="currentColor" fill-opacity="0.3" />
    {:else if name === 'king'}
        <path d="M2 18h20l-2-10-4.5 4-3.5-7-3.5 7L4 8l-2 10z" fill="currentColor" fill-opacity="0.3" />
        <path d="M4 21h16" />
    {:else if name === 'dice'}
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" />
        <circle cx="15.5" cy="8.5" r="1.2" fill="currentColor" />
        <circle cx="12" cy="12" r="1.2" fill="currentColor" />
        <circle cx="8.5" cy="15.5" r="1.2" fill="currentColor" />
        <circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" />
    {:else if name === 'confetti'}
        <path d="M4 20l5-12 7 7-12 5Z" fill="currentColor" fill-opacity="0.25" />
        <path d="M14 4c0 2 2 2 2 4" />
        <path d="M19 7c-2 0-2 2-4 2" />
        <path d="M18 14l2 1" />
        <circle cx="10" cy="4" r="1" fill="currentColor" />
    {:else if name === 'shield18'}
        <path d="M12 2l8 3v6c0 5.2-3.4 9.7-8 11-4.6-1.3-8-5.8-8-11V5l8-3Z" fill="currentColor" fill-opacity="0.2" />
        <text
            x="12"
            y="14.5"
            text-anchor="middle"
            fill="currentColor"
            stroke="none"
            font-family="Russo One, system-ui, sans-serif"
            font-weight="900"
            font-size="8.5"
        >18+</text>
    {:else if name === 'hourglass'}
        <path d="M6 2h12" />
        <path d="M6 22h12" />
        <path d="M7 2v5l5 5 5-5V2" />
        <path d="M7 22v-5l5-5 5 5v5" />
    {/if}
</svg>
