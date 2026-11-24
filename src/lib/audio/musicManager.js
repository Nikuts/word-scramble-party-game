// src/lib/audio/musicManager.js
import { MUSIC_THEMES, MUSIC_THEME_METADATA, getTracksForStage, mapPhaseToMusicStage } from './musicTracks.js';
import { MusicSynthesizer } from './musicSynthesizer.js';

function clampVolume(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return 0.42;
    return Math.max(0, Math.min(1, num));
}

function readLocalStorage(key) {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            return window.localStorage.getItem(key);
        }
    } catch (e) {}
    return null;
}

function writeLocalStorage(key, value) {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(key, value);
        }
    } catch (e) {}
}

class BackgroundMusicManager {
    constructor() {
        this.ctx = null;
        this.synth = null;
        this.currentTheme = MUSIC_THEMES.DEEP_LOFI_BASS;
        this.currentStage = 'lobby';
        this.isPlaying = false;

        this.isMuted = false;
        this.baseVolume = 0.42;
        this.isDucked = false;
        this.duckTimeout = null;

        // Live Studio Soundtrack playback state
        this.audioElement = null;
        this.fadingAudioElements = new Set();
        this.activeFades = new Map();
        this.currentTrack = null;
        this.currentSoundtrackStage = null;
        this.lastRound = null;
        this.isSoundtrackPlaying = false;
        this.pendingSoundtrackStage = null;
        this.needsUserGestureUnlock = false;
        this.pausedByVisibility = false;
        this.playedTrackIds = new Set();
        this.recentTrackIds = [];
        this._playSeq = 0;
        this._resumeInFlight = false;

        const savedTheme = readLocalStorage('wordScrambleMusicTheme');
        if (savedTheme && Object.values(MUSIC_THEMES).includes(savedTheme)) {
            this.currentTheme = savedTheme;
        }

        const savedMuted = readLocalStorage('wordScrambleMusicMuted');
        if (savedMuted !== null) {
            this.isMuted = savedMuted === 'true';
        }

        const savedVolume = readLocalStorage('wordScrambleMusicVolume');
        if (savedVolume !== null) {
            this.baseVolume = clampVolume(parseFloat(savedVolume));
        }
    }

    _getEffectiveAudioVolume() {
        if (this.isMuted) return 0;
        return this.isDucked ? clampVolume(this.baseVolume * 0.22) : clampVolume(this.baseVolume);
    }

    _getEffectiveSynthVolume() {
        if (this.isMuted) return 0.001;
        return this.isDucked ? clampVolume(this.baseVolume * 0.22) : clampVolume(this.baseVolume);
    }

    _cancelFadeFor(audioEl) {
        if (!audioEl) return;
        const timerId = this.activeFades.get(audioEl);
        if (timerId) {
            clearInterval(timerId);
            this.activeFades.delete(audioEl);
        }
    }

    _fadeAudioElement(audioEl, targetVol, durationSec = 0.4, onComplete = null) {
        if (!audioEl) {
            onComplete?.();
            return;
        }
        this._cancelFadeFor(audioEl);

        const clampedTarget = clampVolume(targetVol);
        const stepMs = 40;
        const steps = durationSec > 0 ? Math.max(1, Math.round((durationSec * 1000) / stepMs)) : 0;

        if (steps <= 1) {
            try {
                audioEl.volume = clampedTarget;
            } catch (e) {}
            onComplete?.();
            return;
        }

        const startVol = Number.isFinite(audioEl.volume) ? audioEl.volume : 0;
        let step = 0;
        const timerId = setInterval(() => {
            step += 1;
            const progress = Math.min(1, step / steps);
            try {
                audioEl.volume = clampVolume(startVol + (clampedTarget - startVol) * progress);
            } catch (e) {}

            if (progress >= 1) {
                clearInterval(timerId);
                this.activeFades.delete(audioEl);
                onComplete?.();
            }
        }, stepMs);

        this.activeFades.set(audioEl, timerId);
    }

    _disposeAudioElement(audioEl) {
        if (!audioEl) return;
        this._cancelFadeFor(audioEl);
        this.fadingAudioElements.delete(audioEl);
        try {
            audioEl.pause();
            audioEl.src = '';
        } catch (e) {}
    }

    _recordPlayedTrack(trackId) {
        if (!trackId) return;
        this.playedTrackIds.add(trackId);
        this.recentTrackIds = [...this.recentTrackIds.filter(id => id !== trackId), trackId].slice(-4);
    }

    /**
     * Picks the next soundtrack track for a game stage while avoiding repeats.
     * Priority:
     * 1. Unplayed primary track (excluding current track)
     * 2. Unplayed secondary-stage track (excluding current track)
     * 3. Primary non-recent track (excluding current track)
     * 4. Any eligible non-recent track (excluding current track)
     * 5. Any eligible track other than current track
     * 6. Any eligible track
     */
    selectTrackForStage(stageKey, rng = Math.random) {
        const eligible = getTracksForStage(stageKey);
        if (eligible.length === 0) return null;
        if (eligible.length === 1) return eligible[0];

        const currentId = this.currentTrack?.id || null;
        const notCurrent = eligible.filter(t => t.id !== currentId);
        const recentSet = new Set(this.recentTrackIds);

        const buckets = [
            notCurrent.filter(t => t.stage === stageKey && !this.playedTrackIds.has(t.id)),
            notCurrent.filter(t => !this.playedTrackIds.has(t.id)),
            notCurrent.filter(t => t.stage === stageKey && !recentSet.has(t.id)),
            notCurrent.filter(t => !recentSet.has(t.id)),
            notCurrent,
            eligible
        ];

        const pool = buckets.find(b => b.length > 0) || eligible;
        const rawIdx = Math.floor(rng() * pool.length);
        const safeIdx = Math.max(0, Math.min(pool.length - 1, rawIdx));
        return pool[safeIdx];
    }

    // =========================================================================
    // LIVE STUDIO SOUNDTRACK ENGINE (HOST TV PLAYBACK)
    // =========================================================================

    async playSoundtrackStage(stageKey, options = {}) {
        const { forceNewTrack = false, fadeDuration = 0.6 } = options;
        if (!stageKey) return null;

        this.pendingSoundtrackStage = stageKey;

        if (this.isMuted) {
            if (this.audioElement) {
                try {
                    this.audioElement.pause();
                } catch (e) {}
            }
            this.isSoundtrackPlaying = false;
            return this.currentTrack;
        }

        // Keep continuous flow across sub-phases inside the same music stage unless rotation is forced
        if (
            this.isSoundtrackPlaying &&
            this.currentSoundtrackStage === stageKey &&
            this.currentTrack &&
            !forceNewTrack
        ) {
            if (this.audioElement && this.audioElement.paused) {
                try {
                    await this.audioElement.play();
                    this._fadeAudioElement(this.audioElement, this._getEffectiveAudioVolume(), 0.25);
                } catch (e) {
                    this.needsUserGestureUnlock = true;
                    this.isSoundtrackPlaying = false;
                }
            }
            return this.currentTrack;
        }

        const nextTrack = this.selectTrackForStage(stageKey);
        if (!nextTrack) return null;

        const seq = ++this._playSeq;
        const prevAudio = this.audioElement;
        if (prevAudio) {
            this.audioElement = null;
            this.fadingAudioElements.add(prevAudio);
            this._fadeAudioElement(prevAudio, 0, Math.min(fadeDuration, 0.5), () => {
                this._disposeAudioElement(prevAudio);
            });
        }

        this.currentTrack = nextTrack;
        this.currentSoundtrackStage = stageKey;
        this.pausedByVisibility = false;

        const AudioCtor = typeof globalThis.Audio !== 'undefined' ? globalThis.Audio : null;
        if (!AudioCtor) {
            this._recordPlayedTrack(nextTrack.id);
            this.isSoundtrackPlaying = true;
            this.needsUserGestureUnlock = false;
            return nextTrack;
        }

        const nextAudio = new AudioCtor(nextTrack.src);
        nextAudio.loop = true;
        nextAudio.preload = 'auto';
        nextAudio.volume = 0;
        this.audioElement = nextAudio;

        try {
            const playResult = nextAudio.play();
            if (playResult && typeof playResult.then === 'function') {
                await playResult;
            }
            if (seq !== this._playSeq || this.isMuted) {
                if (this.audioElement === nextAudio && this.isMuted) {
                    try { nextAudio.pause(); } catch (e) {}
                } else if (this.audioElement !== nextAudio) {
                    this._disposeAudioElement(nextAudio);
                }
                return nextTrack;
            }
            this.needsUserGestureUnlock = false;
            this.isSoundtrackPlaying = true;
            this._recordPlayedTrack(nextTrack.id);
            this._fadeAudioElement(nextAudio, this._getEffectiveAudioVolume(), fadeDuration);
        } catch (e) {
            // Browser blocked autoplay prior to user interaction — retry cleanly on unlockAudio()
            if (seq === this._playSeq) {
                this.needsUserGestureUnlock = true;
                this.isSoundtrackPlaying = false;
            }
        }

        return nextTrack;
    }

    syncGamePhase(gamePhase, options = {}) {
        const stage = mapPhaseToMusicStage(gamePhase);
        const incomingRound = options?.round ?? null;
        const roundChanged = incomingRound !== null && this.lastRound !== null && incomingRound !== this.lastRound;
        if (incomingRound !== null) {
            this.lastRound = incomingRound;
        }
        return this.playSoundtrackStage(stage, {
            forceNewTrack: Boolean(options?.forceNewTrack || roundChanged),
            fadeDuration: options?.fadeDuration ?? 0.6
        });
    }

    async resumePendingPlayback() {
        if (this.isMuted || !this.pendingSoundtrackStage || this._resumeInFlight) return;
        this._resumeInFlight = true;
        try {
            if (this.audioElement && this.needsUserGestureUnlock && !this.pausedByVisibility) {
                const targetAudio = this.audioElement;
                try {
                    const playResult = targetAudio.play();
                    if (playResult && typeof playResult.then === 'function') {
                        await playResult;
                    }
                    if (this.audioElement !== targetAudio) {
                        this._disposeAudioElement(targetAudio);
                        return;
                    }
                    if (this.isMuted) {
                        try { targetAudio.pause(); } catch (e) {}
                        return;
                    }
                    this.needsUserGestureUnlock = false;
                    this.isSoundtrackPlaying = true;
                    if (this.currentTrack) {
                        this._recordPlayedTrack(this.currentTrack.id);
                    }
                    this._fadeAudioElement(targetAudio, this._getEffectiveAudioVolume(), 0.4);
                } catch (e) {
                    // Browser still blocking autoplay (e.g. TV remote D-pad key); retain existing element for the next gesture
                    if (this.audioElement === targetAudio) {
                        this.needsUserGestureUnlock = true;
                        this.isSoundtrackPlaying = false;
                    }
                }
                return;
            }
            if (!this.audioElement && this.needsUserGestureUnlock && !this.isSoundtrackPlaying) {
                await this.playSoundtrackStage(this.pendingSoundtrackStage, { forceNewTrack: false, fadeDuration: 0.4 });
            }
        } finally {
            this._resumeInFlight = false;
        }
    }

    pauseForHidden() {
        if (!this.audioElement || !this.isSoundtrackPlaying) return;
        this.pausedByVisibility = true;
        try {
            this.audioElement.pause();
        } catch (e) {}
    }

    async resumeFromVisible() {
        if (!this.pausedByVisibility || this.isMuted || !this.pendingSoundtrackStage) {
            this.pausedByVisibility = false;
            return;
        }
        this.pausedByVisibility = false;
        if (this.audioElement) {
            try {
                const playResult = this.audioElement.play();
                if (playResult && typeof playResult.then === 'function') {
                    await playResult;
                }
                this.isSoundtrackPlaying = true;
                this._fadeAudioElement(this.audioElement, this._getEffectiveAudioVolume(), 0.25);
                return;
            } catch (e) {
                this.needsUserGestureUnlock = true;
            }
        }
    }

    // =========================================================================
    // PROCEDURAL SYNTHESIZER API (SOUNDTESTVIEW COMPARISON)
    // =========================================================================

    setAudioContext(audioCtx) {
        if (!audioCtx) return;
        this.ctx = audioCtx;
        if (!this.synth) {
            this.synth = new MusicSynthesizer(this.ctx);
        }
    }

    getTheme() {
        return this.currentTheme;
    }

    setTheme(newTheme) {
        if (!Object.values(MUSIC_THEMES).includes(newTheme)) return;
        this.currentTheme = newTheme;
        writeLocalStorage('wordScrambleMusicTheme', newTheme);

        if (newTheme === MUSIC_THEMES.OFF) {
            this.stop();
            return;
        }

        const synthStyle = MUSIC_THEME_METADATA[newTheme]?.synthStyle || 'deep_lofi_bass';
        if (this.isPlaying && this.synth) {
            this.synth.switchTheme(synthStyle);
        }
    }

    async playStage(stageKey, options = {}) {
        if (this.currentTheme === MUSIC_THEMES.OFF) return;
        this.currentStage = stageKey;

        if (!this.ctx && typeof window !== 'undefined') {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }

        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') {
            try {
                await this.ctx.resume();
            } catch (e) {}
        }

        if (!this.synth) {
            this.synth = new MusicSynthesizer(this.ctx);
        }

        const effectiveVolume = this.isMuted ? 0.0001 : (this.isDucked ? this.baseVolume * 0.22 : this.baseVolume);
        const synthStyle = MUSIC_THEME_METADATA[this.currentTheme]?.synthStyle || 'deep_lofi_bass';

        if (!this.isPlaying) {
            await this.synth.play(synthStyle, stageKey, effectiveVolume);
            this.isPlaying = true;
        } else {
            this.synth.switchTheme(synthStyle);
            this.synth.switchPhase(stageKey);
            this.synth.setGain(effectiveVolume, options.fadeDuration || 0.3);
        }
    }

    // =========================================================================
    // UNIFIED VOLUME, MUTE, VOICEOVER DUCKING & STOP
    // =========================================================================

    stop(fadeDuration = 0.3) {
        this._playSeq += 1;
        this.isPlaying = false;
        this.isSoundtrackPlaying = false;
        this.currentSoundtrackStage = null;
        this.currentTrack = null;
        this.pendingSoundtrackStage = null;
        this.lastRound = null;
        this.needsUserGestureUnlock = false;
        this.pausedByVisibility = false;
        this._resumeInFlight = false;
        this.playedTrackIds.clear();
        this.recentTrackIds = [];

        if (this.duckTimeout) {
            clearTimeout(this.duckTimeout);
            this.duckTimeout = null;
        }
        this.isDucked = false;

        if (this.synth) {
            this.synth.stop(fadeDuration);
        }

        for (const fadingEl of [...this.fadingAudioElements]) {
            this._disposeAudioElement(fadingEl);
        }

        const activeAudio = this.audioElement;
        this.audioElement = null;
        if (activeAudio) {
            if (fadeDuration > 0 && typeof window !== 'undefined') {
                this.fadingAudioElements.add(activeAudio);
                this._fadeAudioElement(activeAudio, 0, Math.min(fadeDuration, 0.4), () => {
                    this._disposeAudioElement(activeAudio);
                });
            } else {
                this._disposeAudioElement(activeAudio);
            }
        }
    }

    setVolume(volume) {
        this.baseVolume = clampVolume(volume);
        writeLocalStorage('wordScrambleMusicVolume', String(this.baseVolume));

        if (this.isPlaying && this.synth) {
            this.synth.setGain(this._getEffectiveSynthVolume(), 0.2);
        }
        if (this.audioElement && this.isSoundtrackPlaying) {
            this._cancelFadeFor(this.audioElement);
            try {
                this.audioElement.volume = this._getEffectiveAudioVolume();
            } catch (e) {}
        }
    }

    setMuted(muted) {
        this.isMuted = !!muted;
        writeLocalStorage('wordScrambleMusicMuted', this.isMuted ? 'true' : 'false');

        if (this.isPlaying && this.synth) {
            this.synth.setGain(this._getEffectiveSynthVolume(), 0.2);
        }

        if (this.isMuted) {
            if (this.audioElement) {
                this._cancelFadeFor(this.audioElement);
                try {
                    this.audioElement.volume = 0;
                    this.audioElement.pause();
                } catch (e) {}
            }
            this.isSoundtrackPlaying = false;
        } else if (this.pendingSoundtrackStage) {
            this.playSoundtrackStage(this.pendingSoundtrackStage, { forceNewTrack: false, fadeDuration: 0.35 });
        }
    }

    /**
     * Ducks music volume smoothly when announcer voiceovers play.
     * @param {number} durationMs Duration of voiceover in milliseconds (defaults to 3200ms).
     */
    duck(durationMs = 3200) {
        if (!this.isPlaying && !this.isSoundtrackPlaying) return;
        this.isDucked = true;

        if (this.isPlaying && this.synth) {
            this.synth.setGain(this._getEffectiveSynthVolume(), 0.2);
        }
        if (this.audioElement && this.isSoundtrackPlaying && !this.isMuted) {
            this._fadeAudioElement(this.audioElement, this._getEffectiveAudioVolume(), 0.18);
        }

        if (this.duckTimeout) clearTimeout(this.duckTimeout);
        this.duckTimeout = setTimeout(() => {
            this.duckTimeout = null;
            this.isDucked = false;
            if (this.isPlaying && this.synth) {
                this.synth.setGain(this._getEffectiveSynthVolume(), 0.6);
            }
            if (this.audioElement && this.isSoundtrackPlaying && !this.isMuted) {
                this._fadeAudioElement(this.audioElement, this._getEffectiveAudioVolume(), 0.5);
            }
        }, durationMs);
    }
}

export const musicManager = new BackgroundMusicManager();
if (typeof window !== 'undefined') {
    window.__musicManager = musicManager;
}
