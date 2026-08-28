// src/lib/utils.js
import confetti from 'canvas-confetti';

const SOUND_ASSETS = {
    'sfx_timer_tick': '/sounds/sfx_timer_tick.mp3',
    'vo_get_ready_questions_en': '/sounds/vo_get_ready_questions_en.mp3',
    'vo_get_ready_questions_uk': '/sounds/vo_get_ready_questions_uk.mp3',
    'vo_battle_incoming_en': '/sounds/vo_battle_incoming_en.mp3',
    'vo_battle_incoming_uk': '/sounds/vo_battle_incoming_uk.mp3',
    'vo_voting_starts_en': '/sounds/vo_voting_starts_en.mp3',
    'vo_voting_starts_uk': '/sounds/vo_voting_starts_uk.mp3',
    'vo_final_scores_en': '/sounds/vo_final_scores_en.mp3',
    'vo_final_scores_uk': '/sounds/vo_final_scores_uk.mp3'
};

class WebAudioSoundEngine {
    constructor() {
        this.ctx = null;
        this.buffers = new Map();
        this.isUnlocked = false;
        this.playCounts = new Map();
        this.loadingPromises = new Map();
    }

    initContext() {
        if (typeof window === 'undefined') return null;
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        return this.ctx;
    }

    async preloadSound(soundId, url) {
        if (this.buffers.has(soundId) || this.loadingPromises.has(soundId)) {
            return this.loadingPromises.get(soundId);
        }
        const promise = (async () => {
            try {
                const response = await fetch(url);
                const arrayBuffer = await response.arrayBuffer();
                const ctx = this.initContext();
                if (ctx) {
                    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
                    this.buffers.set(soundId, audioBuffer);
                }
            } catch (e) {
                console.warn(`[SoundEngine] Could not decode audio for ${soundId}:`, e);
            }
        })();
        this.loadingPromises.set(soundId, promise);
        return promise;
    }

    async unlock() {
        if (this.isUnlocked || typeof window === 'undefined') return;
        const ctx = this.initContext();
        if (ctx) {
            if (ctx.state === 'suspended') {
                await ctx.resume().catch(() => {});
            }
            this.isUnlocked = true;
            // Pre-decode all audio assets in parallel into memory
            Object.entries(SOUND_ASSETS).forEach(([id, url]) => {
                this.preloadSound(id, url);
            });
        }
    }

    play(soundId, options = {}) {
        const { pitch = 1.0, volume = 1.0 } = options;
        this.playCounts.set(soundId, (this.playCounts.get(soundId) || 0) + 1);

        const ctx = this.initContext();
        const buffer = this.buffers.get(soundId);

        if (ctx && buffer && ctx.state === 'running') {
            try {
                const source = ctx.createBufferSource();
                source.buffer = buffer;
                source.playbackRate.value = pitch;

                const gainNode = ctx.createGain();
                gainNode.gain.value = volume;

                source.connect(gainNode);
                gainNode.connect(ctx.destination);
                source.start(0);
                return;
            } catch (e) {
                console.warn(`[SoundEngine] Web Audio play failed for ${soundId}:`, e);
            }
        }

        // Graceful fallback to HTML5 Audio element
        if (typeof document !== 'undefined') {
            try {
                const el = document.getElementById(soundId);
                if (el) {
                    el.currentTime = 0;
                    el.playbackRate = pitch;
                    el.volume = Math.max(0, Math.min(1, volume));
                    const p = el.play();
                    if (p && typeof p.catch === 'function') p.catch(() => {});
                }
            } catch (e) {
                console.warn(`[SoundEngine] Fallback audio play failed for ${soundId}:`, e);
            }
        }
    }

    getPlayCount(soundId) {
        return this.playCounts.get(soundId) || 0;
    }
}

export const soundEngine = new WebAudioSoundEngine();
if (typeof window !== 'undefined') {
    window.__soundEngine = soundEngine;
}

let isAudioUnlocked = false;

/**
 * Unlocks audio playback for browsers on first user interaction.
 */
export function unlockAudio() {
    if (isAudioUnlocked) return;
    soundEngine.unlock();
    isAudioUnlocked = true;
}

// Auto-register user gesture listeners for seamless audio playback
if (typeof window !== 'undefined') {
    const unlockEvents = ['pointerdown', 'touchstart', 'click', 'keydown'];
    const onFirstUserGesture = () => {
        unlockAudio();
        unlockEvents.forEach(evt => window.removeEventListener(evt, onFirstUserGesture, { capture: true }));
    };
    unlockEvents.forEach(evt => window.addEventListener(evt, onFirstUserGesture, { capture: true, once: true }));
}

export function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>"']/g, (match) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[match]));
}

export function playSound(soundId, options = {}) {
    soundEngine.play(soundId, options);
}

export function triggerConfetti(options = {}) {
    if (typeof confetti === 'function') {
        const isTvMode = typeof document !== 'undefined' && document.body?.getAttribute('data-tv-mode') === 'true';
        const defaults = {
            particleCount: isTvMode ? 35 : 150,
            spread: isTvMode ? 60 : 80,
            origin: { y: 0.6 },
            shapes: ['square'],
            gravity: 1.2,
            scalar: 1.2,
            colors: ['#00CFFD', '#FF00A8', '#39FF14', '#facc15', '#ffffff'],
        };
        
        confetti({ ...defaults, ...options });
    }
}

export function tokenizeText(text) {
    if (!text) return [];
    const tokenizerRegex = /[\p{L}\p{N}'’`ʼ-]+|_{3,}|[.,!?;:()"-]/gu;
    return text.match(tokenizerRegex) || [];
}

/**
 * Formats answer text with clean typographic spacing before punctuation marks.
 * @param {string} text The text to format.
 * @returns {string} The formatted text.
 */
export function formatAnswerText(text) {
    if (!text || typeof text !== 'string') return text || '';
    return text
        .replace(/\s+([.,!?:;…])/gu, '$1')
        .replace(/(^|\s)(["'“‘(\[])\s+/gu, '$1$2')
        .replace(/\s+(["'”’)\],.:;!?…])(\s|$|[.,!?:;…])/gu, '$1$2')
        .trim();
}
