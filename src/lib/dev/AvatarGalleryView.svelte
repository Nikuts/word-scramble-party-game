<!-- src/lib/dev/AvatarGalleryView.svelte -->
<script>
    import PixelAvatar from '../shared/PixelAvatar.svelte';
    import { AVATARS } from '../config.js';
    import { playSound } from '../utils.js';

    let selectedAvatar = '🦊';
</script>

<div class="p-6 text-white max-w-4xl mx-auto space-y-8">
    <div class="text-center space-y-2">
        <h1 class="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-pink-400 to-amber-300">
            🎨 Pixel Avatar Design Gallery
        </h1>
        <p class="text-gray-400 text-sm">
            All 14 game avatars with size variations, animation states, and audio triggers.
        </p>
    </div>

    <!-- Avatar Grid -->
    <div class="bg-gray-900/80 border border-fuchsia-500/30 rounded-2xl p-6 shadow-xl">
        <h2 class="text-xs uppercase tracking-widest text-fuchsia-400 font-bold mb-4">Select & Inspect</h2>
        <div class="grid grid-cols-7 gap-4">
            {#each AVATARS as avatar}
                <button
                    class="flex flex-col items-center gap-2 p-3 rounded-xl border transition-all transform hover:scale-110 {selectedAvatar === avatar ? 'bg-fuchsia-600/30 border-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.5)]' : 'bg-gray-800/60 border-gray-700 hover:border-gray-500'}"
                    on:click={() => { selectedAvatar = avatar; playSound('button_click'); }}
                >
                    <PixelAvatar {avatar} size={48} />
                    <span class="text-xs font-bold text-gray-300">{avatar}</span>
                </button>
            {/each}
        </div>
    </div>

    <!-- Size & Style Showcase -->
    <div class="bg-gray-900/80 border border-cyan-500/30 rounded-2xl p-6 shadow-xl grid grid-cols-3 gap-6 text-center">
        <div class="space-y-3 flex flex-col items-center">
            <span class="text-xs uppercase text-gray-400 font-bold">Small (32px - Badges)</span>
            <div class="p-4 bg-gray-950 rounded-xl border border-gray-800 flex items-center justify-center h-28 w-full">
                <PixelAvatar avatar={selectedAvatar} size={32} />
            </div>
        </div>
        <div class="space-y-3 flex flex-col items-center">
            <span class="text-xs uppercase text-gray-400 font-bold">Medium (64px - Lobby)</span>
            <div class="p-4 bg-gray-950 rounded-xl border border-gray-800 flex items-center justify-center h-28 w-full">
                <PixelAvatar avatar={selectedAvatar} size={64} />
            </div>
        </div>
        <div class="space-y-3 flex flex-col items-center">
            <span class="text-xs uppercase text-gray-400 font-bold">Large (110px - Podium)</span>
            <div class="p-4 bg-gray-950 rounded-xl border border-gray-800 flex items-center justify-center h-28 w-full">
                <PixelAvatar avatar={selectedAvatar} size={110} />
            </div>
        </div>
    </div>
</div>
