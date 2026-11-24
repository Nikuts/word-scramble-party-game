<!-- src/lib/dev/SoundTestView.svelte -->
<script>
    import { onMount, onDestroy } from 'svelte';
    import { changeView } from '../../stores.js';
    import {
        playSound,
        unlockAudio
    } from '../utils.js';
    import { musicManager } from '../audio/musicManager.js';
    import {
        MUSIC_PLAYLIST_TRACKS,
        MUSIC_STAGE_LABELS,
        MUSIC_THEMES,
        MUSIC_THEME_METADATA
    } from '../audio/musicTracks.js';

    const STUDIO_TRACKS = MUSIC_PLAYLIST_TRACKS;
    const VALID_TRACK_IDS = new Set(STUDIO_TRACKS.map(t => t.id));
    const DEFAULT_FAVORITES = STUDIO_TRACKS.map(t => t.id);
    let userFavorites = new Set(DEFAULT_FAVORITES);
    let dismissedTracks = new Set();

    // Studio Audio Player State
    let selectedCategoryFilter = 'shortlist';
    let selectedStageFilter = 'all';
    const STAGE_FILTERS = [
        { id: 'all', label: '🌐 All Stages' },
        { id: 'lobby', label: '🏠 Lobby' },
        { id: 'question', label: '✍️ Questions' },
        { id: 'battle', label: '⚔️ Battle' },
        { id: 'voting', label: '🗳️ Voting' },
        { id: 'podium', label: '🏆 Podium' }
    ];
    let studioAudio = null;
    let selectedStudioTrack = STUDIO_TRACKS[0];
    let isStudioPlaying = false;
    let studioCurrentTime = 0;
    let studioDuration = 0;
    let studioVolume = 0.65;
    let isStudioMuted = false;
    let isStudioLooping = true;
    let isStudioDucked = false;

    // Filtered tracks (Excluding dismissed tracks)
    $: activeTracks = STUDIO_TRACKS.filter(t => !dismissedTracks.has(t.id));

    $: tabBaseTracks = selectedCategoryFilter === 'shortlist'
        ? activeTracks.filter(t => userFavorites.has(t.id))
        : activeTracks;

    $: filteredTracks = selectedStageFilter === 'all'
        ? tabBaseTracks
        : tabBaseTracks.filter(t => (t.stages || [t.stage]).includes(selectedStageFilter));

    function toggleFavorite(trackId) {
        if (userFavorites.has(trackId)) {
            userFavorites.delete(trackId);
        } else {
            userFavorites.add(trackId);
        }
        userFavorites = new Set(userFavorites);
        try {
            localStorage.setItem('ws_user_favorites', JSON.stringify([...userFavorites]));
        } catch (e) {}
    }

    function handleDislikeTrack(trackId) {
        dismissedTracks.add(trackId);
        userFavorites.delete(trackId);
        dismissedTracks = new Set(dismissedTracks);
        userFavorites = new Set(userFavorites);

        try {
            localStorage.setItem('ws_dismissed_tracks', JSON.stringify([...dismissedTracks]));
            localStorage.setItem('ws_user_favorites', JSON.stringify([...userFavorites]));
        } catch (e) {}

        // If the disliked track is currently playing or selected, switch to next available track
        if (selectedStudioTrack && selectedStudioTrack.id === trackId) {
            const remaining = activeTracks.filter(t => t.id !== trackId);
            if (remaining.length > 0) {
                const nextTrack = remaining[0];
                selectedStudioTrack = nextTrack;
                if (isStudioPlaying && studioAudio) {
                    playStudioTrack(nextTrack);
                } else if (studioAudio) {
                    studioAudio.src = nextTrack.src;
                }
            } else {
                if (studioAudio) studioAudio.pause();
                isStudioPlaying = false;
            }
        }
    }

    function handleResetDismissed() {
        const defaultSet = new Set(DEFAULT_FAVORITES);
        for (const id of dismissedTracks) {
            if (defaultSet.has(id)) {
                userFavorites.add(id);
            }
        }
        dismissedTracks = new Set();
        userFavorites = new Set(userFavorites);
        try {
            localStorage.removeItem('ws_dismissed_tracks');
            localStorage.setItem('ws_user_favorites', JSON.stringify([...userFavorites]));
        } catch (e) {}
    }

    // Procedural Synth State (Legacy Comparison)
    let selectedTheme = musicManager.getTheme() === MUSIC_THEMES.OFF ? MUSIC_THEMES.DEEP_LOFI_BASS : musicManager.getTheme();
    let currentPlayingPhase = null;
    let isSynthPlaying = false;
    let isSynthDucked = false;
    let synthVolume = 0.55;
    let isSynthMuted = false;

    const PHASES = [
        { id: 'lobby', name: 'Lobby & Matchmaking', icon: '🎧', desc: 'Deep sub-bass groove & warm low-end waiting beat.' },
        { id: 'question', name: 'Question Writing', icon: '📝', desc: 'Low-frequency, focused thinking rhythm.' },
        { id: 'battle', name: 'Battle Answering', icon: '🕶️', desc: 'Thick, driving rolling bass scramble beat.' },
        { id: 'voting', name: 'Voting & Showdown', icon: '🌌', desc: 'Dark, hypnotic sub-pulse voting tension.' },
        { id: 'podium', name: 'Podium & Victory', icon: '🏆', desc: 'Warm, low-register celebration groove.' }
    ];

    const VO_SAMPLES = [
        { id: 'vo_get_ready_questions_en', label: 'Get Ready (EN)', icon: '🎙️' },
        { id: 'vo_battle_incoming_en', label: 'Battle Incoming! (EN)', icon: '⚔️' },
        { id: 'vo_voting_starts_en', label: 'Voting Starts! (EN)', icon: '🗳️' },
        { id: 'vo_final_scores_en', label: 'Final Scores! (EN)', icon: '🏆' },
        { id: 'vo_battle_incoming_uk', label: 'Битва наближається! (UK)', icon: '🇺🇦' },
        { id: 'vo_voting_starts_uk', label: 'Початок голосування! (UK)', icon: '🇺🇦' }
    ];

    onMount(() => {
        try {
            const savedFavs = localStorage.getItem('ws_user_favorites');
            if (savedFavs) {
                const parsed = JSON.parse(savedFavs);
                if (Array.isArray(parsed)) {
                    const cleanedFavs = [...new Set([...DEFAULT_FAVORITES, ...parsed].filter(id => VALID_TRACK_IDS.has(id)))];
                    userFavorites = new Set(cleanedFavs);
                    localStorage.setItem('ws_user_favorites', JSON.stringify(cleanedFavs));
                }
            }

            const savedDismissed = localStorage.getItem('ws_dismissed_tracks');
            if (savedDismissed) {
                const parsedDismissed = JSON.parse(savedDismissed);
                if (Array.isArray(parsedDismissed)) {
                    const cleanedDismissed = parsedDismissed.filter(id => VALID_TRACK_IDS.has(id));
                    dismissedTracks = new Set(cleanedDismissed);
                    if (cleanedDismissed.length > 0) {
                        localStorage.setItem('ws_dismissed_tracks', JSON.stringify(cleanedDismissed));
                    } else {
                        localStorage.removeItem('ws_dismissed_tracks');
                    }
                }
            }
        } catch (e) {}

        if (typeof Audio !== 'undefined') {
            studioAudio = new Audio();
            studioAudio.loop = isStudioLooping;
            studioAudio.volume = studioVolume;

            studioAudio.addEventListener('timeupdate', () => {
                if (studioAudio) studioCurrentTime = studioAudio.currentTime;
            });
            studioAudio.addEventListener('loadedmetadata', () => {
                if (studioAudio) studioDuration = studioAudio.duration || 0;
            });
            studioAudio.addEventListener('ended', () => {
                if (!isStudioLooping) isStudioPlaying = false;
            });
        }
    });

    // =========================================================================
    // STUDIO PLAYER CONTROLS (OPTION A)
    // =========================================================================
    async function playStudioTrack(track) {
        unlockAudio();
        if (isSynthPlaying) handleStopSynth();

        selectedStudioTrack = track;
        if (!studioAudio) return;

        if (studioAudio.src !== window.location.origin + track.src && !studioAudio.src.endsWith(track.src)) {
            studioAudio.src = track.src;
            studioAudio.currentTime = 0;
        }

        try {
            await studioAudio.play();
            isStudioPlaying = true;
        } catch (e) {
            console.warn('[StudioPlayer] Playback failed:', e);
        }
    }

    async function toggleStudioPlay() {
        unlockAudio();
        if (!studioAudio) return;

        if (isStudioPlaying) {
            studioAudio.pause();
            isStudioPlaying = false;
        } else {
            if (!studioAudio.src || studioAudio.src === '') {
                studioAudio.src = selectedStudioTrack.src;
            }
            if (isSynthPlaying) handleStopSynth();
            try {
                await studioAudio.play();
                isStudioPlaying = true;
            } catch (e) {
                console.warn('[StudioPlayer] Playback failed:', e);
            }
        }
    }

    function handleStudioSeek(e) {
        const time = parseFloat(e.target.value);
        if (studioAudio) {
            studioAudio.currentTime = time;
            studioCurrentTime = time;
        }
    }

    function handleStudioVolumeChange(e) {
        studioVolume = parseFloat(e.target.value);
        if (studioAudio && !isStudioMuted) {
            studioAudio.volume = studioVolume;
        }
    }

    function toggleStudioMute() {
        isStudioMuted = !isStudioMuted;
        if (studioAudio) {
            studioAudio.volume = isStudioMuted ? 0 : studioVolume;
        }
    }

    function toggleStudioLoop() {
        isStudioLooping = !isStudioLooping;
        if (studioAudio) {
            studioAudio.loop = isStudioLooping;
        }
    }

    function formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    // =========================================================================
    // SYNTH PLAYER CONTROLS (COMPARISON)
    // =========================================================================
    async function handleSelectSynthTheme(themeKey) {
        unlockAudio();
        selectedTheme = themeKey;
        if (isSynthPlaying && currentPlayingPhase) {
            musicManager.setTheme(themeKey);
            await musicManager.playStage(currentPlayingPhase);
        }
    }

    async function handlePlaySynthPhase(phaseKey) {
        unlockAudio();
        if (isStudioPlaying && studioAudio) {
            studioAudio.pause();
            isStudioPlaying = false;
        }

        if (isSynthPlaying && currentPlayingPhase === phaseKey) {
            musicManager.stop(0.3);
            isSynthPlaying = false;
            currentPlayingPhase = null;
            return;
        }

        musicManager.setTheme(selectedTheme);
        await musicManager.playStage(phaseKey);
        currentPlayingPhase = phaseKey;
        isSynthPlaying = true;
    }

    function handleStopSynth() {
        musicManager.stop(0.3);
        isSynthPlaying = false;
        currentPlayingPhase = null;
    }

    // =========================================================================
    // VOICEOVER DUCKING TEST
    // =========================================================================
    function handlePlayVO(voId) {
        unlockAudio();
        isStudioDucked = true;
        isSynthDucked = true;

        if (studioAudio && isStudioPlaying && !isStudioMuted) {
            studioAudio.volume = studioVolume * 0.25;
        }

        playSound(voId);

        setTimeout(() => {
            isStudioDucked = false;
            isSynthDucked = false;
            if (studioAudio && !isStudioMuted) {
                studioAudio.volume = studioVolume;
            }
        }, 3200);
    }

    onDestroy(() => {
        if (studioAudio) {
            studioAudio.pause();
            studioAudio.src = '';
            studioAudio = null;
        }
        musicManager.stop(0.2);
    });
</script>

<div class="sound-test-scroll-shell">
<div class="sound-test-container">
    <!-- Header -->
    <header class="sound-test-header">
        <div class="header-titles">
            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
                <button class="back-btn" on:click={() => changeView('mainMenu')}>
                    ⬅️ Main Menu
                </button>
                <span class="badge" style="margin-bottom: 0;">🕹️ RETRO ARCADE SOUND LAB</span>
            </div>
            <h1>Interactive Music Sampler</h1>
            <p>Audition the <strong>15 Normalized Live Game Tracks</strong> (<strong>Kevin MacLeod · CC-BY 4.0</strong>) with multi-stage rotation pools.</p>
        </div>
    </header>

    <!-- ===================================================================== -->
    <!-- SECTION 1: OPTION A - STUDIO RECORDINGS SHOWCASE                      -->
    <!-- ===================================================================== -->
    <section class="studio-section">
        <div class="section-badge-row">
            <span class="star-badge">⭐ LIVE RETRO-ARCADE SOUNDTRACK</span>
            <span class="section-tagline">15 Loudness-Normalized (-16 LUFS) Tracks · Zero-Repeat Phase Rotation · Kevin MacLeod (CC-BY 4.0)</span>
        </div>
        
        <div class="section-heading-with-filters">
            <div>
                <h2>1. Studio Soundtrack Showcase</h2>
                <span class="subtext">Filter by live Screen Category (tracks rotate across all listed stages without repeating):</span>
            </div>

            <!-- Category Filter Tabs -->
            <div class="category-tabs">
                <button
                    class="cat-tab shortlist-tab"
                    class:active={selectedCategoryFilter === 'shortlist'}
                    on:click={() => selectedCategoryFilter = 'shortlist'}
                >
                    ⭐ Live Soundtrack ({activeTracks.filter(t => userFavorites.has(t.id)).length})
                </button>
                <button
                    class="cat-tab"
                    class:active={selectedCategoryFilter === 'all'}
                    on:click={() => selectedCategoryFilter = 'all'}
                >
                    🌐 All ({activeTracks.length})
                </button>
                {#if dismissedTracks.size > 0}
                    <button class="cat-tab reset-dismissed-tab" on:click={handleResetDismissed}>
                        🔄 Restore {dismissedTracks.size} Disliked
                    </button>
                {/if}
            </div>
        </div>

        <div class="ai-stage-bar" role="group" aria-label="Filter tracks by screen category">
            <span class="ai-stage-label">Screen Category:</span>
            <div class="ai-stage-pills">
                {#each STAGE_FILTERS as stageFilter}
                    {@const stageCount = stageFilter.id === 'all'
                        ? tabBaseTracks.length
                        : tabBaseTracks.filter(t => (t.stages || [t.stage]).includes(stageFilter.id)).length}
                    <button
                        class="stage-pill"
                        class:active={selectedStageFilter === stageFilter.id}
                        on:click={() => selectedStageFilter = stageFilter.id}
                    >
                        {stageFilter.label} ({stageCount})
                    </button>
                {/each}
            </div>
        </div>

        <!-- Master Studio Player Deck -->
        {#if selectedStudioTrack}
            <div class="studio-player-deck" style="border-left-color: {selectedStudioTrack.accentColor};">
                <div class="player-track-info">
                    <div class="now-playing-pill" class:active={isStudioPlaying}>
                        {#if isStudioPlaying}
                            <span class="pulse-dot" style="background: {selectedStudioTrack.accentColor};"></span> NOW PLAYING: {selectedStudioTrack.title.toUpperCase()}
                        {:else}
                            READY TO PLAY
                        {/if}
                        {#if userFavorites.has(selectedStudioTrack.id)}
                            <span class="fav-pill">⭐ ON YOUR SHORTLIST</span>
                        {/if}
                        {#if isStudioDucked}
                            <span class="duck-pill">🦆 VO DUCKING (-75%)</span>
                        {/if}
                    </div>
                    <h3 class="track-title">{selectedStudioTrack.title}</h3>
                    <div class="track-meta-row">
                        <span class="track-artist">👤 {selectedStudioTrack.artist}</span>
                        <span class="track-badge">{selectedStudioTrack.genre}</span>
                        <span class="track-vibe-badge">🎯 Vibe: {selectedStudioTrack.jackboxVibe}</span>
                        <span class="track-bpm-badge">⚡ {selectedStudioTrack.bpm} BPM</span>
                    </div>
                    <p class="track-instruments"><strong>Instruments:</strong> {selectedStudioTrack.instruments}</p>
                </div>

                <!-- Scrubber & Time -->
                <div class="player-scrubber-group">
                    <div class="time-display">
                        <span>{formatTime(studioCurrentTime)}</span>
                        <span>{formatTime(studioDuration)}</span>
                    </div>
                    <input
                        type="range"
                        class="scrubber-bar"
                        min="0"
                        max={studioDuration || 100}
                        step="0.1"
                        value={studioCurrentTime}
                        on:input={handleStudioSeek}
                    />
                </div>

                <!-- Controls Row -->
                <div class="player-controls-row">
                    <button
                        class="studio-main-play-btn"
                        on:click={toggleStudioPlay}
                        style="background: {selectedStudioTrack.accentColor};"
                    >
                        {#if isStudioPlaying}
                            <span>⏸️ Pause {selectedStudioTrack.title}</span>
                        {:else}
                            <span>▶️ Play {selectedStudioTrack.title}</span>
                        {/if}
                    </button>

                    <button
                        class="fav-toggle-btn"
                        class:is-fav={userFavorites.has(selectedStudioTrack.id)}
                        on:click={() => toggleFavorite(selectedStudioTrack.id)}
                    >
                        {userFavorites.has(selectedStudioTrack.id) ? '⭐ Shortlisted' : '🤍 Add to Shortlist'}
                    </button>

                    <!-- Deck Dislike / Delete Button -->
                    <button
                        class="deck-dislike-btn"
                        on:click={() => handleDislikeTrack(selectedStudioTrack.id)}
                        title="Dislike and remove this track from list"
                    >
                        👎 Dislike & Remove
                    </button>

                    <button class="loop-toggle-btn" class:active={isStudioLooping} on:click={toggleStudioLoop}>
                        🔁 {isStudioLooping ? 'Loop: ON' : 'Loop: OFF'}
                    </button>

                    <div class="volume-control-box">
                        <button class="mini-mute-btn" on:click={toggleStudioMute}>
                            {isStudioMuted ? '🔇' : '🔊'}
                        </button>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={studioVolume}
                            on:input={handleStudioVolumeChange}
                        />
                        <span class="vol-num">{Math.round((isStudioMuted ? 0 : studioVolume) * 100)}%</span>
                    </div>
                </div>
            </div>
        {/if}

        <!-- Studio Tracks Grid -->
        <div class="studio-grid">
            {#each filteredTracks as track (track.id)}
                <div
                    class="studio-card"
                    role="button"
                    tabindex="0"
                    class:selected={selectedStudioTrack && selectedStudioTrack.id === track.id}
                    class:playing={isStudioPlaying && selectedStudioTrack && selectedStudioTrack.id === track.id}
                    class:is-favorited={userFavorites.has(track.id)}
                    on:click={() => playStudioTrack(track)}
                    on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') playStudioTrack(track); }}
                    style="--card-accent: {track.accentColor};"
                >
                    <div class="card-top-row">
                        <span class="card-genre">{track.genre}</span>
                        <div style="display: flex; align-items: center; gap: 0.4rem;">
                            {#if userFavorites.has(track.id)}
                                <span class="card-fav-star">⭐</span>
                            {/if}
                            <span class="card-bpm">{track.bpm} BPM</span>
                        </div>
                    </div>

                    <h4 class="card-title">{track.title}</h4>
                    <span class="card-jackbox">🎯 {track.jackboxVibe}</span>
                    <span class="card-stages">{(track.stages || [track.stage]).map(s => MUSIC_STAGE_LABELS[s] || s).join(' · ')}</span>
                    <p class="card-desc">{track.desc}</p>
                    <p class="card-inst">🎹 {track.instruments}</p>

                    <div class="card-actions-row">
                        <button
                            class="card-play-action"
                            on:click|stopPropagation={() => playStudioTrack(track)}
                        >
                            {#if isStudioPlaying && selectedStudioTrack && selectedStudioTrack.id === track.id}
                                ⏸️ Playing {track.title}
                            {:else}
                                ▶️ Listen to {track.title}
                            {/if}
                        </button>

                        <button
                            class="card-fav-btn"
                            class:active={userFavorites.has(track.id)}
                            on:click|stopPropagation={() => toggleFavorite(track.id)}
                            title={userFavorites.has(track.id) ? 'Remove from shortlist' : 'Add to shortlist'}
                        >
                            {userFavorites.has(track.id) ? '⭐' : '🤍'}
                        </button>

                        <!-- Dislike & Delete Button on Card -->
                        <button
                            class="card-dislike-btn"
                            on:click|stopPropagation={() => handleDislikeTrack(track.id)}
                            title="Dislike & auto-delete from list"
                        >
                            👎
                        </button>
                    </div>
                </div>
            {:else}
                <div class="empty-notice">
                    <p>No tracks in this view. All tracks were either shortlisted or disliked.</p>
                    {#if dismissedTracks.size > 0}
                        <button class="cat-tab" on:click={handleResetDismissed}>
                            🔄 Restore {dismissedTracks.size} Disliked Tracks
                        </button>
                    {/if}
                </div>
            {/each}
        </div>
    </section>

    <!-- ===================================================================== -->
    <!-- SECTION 2: PROCEDURAL SYNTHESIZER (LEGACY COMPARISON)                 -->
    <!-- ===================================================================== -->
    <section class="synth-section">
        <div class="section-heading">
            <h2>2. Compare with Web Audio Synthesizer (Procedural Code)</h2>
            <span class="subtext">Compare the studio recordings above with the mathematical oscillator-based presets below.</span>
        </div>

        <div class="theme-cards-grid">
            {#each Object.entries(MUSIC_THEME_METADATA) as [key, meta]}
                {#if key !== MUSIC_THEMES.OFF}
                    <button
                        class="theme-card"
                        class:selected={selectedTheme === key}
                        on:click={() => handleSelectSynthTheme(key)}
                    >
                        <div class="theme-icon">{meta.icon}</div>
                        <div class="theme-info">
                            <div class="theme-title-row">
                                <h3>{meta.name}</h3>
                            </div>
                            <span class="theme-tag">{meta.tag}</span>
                            <p class="theme-desc">{meta.description}</p>
                        </div>
                    </button>
                {/if}
            {/each}
        </div>

        <div class="phase-grid" style="margin-top: 1.5rem;">
            {#each PHASES as phase}
                <div class="phase-card" class:playing={isSynthPlaying && currentPlayingPhase === phase.id}>
                    <div class="phase-header">
                        <span class="phase-icon">{phase.icon}</span>
                        <div class="phase-text">
                            <h4>{phase.name}</h4>
                            <span class="phase-desc">{phase.desc}</span>
                        </div>
                    </div>

                    <button
                        class="phase-play-btn"
                        class:is-active={isSynthPlaying && currentPlayingPhase === phase.id}
                        on:click={() => handlePlaySynthPhase(phase.id)}
                    >
                        {#if isSynthPlaying && currentPlayingPhase === phase.id}
                            <span class="btn-icon">⏸️</span> Pause Synth
                        {:else}
                            <span class="btn-icon">▶️</span> Play Synth {phase.name.split(' ')[0]}
                        {/if}
                    </button>
                </div>
            {/each}
        </div>
    </section>

    <!-- ===================================================================== -->
    <!-- SECTION 3: VOICEOVER & DUCKING TEST BENCH                             -->
    <!-- ===================================================================== -->
    <section class="vo-ducking-section">
        <div class="section-heading">
            <h2>3. Voiceover & Audio Ducking Test</h2>
            <span class="subtext">Start any studio track or synth loop above, then click a voiceover button to test real-time audio ducking.</span>
        </div>

        <div class="vo-buttons-grid">
            {#each VO_SAMPLES as sample}
                <button class="vo-btn" on:click={() => handlePlayVO(sample.id)}>
                    <span class="vo-icon">{sample.icon}</span>
                    <span class="vo-label">{sample.label}</span>
                </button>
            {/each}
        </div>
    </section>
</div>
</div>

<style>
    .sound-test-scroll-shell {
        width: 100%;
        height: 100%;
        overflow-y: auto;
        overflow-x: hidden;
        -webkit-overflow-scrolling: touch;
    }

    .sound-test-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2.5rem 1.5rem 5rem;
        color: #f8fafc;
        font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .sound-test-header {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: center;
        gap: 1.5rem;
        padding-bottom: 2rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.12);
        margin-bottom: 2.5rem;
    }

    .back-btn {
        background: rgba(30, 41, 59, 0.85);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #e2e8f0;
        font-weight: 700;
        font-size: 0.75rem;
        padding: 0.35rem 0.75rem;
        border-radius: 0.5rem;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .back-btn:hover {
        background: #38bdf8;
        color: #0f172a;
        border-color: #38bdf8;
    }

    .badge {
        display: inline-block;
        font-size: 0.75rem;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #38bdf8;
        background: rgba(56, 189, 248, 0.15);
        border: 1px solid rgba(56, 189, 248, 0.35);
        padding: 0.35rem 0.8rem;
        border-radius: 9999px;
    }

    .sound-test-header h1 {
        font-size: 2.25rem;
        font-weight: 900;
        margin: 0 0 0.5rem;
        letter-spacing: -0.03em;
        background: linear-gradient(135deg, #ffffff 30%, #fbbf24 70%, #34d399 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }

    .sound-test-header p {
        margin: 0;
        color: #94a3b8;
        font-size: 1rem;
    }

    /* Studio Section Styling */
    .studio-section {
        background: linear-gradient(180deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.9) 100%);
        border: 1px solid rgba(251, 191, 36, 0.35);
        border-radius: 1.5rem;
        padding: 2rem;
        margin-bottom: 3.5rem;
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
    }

    .section-badge-row {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 0.75rem;
    }

    .star-badge {
        font-size: 0.75rem;
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #0f172a;
        background: #fbbf24;
        padding: 0.3rem 0.75rem;
        border-radius: 9999px;
    }

    .section-tagline {
        font-size: 0.85rem;
        color: #cbd5e1;
        font-weight: 600;
    }

    .section-heading-with-filters {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: flex-end;
        gap: 1rem;
        margin-bottom: 1.5rem;
    }

    .section-heading-with-filters h2 {
        font-size: 1.45rem;
        font-weight: 800;
        margin: 0 0 0.25rem;
        color: #f1f5f9;
    }

    .subtext {
        color: #94a3b8;
        font-size: 0.9rem;
    }

    .category-tabs {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
    }

    .cat-tab {
        background: rgba(15, 23, 42, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: #94a3b8;
        font-weight: 700;
        font-size: 0.8rem;
        padding: 0.45rem 0.85rem;
        border-radius: 0.6rem;
        cursor: pointer;
        transition: all 0.15s ease;
    }

    .cat-tab:hover {
        background: rgba(251, 191, 36, 0.15);
        color: #e2e8f0;
        border-color: rgba(251, 191, 36, 0.4);
    }

    .cat-tab.active {
        background: #fbbf24;
        color: #0f172a;
        border-color: #fbbf24;
        font-weight: 800;
        box-shadow: 0 0 14px rgba(251, 191, 36, 0.4);
    }

    .cat-tab.shortlist-tab.active {
        background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
        color: #0f172a;
        box-shadow: 0 0 18px rgba(251, 191, 36, 0.5);
    }

    .ai-stage-bar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.65rem;
        margin-bottom: 1.5rem;
        padding: 0.75rem 1rem;
        border-radius: 0.85rem;
        background: rgba(15, 23, 42, 0.72);
        border: 1px solid rgba(52, 211, 153, 0.25);
    }

    .ai-stage-label {
        font-size: 0.75rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #6ee7b7;
    }

    .ai-stage-pills {
        display: flex;
        flex-wrap: wrap;
        gap: 0.45rem;
    }

    .stage-pill {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.14);
        color: #cbd5e1;
        font-size: 0.75rem;
        font-weight: 700;
        padding: 0.35rem 0.7rem;
        border-radius: 9999px;
        cursor: pointer;
        transition: all 0.15s ease;
    }

    .stage-pill:hover {
        border-color: #34d399;
        color: #ffffff;
    }

    .stage-pill.active {
        background: #34d399;
        color: #0f172a;
        border-color: #34d399;
        font-weight: 800;
    }

    .reset-dismissed-tab {
        background: rgba(239, 68, 68, 0.15);
        border-color: rgba(239, 68, 68, 0.35);
        color: #f87171;
    }

    .reset-dismissed-tab:hover {
        background: #ef4444;
        color: #ffffff;
        border-color: #ef4444;
    }

    /* Player Deck */
    .studio-player-deck {
        background: rgba(15, 23, 42, 0.95);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-left: 6px solid #fbbf24;
        border-radius: 1rem;
        padding: 1.5rem 1.75rem;
        margin: 0 0 2rem;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
    }

    .now-playing-pill {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.75rem;
        font-weight: 800;
        color: #94a3b8;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        padding: 0.25rem 0.65rem;
        border-radius: 9999px;
        margin-bottom: 0.5rem;
    }

    .now-playing-pill.active {
        color: #fbbf24;
        background: rgba(251, 191, 36, 0.12);
        border-color: rgba(251, 191, 36, 0.4);
    }

    .fav-pill {
        background: rgba(251, 191, 36, 0.2);
        color: #fbbf24;
        border: 1px solid rgba(251, 191, 36, 0.4);
        font-weight: 900;
        font-size: 0.65rem;
        padding: 0.15rem 0.5rem;
        border-radius: 9999px;
    }

    .pulse-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
        0% { transform: scale(0.9); opacity: 0.7; }
        50% { transform: scale(1.3); opacity: 1; }
        100% { transform: scale(0.9); opacity: 0.7; }
    }

    .duck-pill {
        background: #f59e0b;
        color: #0f172a;
        font-weight: 900;
        font-size: 0.65rem;
        padding: 0.15rem 0.45rem;
        border-radius: 9999px;
    }

    .track-title {
        font-size: 1.6rem;
        font-weight: 800;
        margin: 0 0 0.5rem;
        color: #ffffff;
    }

    .track-meta-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.6rem;
        align-items: center;
        font-size: 0.85rem;
        margin-bottom: 0.5rem;
    }

    .track-artist {
        color: #94a3b8;
        font-weight: 600;
    }

    .track-badge {
        background: rgba(255, 255, 255, 0.1);
        color: #e2e8f0;
        padding: 0.2rem 0.5rem;
        border-radius: 0.4rem;
        font-weight: 600;
        font-size: 0.75rem;
    }

    .track-vibe-badge {
        background: rgba(251, 191, 36, 0.15);
        color: #fbbf24;
        border: 1px solid rgba(251, 191, 36, 0.3);
        padding: 0.2rem 0.5rem;
        border-radius: 0.4rem;
        font-weight: 700;
        font-size: 0.75rem;
    }

    .track-bpm-badge {
        background: rgba(52, 211, 153, 0.15);
        color: #34d399;
        border: 1px solid rgba(52, 211, 153, 0.3);
        padding: 0.2rem 0.5rem;
        border-radius: 0.4rem;
        font-weight: 700;
        font-size: 0.75rem;
    }

    .track-instruments {
        font-size: 0.85rem;
        color: #94a3b8;
        margin: 0;
    }

    .player-scrubber-group {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
    }

    .time-display {
        display: flex;
        justify-content: space-between;
        font-size: 0.75rem;
        font-weight: 700;
        color: #94a3b8;
    }

    .scrubber-bar {
        width: 100%;
        accent-color: #fbbf24;
        cursor: pointer;
        height: 6px;
    }

    .player-controls-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
    }

    .studio-main-play-btn {
        color: #0f172a;
        font-weight: 900;
        font-size: 1rem;
        padding: 0.65rem 1.4rem;
        border-radius: 0.75rem;
        border: none;
        cursor: pointer;
        transition: transform 0.15s ease, filter 0.15s ease;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);
    }

    .studio-main-play-btn:hover {
        transform: translateY(-2px);
        filter: brightness(1.1);
    }

    .fav-toggle-btn {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: #e2e8f0;
        font-weight: 700;
        font-size: 0.85rem;
        padding: 0.55rem 0.9rem;
        border-radius: 0.6rem;
        cursor: pointer;
        transition: all 0.15s;
    }

    .fav-toggle-btn.is-fav {
        background: rgba(251, 191, 36, 0.2);
        border-color: #fbbf24;
        color: #fbbf24;
    }

    .deck-dislike-btn {
        background: rgba(239, 68, 68, 0.12);
        border: 1px solid rgba(239, 68, 68, 0.3);
        color: #f87171;
        font-weight: 700;
        font-size: 0.85rem;
        padding: 0.55rem 0.9rem;
        border-radius: 0.6rem;
        cursor: pointer;
        transition: all 0.15s;
    }

    .deck-dislike-btn:hover {
        background: #ef4444;
        color: #ffffff;
        border-color: #ef4444;
    }

    .loop-toggle-btn {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: #94a3b8;
        font-weight: 700;
        font-size: 0.85rem;
        padding: 0.55rem 0.9rem;
        border-radius: 0.6rem;
        cursor: pointer;
    }

    .loop-toggle-btn.active {
        color: #fbbf24;
        border-color: #fbbf24;
        background: rgba(251, 191, 36, 0.15);
    }

    .volume-control-box {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        background: rgba(255, 255, 255, 0.05);
        padding: 0.4rem 0.75rem;
        border-radius: 0.6rem;
        border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .mini-mute-btn {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 1rem;
        padding: 0;
    }

    .volume-control-box input[type="range"] {
        width: 85px;
        accent-color: #fbbf24;
    }

    .vol-num {
        font-size: 0.75rem;
        color: #94a3b8;
        font-weight: 700;
        min-width: 30px;
    }

    /* Studio Grid */
    .studio-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 1rem;
    }

    .studio-card {
        background: rgba(15, 23, 42, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 1rem;
        padding: 1.25rem;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        transition: all 0.2s ease;
    }

    .studio-card:hover {
        border-color: var(--card-accent, #fbbf24);
        transform: translateY(-2px);
        background: rgba(30, 41, 59, 0.9);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    }

    .studio-card.selected {
        border-color: var(--card-accent, #fbbf24);
        box-shadow: 0 0 18px var(--card-accent, rgba(251, 191, 36, 0.35));
    }

    .studio-card.playing {
        border-color: #34d399;
        box-shadow: 0 0 20px rgba(52, 211, 153, 0.35);
    }

    .card-top-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .card-genre {
        font-size: 0.75rem;
        font-weight: 800;
        color: var(--card-accent, #fbbf24);
    }

    .card-bpm {
        font-size: 0.7rem;
        color: #34d399;
        font-weight: 700;
        background: rgba(52, 211, 153, 0.1);
        padding: 0.15rem 0.4rem;
        border-radius: 0.3rem;
    }

    .card-fav-star {
        font-size: 0.85rem;
    }

    .card-title {
        font-size: 1.15rem;
        font-weight: 800;
        margin: 0;
        color: #ffffff;
    }

    .card-jackbox {
        font-size: 0.75rem;
        color: #a7f3d0;
        font-weight: 700;
    }

    .card-stages {
        font-size: 0.72rem;
        color: #7dd3fc;
        font-weight: 600;
        letter-spacing: 0.02em;
    }

    .card-desc {
        font-size: 0.8rem;
        color: #94a3b8;
        margin: 0;
        line-height: 1.35;
        flex: 1;
    }

    .card-inst {
        font-size: 0.7rem;
        color: #64748b;
        margin: 0;
    }

    .card-actions-row {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        margin-top: 0.5rem;
    }

    .card-play-action {
        flex: 1;
        background: rgba(251, 191, 36, 0.15);
        border: 1px solid rgba(251, 191, 36, 0.3);
        color: #fbbf24;
        font-weight: 800;
        font-size: 0.8rem;
        padding: 0.5rem;
        border-radius: 0.6rem;
        cursor: pointer;
        transition: all 0.15s;
    }

    .card-play-action:hover {
        background: #fbbf24;
        color: #0f172a;
    }

    .card-fav-btn {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        padding: 0.5rem 0.65rem;
        border-radius: 0.6rem;
        cursor: pointer;
        font-size: 0.85rem;
        transition: all 0.15s;
    }

    .card-fav-btn:hover, .card-fav-btn.active {
        background: rgba(251, 191, 36, 0.25);
        border-color: #fbbf24;
    }

    .card-dislike-btn {
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.2);
        color: #f87171;
        padding: 0.5rem 0.65rem;
        border-radius: 0.6rem;
        cursor: pointer;
        font-size: 0.85rem;
        transition: all 0.15s;
    }

    .card-dislike-btn:hover {
        background: #ef4444;
        color: #ffffff;
        border-color: #ef4444;
    }

    .empty-notice {
        grid-column: 1 / -1;
        padding: 3rem;
        text-align: center;
        background: rgba(15, 23, 42, 0.5);
        border: 1px dashed rgba(255, 255, 255, 0.2);
        border-radius: 1rem;
        color: #94a3b8;
    }

    /* Synth & Phase Sections */
    .synth-section {
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        padding-top: 2.5rem;
        margin-bottom: 3.5rem;
    }

    .theme-cards-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 1rem;
    }

    .theme-card {
        background: rgba(15, 23, 42, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 0.85rem;
        padding: 1rem;
        text-align: left;
        color: #e2e8f0;
        cursor: pointer;
        display: flex;
        gap: 0.85rem;
    }

    .theme-card.selected {
        border-color: #818cf8;
        background: rgba(129, 140, 248, 0.1);
    }

    .theme-icon {
        font-size: 1.5rem;
    }

    .theme-info h3 {
        font-size: 0.95rem;
        font-weight: 700;
        margin: 0 0 0.2rem;
    }

    .theme-tag {
        font-size: 0.65rem;
        color: #818cf8;
        font-weight: 800;
        text-transform: uppercase;
    }

    .theme-desc {
        font-size: 0.75rem;
        color: #94a3b8;
        margin: 0.25rem 0 0;
    }

    .phase-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 0.85rem;
    }

    .phase-card {
        background: rgba(15, 23, 42, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 0.75rem;
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
    }

    .phase-card.playing {
        border-color: #4ade80;
        background: rgba(34, 197, 94, 0.08);
    }

    .phase-header {
        display: flex;
        gap: 0.6rem;
    }

    .phase-icon {
        font-size: 1.3rem;
    }

    .phase-text h4 {
        margin: 0;
        font-size: 0.85rem;
        font-weight: 700;
    }

    .phase-desc {
        font-size: 0.7rem;
        color: #94a3b8;
    }

    .phase-play-btn {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: #cbd5e1;
        font-weight: 700;
        font-size: 0.75rem;
        padding: 0.45rem;
        border-radius: 0.5rem;
        cursor: pointer;
    }

    .phase-play-btn.is-active {
        background: #22c55e;
        color: #0f172a;
        border-color: #22c55e;
    }

    /* Voiceover Section */
    .vo-ducking-section {
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        padding-top: 2.5rem;
    }

    .vo-buttons-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 0.75rem;
    }

    .vo-btn {
        background: rgba(30, 41, 59, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 0.75rem;
        padding: 0.85rem 1rem;
        display: flex;
        align-items: center;
        gap: 0.6rem;
        color: #f1f5f9;
        font-weight: 700;
        font-size: 0.85rem;
        cursor: pointer;
        transition: all 0.2s;
    }

    .vo-btn:hover {
        background: #fbbf24;
        color: #0f172a;
        transform: translateY(-2px);
    }
</style>
