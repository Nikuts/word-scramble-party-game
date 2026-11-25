<script>
  import { onMount } from 'svelte';
  import { view, language, isLoading, isReconnecting, error, t, joinForm, initializeSocket, reconnectSocket, resetToMenu, gameState, tvMode } from './stores.js';

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
  import ArcadeIcon from './lib/shared/ArcadeIcon.svelte';
  import ArcadeToastContainer from './lib/shared/ArcadeToastContainer.svelte';
  import { musicManager } from './lib/audio/musicManager.js';
  import { requestScreenWakeLock, releaseScreenWakeLock } from './lib/utils.js';
  import { get } from 'svelte/store';

  const initialUrlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  let isDevHarness = initialUrlParams ? (initialUrlParams.has('debug') || initialUrlParams.has('dev') || initialUrlParams.has('harness')) : false;
  let LazyDevHarness = null;
  let LazySoundTestView = null;

  $: if (isDevHarness && !LazyDevHarness) {
      import('./lib/dev/DevHarness.svelte').then((mod) => {
          LazyDevHarness = mod.default;
      });
  }

  let currentView = $view;
  $: if (currentView === 'soundTest' && !LazySoundTestView) {
      import('./lib/dev/SoundTestView.svelte').then((mod) => {
          LazySoundTestView = mod.default;
      });
  }

  const WAKE_LOCK_VIEWS = new Set(['hostDisplay', 'playerGame']);
  $: if (typeof window !== 'undefined') {
      if (WAKE_LOCK_VIEWS.has(currentView)) {
          requestScreenWakeLock();
      } else {
          releaseScreenWakeLock();
      }
  }
  let mainContentElement;
  let isTransitioning = false;
  let transitionFallbackTimer = null;

  function transitionToView(targetView) {
      if (!mainContentElement || get(tvMode)) {
          currentView = targetView;
          return;
      }
      if (isTransitioning) return;
      isTransitioning = true;
      mainContentElement.classList.add('view-out');

      let transitionDone = false;
      const cleanupTransition = () => {
          if (transitionDone) return;
          transitionDone = true;
          if (transitionFallbackTimer) {
              clearTimeout(transitionFallbackTimer);
              transitionFallbackTimer = null;
          }
          if (mainContentElement) {
              mainContentElement.classList.remove('view-out');
              mainContentElement.classList.remove('view-in');
          }
          currentView = targetView;
          isTransitioning = false;
          if (get(view) !== currentView) {
              transitionToView(get(view));
          }
      };

      // Failsafe timer: if animationend never fires (TV mode, reduced motion, inactive tab), recover immediately
      transitionFallbackTimer = setTimeout(cleanupTransition, 260);

      const onFadeOutEnd = () => {
          if (transitionDone) return;
          currentView = targetView;
          if (mainContentElement) {
              mainContentElement.classList.remove('view-out');
              mainContentElement.classList.add('view-in');

              mainContentElement.addEventListener('animationend', () => {
                  cleanupTransition();
              }, { once: true });
          } else {
              cleanupTransition();
          }
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
    if (document.body.dataset.theme) {
      delete document.body.dataset.theme;
    }
  }

  // Initialize the socket connection and background throttling when the app mounts
  onMount(() => {
    currentView = $view;
    initializeSocket();

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined') {
        if (document.visibilityState === 'hidden') {
          document.body.setAttribute('data-app-hidden', 'true');
          musicManager.pauseForHidden();
        } else {
          document.body.removeAttribute('data-app-hidden');
          musicManager.resumeFromVisible();
          if (WAKE_LOCK_VIEWS.has(currentView)) {
            requestScreenWakeLock();
          }
        }
      }
    };

    const handleOnline = () => {
      console.log('Browser online event detected.');
      if (get(error)?.fatal) {
        reconnectSocket();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
    }

    // Check for debug / dev harness query params
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('debug') || urlParams.has('dev') || urlParams.has('harness')) {
        isDevHarness = true;
        return;
    }
    if (import.meta.env.DEV && (urlParams.has('music') || urlParams.has('soundTest'))) {
        view.set('soundTest');
        return;
    }

    // Check for language in query params
    const urlLang = urlParams.get('lang');
    if (urlLang) {
        const normalizedUrlLang = (urlLang === 'ua' || urlLang === 'uk') ? 'uk' : 'en';
        language.set(normalizedUrlLang);
        try { localStorage.setItem('wordScrambleLang', normalizedUrlLang); } catch (e) {}
    }

    // Check for a gameId in the URL, which happens when scanning the QR code or clicking a shared link.
    const gameId = urlParams.get('gameId');
    if (gameId) {
        joinForm.update(form => ({...form, gameId: gameId.toUpperCase()}));
        view.set('joinPrompt');
    }

    return () => {
      releaseScreenWakeLock();
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

{#if isDevHarness}
    {#if LazyDevHarness}
        <svelte:component this={LazyDevHarness} />
    {:else}
        <LoadingSpinner message={$t.pleaseWait} />
    {/if}
{:else}
    <main class="h-screen-safe max-h-screen-safe w-full overflow-hidden flex flex-col relative z-10" style="transform: translateZ(0);">
        {#if $isReconnecting}
            <div class="fixed top-2 inset-x-0 flex justify-center z-50 pointer-events-none px-4">
                <div class="cut-sm bg-amber-950/95 border-2 border-amber-400 text-amber-200 px-3.5 py-1 flex items-center gap-2 font-display text-xs tracking-wider uppercase shadow-lg">
                    <ArcadeIcon name="rotate" className="w-3.5 h-3.5 animate-spin" />
                    <span>{$t.reconnectingBanner || $t.reconnecting || 'Reconnecting...'}</span>
                </div>
            </div>
        {/if}

        <div bind:this={mainContentElement} class="w-full h-full flex-1 flex flex-col min-h-0 overflow-hidden">
            {#if $isLoading}
                <LoadingSpinner message={$error.message || $t.pleaseWait} />
            {:else if $error.fatal}
                <ErrorDisplay message={$error.message} on:reset={resetToMenu} />
            {:else if currentView === 'soundTest'}
                {#if LazySoundTestView}
                    <svelte:component this={LazySoundTestView} />
                {:else}
                    <LoadingSpinner message={$t.pleaseWait} />
                {/if}
            {:else}
                <svelte:component this={views[currentView] || MainMenu} />
            {/if}
        </div>
        <ArcadeToastContainer />
    </main>
{/if}
