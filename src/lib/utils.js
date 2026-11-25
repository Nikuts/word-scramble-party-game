// src/lib/utils.js
import confetti from 'canvas-confetti';
import { AVATAR_MAP, SOUNDS_ON_HOST_ONLY } from './config.js';
import { musicManager } from './audio/musicManager.js';

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
        this.hostPreloadEnabled = !SOUNDS_ON_HOST_ONLY;
    }

    enableHostPreload() {
        this.hostPreloadEnabled = true;
        if (this.isUnlocked) {
            Object.entries(SOUND_ASSETS).forEach(([id, url]) => {
                this.preloadSound(id, url);
            });
        }
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
                if (!response.ok) return;
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
            if (ctx.state !== 'running') {
                return;
            }
            this.isUnlocked = true;
            // Pre-decode all audio assets in parallel into memory (host display only when SOUNDS_ON_HOST_ONLY is true)
            if (this.hostPreloadEnabled) {
                Object.entries(SOUND_ASSETS).forEach(([id, url]) => {
                    this.preloadSound(id, url);
                });
            }
        }
    }

    play(soundId, options = {}) {
        const { pitch = 1.0, volume = 1.0 } = options;
        this.playCounts.set(soundId, (this.playCounts.get(soundId) || 0) + 1);

        const ctx = this.initContext();
        const buffer = this.buffers.get(soundId);
        if (soundId === 'sfx_time_boost' && !buffer) {
            if (ctx && ctx.state === 'running') {
                try {
                    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
                    notes.forEach((freq, idx) => {
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.type = 'triangle';
                        osc.frequency.value = freq * pitch;
                        const startTime = ctx.currentTime + idx * 0.055;
                        const duration = 0.08;
                        gain.gain.setValueAtTime(0.15 * Math.max(0, Math.min(1, volume)), startTime);
                        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
                        osc.connect(gain);
                        gain.connect(ctx.destination);
                        osc.start(startTime);
                        osc.stop(startTime + duration);
                    });
                } catch (e) {
                    console.warn(`[SoundEngine] Web Audio synth failed for ${soundId}:`, e);
                }
            }
            return;
        }

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

        // Graceful lazy fallback to HTML5 Audio element if Web Audio buffer is not yet decoded
        if (typeof Audio !== 'undefined' && SOUND_ASSETS[soundId]) {
            try {
                const audio = new Audio(SOUND_ASSETS[soundId]);
                audio.playbackRate = pitch;
                audio.volume = Math.max(0, Math.min(1, volume));
                const p = audio.play();
                if (p && typeof p.catch === 'function') p.catch(() => {});
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

/**
 * Unlocks Web Audio SFX and retries any browser-blocked background soundtrack playback.
 */
export function unlockAudio() {
    musicManager.resumePendingPlayback();
    if (!soundEngine.isUnlocked) {
        soundEngine.unlock();
    }
}

/**
 * Handles user interaction events and retries unlocking audio while SFX or soundtrack remains blocked.
 */
export function handleUserAudioGesture() {
    if (soundEngine.isUnlocked && !musicManager.needsUserGestureUnlock) {
        return;
    }
    unlockAudio();
}

// Keep gesture listeners attached so TV remote clicks/OK presses recover blocked autoplay after D-pad keys, reloads, or tab visibility resumes
if (typeof window !== 'undefined') {
    const unlockEvents = ['pointerdown', 'touchstart', 'click', 'keydown'];
    unlockEvents.forEach(evt => window.addEventListener(evt, handleUserAudioGesture, { capture: true, passive: true }));
}

export function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>"']/g, (match) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[match]));
}

export function playSound(soundId, options = {}) {
    if (typeof soundId === 'string' && soundId.startsWith('vo_')) {
        musicManager.duck(3200);
    }
    soundEngine.play(soundId, options);
}

export function playMusic(stageOrPhase, options = {}) {
    return musicManager.syncGamePhase(stageOrPhase, options);
}

export function stopMusic(fadeDuration = 0.3) {
    musicManager.stop(fadeDuration);
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
            zIndex: 1,
            colors: ['#00CFFD', '#FF00A8', '#39FF14', '#facc15', '#ffffff'],
        };
        
        const merged = { ...defaults, ...options };
        if (isTvMode) {
            merged.particleCount = Math.min(merged.particleCount ?? 40, 40);
        }
        confetti(merged);
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
const AVATAR_FALLBACK_MAP = {
    '👽': 'alien', '🐶': 'dog', '🦆': 'duck', '⚒️': 'dwarf', '⚒': 'dwarf',
    '🦊': 'fox', '🐸': 'frog', '👺': 'goblin', '🛡️': 'knight', '🛡': 'knight',
    '🍄': 'mushroom', '🦜': 'parrot', '🐧': 'penguin', '🐷': 'pig', '🤖': 'robot',
    '💀': 'skeleton', '🦠': 'slime', '🫧': 'slime', '🐱': 'sphynx', '🐈': 'sphynx',
    '🧛': 'vampire', '🧙': 'wizard', '🐛': 'worm', '🪱': 'worm', '🧟': 'zombie',
    '🐼': 'alien', '🐯': 'fox', '🐵': 'dog', '🦄': 'wizard', '🐙': 'octopus', '🧌': 'goblin', '🧔': 'dwarf'
};

/**
 * Resolves a player emoji/key avatar to its static pixel-art image path.
 * @param {string} avatar
 * @returns {string}
 */
export function resolveAvatarSrc(avatar) {
    const raw = avatar ? String(avatar).replace(/[\uFE0E\uFE0F]/g, '') : 'frog';
    const imageName = AVATAR_MAP[avatar] || AVATAR_MAP[raw] || AVATAR_FALLBACK_MAP[avatar] || AVATAR_FALLBACK_MAP[raw] || 'frog';
    return `/images/${imageName}.webp`;
}

export function formatAnswerText(text) {
    if (!text || typeof text !== 'string') return text || '';
    return text
        .replace(/\s+([.,!?:;…])/gu, '$1')
        .replace(/(^|\s)(["'“‘(\[])\s+/gu, '$1$2')
        .replace(/\s+(["'”’)\],.:;!?…])(\s|$|[.,!?:;…])/gu, '$1$2')
        .trim();
}

let activeWakeLock = null;
let wakeLockPending = false;

/**
 * Requests a Screen Wake Lock on supported browsers so phones and TVs stay awake during matches.
 */
export async function requestScreenWakeLock() {
    if (typeof navigator === 'undefined' || !navigator.wakeLock || typeof navigator.wakeLock.request !== 'function') {
        return false;
    }
    if (activeWakeLock || wakeLockPending) return true;
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return false;
    }
    wakeLockPending = true;
    try {
        const sentinel = await navigator.wakeLock.request('screen');
        activeWakeLock = sentinel;
        sentinel.addEventListener?.('release', () => {
            if (activeWakeLock === sentinel) {
                activeWakeLock = null;
            }
        });
        return true;
    } catch {
        return false;
    } finally {
        wakeLockPending = false;
    }
}

/**
 * Releases any active Screen Wake Lock cleanly.
 */
export async function releaseScreenWakeLock() {
    if (!activeWakeLock) return;
    const sentinel = activeWakeLock;
    activeWakeLock = null;
    try {
        await sentinel.release();
    } catch {
        // Ignore release errors when document is already hidden
    }
}
