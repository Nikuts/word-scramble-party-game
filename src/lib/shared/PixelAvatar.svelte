<script>
    import { resolveAvatarSrc } from '../utils.js';
    export let avatar; // the emoji character
    export let className = '';

    $: src = resolveAvatarSrc(avatar);
</script>

<div class="aspect-square {className}">
    <img {src} alt="Avatar {avatar}" class="w-full h-full object-contain" draggable="false" decoding="sync" loading="eager" width="64" height="64" />
</div>