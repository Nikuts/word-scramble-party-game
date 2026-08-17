<script>
  import { onMount } from 'svelte';
  import { view, isLoading, error, t, joinForm, initializeSocket, reconnectSocket, resetToMenu, gameState } from './stores.js';

  // Import all possible view components
  import Language from './lib/views/Language.svelte';
  import MainMenu from './lib/views/MainMenu.svelte';
  import JoinPrompt from './lib/views/JoinPrompt.svelte';
  import HostDisplay from './lib/views/HostDisplay.svelte';
  import PlayerGame from './lib/views/PlayerGame.svelte';
  import Instructions from './lib/views/Instructions.svelte';

  // Import shared components
  import LoadingSpinner from './lib/shared/LoadingSpinner.svelte';
  import ErrorDisplay from './lib/shared/ErrorDisplay.svelte';
  import { get } from 'svelte/store';

  let currentView = $view;
  let mainContentElement;
  let isTransitioning = false;

  function transitionToView(targetView) {
      if (!mainContentElement) {
          currentView = targetView;
          return;
      }
      if (isTransitioning) return;
      isTransitioning = true;
      mainContentElement.classList.add('view-out');

      const onFadeOutEnd = () => {
          currentView = targetView;
          mainContentElement.classList.remove('view-out');
          mainContentElement.classList.add('view-in');

          mainContentElement.addEventListener('animationend', () => {
              mainContentElement.classList.remove('view-in');
              isTransitioning = false;
              if (get(view) !== currentView) {
                  transitionToView(get(view));
              }
          }, { once: true });
      };

      mainContentElement.addEventListener('animationend', onFadeOutEnd, { once: true });
  }

  $: if ($view !== currentView && !isTransitioning) {
      transitionToView($view);
  }

  // Set the color theme on the body
  $: if ($gameState?.colorTheme) {
    document.body.dataset.theme = $gameState.colorTheme;
  } else {
    // Fallback to default if no theme is set
    if (document.body.dataset.theme) {
      delete document.body.dataset.theme;
    }
  }

  // Initialize the socket connection and background throttling when the app mounts
  onMount(() => {
    currentView = $view; // Set initial view without transition
    initializeSocket();

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined') {
        if (document.visibilityState === 'hidden') {
          document.body.setAttribute('data-app-hidden', 'true');
        } else {
          document.body.removeAttribute('data-app-hidden');
          // When user returns to the tab, ensure socket session is connected
          reconnectSocket();
        }
      }
    };

    const handleOnline = () => {
      console.log('Browser online event detected. Reconnecting...');
      reconnectSocket();
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
    }

    // Check for a gameId in the URL, which happens when scanning the QR code or clicking a shared link.
    const urlParams = new URLSearchParams(window.location.search);
    const gameId = urlParams.get('gameId');
    if (gameId) {
        // If a gameId is found, pre-populate the join form and jump directly to join prompt.
        joinForm.update(form => ({...form, gameId: gameId.toUpperCase()}));
        view.set('joinPrompt');
    }

    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
      }
    };
  });

  const views = {
    language: Language,
    mainMenu: MainMenu,
    joinPrompt: JoinPrompt,
    hostDisplay: HostDisplay,
    playerGame: PlayerGame,
    instructions: Instructions,
  };
</script>

<main class="min-h-screen" style="transform: translateZ(0);">
    <div bind:this={mainContentElement}>
        {#if $isLoading}
            <LoadingSpinner message={$error.message || $t.connecting} />
        {:else if $error.fatal}
            <ErrorDisplay message={$error.message} on:reset={resetToMenu} />
        {:else}
            <svelte:component this={views[currentView] || MainMenu} />
        {/if}
    </div>
</main>