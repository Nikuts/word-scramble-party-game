<script>
    import { AVATAR_MAP } from '../config.js';
    export let avatar; // the emoji character
    export let className = '';
    
    // A fallback in case a new emoji is added to AVATARS but not AVATAR_MAP
    $: imageName = AVATAR_MAP[avatar] || 'frog'; 
    $: src = `/images/${imageName}.webp`;
</script>

<div class="aspect-square {className}">
    <img {src} alt="Avatar {avatar}" class="w-full h-full object-contain" draggable="false" loading="lazy" decoding="async" width="64" height="64" />
</div>