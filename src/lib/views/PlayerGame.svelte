<script>
    import { gamePhase, currentPlayerDetails, hasConfirmedAvatar } from '../../stores.js';
    import PlayerAvatarSelect from './PlayerAvatarSelect.svelte';
    import PlayerLobby from './PlayerLobby.svelte';
    import PlayerGameView from './PlayerGameView.svelte';
    import LoadingSpinner from '../shared/LoadingSpinner.svelte';

    let lastSeenPhase = null;
    $: if ($gamePhase) {
        if ($gamePhase !== 'lobby') {
            hasConfirmedAvatar.set(true);
        } else if (lastSeenPhase && lastSeenPhase !== 'lobby' && $gamePhase === 'lobby') {
            hasConfirmedAvatar.set(true);
        }
        lastSeenPhase = $gamePhase;
    }
</script>

{#if !$gamePhase || !$currentPlayerDetails}
    <LoadingSpinner />
{:else if $gamePhase === 'lobby'}
    {#if !$hasConfirmedAvatar}
        <PlayerAvatarSelect on:confirmed={() => hasConfirmedAvatar.set(true)} />
    {:else}
        <PlayerLobby on:reselectAvatar={() => hasConfirmedAvatar.set(false)} />
    {/if}
{:else}
    <PlayerGameView />
{/if}