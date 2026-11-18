<script>
    import { createEventDispatcher } from 'svelte';
    import { t, reconnectSocket } from '../../stores.js';
    import ArcadeIcon from './ArcadeIcon.svelte';

    export let message = "An error occurred.";
    const dispatch = createEventDispatcher();
</script>

<div class="h-screen-safe w-full flex flex-col justify-center items-center p-4 sm:p-6 select-none">
    <div class="w-full max-w-md panel-arcade text-center flex flex-col items-center gap-4 p-6 sm:p-8" style="--neon-color: var(--color-danger);">
        <div class="w-14 h-14 cut-md bg-rose-950/90 border-2 border-danger flex items-center justify-center text-danger">
            <ArcadeIcon name="warning" className="w-8 h-8" />
        </div>

        <div>
            <h1 class="text-2xl sm:text-3xl font-display text-danger mb-1.5 tracking-wider">
                {$t.connectionLostTitle || $t.errorOccurred || 'CONNECTION LOST'}
            </h1>
            <p class="text-sm sm:text-base text-slate-300 font-sans leading-relaxed">
                {message || $t.connectionLostDesc || 'We lost your connection to the game.'}
            </p>
        </div>

        <div class="w-full flex flex-col gap-2.5 mt-2">
            <button
                type="button"
                on:click={reconnectSocket}
                class="btn-arcade w-full py-3.5 text-sm sm:text-base"
                style="--btn-color: var(--color-primary);"
            >
                <ArcadeIcon name="rotate" className="w-5 h-5" />
                <span>{$t.retryConnection || 'RETRY CONNECTION'}</span>
            </button>
            <button
                type="button"
                on:click={() => dispatch('reset')}
                class="w-full py-2.5 px-4 cut-sm bg-neutral-900/90 border border-neutral-700 hover:border-slate-500 text-slate-300 hover:text-white font-display text-xs sm:text-sm uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
                <ArcadeIcon name="home" className="w-4 h-4" />
                <span>{$t.backToMainMenu || $t.mainMenu || 'BACK TO MAIN MENU'}</span>
            </button>
        </div>
    </div>
</div>
