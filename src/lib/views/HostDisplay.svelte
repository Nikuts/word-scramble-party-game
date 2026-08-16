<script>
    import { gamePhase } from '../../stores.js';
    import HostLobby from './HostLobby.svelte';
    import HostGameView from './HostGameView.svelte';
    import LoadingSpinner from '../shared/LoadingSpinner.svelte';
</script>

{#if !$gamePhase}
    <LoadingSpinner />
{:else if $gamePhase === 'lobby'}
    <HostLobby />
{:else}
    <HostGameView />
{/if}