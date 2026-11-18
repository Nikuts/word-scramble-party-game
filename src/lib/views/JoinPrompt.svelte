<script>
    import { view, t, joinForm, error, language, sendMessage, changeView } from '../../stores.js';
    import ArcadeIcon from '../shared/ArcadeIcon.svelte';

    let isSubmitting = false;

    $: canJoin = ($joinForm.gameId || '').trim().length === 4 && ($joinForm.playerName || '').trim().length > 0 && !isSubmitting;
    $: if ($error.message || $view !== 'joinPrompt') {
        isSubmitting = false;
    }

    function clearError() {
        isSubmitting = false;
        if ($error.message) {
            error.set({ message: null, fatal: false, context: null });
        }
    }

    function handleJoin() {
        clearError();
        const gid = ($joinForm.gameId || '').trim().toUpperCase();
        const pname = ($joinForm.playerName || '').trim();
        if (gid.length !== 4 || pname.length === 0) return;
        isSubmitting = true;
        sendMessage('join-game', {
            gameId: gid,
            playerName: pname,
            language: $language
        });
    }
</script>

<div class="h-screen-safe overflow-y-auto overscroll-contain flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 safe-top safe-bottom">
    <div class="w-full max-w-md flex flex-col items-center my-auto">
        <div class="w-full flex justify-start mb-3">
            <button
                type="button"
                on:click={() => changeView('mainMenu')}
                class="cut-sm px-3 py-1.5 bg-[#131126] border border-[#332e59] hover:border-primary text-xs sm:text-sm font-display text-slate-300 hover:text-primary transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
                <ArcadeIcon name="arrow-left" className="w-4 h-4" />
                <span>{$t.mainMenu}</span>
            </button>
        </div>

        <h1 class="text-2xl sm:text-3xl mb-4 text-secondary tracking-wider text-center">{$t.joinAsPlayer}</h1>

        <form on:submit|preventDefault={handleJoin} class="w-full panel-arcade p-5 sm:p-6" style="--neon-color: var(--color-secondary);">
            {#if $error.message && $view === 'joinPrompt'}
                <div class="mb-4 p-2.5 cut-sm bg-rose-950/90 border border-danger text-rose-200 text-center font-bold font-display text-xs sm:text-sm">
                    {$error.message}
                </div>
            {/if}

            <div class="mb-5 select-text">
                <label for="gameIdInput" class="block text-xs sm:text-sm text-slate-300 mb-1.5 font-display uppercase tracking-wider">{$t.enterGameId}</label>
                <input
                    type="text"
                    id="gameIdInput"
                    class="input-arcade select-text font-mono text-2xl sm:text-3xl font-extrabold"
                    maxlength="4"
                    autocomplete="off"
                    autocorrect="off"
                    autocapitalize="characters"
                    placeholder="ABCD"
                    bind:value={$joinForm.gameId}
                    on:input={clearError}
                >
            </div>

            <div class="mb-6 select-text">
                <label for="playerNameInput" class="block text-xs sm:text-sm text-slate-300 mb-1.5 font-display uppercase tracking-wider">{$t.enterYourName}</label>
                <input
                    type="text"
                    id="playerNameInput"
                    class="input-arcade select-text !text-left !tracking-normal !text-base sm:!text-lg !font-sans"
                    style="color: #f8fafc; border-color: var(--color-secondary);"
                    maxlength="25"
                    bind:value={$joinForm.playerName}
                    on:input={clearError}
                >
            </div>

            <button
                id="joinGameBtn"
                data-testid="join-button"
                type="submit"
                disabled={!canJoin}
                class="btn-arcade text-lg sm:text-xl w-full py-3.5"
                style="--btn-color: var(--color-accent);"
            >
                <ArcadeIcon name={isSubmitting ? 'clock' : 'sword'} className="w-5 h-5 {isSubmitting ? 'animate-spin' : ''}" />
                <span>{isSubmitting ? ($t.pleaseWait || 'JOINING...') : $t.join}</span>
            </button>
        </form>
    </div>
</div>
