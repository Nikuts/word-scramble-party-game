<script>
    import { view, t, joinForm, error, language, sendMessage, changeView } from '../../stores.js';

    $: canJoin = ($joinForm.gameId || '').trim().length === 4 && ($joinForm.playerName || '').trim().length > 0;

    function clearError() {
        if ($error.message) {
            error.set({ message: null, fatal: false, context: null });
        }
    }

    function handleJoin() {
        clearError();
        const gid = ($joinForm.gameId || '').trim().toUpperCase();
        const pname = ($joinForm.playerName || '').trim();
        if (gid.length !== 4 || pname.length === 0) return;
        sendMessage('join-game', {
            gameId: gid,
            playerName: pname,
            language: $language,
            loading: true
        });
    }
</script>

<div class="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
    <h1 class="text-2xl sm:text-3xl mb-8 text-secondary" style="text-shadow: 0 0 8px var(--color-secondary);">{$t.joinAsPlayer}</h1>
    <form on:submit|preventDefault={handleJoin} class="w-full max-w-lg panel-arcade" style="--neon-color: var(--color-secondary); --neon-color-rgb: var(--color-secondary-rgb);">
        {#if $error.message && $view === 'joinPrompt'}
            <p class="text-danger text-center mb-4 font-bold font-display text-sm">{$error.message}</p>
        {/if}
        <div class="mb-6 select-text">
            <label for="gameIdInput" class="block text-sm text-neutral-300 mb-2 font-display">{$t.enterGameId}</label>
            <input 
                type="text" 
                id="gameIdInput" 
                class="input-arcade select-text" 
                maxlength="4" 
                autocomplete="off" 
                autocorrect="off" 
                autocapitalize="off" 
                bind:value={$joinForm.gameId} 
                on:input={clearError}
            >
        </div>
        <div class="mb-8 select-text">
            <label for="playerNameInput" class="block text-sm text-neutral-300 mb-2 font-display">{$t.enterYourName}</label>
            <input 
                type="text" 
                id="playerNameInput" 
                class="block w-full bg-black border-2 p-3 text-lg focus:outline-none select-text" 
                style="border-color: var(--color-secondary); box-shadow: 0 0 8px var(--color-secondary), inset 0 0 8px rgba(var(--color-secondary-rgb), 0.2); color: var(--color-secondary);" 
                maxlength="25" 
                bind:value={$joinForm.playerName} 
                on:input={clearError}
            >
        </div>
        <button id="joinGameBtn" data-testid="join-button" type="submit" class="btn-arcade text-xl w-full" style="--btn-color: var(--color-accent);">{$t.join}</button>
    </form>
    <button on:click={() => changeView('mainMenu')} class="mt-8 px-4 py-2 bg-neutral-900 border border-neutral-600 rounded text-sm hover:bg-primary hover:text-black hover:border-white transition-all font-display">{$t.mainMenu}</button>
</div>