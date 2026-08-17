<script>
    import { t, changeView, gameState } from '../../stores.js';

    function handleBack() {
        if ($gameState) {
            changeView('playerGame');
        } else {
            changeView('mainMenu');
        }
    }
</script>

<div class="min-h-screen flex flex-col items-center p-4 sm:p-6 lg:p-8 py-8 justify-center">
    <div class="w-full max-w-2xl panel-arcade" style="--neon-color: var(--color-accent); --neon-color-rgb: var(--color-accent-rgb);">
        <h1 class="text-3xl sm:text-4xl mb-6 text-center text-accent" style="text-shadow: 0 0 8px var(--color-accent);">{$t.instructionsTitle}</h1>
        
        <div class="space-y-4 text-left text-lg">
            <div class="p-4 bg-neutral-900/50 border-l-4 border-primary rounded-r-md">
                <h2 class="text-xl text-primary">{$t.instructions1Title}</h2>
                <p class="text-neutral-300 mt-1">{$t.instructions1Text}</p>
            </div>
            <div class="p-4 bg-neutral-900/50 border-l-4 border-primary rounded-r-md">
                <h2 class="text-xl text-primary">{$t.instructions2Title}</h2>
                <p class="text-neutral-300 mt-1">{$t.instructions2Text}</p>
            </div>
            <div class="p-4 bg-neutral-900/50 border-l-4 border-primary rounded-r-md">
                <h2 class="text-xl text-primary">{$t.instructions3Title}</h2>
                <p class="text-neutral-300 mt-1">{$t.instructions3Text}</p>
            </div>
            <div class="pt-4 mt-6 border-t-2 border-neutral-700/50">
                 <p class="text-center font-bold text-xl text-warning">{$t.instructionsGoal}</p>
            </div>
        </div>

    </div>
    <button on:click={handleBack} class="mt-8 btn-arcade" style="--btn-color: var(--color-secondary);">
        &larr; {$gameState ? $t.backToLobby : $t.backToMenu}
    </button>
</div>