<!-- src/lib/shared/ArcadeConfirmModal.svelte -->
<script context="module">
    let modalSeq = 0;
</script>

<script>
    import { createEventDispatcher, onMount, afterUpdate } from 'svelte';
    import ArcadeIcon from './ArcadeIcon.svelte';

    export let open = false;
    export let title = '';
    export let message = '';
    export let confirmLabel = 'Confirm';
    export let cancelLabel = 'Cancel';
    export let variant = 'danger'; // 'danger' | 'warning' | 'primary'

    const dispatch = createEventDispatcher();
    const instanceId = ++modalSeq;
    const titleId = `arcade-confirm-title-${instanceId}`;
    const descId = `arcade-confirm-desc-${instanceId}`;

    let dialogEl;
    let cardEl;
    let mounted = false;

    $: borderClass = variant === 'warning'
        ? 'border-amber-400'
        : (variant === 'primary' ? 'border-primary' : 'border-danger');
    $: titleColorClass = variant === 'warning'
        ? 'text-amber-300'
        : (variant === 'primary' ? 'text-primary' : 'text-rose-300');
    $: btnColor = variant === 'warning'
        ? 'var(--color-warning)'
        : (variant === 'primary' ? 'var(--color-primary)' : 'var(--color-danger)');
    $: iconName = variant === 'primary' ? 'bolt' : 'warning';

    function syncDialogState() {
        if (!mounted || !dialogEl) return;
        const supportsModal = typeof dialogEl.showModal === 'function';
        if (open) {
            if (supportsModal) {
                if (!dialogEl.open) {
                    dialogEl.returnValue = '';
                    dialogEl.showModal();
                }
            } else if (!dialogEl.hasAttribute('open')) {
                dialogEl.setAttribute('open', '');
            }
        } else {
            if (supportsModal) {
                if (dialogEl.open) {
                    dialogEl.close('');
                }
            } else if (dialogEl.hasAttribute('open')) {
                dialogEl.removeAttribute('open');
            }
        }
    }

    onMount(() => {
        mounted = true;
        syncDialogState();

        if (!dialogEl || ('closedBy' in HTMLDialogElement.prototype)) return;

        // Progressive fallback for browsers lacking <dialog closedby="any"> (e.g., Safari)
        let pressedOutside = false;
        const isOutsideCard = (e) => {
            if (!cardEl) return false;
            const r = cardEl.getBoundingClientRect();
            return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
        };
        const onPointerDown = (e) => {
            pressedOutside = dialogEl.open && isOutsideCard(e);
        };
        const onPointerUp = (e) => {
            if (pressedOutside && dialogEl.open && isOutsideCard(e)) {
                pressedOutside = false;
                if (typeof dialogEl.close === 'function') {
                    dialogEl.close('');
                } else {
                    finishClose('');
                }
            } else {
                pressedOutside = false;
            }
        };

        dialogEl.addEventListener('pointerdown', onPointerDown);
        dialogEl.addEventListener('pointerup', onPointerUp);
        return () => {
            dialogEl.removeEventListener('pointerdown', onPointerDown);
            dialogEl.removeEventListener('pointerup', onPointerUp);
        };
    });

    afterUpdate(syncDialogState);

    function finishClose(returnValue) {
        open = false;
        if (returnValue === 'confirm') {
            dispatch('confirm');
        } else {
            dispatch('cancel');
        }
    }

    function handleDialogClose() {
        if (!dialogEl) return;
        const result = dialogEl.returnValue;
        dialogEl.returnValue = '';
        finishClose(result);
    }

    function handleLegacyChoice(value) {
        if (dialogEl && typeof dialogEl.showModal === 'function') return;
        if (dialogEl) dialogEl.removeAttribute('open');
        finishClose(value);
    }
</script>

<dialog
    bind:this={dialogEl}
    class="arcade-modal"
    aria-labelledby={titleId}
    aria-describedby={message ? descId : undefined}
    closedby="any"
    data-testid="arcade-confirm-modal"
    on:close={handleDialogClose}
>
    <div
        bind:this={cardEl}
        class="arcade-modal-card cut-md bg-[#131126] border-2 {borderClass} w-full max-w-md p-5 sm:p-6 shadow-2xl select-none"
    >
        <div class="flex items-start gap-2.5 mb-2.5">
            <ArcadeIcon name={iconName} className="w-5 h-5 mt-0.5 {titleColorClass}" />
            <h1 id={titleId} class="font-display text-base sm:text-xl tracking-wide uppercase m-0 leading-snug {titleColorClass}">
                {title}
            </h1>
        </div>

        {#if message}
            <p id={descId} class="font-sans text-sm sm:text-base text-slate-200 leading-relaxed mb-5">
                {message}
            </p>
        {/if}

        <form method="dialog" class="flex flex-wrap items-center justify-end gap-2.5">
            <!-- svelte-ignore a11y-autofocus -->
            <button
                type="submit"
                value="cancel"
                autofocus
                data-testid="arcade-confirm-cancel"
                on:click={() => handleLegacyChoice('cancel')}
                class="btn-arcade btn-neutral py-2.5 px-4 text-xs sm:text-sm"
            >
                <span>{cancelLabel}</span>
            </button>
            <button
                type="submit"
                value="confirm"
                data-testid="arcade-confirm-accept"
                on:click={() => handleLegacyChoice('confirm')}
                class="btn-arcade py-2.5 px-4 text-xs sm:text-sm"
                style="--btn-color: {btnColor};"
            >
                <span>{confirmLabel}</span>
            </button>
        </form>
    </div>
</dialog>
