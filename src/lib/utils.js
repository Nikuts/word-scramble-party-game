// src/lib/utils.js
import confetti from 'canvas-confetti';

let isAudioUnlocked = false;

/**
 * Unlocks audio playback for browsers (especially mobile Safari/Chrome)
 * by warming up audio elements on the first user interaction.
 */
export function unlockAudio() {
    if (isAudioUnlocked || typeof document === 'undefined') return;
    
    try {
        const audioContainer = document.getElementById('audio-assets');
        if (audioContainer) {
            const audioElements = audioContainer.querySelectorAll('audio');
            audioElements.forEach(audio => {
                // Pre-warm audio element without producing audible sound
                const originalVolume = audio.volume;
                audio.volume = 0;
                const promise = audio.play();
                if (promise !== undefined) {
                    promise
                        .then(() => {
                            audio.pause();
                            audio.currentTime = 0;
                            audio.volume = originalVolume;
                        })
                        .catch(() => {
                            audio.volume = originalVolume;
                        });
                }
            });
        }
        isAudioUnlocked = true;
    } catch (e) {
        console.warn('Audio pre-warm attempted:', e);
    }
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

export function playSound(soundId) {
    if (typeof document === 'undefined') return;
    try {
        const audioElement = document.getElementById(soundId);
        if (audioElement) {
            audioElement.currentTime = 0;
            const playPromise = audioElement.play();

            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    // Autoplay restriction or sound not ready
                    console.warn(`Audio playback for '${soundId}' paused or waiting for user gesture.`);
                });
            }
        } else {
            console.warn(`Audio element with ID '${soundId}' not found in the DOM.`);
        }
    } catch (e) {
        console.error(`An unexpected error occurred in playSound for ID '${soundId}':`, e);
    }
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

/**
 * A language-agnostic function to correctly tokenize text into words and punctuation.
 * It uses a Unicode-aware regex to handle both English and Ukrainian text.
 * This is used on the client-side for the word scramble mechanic.
 * @param {string} text The text to tokenize.
 * @returns {string[]} An array of words and punctuation.
 */
export function tokenizeText(text) {
    if (!text) return [];
    const tokenizerRegex = /[\p{L}\p{N}'’`-]+|_{3,}|[.,!?;:()"]/gu;
    return text.match(tokenizerRegex) || [];
}
