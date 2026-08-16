<script>
    import { createEventDispatcher } from 'svelte';
    import { t, gameState, currentPlayerDetails, sendMessage, error } from '../../stores.js';
    import { AVATARS } from '../config.js';
    import PixelAvatar from '../shared/PixelAvatar.svelte';

    const dispatch = createEventDispatcher();

    $: game = $gameState;
    $: player = $currentPlayerDetails;

    // Determine which avatars are taken by OTHER players currently in the room
    $: takenAvatars = (game?.players || [])
        .filter(p => p.id !== player?.id)
        .map(p => p.avatar);

    function selectAvatar(avatar) {
        if (!game || !player) return;
        if (takenAvatars.includes(avatar)) return;
        if (player.avatar === avatar) return;

        sendMessage('change-avatar', {
            gameId: game.id,
            avatar: avatar
        });
    }

    function handleConfirm() {
        dispatch('confirmed');
    }
</script>

<div class="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
    <div class="w-full max-w-lg panel-arcade text-center" style="--neon-color: var(--color-secondary); --neon-color-rgb: var(--color-secondary-rgb);">
        <h1 class="text-2xl sm:text-3xl mb-2 text-secondary font-display" style="text-shadow: 0 0 8px var(--color-secondary);">
            {$t.chooseAvatar}
        </h1>
        <p class="text-neutral-300 text-sm mb-6 font-display">
            {player?.name || ''}
        </p>

        {#if $error.message}
            <p class="text-danger text-center mb-4 font-bold font-display text-sm">{$error.message}</p>
        {/if}

        <!-- Current Avatar Preview -->
        <div class="flex justify-center mb-6">
            <div class="w-24 h-24 rounded-full bg-neutral-900 border-2 border-secondary flex items-center justify-center shadow-lg" style="box-shadow: 0 0 15px var(--color-secondary);">
                {#if player?.avatar}
                    <PixelAvatar avatar={player.avatar} />
                {/if}
            </div>
        </div>

        <!-- 20 Avatar Selector Grid -->
        <div class="mb-8">
            <div class="avatar-selector" role="radiogroup" aria-label={$t.chooseAvatar}>
                {#each AVATARS as avatar}
                    {@const isTaken = takenAvatars.includes(avatar)}
                    {@const isSelected = player?.avatar === avatar}
                    <button
                        type="button"
                        class="avatar-option"
                        class:selected={isSelected}
                        class:disabled-taken={isTaken}
                        style={isTaken ? "opacity: 0.25; filter: grayscale(100%); cursor: not-allowed;" : ""}
                        on:click={() => selectAvatar(avatar)}
                        disabled={isTaken}
                        role="radio"
                        aria-checked={isSelected}
                        aria-label={`Avatar ${avatar}`}
                    >
                        <PixelAvatar {avatar} />
                    </button>
                {/each}
            </div>
        </div>

        <!-- Confirm Action Button -->
        <button
            id="confirmAvatarBtn"
            data-testid="confirm-avatar-btn"
            on:click={handleConfirm}
            class="btn-arcade text-xl w-full"
            style="--btn-color: var(--color-accent);"
        >
            {$t.confirmCharacter}
        </button>
    </div>
</div>
