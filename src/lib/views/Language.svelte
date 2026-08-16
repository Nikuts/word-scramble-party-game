<script>
  import { setLanguage } from '../../stores.js';
</script>

<div class="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
    <div class="flex flex-col sm:flex-row gap-4">
        <button on:click={() => setLanguage('en')} class="btn-arcade text-2xl" style="--btn-color: #00CFFD;">English</button>
        <button on:click={() => setLanguage('uk')} class="btn-arcade text-2xl" style="--btn-color: #39FF14;">Українська</button>
    </div>
</div>