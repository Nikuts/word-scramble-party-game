<script>
    import { view, t, joinForm, error, language, sendMessage, changeView } from '../../stores.js';
    import { AVATARS } from '../config.js';
    import PixelAvatar from '../shared/PixelAvatar.svelte';

    $: takenAvatars = $error.context?.takenAvatars || [];
    $: availableAvatars = AVATARS.filter(a => !takenAvatars.includes(a));
    
    // Auto-select an avatar if the current one is taken or none is selected.
    $: if ($view === 'joinPrompt' && (!$joinForm.avatar || takenAvatars.includes($joinForm.avatar))) {
        const firstAvailable = availableAvatars[0] || '';
        if ($joinForm.avatar !== firstAvailable) {
            joinForm.update(s => ({...s, avatar: firstAvailable}));
        }
    }

    $: canJoin = $joinForm.gameId.length === 4 && $joinForm.playerName.trim().length > 0 && $joinForm.avatar;

    function clearError() {
        if ($error.message) {
            error.set({ message: null, fatal: false, context: null });
        }
    }

    function handleJoin() {
        if (!canJoin) return;
        sendMessage('join-game', {
            gameId: $joinForm.gameId.toUpperCase(),
            playerName: $joinForm.playerName.trim(),
            language: $language,
            avatar: $joinForm.avatar,
            loading: true
        });
    }

    function handleGameIdInput(event) {
        clearError();
        const value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        joinForm.update(s => ({...s, gameId: value}));
    }

    function handlePlayerNameInput(event) {
        clearError();
        const value = event.target.value;
        joinForm.update(s => ({...s, playerName: value}));
    }

    function handleAvatarClick(avatar) {
        clearError();
        joinForm.update(s => ({...s, avatar: avatar}));
    }
</script>

<div class="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
    <h1 class="text-2xl sm:text-3xl mb-8 text-secondary" style="text-shadow: 0 0 8px var(--color-secondary);">{$t.joinAsPlayer}</h1>
    <div class="w-full max-w-lg panel-arcade" style="--neon-color: var(--color-secondary); --neon-color-rgb: var(--color-secondary-rgb);">
        {#if $error.message && $view === 'joinPrompt'}
            <p class="text-danger text-center mb-4 font-bold font-display text-sm">{$error.message}</p>
        {/if}
        <div class="mb-6">
            <label for="gameIdInput" class="block text-sm text-neutral-300 mb-2 font-display">{$t.enterGameId}</label>
            <input type="text" id="gameIdInput" class="input-arcade" maxlength="4" autocomplete="off" autocorrect="off" autocapitalize="off" value={$joinForm.gameId} on:input={handleGameIdInput}>
        </div>
        <div class="mb-6">
            <label for="playerNameInput" class="block text-sm text-neutral-300 mb-2 font-display">{$t.enterYourName}</label>
            <input type="text" id="playerNameInput" class="block w-full bg-black border-2 p-3 text-lg focus:outline-none" style="border-color: var(--color-secondary); box-shadow: 0 0 8px var(--color-secondary), inset 0 0 8px rgba(var(--color-secondary-rgb), 0.2); color: var(--color-secondary);" maxlength="25" value={$joinForm.playerName} on:input={handlePlayerNameInput}>
        </div>
        <div class="mb-8">
             <span id="avatar-group-label" class="block text-sm text-neutral-300 mb-2 font-display">{$t.chooseAvatar}</span>
             <div class="avatar-selector" role="radiogroup" aria-labelledby="avatar-group-label">
                {#each AVATARS as avatar}
                    {@const isTaken = takenAvatars.includes(avatar)}
                    <button type="button"
                        class="avatar-option"
                        class:selected={$joinForm.avatar === avatar}
                        class:disabled-taken={isTaken}
                        on:click={() => { if (!isTaken) handleAvatarClick(avatar); }}
                        disabled={isTaken}
                        role="radio"
                        aria-checked={$joinForm.avatar === avatar}
                        aria-label={`Avatar ${avatar}`}
                    >
                        <PixelAvatar {avatar} />
                    </button>
                {/each}
             </div>
        </div>
        <button on:click={handleJoin} class="btn-arcade text-xl w-full" style="--btn-color: var(--color-accent);" disabled={!canJoin}>{$t.join}</button>
    </div>
    <button on:click={() => changeView('mainMenu')} class="mt-8 px-4 py-2 bg-neutral-900 border border-neutral-600 rounded text-sm hover:bg-primary hover:text-black hover:border-white transition-all font-display">{$t.mainMenu}</button>
</div>