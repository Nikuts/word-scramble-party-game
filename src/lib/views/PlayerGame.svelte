<script>
    import { gamePhase, currentPlayerDetails } from '../../stores.js';
    import PlayerLobby from './PlayerLobby.svelte';
    import PlayerGameView from './PlayerGameView.svelte';
    import LoadingSpinner from '../shared/LoadingSpinner.svelte';
</script>

{#if !$gamePhase || !$currentPlayerDetails}
    <LoadingSpinner />
{:else if $gamePhase === 'lobby'}
    <PlayerLobby />
{:else}
    <PlayerGameView />
{/if}