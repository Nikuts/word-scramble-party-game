<script>
  import { setLanguage } from '../../stores.js';
</script>

<div class="h-screen-safe flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative select-none">
    <div class="panel-arcade max-w-lg lg:max-w-[36rem] 2xl:max-w-[44rem] w-full text-center py-8 px-6 sm:px-10 lg:py-12 lg:px-14" style="--neon-color: var(--color-primary);">
        <p class="font-display text-xs lg:text-base 2xl:text-lg tracking-widest uppercase text-slate-400 mb-5 lg:mb-8">SELECT LANGUAGE / ОБЕРІТЬ МОВУ</p>
        <div class="flex flex-col sm:flex-row gap-3.5 lg:gap-5 justify-center">
            <button type="button" on:click={() => setLanguage('en')} class="btn-arcade text-xl sm:text-2xl lg:text-3xl lg:py-5 flex-1" style="--btn-color: #00e5ff;">English</button>
            <button type="button" on:click={() => setLanguage('uk')} class="btn-arcade text-xl sm:text-2xl lg:text-3xl lg:py-5 flex-1" style="--btn-color: #39ff14;">Українська</button>
        </div>
    </div>
</div>
