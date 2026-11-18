<!-- src/lib/views/PlayerAvatarSelect.svelte -->
<script>
    import { createEventDispatcher } from 'svelte';
    import { t, gameState, currentPlayerDetails, sendMessage, error } from '../../stores.js';
    import { AVATARS } from '../config.js';
    import PixelAvatar from '../shared/PixelAvatar.svelte';
    import ArcadeIcon from '../shared/ArcadeIcon.svelte';

    const dispatch = createEventDispatcher();

    $: game = $gameState;
    $: player = $currentPlayerDetails;

    let initializedForId = null;
    let editNameValue = player?.name || '';
    let selectedAvatar = player?.avatar || '🦊';
    let waitingSaveTargetName = null;
    let waitingSaveTargetAvatar = null;
    let localNameError = '';

    $: if (player?.id && player.id !== initializedForId) {
        initializedForId = player.id;
        editNameValue = player.name || '';
        selectedAvatar = player.avatar || '🦊';
        waitingSaveTargetName = null;
        waitingSaveTargetAvatar = null;
        localNameError = '';
    }

    $: takenAvatars = (game?.players || [])
        .filter(p => p.id !== player?.id)
        .map(p => p.avatar);

    $: if ($error.message && !$error.fatal) {
        localNameError = $error.message;
        waitingSaveTargetName = null;
        waitingSaveTargetAvatar = null;
    }

    $: if (waitingSaveTargetName !== null || waitingSaveTargetAvatar !== null) {
        const nameOk = waitingSaveTargetName === null || player?.name === waitingSaveTargetName;
        const avatarOk = waitingSaveTargetAvatar === null || player?.avatar === waitingSaveTargetAvatar;
        if (nameOk && avatarOk) {
            waitingSaveTargetName = null;
            waitingSaveTargetAvatar = null;
            dispatch('confirmed');
        }
    }

    function normalizeName(v) {
        return String(v || '').normalize('NFC').replace(/\s+/g, ' ').trim();
    }

    function selectAvatar(avatar) {
        if (!game || !player) return;
        if (takenAvatars.includes(avatar)) return;
        localNameError = '';
        if ($error.message && !$error.fatal) error.set({ message: '', fatal: false });
        selectedAvatar = avatar;
    }

    function handleCancelProfile() {
        localNameError = '';
        if ($error.message && !$error.fatal) error.set({ message: '', fatal: false });
        waitingSaveTargetName = null;
        waitingSaveTargetAvatar = null;
        dispatch('confirmed');
    }

    function handleSaveProfile() {
        if (!game || !player) return;
        localNameError = '';

        const cleanName = normalizeName(editNameValue);
        if (!cleanName) {
            localNameError = $t.nameRequired || 'Please enter a name.';
            return;
        }
        const nameTaken = (game?.players || []).some(
            p => p.id !== player.id && normalizeName(p.name).toLowerCase() === cleanName.toLowerCase()
        );
        if (nameTaken) {
            localNameError = $t.nameTaken || 'This name is already taken.';
            return;
        }

        const needsNameSave = cleanName !== player.name;
        const needsAvatarSave = Boolean(selectedAvatar && selectedAvatar !== player.avatar && !takenAvatars.includes(selectedAvatar));

        if (!needsNameSave && !needsAvatarSave) {
            dispatch('confirmed');
            return;
        }

        waitingSaveTargetName = needsNameSave ? cleanName : null;
        waitingSaveTargetAvatar = needsAvatarSave ? selectedAvatar : null;

        if (needsNameSave) {
            sendMessage('change-name', {
                gameId: game.id,
                newName: cleanName
            });
        }

        if (needsAvatarSave) {
            sendMessage('change-avatar', {
                gameId: game.id,
                avatar: selectedAvatar
            });
        }
    }
</script>

<div class="w-full h-screen-safe max-h-screen-safe min-h-0 flex flex-col justify-between p-3 sm:p-4 max-w-md md:max-w-2xl mx-auto safe-top safe-bottom select-none font-sans overflow-hidden box-border">
    
    <header class="text-center mb-2 flex-shrink-0">
        <h1 class="text-lg sm:text-2xl font-display text-primary uppercase tracking-wide">
            {$t.editProfile || 'EDIT PROFILE'}
        </h1>
        <p class="text-xs text-slate-400 font-sans mt-0.5">
            {$t.editProfileDesc || 'Change your name and choose an avatar'}
        </p>
    </header>

    {#if localNameError || ($error.message && !$error.fatal)}
        <div class="mb-2 p-2 cut-sm bg-rose-950/90 border border-danger text-rose-200 text-xs font-bold text-center flex-shrink-0">
            {localNameError || $error.message}
        </div>
    {/if}

    <!-- Name Input Field -->
    <div class="bg-[#131126] border-2 border-[#332e59] cut-md p-3 mb-2 flex-shrink-0 select-text">
        <label for="profile-name-input" class="text-[11px] font-display text-slate-300 uppercase block mb-1 tracking-wider">
            {$t.enterYourName || 'PLAYER NAME'}:
        </label>
        <input
            id="profile-name-input"
            type="text"
            bind:value={editNameValue}
            on:input={() => {
                localNameError = '';
                if ($error.message && !$error.fatal) error.set({ message: '', fatal: false });
            }}
            class="w-full bg-[#070610] border-2 border-cyan-400 cut-sm text-white font-display text-sm sm:text-base px-3 py-2 focus:outline-none focus:border-primary select-text"
            maxlength="25"
        />
    </div>

    <!-- Avatar Grid (3 Cols on Phone, 6 Cols on Tablet/PC) -->
    <div class="flex-1 min-h-0 overflow-y-auto bg-[#131126] border-2 border-[#332e59] cut-md p-3 mb-2.5">
        <span class="text-[11px] font-display text-slate-400 uppercase tracking-wider block mb-2 text-center">
            {$t.chooseAvatar || 'CHOOSE AN AVATAR'}
        </span>
        <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
            {#each AVATARS as av}
                {@const isTaken = takenAvatars.includes(av)}
                {@const isSelected = selectedAvatar === av}

                <button
                    type="button"
                    disabled={isTaken}
                    on:click={() => selectAvatar(av)}
                    aria-label="Avatar {av}"
                    class="avatar-option {
                        isSelected
                        ? 'selected'
                        : (isTaken ? 'disabled-taken' : '')
                    }"
                >
                    <div class="w-full h-full flex items-center justify-center">
                        <PixelAvatar avatar={av} className="w-full h-full" />
                    </div>
                    {#if isSelected}
                        <div class="absolute top-1 right-1 bg-primary text-black cut-sm w-5 h-5 flex items-center justify-center">
                            <ArcadeIcon name="check" className="w-3.5 h-3.5" />
                        </div>
                    {/if}
                </button>
            {/each}
        </div>
    </div>

    <!-- Save Profile Action -->
    <footer class="flex-shrink-0 pt-0.5 flex items-center gap-2">
        <button
            type="button"
            on:click={handleCancelProfile}
            class="btn-arcade btn-neutral py-3 px-4 text-sm sm:text-base flex-shrink-0"
        >
            <span>{$t.cancel || 'CANCEL'}</span>
        </button>
        <button
            type="button"
            id="confirmAvatarBtn"
            data-testid="confirm-avatar-btn"
            on:click={handleSaveProfile}
            class="btn-arcade flex-1 py-3 text-sm sm:text-base"
            style="--btn-color: var(--color-primary);"
        >
            <ArcadeIcon name="check" className="w-4 h-4" />
            <span>{$t.saveProfile || 'SAVE PROFILE'}</span>
        </button>
    </footer>
</div>
