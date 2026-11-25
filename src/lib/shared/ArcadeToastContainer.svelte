<!-- src/lib/shared/ArcadeToastContainer.svelte -->
<script>
    import { onMount, onDestroy, tick } from 'svelte';
    import { t, toasts, dismissToast } from '../../stores.js';
    import ArcadeIcon from './ArcadeIcon.svelte';

    let stackEl;
    let mounted = false;
    let isSuppressedByModal = false;
    let liveAnnouncement = '';
    let lastFocusedBeforeToast = null;

    const timers = new Map();
    const pausedIds = new Set();
    const announcedIds = new Set();

    function syncModalSuppression() {
        if (typeof document === 'undefined') return;
        isSuppressedByModal = Boolean(document.querySelector('dialog[open]'));
    }

    function syncPopoverVisibility() {
        if (!mounted || !stackEl) return;
        const supportsPopover = typeof HTMLElement !== 'undefined' && Object.hasOwn(HTMLElement.prototype, 'popover');
        if (!supportsPopover) return;
        const shouldShow = $toasts.length > 0 && !isSuppressedByModal;
        try {
            const isOpen = stackEl.matches(':popover-open');
            if (shouldShow && !isOpen) {
                stackEl.showPopover();
            } else if (!shouldShow && isOpen) {
                stackEl.hidePopover();
            }
        } catch (err) {
            // Ignore InvalidStateError if browser hides top-layer on view teardown
        }
    }

    function scheduleAutoDismiss(toast) {
        if (!toast || !toast.duration || toast.duration <= 0) return;
        if (timers.has(toast.id) || pausedIds.has(toast.id)) return;
        const handle = setTimeout(() => {
            timers.delete(toast.id);
            pausedIds.delete(toast.id);
            dismissToast(toast.id);
        }, toast.duration);
        timers.set(toast.id, handle);
    }

    function clearToastTimer(id) {
        const handle = timers.get(id);
        if (handle) {
            clearTimeout(handle);
            timers.delete(id);
        }
    }

    function pauseToastTimer(id) {
        pausedIds.add(id);
        clearToastTimer(id);
    }

    function resumeToastTimer(toast) {
        pausedIds.delete(toast.id);
        scheduleAutoDismiss(toast);
    }

    async function handleManualDismiss(id) {
        const activeEl = typeof document !== 'undefined' ? document.activeElement : null;
        const activeToastEl = activeEl?.closest?.('[data-toast-id]');
        const wasFocusedInsideTarget = activeToastEl?.getAttribute('data-toast-id') === String(id);
        const remainingIds = $toasts.filter((item) => item.id !== id).map((item) => item.id);

        clearToastTimer(id);
        pausedIds.delete(id);
        dismissToast(id);

        if (wasFocusedInsideTarget) {
            await tick();
            if (remainingIds.length > 0 && stackEl) {
                const nextBtn = stackEl.querySelector('[data-testid="arcade-toast-dismiss"]');
                nextBtn?.focus?.();
            } else if (lastFocusedBeforeToast && lastFocusedBeforeToast.isConnected) {
                lastFocusedBeforeToast.focus();
                lastFocusedBeforeToast = null;
            }
        }
    }

    $: if (typeof window !== 'undefined') {
        const activeIds = new Set($toasts.map((item) => item.id));
        for (const existingId of Array.from(timers.keys())) {
            if (!activeIds.has(existingId)) {
                clearToastTimer(existingId);
                pausedIds.delete(existingId);
            }
        }

        if ($toasts.length > 0 && typeof document !== 'undefined') {
            const curActive = document.activeElement;
            if (curActive && (!stackEl || !stackEl.contains(curActive))) {
                lastFocusedBeforeToast = curActive;
            }
        } else if ($toasts.length === 0) {
            lastFocusedBeforeToast = null;
        }

        for (const toast of $toasts) {
            if (!announcedIds.has(toast.id)) {
                announcedIds.add(toast.id);
                if (typeof document !== 'undefined') {
                    if (typeof document.ariaNotify === 'function') {
                        document.ariaNotify(toast.message);
                    } else {
                        liveAnnouncement = toast.message;
                    }
                }
            }
            scheduleAutoDismiss(toast);
        }
        syncPopoverVisibility();
    }

    $: visibleToasts = isSuppressedByModal ? [] : $toasts;

    onMount(() => {
        mounted = true;
        if (stackEl && typeof HTMLElement !== 'undefined' && Object.hasOwn(HTMLElement.prototype, 'popover')) {
            stackEl.setAttribute('popover', 'manual');
        }
        syncModalSuppression();
        syncPopoverVisibility();

        const observer = new MutationObserver(() => {
            syncModalSuppression();
            syncPopoverVisibility();
        });
        observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open'] });

        return () => {
            observer.disconnect();
        };
    });

    onDestroy(() => {
        for (const handle of timers.values()) {
            clearTimeout(handle);
        }
        timers.clear();
        pausedIds.clear();
    });
</script>

<div role="region" aria-label={$t.notificationsLabel || 'Notifications'}>
    {#if typeof document === 'undefined' || typeof document.ariaNotify !== 'function'}
        <p class="sr-only">{$t.notificationsLabel || 'Notifications'}</p>
        <div class="sr-only" aria-live="assertive" aria-atomic="true">{liveAnnouncement}</div>
    {/if}

    <div bind:this={stackEl} class="arcade-toast-stack">
        {#each visibleToasts as toast (toast.id)}
            {@const isWarning = toast.variant === 'warning'}
            {@const isInfo = toast.variant === 'info'}
            <div
                role="status"
                data-toast-id={toast.id}
                data-testid="arcade-toast"
                on:mouseenter={() => pauseToastTimer(toast.id)}
                on:mouseleave={() => resumeToastTimer(toast)}
                on:focusin={() => pauseToastTimer(toast.id)}
                on:focusout={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget)) {
                        resumeToastTimer(toast);
                    }
                }}
                class="arcade-toast-item cut-sm border-2 px-3 py-2.5 shadow-xl flex items-center justify-between gap-2.5 text-xs sm:text-sm font-sans font-bold {
                    isWarning
                    ? 'bg-amber-950/95 border-amber-400 text-amber-100'
                    : (isInfo
                        ? 'bg-cyan-950/95 border-cyan-400 text-cyan-100'
                        : 'bg-[#450a0a]/95 border-danger text-rose-100')
                }"
            >
                <div class="flex items-start gap-2 min-w-0 flex-1">
                    <ArcadeIcon
                        name={isInfo ? 'bolt' : 'warning'}
                        className="w-4 h-4 mt-0.5 flex-shrink-0 {isWarning ? 'text-amber-300' : (isInfo ? 'text-cyan-300' : 'text-rose-300')}"
                    />
                    <span class="break-words leading-snug">{toast.message}</span>
                </div>
                <button
                    type="button"
                    data-testid="arcade-toast-dismiss"
                    on:click={() => handleManualDismiss(toast.id)}
                    aria-label={$t.dismiss || 'Dismiss'}
                    class="cut-sm px-2 py-1 border text-[11px] font-display uppercase tracking-wider cursor-pointer flex-shrink-0 transition-colors {
                        isWarning
                        ? 'bg-amber-900/70 border-amber-400/70 text-amber-100 hover:bg-amber-800'
                        : (isInfo
                            ? 'bg-cyan-900/70 border-cyan-400/70 text-cyan-100 hover:bg-cyan-800'
                            : 'bg-rose-950 border-rose-400/70 text-rose-100 hover:bg-rose-900')
                    }"
                >
                    {$t.ok || 'OK'}
                </button>
            </div>
        {/each}
    </div>
</div>
