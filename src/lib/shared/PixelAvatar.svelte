<script>
    import { AVATAR_MAP } from '../config.js';
    export let avatar; // the emoji character
    export let className = '';
    
    // Normalization helper for emoji variants and fallbacks
    const FALLBACK_MAP = {
        '👽': 'alien', '🐶': 'dog', '🦆': 'duck', '⚒️': 'dwarf', '⚒': 'dwarf',
        '🦊': 'fox', '🐸': 'frog', '👺': 'goblin', '🛡️': 'knight', '🛡': 'knight',
        '🍄': 'mushroom', '🦜': 'parrot', '🐧': 'penguin', '🐷': 'pig', '🤖': 'robot',
        '💀': 'skeleton', '🦠': 'slime', '🫧': 'slime', '🐱': 'sphynx', '🐈': 'sphynx',
        '🧛': 'vampire', '🧙': 'wizard', '🐛': 'worm', '🪱': 'worm', '🧟': 'zombie',
        '🐼': 'alien', '🐯': 'fox', '🐵': 'dog', '🦄': 'wizard', '🐙': 'octopus', '🧌': 'goblin', '🧔': 'dwarf'
    };

    $: raw = avatar ? String(avatar).replace(/[\uFE0E\uFE0F]/g, '') : 'frog';
    $: imageName = AVATAR_MAP[avatar] || AVATAR_MAP[raw] || FALLBACK_MAP[avatar] || FALLBACK_MAP[raw] || 'frog'; 
    $: src = `/images/${imageName}.webp`;
</script>

<div class="aspect-square {className}">
    <img {src} alt="Avatar {avatar}" class="w-full h-full object-contain" draggable="false" loading="lazy" decoding="async" width="64" height="64" />
</div>