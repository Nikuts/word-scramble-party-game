<!-- src/lib/views/PlayerAvatarSelect.svelte -->
<script>
    import { createEventDispatcher } from 'svelte';
    import { t, language, gameState, currentPlayerDetails, sendMessage, error } from '../../stores.js';
    import { AVATARS } from '../config.js';
    import PixelAvatar from '../shared/PixelAvatar.svelte';

    const dispatch = createEventDispatcher();

    $: game = $gameState;
    $: player = $currentPlayerDetails;
    $: isUkrainian = $language === 'ua' || $language === 'uk';

    let editNameValue = player?.name || '';
    let selectedAvatar = player?.avatar || '🦊';

    $: if (player?.name && !editNameValue) {
        editNameValue = player.name;
    }
    $: if (player?.avatar && selectedAvatar === '🦊') {
        selectedAvatar = player.avatar;
    }

    // Determine which avatars are taken by OTHER players currently in the room
    $: takenAvatars = (game?.players || [])
        .filter(p => p.id !== player?.id)
        .map(p => p.avatar);

    function selectAvatar(avatar) {
        if (!game || !player) return;
        if (takenAvatars.includes(avatar)) return;
        selectedAvatar = avatar;
    }

    function handleSaveProfile() {
        if (!game || !player) return;
        
        // Update name if changed
        if (editNameValue.trim() && editNameValue.trim() !== player.name) {
            sendMessage('change-name', {
                gameId: game.id,
                newName: editNameValue.trim()
            });
        }

        // Update avatar if changed
        if (selectedAvatar && selectedAvatar !== player.avatar && !takenAvatars.includes(selectedAvatar)) {
            sendMessage('change-avatar', {
                gameId: game.id,
                avatar: selectedAvatar
            });
        }

        dispatch('confirmed');
    }
</script>

<div class="w-full h-full max-h-screen flex flex-col justify-between p-3.5 sm:p-4 max-w-md mx-auto safe-top safe-bottom select-none font-sans overflow-hidden box-border">
    
    <header class="text-center mb-2 flex-shrink-0">
        <h1 class="text-lg font-display font-black text-cyan-400 uppercase tracking-wide">
            {$t.editProfile || (isUkrainian ? 'РЕДАГУВАТИ ПРОФІЛЬ' : 'EDIT PROFILE')}
        </h1>
        <p class="text-xs text-slate-400 font-sans mt-0.5">
            {isUkrainian ? 'Змініть імʼя або оберіть персонажа' : 'Change your name and choose an avatar'}
        </p>
    </header>

    {#if $error.message && !$error.fatal}
        <div class="mb-2 p-2 bg-red-950/80 border border-red-500/60 text-red-300 text-xs font-bold text-center rounded-xl flex-shrink-0">
            {$error.message}
        </div>
    {/if}

    <!-- Name Input Field -->
    <div class="bg-neutral-950/90 border border-neutral-800 rounded-xl p-3 mb-2.5 flex-shrink-0">
        <label for="profile-name-input" class="text-[10px] font-display font-bold text-slate-400 uppercase block mb-1">
            {$t.enterYourName || 'PLAYER NAME'}:
        </label>
        <input 
            id="profile-name-input"
            type="text"
            bind:value={editNameValue}
            class="w-full bg-neutral-900 border-2 border-cyan-400 text-white font-display font-bold text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-300"
            maxlength="15"
        />
    </div>

    <!-- 21 Character 3-Column Grid (Edge-to-Edge Big Avatars) -->
    <div class="flex-1 overflow-y-auto bg-neutral-950/90 border border-neutral-800 p-3 rounded-2xl shadow-inner mb-2.5">
        <span class="text-[10px] font-display font-bold text-slate-400 uppercase tracking-wider block mb-2 text-center">
            {$t.chooseAvatar || 'CHOOSE AN AVATAR'}
        </span>
        <div class="grid grid-cols-3 gap-3">
            {#each AVATARS as av}
                {@const isTaken = takenAvatars.includes(av)}
                {@const isSelected = selectedAvatar === av}

                <button
                    type="button"
                    disabled={isTaken}
                    on:click={() => selectAvatar(av)}
                    aria-label="Avatar {av}"
                    class="avatar-option aspect-square rounded-2xl p-1 border-2 transition-all relative flex items-center justify-center cursor-pointer {
                        isSelected 
                        ? 'bg-cyan-500/25 border-cyan-400 ring-2 ring-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.9)] scale-105 z-10' 
                        : (isTaken ? 'bg-neutral-900/80 border-neutral-800 opacity-60 grayscale brightness-90 cursor-not-allowed' : 'bg-neutral-900 border-neutral-700 hover:border-slate-400 active:scale-95')
                    }"
                >
                    <div class="w-full h-full flex items-center justify-center scale-105">
                        <PixelAvatar avatar={av} className="w-full h-full" />
                    </div>
                    {#if isSelected}
                        <div class="absolute -top-1.5 -right-1.5 bg-cyan-400 text-black text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center shadow-md">
                            ✓
                        </div>
                    {:else if isTaken}
                        <div class="absolute -top-1 -right-1 bg-neutral-800 border border-neutral-600 text-[8px] rounded-full w-4 h-4 flex items-center justify-center shadow-sm">
                            🔒
                        </div>
                    {/if}
                </button>
            {/each}
        </div>
    </div>

    <!-- Save Profile Action -->
    <footer class="flex-shrink-0">
        <button
            type="button"
            id="confirmAvatarBtn"
            data-testid="confirm-avatar-btn"
            on:click={handleSaveProfile}
            class="w-full py-3 bg-gradient-to-r from-cyan-500 to-emerald-400 text-black font-display font-black text-sm tracking-wider uppercase rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.6)] active:scale-98 transition-all cursor-pointer"
        >
            ✓ {$t.saveProfile || (isUkrainian ? 'ЗБЕРЕГТИ ПРОФІЛЬ' : 'SAVE PROFILE')}
        </button>
    </footer>
</div>
