<script>
    import { gamePhase, currentPlayerDetails } from '../../stores.js';
    import PlayerAvatarSelect from './PlayerAvatarSelect.svelte';
    import PlayerLobby from './PlayerLobby.svelte';
    import PlayerGameView from './PlayerGameView.svelte';
    import LoadingSpinner from '../shared/LoadingSpinner.svelte';

    let hasConfirmedAvatar = false;
</script>

{#if !$gamePhase || !$currentPlayerDetails}
    <LoadingSpinner />
{:else if $gamePhase === 'lobby'}
    {#if !hasConfirmedAvatar}
        <PlayerAvatarSelect on:confirmed={() => hasConfirmedAvatar = true} />
    {:else}
        <PlayerLobby on:reselectAvatar={() => hasConfirmedAvatar = false} />
    {/if}
{:else}
    <PlayerGameView />
{/if}