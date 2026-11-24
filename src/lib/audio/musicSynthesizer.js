// src/lib/audio/musicSynthesizer.js

/**
 * Deep Bass & Warm Low-Register Polyphonic Synthesizer & 64-Step Sequencer
 * Emphasizes thick sub-bass, resonant low frequencies, muted dark keys,
 * and zero harsh high notes.
 */

// Note semitone offsets relative to C
const NOTE_OFFSETS = {
    'C': 0, 'C#': 1, 'Db': 1,
    'D': 2, 'D#': 3, 'Eb': 3,
    'E': 4,
    'F': 5, 'F#': 6, 'Gb': 6,
    'G': 7, 'G#': 8, 'Ab': 8,
    'A': 9, 'A#': 10, 'Bb': 10,
    'B': 11
};

/**
 * Computes exact frequency (in Hz) for any musical note.
 * Standard pitch: A4 = 440 Hz.
 * @param {string} note (e.g. 'C1', 'Eb2', 'Ab3')
 * @returns {number|null}
 */
export function getNoteFrequency(note) {
    if (!note || typeof note !== 'string') return null;
    const match = note.match(/^([A-G][#b]?)([0-8])$/);
    if (!match) return null;
    const [, noteName, octaveStr] = match;
    const octave = parseInt(octaveStr, 10);
    const semitone = NOTE_OFFSETS[noteName];
    if (semitone === undefined) return null;
    
    // MIDI note number: C0 = 12, A4 = 69
    const midiNumber = (octave + 1) * 12 + semitone;
    return 440 * Math.pow(2, (midiNumber - 69) / 12);
}

// ----------------------------------------------------------------------
// 64-STEP DEEP BASS & LOW-REGISTER COMPOSITIONS (Octaves 1 - 4)
// ----------------------------------------------------------------------
export const COMPOSITIONS = {
    // ==================================================================
    // 🎧 1. DEEP LO-FI SUB-BASS (Key of C minor / F minor)
    // ==================================================================
    deep_lofi_bass: {
        lobby: {
            bpm: 76,
            bass: [
                'C1', 'C1', null, 'G1', null, 'C2', 'Bb1', null, 'C1', null, 'Eb1', null, 'G1', null, 'Bb1', null,
                'Ab1', 'Ab1', null, 'Eb1', null, 'Ab1', 'G1', null, 'Ab1', null, 'C2', null, 'Eb1', null, 'G1', 'Ab1',
                'F1', 'F1', null, 'C1', null, 'F1', 'Eb1', null, 'F1', null, 'Ab1', null, 'C2', null, 'Eb1', null,
                'G1', 'G1', null, 'D1', null, 'G1', 'F1', null, 'G1', null, 'B1', null, 'D1', 'F1', 'Ab1', 'B1'
            ],
            chords: [
                ['C3', 'Eb3', 'G3', 'Bb3', 'D4'], null, null, ['Eb3', 'G3', 'Bb3'], null, null, ['G3', 'Bb3', 'D4'], null,
                ['C3', 'Eb3', 'G3', 'Bb3'], null, null, ['Eb3', 'G3', 'D4'], null, null, null, null,
                ['Ab2', 'C3', 'Eb3', 'G3', 'Bb3'], null, null, ['C3', 'Eb3', 'G3'], null, null, ['Eb3', 'G3', 'Bb3'], null,
                ['Ab2', 'C3', 'Eb3', 'G3'], null, null, ['C3', 'Eb3', 'Bb3'], null, null, null, null,
                ['F2', 'Ab2', 'C3', 'Eb3', 'G3'], null, null, ['Ab2', 'C3', 'Eb3'], null, null, ['C3', 'Eb3', 'G3'], null,
                ['F2', 'Ab2', 'C3', 'Eb3'], null, null, ['Ab2', 'C3', 'G3'], null, null, null, null,
                ['G2', 'B2', 'D3', 'F3', 'Ab3'], null, null, ['B2', 'D3', 'F3'], null, null, ['D3', 'F3', 'Ab3'], null,
                ['G2', 'B2', 'D3', 'F3'], null, null, ['B2', 'D3', 'Ab3'], null, null, null, null
            ],
            melody: [
                null, 'G3', null, 'Bb3', 'D4', null, 'C4', null, null, 'Bb3', null, 'G3', 'F3', null, 'G3', null,
                null, 'F3', 'Eb3', null, 'C3', null, 'Eb3', 'F3', 'G3', null, 'Bb3', null, 'C4', 'Bb3', 'G3', null,
                null, 'Ab3', null, 'C4', 'Eb4', null, 'D4', null, null, 'C4', null, 'Ab3', 'G3', null, 'F3', null,
                null, 'D3', 'F3', 'G3', 'Ab3', 'G3', 'F3', 'Eb3', 'D3', null, 'F3', 'Ab3', 'B3', 'D4', 'C4', null
            ],
            drums: [
                'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'kick', 'hat', 'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'hat', 'hat',
                'kick', 'hat', 'hat', 'kick', 'snare', 'hat', 'hat', 'hat', 'kick', 'hat', 'kick', 'hat', 'snare', 'hat', 'hat', 'hat',
                'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'kick', 'hat', 'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'hat', 'kick',
                'kick', 'hat', 'kick', 'hat', 'snare', 'hat', 'kick', 'hat', 'kick', 'hat', 'snare', 'hat', 'snare', 'snare', 'hat', 'hat'
            ]
        },
        question: {
            bpm: 80,
            bass: [
                'F1', 'F1', null, 'C1', null, 'F1', 'G1', null, 'Ab1', null, 'C2', null, 'Eb1', null, 'F1', null,
                'Eb1', 'Eb1', null, 'Bb1', null, 'Eb1', 'F1', null, 'G1', null, 'Bb1', null, 'Db1', null, 'Eb1', null,
                'Db1', 'Db1', null, 'Ab1', null, 'Db1', 'Eb1', null, 'F1', null, 'Ab1', null, 'C1', null, 'Db1', null,
                'C1', 'C1', null, 'G1', null, 'C1', 'D1', null, 'E1', null, 'G1', null, 'Bb1', null, 'C2', null
            ],
            chords: [
                ['F2', 'Ab2', 'C3', 'Eb3', 'G3'], null, null, ['Ab2', 'C3', 'Eb3'], null, null, ['C3', 'Eb3', 'G3'], null,
                ['F2', 'Ab2', 'C3', 'Eb3'], null, null, ['Ab2', 'C3', 'G3'], null, null, null, null,
                ['Eb2', 'G2', 'Bb2', 'Db3', 'F3'], null, null, ['G2', 'Bb2', 'Db3'], null, null, ['Bb2', 'Db3', 'F3'], null,
                ['Eb2', 'G2', 'Bb2', 'Db3'], null, null, ['G2', 'Bb2', 'F3'], null, null, null, null,
                ['Db2', 'F2', 'Ab2', 'C3', 'Eb3'], null, null, ['F2', 'Ab2', 'C3'], null, null, ['Ab2', 'C3', 'Eb3'], null,
                ['Db2', 'F2', 'Ab2', 'C3'], null, null, ['F2', 'Ab2', 'Eb3'], null, null, null, null,
                ['C2', 'E2', 'G2', 'Bb2', 'D3'], null, null, ['E2', 'G2', 'Bb2'], null, null, ['G2', 'Bb2', 'D3'], null,
                ['C2', 'E2', 'G2', 'Bb2'], null, null, ['E2', 'G2', 'D3'], null, null, null, null
            ],
            melody: [
                'C4', null, 'Eb4', null, 'G4', null, 'F4', 'Eb4', 'C4', null, 'Ab3', null, 'Bb3', null, 'C4', null,
                'Bb3', null, 'Db4', null, 'F4', null, 'Eb4', 'Db4', 'Bb3', null, 'G3', null, 'Ab3', 'Bb3', 'G3', null,
                'Ab3', null, 'C4', null, 'Eb4', null, 'Db4', 'C4', 'Ab3', null, 'F3', null, 'G3', 'Ab3', 'F3', null,
                'G3', null, 'Bb3', null, 'D4', null, 'C4', 'Bb3', 'G3', null, 'E3', null, 'C3', null, null, null
            ],
            drums: [
                'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'hat', 'kick', 'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'hat', 'hat',
                'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'kick', 'hat', 'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'hat', 'hat',
                'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'hat', 'kick', 'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'hat', 'kick',
                'kick', 'hat', 'kick', 'hat', 'snare', 'hat', 'kick', 'hat', 'kick', 'hat', 'snare', 'snare', 'hat', 'hat', 'kick', 'hat'
            ]
        },
        battle: {
            bpm: 86,
            bass: [
                'C1', 'C1', 'G1', 'C1', 'Eb1', 'Eb1', 'Bb1', 'Eb1', 'F1', 'F1', 'C1', 'F1', 'G1', 'G1', 'D1', 'G1',
                'Ab1', 'Ab1', 'Eb1', 'Ab1', 'Bb1', 'Bb1', 'F1', 'Bb1', 'C2', 'C2', 'G1', 'C2', 'Eb1', 'Eb1', 'Bb1', 'G1',
                'C1', 'C1', 'G1', 'C1', 'Eb1', 'Eb1', 'Bb1', 'Eb1', 'F1', 'F1', 'C1', 'F1', 'G1', 'G1', 'D1', 'G1',
                'Ab1', 'Ab1', 'Eb1', 'Ab1', 'G1', 'G1', 'D1', 'G1', 'F1', 'F1', 'C1', 'F1', 'Eb1', 'D1', 'C1', 'G1'
            ],
            chords: [
                ['C3', 'Eb3', 'G3', 'Bb3'], ['C3', 'Eb3', 'G3'], null, null, ['Eb3', 'G3', 'Bb3', 'D4'], ['Eb3', 'G3', 'Bb3'], null, null,
                ['F2', 'Ab2', 'C3', 'Eb3'], ['F2', 'Ab2', 'C3'], null, null, ['G2', 'B2', 'D3', 'F3'], null, ['B2', 'D3', 'F3'], null,
                ['Ab2', 'C3', 'Eb3', 'G3'], ['Ab2', 'C3', 'Eb3'], null, null, ['Bb2', 'D3', 'F3', 'Ab3'], ['Bb2', 'D3', 'F3'], null, null,
                ['C3', 'Eb3', 'G3', 'Bb3'], ['C3', 'Eb3', 'G3'], null, null, ['Eb3', 'G3', 'Bb3', 'D4'], null, ['G3', 'Bb3', 'D4'], null,
                ['C3', 'Eb3', 'G3', 'Bb3'], ['C3', 'Eb3', 'G3'], null, null, ['Eb3', 'G3', 'Bb3', 'D4'], ['Eb3', 'G3', 'Bb3'], null, null,
                ['F2', 'Ab2', 'C3', 'Eb3'], ['F2', 'Ab2', 'C3'], null, null, ['G2', 'B2', 'D3', 'F3'], null, ['B2', 'D3', 'F3'], null,
                ['Ab2', 'C3', 'Eb3', 'G3'], ['Ab2', 'C3', 'Eb3'], null, null, ['G2', 'B2', 'D3', 'F3'], ['G2', 'B2', 'D3'], null, null,
                ['F2', 'Ab2', 'C3', 'Eb3'], ['F2', 'Ab2', 'C3'], null, null, ['Eb2', 'G2', 'Bb2', 'D3'], null, ['C2', 'Eb2', 'G2'], null
            ],
            melody: [
                'G3', null, 'Eb4', null, 'C4', null, 'Ab3', 'Bb3', 'C4', null, 'F3', null, 'G3', 'Bb3', 'D4', null,
                'Eb4', null, 'C4', null, 'Ab3', 'Bb3', 'C4', 'D4', 'Bb3', null, 'G3', null, 'Eb3', 'G3', 'Bb3', null,
                'C4', null, 'Eb4', null, 'G4', null, 'F4', 'Eb4', 'C4', null, 'Ab3', null, 'Bb3', 'C4', 'D4', null,
                'Eb4', null, 'D4', null, 'C4', null, 'Bb3', 'Ab3', 'G3', null, 'F3', null, 'Eb3', 'D3', 'C3', null
            ],
            drums: [
                'kick', 'hat', 'kick', 'hat', 'snare', 'hat', 'kick', 'hat', 'kick', 'hat', 'kick', 'hat', 'snare', 'hat', 'kick', 'hat',
                'kick', 'hat', 'kick', 'hat', 'snare', 'hat', 'kick', 'hat', 'kick', 'hat', 'kick', 'hat', 'snare', 'hat', 'kick', 'hat',
                'kick', 'hat', 'kick', 'hat', 'snare', 'hat', 'kick', 'hat', 'kick', 'hat', 'kick', 'hat', 'snare', 'hat', 'kick', 'hat',
                'kick', 'hat', 'kick', 'hat', 'snare', 'hat', 'kick', 'hat', 'snare', 'snare', 'kick', 'snare', 'snare', 'snare', 'hat', 'hat'
            ]
        },
        voting: {
            bpm: 82,
            bass: [
                'Ab1', null, 'Ab1', null, 'Eb1', null, 'Ab1', null, 'C1', null, 'Eb1', null, 'Gb1', null, 'Ab1', null,
                'F1', null, 'F1', null, 'C1', null, 'F1', null, 'Ab1', null, 'C1', null, 'Eb1', null, 'F1', null,
                'Db1', null, 'Db1', null, 'Ab1', null, 'Db1', null, 'F1', null, 'Ab1', null, 'C1', null, 'Db1', null,
                'Eb1', null, 'Eb1', null, 'Bb1', null, 'Eb1', null, 'G1', null, 'Bb1', null, 'Db1', null, 'Eb1', null
            ],
            chords: [
                ['Ab2', 'C3', 'Eb3', 'Gb3', 'Bb3'], null, null, ['C3', 'Eb3', 'Gb3'], null, null, ['Eb3', 'Gb3', 'Bb3'], null,
                ['Ab2', 'C3', 'Eb3', 'Gb3'], null, null, ['C3', 'Eb3', 'Bb3'], null, null, null, null,
                ['F2', 'Ab2', 'C3', 'Eb3', 'G3'], null, null, ['Ab2', 'C3', 'Eb3'], null, null, ['C3', 'Eb3', 'G3'], null,
                ['F2', 'Ab2', 'C3', 'Eb3'], null, null, ['Ab2', 'C3', 'G3'], null, null, null, null,
                ['Db2', 'F2', 'Ab2', 'C3', 'Eb3'], null, null, ['F2', 'Ab2', 'C3'], null, null, ['Ab2', 'C3', 'Eb3'], null,
                ['Db2', 'F2', 'Ab2', 'C3'], null, null, ['F2', 'Ab2', 'Eb3'], null, null, null, null,
                ['Eb2', 'G2', 'Bb2', 'Db3', 'F3'], null, null, ['G2', 'Bb2', 'Db3'], null, null, ['Bb2', 'Db3', 'F3'], null,
                ['Eb2', 'G2', 'Bb2', 'Db3'], null, null, ['G2', 'Bb2', 'F3'], null, null, null, null
            ],
            melody: [
                'C4', null, 'Ab3', null, 'F3', null, 'G3', 'Ab3', 'Bb3', null, 'G3', null, 'Eb3', null, 'F3', null,
                'Ab3', null, 'F3', null, 'Db3', null, 'Eb3', 'F3', 'G3', null, 'Eb3', null, 'C3', null, 'Db3', null,
                'F3', null, 'Db3', null, 'Bb2', null, 'C3', 'Db3', 'Eb3', null, 'C3', null, 'Ab2', null, 'Bb2', null,
                'Db3', null, 'C3', null, 'Bb2', null, 'Ab2', 'G2', 'Eb2', null, 'G2', 'Bb2', 'Db3', 'C3', 'Bb2', null
            ],
            drums: [
                'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'kick', 'hat', 'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'hat', 'hat',
                'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'kick', 'hat', 'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'hat', 'hat',
                'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'kick', 'hat', 'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'hat', 'kick',
                'kick', 'hat', 'kick', 'hat', 'snare', 'hat', 'kick', 'hat', 'kick', 'hat', 'snare', 'hat', 'snare', 'hat', 'kick', 'hat'
            ]
        },
        podium: {
            bpm: 80,
            bass: [
                'C1', 'G1', 'C2', 'G1', 'Eb1', 'Bb1', 'Eb2', 'Bb1', 'Ab1', 'Eb1', 'Ab1', 'Eb1', 'G1', 'D1', 'G1', 'D1',
                'F1', 'C1', 'F1', 'C1', 'Bb1', 'F1', 'Bb1', 'F1', 'Eb1', 'Bb1', 'Eb2', 'Bb1', 'C1', 'G1', 'C2', null,
                'C1', 'G1', 'C2', 'G1', 'Ab1', 'Eb1', 'Ab1', 'Eb1', 'F1', 'C1', 'F1', 'C1', 'G1', 'D1', 'G1', 'D1',
                'Ab1', 'Eb1', 'Ab1', 'Eb1', 'Bb1', 'F1', 'Bb1', 'F1', 'C1', 'G1', 'C2', 'G1', 'C1', null, null, null
            ],
            chords: [
                ['C3', 'Eb3', 'G3', 'Bb3', 'D4'], null, null, ['C3', 'Eb3', 'G3', 'Bb3'], null, null, ['Eb3', 'G3', 'Bb3', 'D4'], null,
                ['Ab2', 'C3', 'Eb3', 'G3'], null, null, ['Ab2', 'C3', 'Eb3'], null, null, ['G2', 'B2', 'D3', 'F3'], null,
                ['F2', 'Ab2', 'C3', 'Eb3'], null, null, ['F2', 'Ab2', 'C3'], null, null, ['Bb2', 'D3', 'F3', 'Ab3'], null,
                ['Eb3', 'G3', 'Bb3', 'D4'], null, null, ['Eb3', 'G3', 'Bb3'], null, null, ['C3', 'Eb3', 'G3', 'C4'], null,
                ['C3', 'Eb3', 'G3', 'Bb3'], null, null, ['Ab2', 'C3', 'Eb3', 'G3'], null, null, ['F2', 'Ab2', 'C3', 'Eb3'], null,
                ['G2', 'B2', 'D3', 'F3'], null, null, ['Ab2', 'C3', 'Eb3', 'G3'], null, null, ['Bb2', 'D3', 'F3', 'Ab3'], null,
                ['C3', 'Eb3', 'G3', 'C4'], null, null, ['C3', 'Eb3', 'G3'], null, null, ['C3', 'Eb3', 'G3', 'C4'], null,
                ['C3', 'Eb3', 'G3', 'C4'], null, null, null, null, null, null, null
            ],
            melody: [
                'C4', 'Eb4', 'G4', 'Bb4', 'C4', null, 'Bb3', null, 'G3', 'Eb3', 'C3', 'Eb3', 'F3', null, 'G3', null,
                'Ab3', 'C4', 'Eb4', null, 'D4', 'C4', 'Ab3', null, 'F3', 'G3', 'Ab3', 'Bb3', 'C4', null, 'Bb3', null,
                'C4', 'Eb4', 'G4', null, 'F4', 'Eb4', 'C4', null, 'Ab3', 'C4', 'Eb4', 'D4', 'B3', 'G3', 'Eb3', null,
                'F3', 'Ab3', 'C4', 'D4', 'C4', 'G3', 'Eb3', null, 'F3', 'Bb3', 'D4', 'F4', 'C4', null, null, null
            ],
            drums: [
                'kick', 'hat', 'hat', 'kick', 'snare', 'hat', 'kick', 'hat', 'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'kick', 'hat',
                'kick', 'hat', 'hat', 'kick', 'snare', 'hat', 'kick', 'hat', 'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'kick', 'hat',
                'kick', 'hat', 'hat', 'kick', 'snare', 'hat', 'kick', 'hat', 'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'kick', 'hat',
                'kick', 'hat', 'kick', 'hat', 'snare', 'hat', 'kick', 'hat', 'snare', 'snare', 'kick', 'snare', 'snare', 'snare', 'kick', 'hat'
            ]
        }
    },

    // ==================================================================
    // 🕶️ 2. MIDNIGHT BASS GROOVE (Key of D minor)
    // ==================================================================
    midnight_groove: {
        lobby: {
            bpm: 80,
            bass: [
                'D1', 'D1', null, 'A1', null, 'D2', 'C2', null, 'D1', null, 'F1', null, 'A1', null, 'C2', null,
                'Bb1', 'Bb1', null, 'F1', null, 'Bb1', 'A1', null, 'Bb1', null, 'D1', null, 'F1', null, 'A1', 'Bb1',
                'G1', 'G1', null, 'D1', null, 'G1', 'F1', null, 'G1', null, 'Bb1', null, 'D1', null, 'F1', null,
                'A1', 'A1', null, 'E1', null, 'A1', 'G1', null, 'A1', null, 'C#1', null, 'E1', 'G1', 'Bb1', 'C#2'
            ],
            chords: [
                ['D3', 'F3', 'A3', 'C4', 'E4'], null, null, ['F3', 'A3', 'C4'], null, null, ['A3', 'C4', 'E4'], null,
                ['D3', 'F3', 'A3', 'C4'], null, null, ['F3', 'A3', 'E4'], null, null, null, null,
                ['Bb2', 'D3', 'F3', 'A3', 'C4'], null, null, ['D3', 'F3', 'A3'], null, null, ['F3', 'A3', 'C4'], null,
                ['Bb2', 'D3', 'F3', 'A3'], null, null, ['D3', 'F3', 'C4'], null, null, null, null,
                ['G2', 'Bb2', 'D3', 'F3', 'A3'], null, null, ['Bb2', 'D3', 'F3'], null, null, ['D3', 'F3', 'A3'], null,
                ['G2', 'Bb2', 'D3', 'F3'], null, null, ['Bb2', 'D3', 'A3'], null, null, null, null,
                ['A2', 'C#3', 'E3', 'G3', 'Bb3'], null, null, ['C#3', 'E3', 'G3'], null, null, ['E3', 'G3', 'Bb3'], null,
                ['A2', 'C#3', 'E3', 'G3'], null, null, ['C#3', 'E3', 'Bb3'], null, null, null, null
            ],
            melody: [
                null, 'A3', null, 'C4', 'E4', null, 'D4', null, null, 'C4', null, 'A3', 'G3', null, 'A3', null,
                null, 'G3', 'F3', null, 'D3', null, 'F3', 'G3', 'A3', null, 'C4', null, 'D4', 'C4', 'A3', null,
                null, 'Bb3', null, 'D4', 'F4', null, 'E4', null, null, 'D4', null, 'Bb3', 'A3', null, 'G3', null,
                null, 'E3', 'G3', 'A3', 'Bb3', 'A3', 'G3', 'F3', 'E3', null, 'G3', 'Bb3', 'C#4', 'E4', 'D4', null
            ],
            drums: [
                'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'kick', 'hat', 'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'hat', 'hat',
                'kick', 'hat', 'hat', 'kick', 'snare', 'hat', 'hat', 'hat', 'kick', 'hat', 'kick', 'hat', 'snare', 'hat', 'hat', 'hat',
                'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'kick', 'hat', 'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'hat', 'kick',
                'kick', 'hat', 'kick', 'hat', 'snare', 'hat', 'kick', 'hat', 'kick', 'hat', 'snare', 'hat', 'snare', 'snare', 'hat', 'hat'
            ]
        },
        question: {
            bpm: 82,
            bass: [
                'G1', 'G1', null, 'D1', null, 'G1', 'A1', null, 'Bb1', null, 'D2', null, 'F1', null, 'G1', null,
                'F1', 'F1', null, 'C1', null, 'F1', 'G1', null, 'A1', null, 'C2', null, 'Eb1', null, 'F1', null,
                'Eb1', 'Eb1', null, 'Bb1', null, 'Eb1', 'F1', null, 'G1', null, 'Bb1', null, 'D1', null, 'Eb1', null,
                'D1', 'D1', null, 'A1', null, 'D1', 'E1', null, 'F#1', null, 'A1', null, 'C2', null, 'D2', null
            ],
            chords: [
                ['G2', 'Bb2', 'D3', 'F3', 'A3'], null, null, ['Bb2', 'D3', 'F3'], null, null, ['D3', 'F3', 'A3'], null,
                ['G2', 'Bb2', 'D3', 'F3'], null, null, ['Bb2', 'D3', 'A3'], null, null, null, null,
                ['F2', 'A2', 'C3', 'Eb3', 'G3'], null, null, ['A2', 'C3', 'Eb3'], null, null, ['C3', 'Eb3', 'G3'], null,
                ['F2', 'A2', 'C3', 'Eb3'], null, null, ['A2', 'C3', 'G3'], null, null, null, null,
                ['Eb2', 'G2', 'Bb2', 'D3', 'F3'], null, null, ['G2', 'Bb2', 'D3'], null, null, ['Bb2', 'D3', 'F3'], null,
                ['Eb2', 'G2', 'Bb2', 'D3'], null, null, ['G2', 'Bb2', 'F3'], null, null, null, null,
                ['D2', 'F#2', 'A2', 'C3', 'E3'], null, null, ['F#2', 'A2', 'C3'], null, null, ['A2', 'C3', 'E3'], null,
                ['D2', 'F#2', 'A2', 'C3'], null, null, ['F#2', 'A2', 'E3'], null, null, null, null
            ],
            melody: [
                'D4', null, 'F4', null, 'A4', null, 'G4', 'F4', 'D4', null, 'Bb3', null, 'C4', null, 'D4', null,
                'C4', null, 'Eb4', null, 'G4', null, 'F4', 'Eb4', 'C4', null, 'A3', null, 'Bb3', 'C4', 'A3', null,
                'Bb3', null, 'D4', null, 'F4', null, 'Eb4', 'D4', 'Bb3', null, 'G3', null, 'A3', 'Bb3', 'G3', null,
                'A3', null, 'C4', null, 'E4', null, 'D4', 'C4', 'A3', null, 'F#3', null, 'D3', null, null, null
            ],
            drums: [
                'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'hat', 'kick', 'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'hat', 'hat',
                'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'kick', 'hat', 'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'hat', 'hat',
                'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'hat', 'kick', 'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'hat', 'kick',
                'kick', 'hat', 'kick', 'hat', 'snare', 'hat', 'kick', 'hat', 'kick', 'hat', 'snare', 'snare', 'hat', 'hat', 'kick', 'hat'
            ]
        },
        battle: {
            bpm: 88,
            bass: [
                'D1', 'D1', 'A1', 'D1', 'F1', 'F1', 'C2', 'F1', 'G1', 'G1', 'D1', 'G1', 'A1', 'A1', 'E1', 'A1',
                'Bb1', 'Bb1', 'F1', 'Bb1', 'C1', 'C1', 'G1', 'C1', 'D1', 'D1', 'A1', 'D1', 'F1', 'F1', 'C2', 'A1',
                'D1', 'D1', 'A1', 'D1', 'F1', 'F1', 'C2', 'F1', 'G1', 'G1', 'D1', 'G1', 'A1', 'A1', 'E1', 'A1',
                'Bb1', 'Bb1', 'F1', 'Bb1', 'A1', 'A1', 'E1', 'A1', 'G1', 'G1', 'D1', 'G1', 'F1', 'E1', 'D1', 'A1'
            ],
            chords: [
                ['D3', 'F3', 'A3', 'C4'], ['D3', 'F3', 'A3'], null, null, ['F3', 'A3', 'C4', 'E4'], ['F3', 'A3', 'C4'], null, null,
                ['G2', 'Bb2', 'D3', 'F3'], ['G2', 'Bb2', 'D3'], null, null, ['A2', 'C#3', 'E3', 'G3'], null, ['C#3', 'E3', 'G3'], null,
                ['Bb2', 'D3', 'F3', 'A3'], ['Bb2', 'D3', 'F3'], null, null, ['C3', 'E3', 'G3', 'Bb3'], ['C3', 'E3', 'G3'], null, null,
                ['D3', 'F3', 'A3', 'C4'], ['D3', 'F3', 'A3'], null, null, ['F3', 'A3', 'C4', 'E4'], null, ['A3', 'C4', 'E4'], null,
                ['D3', 'F3', 'A3', 'C4'], ['D3', 'F3', 'A3'], null, null, ['F3', 'A3', 'C4', 'E4'], ['F3', 'A3', 'C4'], null, null,
                ['G2', 'Bb2', 'D3', 'F3'], ['G2', 'Bb2', 'D3'], null, null, ['A2', 'C#3', 'E3', 'G3'], null, ['C#3', 'E3', 'G3'], null,
                ['Bb2', 'D3', 'F3', 'A3'], ['Bb2', 'D3', 'F3'], null, null, ['A2', 'C#3', 'E3', 'G3'], ['A2', 'C#3', 'E3'], null, null,
                ['G2', 'Bb2', 'D3', 'F3'], ['G2', 'Bb2', 'D3'], null, null, ['F2', 'A2', 'C3', 'E3'], null, ['D2', 'F2', 'A2'], null
            ],
            melody: [
                'A3', null, 'F4', null, 'D4', null, 'Bb3', 'C4', 'D4', null, 'G3', null, 'A3', 'C4', 'E4', null,
                'F4', null, 'D4', null, 'Bb3', 'C4', 'D4', 'E4', 'C4', null, 'A3', null, 'F3', 'A3', 'C4', null,
                'D4', null, 'F4', null, 'A4', null, 'G4', 'F4', 'D4', null, 'Bb3', null, 'C4', 'D4', 'E4', null,
                'F4', null, 'E4', null, 'D4', null, 'C4', 'Bb3', 'A3', null, 'G3', null, 'F3', 'E3', 'D3', null
            ],
            drums: [
                'kick', 'hat', 'kick', 'hat', 'snare', 'hat', 'kick', 'hat', 'kick', 'hat', 'kick', 'hat', 'snare', 'hat', 'kick', 'hat',
                'kick', 'hat', 'kick', 'hat', 'snare', 'hat', 'kick', 'hat', 'kick', 'hat', 'kick', 'hat', 'snare', 'hat', 'kick', 'hat',
                'kick', 'hat', 'kick', 'hat', 'snare', 'hat', 'kick', 'hat', 'kick', 'hat', 'kick', 'hat', 'snare', 'hat', 'kick', 'hat',
                'kick', 'hat', 'kick', 'hat', 'snare', 'hat', 'kick', 'hat', 'snare', 'snare', 'kick', 'snare', 'snare', 'snare', 'hat', 'hat'
            ]
        },
        voting: {
            bpm: 84,
            bass: [
                'Bb1', null, 'Bb1', null, 'F1', null, 'Bb1', null, 'D1', null, 'F1', null, 'Ab1', null, 'Bb1', null,
                'G1', null, 'G1', null, 'D1', null, 'G1', null, 'Bb1', null, 'D1', null, 'F1', null, 'G1', null,
                'Eb1', null, 'Eb1', null, 'Bb1', null, 'Eb1', null, 'G1', null, 'Bb1', null, 'Db1', null, 'Eb1', null,
                'F1', null, 'F1', null, 'C1', null, 'F1', null, 'A1', null, 'C1', null, 'Eb1', null, 'F1', null
            ],
            chords: [
                ['Bb2', 'D3', 'F3', 'Ab3', 'C4'], null, null, ['D3', 'F3', 'Ab3'], null, null, ['F3', 'Ab3', 'C4'], null,
                ['Bb2', 'D3', 'F3', 'Ab3'], null, null, ['D3', 'F3', 'C4'], null, null, null, null,
                ['G2', 'Bb2', 'D3', 'F3', 'A3'], null, null, ['Bb2', 'D3', 'F3'], null, null, ['D3', 'F3', 'A3'], null,
                ['G2', 'Bb2', 'D3', 'F3'], null, null, ['Bb2', 'D3', 'A3'], null, null, null, null,
                ['Eb2', 'G2', 'Bb2', 'D3', 'F3'], null, null, ['G2', 'Bb2', 'D3'], null, null, ['Bb2', 'D3', 'F3'], null,
                ['Eb2', 'G2', 'Bb2', 'D3'], null, null, ['G2', 'Bb2', 'F3'], null, null, null, null,
                ['F2', 'A2', 'C3', 'Eb3', 'G3'], null, null, ['A2', 'C3', 'Eb3'], null, null, ['C3', 'Eb3', 'G3'], null,
                ['F2', 'A2', 'C3', 'Eb3'], null, null, ['A2', 'C3', 'G3'], null, null, null, null
            ],
            melody: [
                'D4', null, 'Bb3', null, 'G3', null, 'A3', 'Bb3', 'C4', null, 'A3', null, 'F3', null, 'G3', null,
                'Bb3', null, 'G3', null, 'Eb3', null, 'F3', 'G3', 'A3', null, 'F3', null, 'D3', null, 'Eb3', null,
                'G3', null, 'Eb3', null, 'C3', null, 'D3', 'Eb3', 'F3', null, 'D3', null, 'Bb2', null, 'C3', null,
                'Eb3', null, 'D3', null, 'C3', null, 'Bb2', 'A2', 'F2', null, 'A2', 'C3', 'Eb3', 'D3', 'C3', null
            ],
            drums: [
                'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'kick', 'hat', 'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'hat', 'hat',
                'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'kick', 'hat', 'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'hat', 'hat',
                'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'kick', 'hat', 'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'hat', 'kick',
                'kick', 'hat', 'kick', 'hat', 'snare', 'hat', 'kick', 'hat', 'kick', 'hat', 'snare', 'hat', 'snare', 'hat', 'kick', 'hat'
            ]
        },
        podium: {
            bpm: 82,
            bass: [
                'D1', 'A1', 'D2', 'A1', 'F1', 'C2', 'F2', 'C2', 'Bb1', 'F1', 'Bb1', 'F1', 'A1', 'E1', 'A1', 'E1',
                'G1', 'D1', 'G1', 'D1', 'C1', 'G1', 'C2', 'G1', 'F1', 'C2', 'F2', 'C2', 'D1', 'A1', 'D2', null,
                'D1', 'A1', 'D2', 'A1', 'Bb1', 'F1', 'Bb1', 'F1', 'G1', 'D1', 'G1', 'D1', 'A1', 'E1', 'A1', 'E1',
                'Bb1', 'F1', 'Bb1', 'F1', 'C1', 'G1', 'C2', 'G1', 'D1', 'A1', 'D2', 'A1', 'D1', null, null, null
            ],
            chords: [
                ['D3', 'F3', 'A3', 'C4', 'E4'], null, null, ['D3', 'F3', 'A3', 'C4'], null, null, ['F3', 'A3', 'C4', 'E4'], null,
                ['Bb2', 'D3', 'F3', 'A3'], null, null, ['Bb2', 'D3', 'F3'], null, null, ['A2', 'C#3', 'E3', 'G3'], null,
                ['G2', 'Bb2', 'D3', 'F3'], null, null, ['G2', 'Bb2', 'D3'], null, null, ['C3', 'E3', 'G3', 'Bb3'], null,
                ['F3', 'A3', 'C4', 'E4'], null, null, ['F3', 'A3', 'C4'], null, null, ['D3', 'F3', 'A3', 'D4'], null,
                ['D3', 'F3', 'A3', 'C4'], null, null, ['Bb2', 'D3', 'F3', 'A3'], null, null, ['G2', 'Bb2', 'D3', 'F3'], null,
                ['A2', 'C#3', 'E3', 'G3'], null, null, ['Bb2', 'D3', 'F3', 'A3'], null, null, ['C3', 'E3', 'G3', 'Bb3'], null,
                ['D3', 'F3', 'A3', 'D4'], null, null, ['D3', 'F3', 'A3'], null, null, ['D3', 'F3', 'A3', 'D4'], null,
                ['D3', 'F3', 'A3', 'D4'], null, null, null, null, null, null, null
            ],
            melody: [
                'D4', 'F4', 'A4', 'C5', 'D4', null, 'C4', null, 'A3', 'F3', 'D3', 'F3', 'G3', null, 'A3', null,
                'Bb3', 'D4', 'F4', null, 'E4', 'D4', 'Bb3', null, 'G3', 'A3', 'Bb3', 'C4', 'D4', null, 'C4', null,
                'D4', 'F4', 'A4', null, 'G4', 'F4', 'D4', null, 'Bb3', 'D4', 'F4', 'E4', 'C#4', 'A3', 'F3', null,
                'G3', 'Bb3', 'D4', 'E4', 'D4', 'A3', 'F3', null, 'G3', 'C4', 'E4', 'G4', 'D4', null, null, null
            ],
            drums: [
                'kick', 'hat', 'hat', 'kick', 'snare', 'hat', 'kick', 'hat', 'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'kick', 'hat',
                'kick', 'hat', 'hat', 'kick', 'snare', 'hat', 'kick', 'hat', 'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'kick', 'hat',
                'kick', 'hat', 'hat', 'kick', 'snare', 'hat', 'kick', 'hat', 'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'kick', 'hat',
                'kick', 'hat', 'kick', 'hat', 'snare', 'hat', 'kick', 'hat', 'snare', 'snare', 'kick', 'snare', 'snare', 'snare', 'kick', 'hat'
            ]
        }
    },

    // ==================================================================
    // 🌌 3. DARK AMBIENT DUB (Key of C minor / G minor)
    // ==================================================================
    dark_dub_ambient: {
        lobby: {
            bpm: 70,
            bass: [
                'C1', null, null, null, 'G1', null, null, null, 'C1', null, null, null, 'Eb1', null, null, null,
                'Ab1', null, null, null, 'Eb1', null, null, null, 'Ab1', null, null, null, 'G1', null, null, null,
                'F1', null, null, null, 'C1', null, null, null, 'F1', null, null, null, 'Ab1', null, null, null,
                'G1', null, null, null, 'D1', null, null, null, 'G1', null, null, null, 'B1', null, null, null
            ],
            chords: [
                ['C3', 'Eb3', 'G3', 'Bb3', 'D4'], null, null, null, ['Eb3', 'G3', 'Bb3', 'D4'], null, null, null,
                ['C3', 'Eb3', 'G3', 'Bb3'], null, null, null, ['G3', 'Bb3', 'D4', 'F4'], null, null, null,
                ['Ab2', 'C3', 'Eb3', 'G3', 'Bb3'], null, null, null, ['C3', 'Eb3', 'G3', 'Bb3'], null, null, null,
                ['Ab2', 'C3', 'Eb3', 'G3'], null, null, null, ['Eb3', 'G3', 'Bb3', 'D4'], null, null, null,
                ['F2', 'Ab2', 'C3', 'Eb3', 'G3'], null, null, null, ['Ab2', 'C3', 'Eb3', 'G3'], null, null, null,
                ['F2', 'Ab2', 'C3', 'Eb3'], null, null, null, ['C3', 'Eb3', 'G3', 'Bb3'], null, null, null,
                ['G2', 'B2', 'D3', 'F3', 'Ab3'], null, null, null, ['B2', 'D3', 'F3', 'Ab3'], null, null, null,
                ['G2', 'B2', 'D3', 'F3'], null, null, null, ['D3', 'F3', 'Ab3', 'C4'], null, null, null
            ],
            melody: [
                'G3', null, 'Bb3', null, 'D4', null, 'Eb4', null, 'G4', null, 'Eb4', null, 'D4', null, 'Bb3', null,
                'C4', null, 'Eb4', null, 'G4', null, 'Bb4', null, 'Ab4', null, 'G4', null, 'Eb4', null, 'D4', null,
                'F3', null, 'Ab3', null, 'C4', null, 'Bb3', null, 'Ab3', null, 'G3', null, 'F3', null, 'Eb3', null,
                'D3', null, 'G3', null, 'B3', null, 'D4', null, 'C4', null, 'B3', null, 'G3', null, null, null
            ],
            drums: [
                'kick', null, 'hat', null, 'snare', null, 'hat', null, 'kick', null, 'hat', null, 'snare', null, 'hat', null,
                'kick', null, 'hat', null, 'snare', null, 'hat', null, 'kick', null, 'hat', null, 'snare', null, 'hat', null,
                'kick', null, 'hat', null, 'snare', null, 'hat', null, 'kick', null, 'hat', null, 'snare', null, 'hat', null,
                'kick', null, 'hat', null, 'snare', null, 'hat', null, 'kick', null, 'hat', 'hat', 'snare', null, 'kick', null
            ]
        },
        question: {
            bpm: 72,
            bass: [
                'F1', null, null, null, 'C1', null, null, null, 'F1', null, null, null, 'A1', null, null, null,
                'Bb1', null, null, null, 'F1', null, null, null, 'Bb1', null, null, null, 'D1', null, null, null,
                'Eb1', null, null, null, 'Bb1', null, null, null, 'Eb1', null, null, null, 'G1', null, null, null,
                'C1', null, null, null, 'G1', null, null, null, 'C1', null, null, null, 'E1', null, null, null
            ],
            chords: [
                ['F2', 'Ab2', 'C3', 'Eb3', 'G3'], null, null, null, ['Ab2', 'C3', 'Eb3', 'G3'], null, null, null,
                ['Bb2', 'D3', 'F3', 'Ab3', 'C4'], null, null, null, ['D3', 'F3', 'Ab3', 'C4'], null, null, null,
                ['Eb2', 'G2', 'Bb2', 'Db3', 'F3'], null, null, null, ['G2', 'Bb2', 'Db3', 'F3'], null, null, null,
                ['C2', 'E2', 'G2', 'Bb2', 'D3'], null, null, null, ['E2', 'G2', 'Bb2', 'D3'], null, null, null,
                ['F2', 'Ab2', 'C3', 'Eb3'], null, null, null, ['Ab2', 'C3', 'Eb3'], null, null, null,
                ['Bb2', 'D3', 'F3', 'Ab3'], null, null, null, ['D3', 'F3', 'Ab3'], null, null, null,
                ['Eb2', 'G2', 'Bb2', 'Db3'], null, null, null, ['G2', 'Bb2', 'Db3'], null, null, null,
                ['C2', 'E2', 'G2', 'Bb2'], null, null, null, ['E2', 'G2', 'Bb2'], null, null, null
            ],
            melody: [
                'C4', null, 'Eb4', null, 'G4', null, 'F4', 'Eb4', 'D4', null, 'Bb3', null, 'C4', null, 'Eb4', null,
                'D4', null, 'F4', null, 'Bb4', null, 'Ab4', 'G4', 'F4', null, 'D4', null, 'Eb4', 'F4', 'D4', null,
                'G3', null, 'Bb3', null, 'D4', null, 'F4', 'Eb4', 'Bb3', null, 'G3', null, 'Bb3', null, 'D4', null,
                'Eb4', null, 'G4', null, 'Bb4', null, 'D4', 'C4', 'G3', null, 'Eb3', null, 'C3', null, null, null
            ],
            drums: [
                'kick', null, 'hat', null, 'snare', null, 'hat', null, 'kick', null, 'hat', null, 'snare', null, 'hat', null,
                'kick', null, 'hat', null, 'snare', null, 'hat', null, 'kick', null, 'hat', null, 'snare', null, 'hat', null,
                'kick', null, 'hat', null, 'snare', null, 'hat', null, 'kick', null, 'hat', null, 'snare', null, 'hat', null,
                'kick', null, 'hat', null, 'snare', null, 'hat', null, 'kick', null, 'hat', null, 'snare', null, 'hat', 'hat'
            ]
        },
        battle: {
            bpm: 78,
            bass: [
                'G1', null, 'G1', null, 'D1', null, 'G1', null, 'Eb1', null, 'Eb1', null, 'Bb1', null, 'Eb1', null,
                'F1', null, 'F1', null, 'C1', null, 'F1', null, 'D1', null, 'D1', null, 'A1', null, 'D1', null,
                'G1', null, 'G1', null, 'D1', null, 'G1', null, 'Eb1', null, 'Eb1', null, 'Bb1', null, 'Eb1', null,
                'F1', null, 'F1', null, 'C1', null, 'F1', null, 'D1', null, 'D1', null, 'F#1', null, 'A1', null
            ],
            chords: [
                ['G2', 'Bb2', 'D3', 'F3', 'A3'], null, ['G2', 'Bb2', 'D3'], null, ['Eb2', 'G2', 'Bb2', 'D3', 'F3'], null, ['Eb2', 'G2', 'Bb2'], null,
                ['F2', 'A2', 'C3', 'Eb3', 'G3'], null, ['F2', 'A2', 'C3'], null, ['D2', 'F#2', 'A2', 'C3', 'E3'], null, ['D2', 'F#2', 'A2'], null,
                ['G2', 'Bb2', 'D3', 'F3', 'A3'], null, ['G2', 'Bb2', 'D3'], null, ['Eb2', 'G2', 'Bb2', 'D3', 'F3'], null, ['Eb2', 'G2', 'Bb2'], null,
                ['F2', 'A2', 'C3', 'Eb3', 'G3'], null, ['F2', 'A2', 'C3'], null, ['D2', 'F#2', 'A2', 'C3'], null, null, null
            ],
            melody: [
                'D4', null, 'Bb3', null, 'G3', null, 'A3', 'Bb3', 'C4', null, 'A3', null, 'F3', null, 'G3', null,
                'A3', null, 'C4', null, 'Eb4', null, 'D4', 'C4', 'A3', null, 'F#3', null, 'A3', 'C4', 'D4', null,
                'G4', null, 'D4', null, 'Bb3', null, 'C4', 'D4', 'Eb4', null, 'C4', null, 'A3', null, 'Bb3', null,
                'C4', null, 'Eb4', null, 'G4', null, 'F#4', 'E4', 'D4', null, 'A3', null, 'F#3', null, 'G3', null
            ],
            drums: [
                'kick', 'hat', 'hat', null, 'snare', 'hat', 'hat', null, 'kick', 'hat', 'kick', null, 'snare', 'hat', 'hat', null,
                'kick', 'hat', 'hat', null, 'snare', 'hat', 'hat', null, 'kick', 'hat', 'kick', null, 'snare', 'hat', 'hat', null,
                'kick', 'hat', 'hat', null, 'snare', 'hat', 'hat', null, 'kick', 'hat', 'kick', null, 'snare', 'hat', 'hat', null,
                'kick', 'hat', 'kick', null, 'snare', 'hat', 'kick', null, 'snare', 'hat', 'snare', 'snare', 'kick', 'hat', 'hat', null
            ]
        },
        voting: {
            bpm: 74,
            bass: [
                'C1', null, null, null, 'G1', null, null, null, 'C1', null, null, null, 'Eb1', null, null, null,
                'Ab1', null, null, null, 'Eb1', null, null, null, 'Ab1', null, null, null, 'C1', null, null, null,
                'F1', null, null, null, 'C1', null, null, null, 'F1', null, null, null, 'Ab1', null, null, null,
                'G1', null, null, null, 'D1', null, null, null, 'G1', null, null, null, 'B1', null, null, null
            ],
            chords: [
                ['C3', 'Eb3', 'G3', 'Bb3', 'D4'], null, null, null, ['Eb3', 'G3', 'Bb3', 'D4'], null, null, null,
                ['Ab2', 'C3', 'Eb3', 'G3', 'Bb3'], null, null, null, ['C3', 'Eb3', 'G3', 'Bb3'], null, null, null,
                ['F2', 'Ab2', 'C3', 'Eb3', 'G3'], null, null, null, ['Ab2', 'C3', 'Eb3', 'G3'], null, null, null,
                ['G2', 'B2', 'D3', 'F3', 'Ab3'], null, null, null, ['B2', 'D3', 'F3', 'Ab3'], null, null, null
            ],
            melody: [
                'G3', null, 'Eb3', null, 'C3', null, 'D3', 'Eb3', 'F3', null, 'D3', null, 'Bb2', null, 'C3', null,
                'Eb3', null, 'C3', null, 'Ab2', null, 'Bb2', 'C3', 'D3', null, 'Bb2', null, 'G2', null, 'Ab2', null,
                'C3', null, 'Ab2', null, 'F2', null, 'G2', 'Ab2', 'Bb2', null, 'G2', null, 'Eb2', null, 'F2', null,
                'G2', null, 'F2', null, 'Eb2', null, 'D2', 'C2', 'B1', null, 'D2', 'F2', 'Ab2', 'G2', 'F2', null
            ],
            drums: [
                'kick', null, 'hat', null, 'snare', null, 'hat', null, 'kick', null, 'hat', null, 'snare', null, 'hat', null,
                'kick', null, 'hat', null, 'snare', null, 'hat', null, 'kick', null, 'hat', null, 'snare', null, 'hat', null,
                'kick', null, 'hat', null, 'snare', null, 'hat', null, 'kick', null, 'hat', null, 'snare', null, 'hat', null,
                'kick', null, 'hat', null, 'snare', null, 'hat', null, 'kick', null, 'hat', null, 'snare', null, 'hat', 'kick'
            ]
        },
        podium: {
            bpm: 72,
            bass: [
                'C1', null, 'G1', null, 'C1', null, 'Eb1', null, 'G1', null, 'B1', null, 'C1', null, 'D1', null,
                'Ab1', null, 'Eb1', null, 'Ab1', null, 'C1', null, 'Eb1', null, 'G1', null, 'Ab1', null, 'Bb1', null,
                'Bb1', null, 'F1', null, 'Bb1', null, 'D1', null, 'F1', null, 'Ab1', null, 'Bb1', null, 'D1', null,
                'C1', null, 'G1', null, 'C2', null, 'Eb1', null, 'G1', null, 'C2', null, 'Eb1', 'D1', 'C1', 'B1'
            ],
            chords: [
                ['C3', 'Eb3', 'G3', 'Bb3', 'D4'], null, null, null, ['C3', 'Eb3', 'G3', 'Bb3'], null, null, null,
                ['Ab2', 'C3', 'Eb3', 'G3', 'Bb3'], null, null, null, ['Ab2', 'C3', 'Eb3', 'G3'], null, null, null,
                ['Bb2', 'D3', 'F3', 'Ab3', 'C4'], null, null, null, ['Bb2', 'D3', 'F3', 'Bb3'], null, null, null,
                ['C3', 'Eb3', 'G3', 'C4', 'Eb4'], null, null, null, ['C3', 'Eb3', 'G3', 'C4'], null, null, null
            ],
            melody: [
                'C4', 'Eb4', 'G4', 'B4', 'D4', null, 'C4', null, 'B3', 'G3', 'Eb3', 'G3', 'Ab3', null, 'G3', null,
                'Ab3', 'C4', 'Eb4', null, 'D4', 'C4', 'Ab3', null, 'G3', 'Ab3', 'C4', 'D4', 'Eb4', null, 'D4', null,
                'D4', 'G3', 'B3', 'D4', 'F4', null, 'Eb4', null, 'D4', 'B3', 'G3', 'B3', 'D4', null, 'B3', null,
                'C4', 'Eb4', 'G4', null, 'Eb4', 'D4', 'C4', null, 'G3', 'Ab3', 'C4', 'Eb4', 'C4', null, null, null
            ],
            drums: [
                'kick', null, 'hat', 'kick', 'snare', null, 'hat', null, 'kick', null, 'hat', null, 'snare', null, 'kick', null,
                'kick', null, 'hat', 'kick', 'snare', null, 'hat', null, 'kick', null, 'hat', null, 'snare', null, 'kick', null,
                'kick', null, 'hat', 'kick', 'snare', null, 'hat', null, 'kick', null, 'hat', null, 'snare', null, 'kick', null,
                'kick', null, 'hat', 'kick', 'snare', null, 'hat', null, 'snare', 'snare', 'kick', 'snare', 'snare', 'snare', 'kick', null
            ]
        }
    },

    // ==================================================================
    // 🎻 4. DEEP UPRIGHT JAZZ BASS (Key of Bb minor / F minor)
    // ==================================================================
    deep_jazz_bass: {
        lobby: {
            bpm: 78,
            bass: [
                'Bb1', 'F1', 'Bb1', 'Ab1', 'G1', 'Eb1', 'G1', 'Ab1', 'A1', 'F1', 'A1', 'G1', 'F1', 'C1', 'F1', 'A1',
                'Bb1', 'D1', 'F1', 'Ab1', 'G1', 'B1', 'D1', 'F1', 'Eb1', 'G1', 'Bb1', 'Db2', 'C2', 'G1', 'E1', 'C1',
                'F1', 'C1', 'F1', 'G1', 'Ab1', 'Eb1', 'Ab1', 'G1', 'F1', 'Db1', 'F1', 'Gb1', 'G1', 'D1', 'G1', 'F1',
                'Eb1', 'Bb1', 'Eb1', 'E1', 'F1', 'C1', 'F1', 'A1', 'Bb1', 'F1', 'D1', 'B1', 'C1', 'G1', 'C1', 'F1'
            ],
            chords: [
                ['Bb2', 'Db3', 'F3', 'Ab3'], null, null, ['Db3', 'F3', 'Ab3'], null, null, ['F3', 'Ab3', 'C4'], null,
                ['Bb2', 'Db3', 'F3', 'Ab3'], null, null, ['Db3', 'F3', 'C4'], null, null, null, null,
                ['Eb2', 'G2', 'Bb2', 'Db3'], null, null, ['G2', 'Bb2', 'Db3'], null, null, ['Bb2', 'Db3', 'F3'], null,
                ['Eb2', 'G2', 'Bb2', 'Db3'], null, null, ['G2', 'Bb2', 'F3'], null, null, null, null,
                ['Ab2', 'C3', 'Eb3', 'G3'], null, null, ['C3', 'Eb3', 'G3'], null, null, ['Eb3', 'G3', 'Bb3'], null,
                ['Ab2', 'C3', 'Eb3', 'G3'], null, null, ['C3', 'Eb3', 'Bb3'], null, null, null, null,
                ['Db2', 'F2', 'Ab2', 'C3'], null, null, ['F2', 'Ab2', 'C3'], null, null, ['Ab2', 'C3', 'Eb3'], null,
                ['Gb2', 'Bb2', 'Db3', 'F3'], null, null, ['C2', 'E2', 'G2', 'Bb2'], null, null, null, null
            ],
            melody: [
                'F3', null, 'Ab3', null, 'C4', null, 'Eb4', 'Db4', 'Ab3', null, 'F3', null, 'G3', null, 'Ab3', null,
                'Bb3', null, 'Db4', null, 'F4', null, 'Eb4', 'Db4', 'Bb3', null, 'G3', null, 'Ab3', 'Bb3', 'G3', null,
                'Ab3', null, 'C4', null, 'Eb4', null, 'G4', 'F4', 'C4', null, 'Ab3', null, 'Bb3', 'C4', 'Ab3', null,
                'Db4', null, 'F4', null, 'Ab4', null, 'G4', 'F4', 'Db4', null, 'Bb3', null, 'C4', 'Db4', 'Bb3', null
            ],
            drums: [
                'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'hat', 'kick', 'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'hat', 'hat',
                'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'hat', 'kick', 'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'hat', 'hat',
                'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'hat', 'kick', 'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'hat', 'hat',
                'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'hat', 'kick', 'kick', 'hat', 'snare', 'hat', 'snare', 'snare', 'hat', 'hat'
            ]
        },
        question: {
            bpm: 80,
            bass: [
                'Eb1', 'Bb1', 'Eb1', 'G1', 'Ab1', 'Eb1', 'Ab1', 'G1', 'F1', 'C1', 'F1', 'Ab1', 'Bb1', 'F1', 'Bb1', 'Ab1',
                'G1', 'D1', 'G1', 'B1', 'C1', 'G1', 'C1', 'Eb1', 'F1', 'C1', 'F1', 'A1', 'Bb1', 'F1', 'Ab1', 'G1',
                'Ab1', 'Eb1', 'C1', 'G1', 'F1', 'C1', 'Ab1', 'F1', 'Bb1', 'F1', 'D1', 'Ab1', 'Eb1', 'Bb1', 'G1', 'Eb1',
                'C1', 'G1', 'Eb1', 'C1', 'F1', 'C1', 'A1', 'F1', 'Bb1', 'F1', 'D1', 'Bb1', 'Eb1', 'G1', 'Bb1', 'D1'
            ],
            chords: [
                ['Eb2', 'G2', 'Bb2', 'D3', 'F3'], null, null, ['G2', 'Bb2', 'D3'], null, null, ['Bb2', 'D3', 'F3'], null,
                ['Ab2', 'C3', 'Eb3', 'G3'], null, null, ['C3', 'Eb3', 'G3'], null, null, null, null,
                ['F2', 'Ab2', 'C3', 'Eb3', 'G3'], null, null, ['Ab2', 'C3', 'Eb3'], null, null, ['C3', 'Eb3', 'G3'], null,
                ['Bb2', 'D3', 'F3', 'Ab3'], null, null, ['D3', 'F3', 'Ab3'], null, null, null, null,
                ['G2', 'B2', 'D3', 'F3'], null, null, ['B2', 'D3', 'F3'], null, null, ['D3', 'F3', 'A3'], null,
                ['C2', 'Eb2', 'G2', 'Bb2'], null, null, ['Eb2', 'G2', 'Bb2'], null, null, null, null,
                ['F2', 'Ab2', 'C3', 'Eb3'], null, null, ['Ab2', 'C3', 'Eb3'], null, null, ['Bb2', 'D3', 'F3', 'Ab3'], null,
                ['Eb2', 'G2', 'Bb2', 'D3'], null, null, ['G2', 'Bb2', 'D3'], null, null, null, null
            ],
            melody: [
                'G3', null, 'Bb3', null, 'D4', null, 'F4', 'Eb4', 'Bb3', null, 'G3', null, 'Ab3', null, 'Bb3', null,
                'C4', null, 'Eb4', null, 'G4', null, 'F4', 'Eb4', 'C4', null, 'Ab3', null, 'Bb3', 'C4', 'Ab3', null,
                'F3', null, 'Ab3', null, 'C4', null, 'Eb4', 'D4', 'Ab3', null, 'F3', null, 'G3', 'Ab3', 'F3', null,
                'Bb3', null, 'D4', null, 'F4', null, 'Eb4', 'D4', 'Bb3', null, 'G3', null, 'Eb3', null, null, null
            ],
            drums: [
                'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'kick', 'hat', 'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'hat', 'hat',
                'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'kick', 'hat', 'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'hat', 'hat',
                'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'kick', 'hat', 'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'hat', 'kick',
                'kick', 'hat', 'kick', 'hat', 'snare', 'hat', 'kick', 'hat', 'kick', 'hat', 'snare', 'snare', 'hat', 'hat', 'kick', 'hat'
            ]
        },
        battle: {
            bpm: 86,
            bass: [
                'C1', 'C1', 'G1', 'C1', 'F1', 'F1', 'C1', 'F1', 'Bb1', 'Bb1', 'F1', 'Bb1', 'Eb1', 'Eb1', 'Bb1', 'G1',
                'Ab1', 'Ab1', 'Eb1', 'Ab1', 'Db1', 'Db1', 'Ab1', 'Db1', 'Gb1', 'Gb1', 'Db1', 'Gb1', 'B1', 'B1', 'F#1', 'B1',
                'E1', 'E1', 'B1', 'E1', 'A1', 'A1', 'E1', 'A1', 'D1', 'D1', 'A1', 'D1', 'G1', 'G1', 'D1', 'G1',
                'C1', 'C1', 'G1', 'C1', 'F1', 'F1', 'C1', 'F1', 'Bb1', 'Bb1', 'F1', 'Bb1', 'Eb1', 'G1', 'Bb1', 'D1'
            ],
            chords: [
                ['C2', 'Eb2', 'G2', 'Bb2', 'D3'], ['C2', 'Eb2', 'G2'], null, null, ['F2', 'Ab2', 'C3', 'Eb3', 'G3'], ['F2', 'Ab2', 'C3'], null, null,
                ['Bb2', 'D3', 'F3', 'Ab3', 'C4'], ['Bb2', 'D3', 'F3'], null, null, ['Eb2', 'G2', 'Bb2', 'D3', 'F3'], null, ['G2', 'Bb2', 'D3'], null,
                ['Ab2', 'C3', 'Eb3', 'G3'], ['Ab2', 'C3', 'Eb3'], null, null, ['Db2', 'F2', 'Ab2', 'C3'], ['Db2', 'F2', 'Ab2'], null, null,
                ['Gb2', 'Bb2', 'Db3', 'F3'], ['Gb2', 'Bb2', 'Db3'], null, null, ['B2', 'D#3', 'F#3', 'A3'], null, ['D#3', 'F#3', 'A3'], null,
                ['E2', 'G#2', 'B2', 'D3'], ['E2', 'G#2', 'B2'], null, null, ['A2', 'C#3', 'E3', 'G3'], ['A2', 'C#3', 'E3'], null, null,
                ['D2', 'F#2', 'A2', 'C3'], ['D2', 'F#2', 'A2'], null, null, ['G2', 'B2', 'D3', 'F3'], null, ['B2', 'D3', 'F3'], null,
                ['C2', 'Eb2', 'G2', 'Bb2'], ['C2', 'Eb2', 'G2'], null, null, ['F2', 'Ab2', 'C3', 'Eb3'], ['F2', 'Ab2', 'C3'], null, null,
                ['Bb2', 'D3', 'F3', 'Ab3'], ['Bb2', 'D3', 'F3'], null, null, ['Eb2', 'G2', 'Bb2', 'D3'], null, ['G2', 'Bb2', 'D3'], null
            ],
            melody: [
                'G3', null, 'Eb4', null, 'C4', null, 'Ab3', 'Bb3', 'C4', null, 'F3', null, 'G3', 'Bb3', 'D4', null,
                'Eb4', null, 'C4', null, 'Ab3', 'Bb3', 'C4', 'Db4', 'Bb3', null, 'Gb3', null, 'Eb3', 'Gb3', 'Bb3', null,
                'B3', null, 'G#3', null, 'E3', 'F#3', 'G#3', 'A3', 'F#3', null, 'D3', null, 'B2', 'D3', 'F#3', null,
                'G3', null, 'Eb4', null, 'C4', null, 'Ab3', 'Bb3', 'C4', null, 'F3', null, 'G3', 'Bb3', 'Eb4', null
            ],
            drums: [
                'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'kick', 'hat', 'kick', 'hat', 'kick', 'hat', 'snare', 'hat', 'kick', 'hat',
                'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'kick', 'hat', 'kick', 'hat', 'kick', 'hat', 'snare', 'hat', 'kick', 'hat',
                'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'kick', 'hat', 'kick', 'hat', 'kick', 'hat', 'snare', 'hat', 'kick', 'hat',
                'kick', 'hat', 'kick', 'hat', 'snare', 'hat', 'kick', 'hat', 'snare', 'snare', 'kick', 'snare', 'snare', 'snare', 'hat', 'hat'
            ]
        },
        voting: {
            bpm: 82,
            bass: [
                'F1', null, 'C1', null, 'F1', null, 'Ab1', null, 'C1', null, 'Eb1', null, 'F1', null, 'G1', null,
                'D1', null, 'A1', null, 'D1', null, 'F#1', null, 'A1', null, 'C1', null, 'D1', null, 'E1', null,
                'G1', null, 'D1', null, 'G1', null, 'Bb1', null, 'D1', null, 'F1', null, 'G1', null, 'A1', null,
                'C1', null, 'G1', null, 'C1', null, 'E1', null, 'G1', null, 'Bb1', null, 'C1', null, 'E1', null
            ],
            chords: [
                ['F2', 'Ab2', 'C3', 'Eb3', 'G3'], null, null, ['F2', 'Ab2', 'C3'], null, null, ['Ab2', 'C3', 'Eb3', 'G3'], null,
                ['F2', 'Ab2', 'C3', 'Eb3'], null, null, ['Ab2', 'C3', 'G3'], null, null, null, null,
                ['D2', 'F#2', 'A2', 'C3', 'E3'], null, null, ['D2', 'F#2', 'A2'], null, null, ['F#2', 'A2', 'C3', 'E3'], null,
                ['D2', 'F#2', 'A2', 'C3'], null, null, ['F#2', 'A2', 'E3'], null, null, null, null,
                ['G2', 'Bb2', 'D3', 'F3', 'A3'], null, null, ['G2', 'Bb2', 'D3'], null, null, ['Bb2', 'D3', 'F3', 'A3'], null,
                ['G2', 'Bb2', 'D3', 'F3'], null, null, ['Bb2', 'D3', 'A3'], null, null, null, null,
                ['C2', 'E2', 'G2', 'Bb2', 'D3'], null, null, ['C2', 'E2', 'G2'], null, null, ['E2', 'G2', 'Bb2', 'D3'], null,
                ['C2', 'E2', 'G2', 'Bb2'], null, null, ['E2', 'G2', 'D3'], null, null, null, null
            ],
            melody: [
                'Ab3', null, 'C4', null, 'Eb4', null, 'G4', 'F4', 'C4', null, 'Ab3', null, 'Bb3', null, 'C4', null,
                'A3', null, 'F#3', null, 'D3', null, 'E3', 'F#3', 'G3', null, 'E3', null, 'C3', null, 'D3', null,
                'Bb3', null, 'D4', null, 'F4', null, 'A4', 'G4', 'D4', null, 'Bb3', null, 'C4', 'D4', 'Bb3', null,
                'G3', null, 'E3', null, 'C3', null, 'D3', 'E3', 'F3', null, 'D3', null, 'B2', null, 'C3', null
            ],
            drums: [
                'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'kick', 'hat', 'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'hat', 'hat',
                'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'kick', 'hat', 'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'hat', 'hat',
                'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'kick', 'hat', 'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'hat', 'kick',
                'kick', 'hat', 'kick', 'hat', 'snare', 'hat', 'kick', 'hat', 'kick', 'hat', 'snare', 'hat', 'snare', 'hat', 'kick', 'hat'
            ]
        },
        podium: {
            bpm: 80,
            bass: [
                'Eb1', 'Bb1', 'Eb2', 'Bb1', 'G1', 'D1', 'G1', 'D1', 'Ab1', 'Eb1', 'Ab1', 'Eb1', 'Bb1', 'F1', 'Bb1', 'F1',
                'C1', 'G1', 'C2', 'G1', 'F1', 'C1', 'F1', 'C1', 'Bb1', 'F1', 'Bb1', 'F1', 'Eb1', 'G1', 'Bb1', 'D1',
                'Eb1', 'Bb1', 'Eb2', 'Bb1', 'Db1', 'Ab1', 'Db2', 'Ab1', 'C1', 'G1', 'C2', 'G1', 'B1', 'F#1', 'B1', 'F#1',
                'Bb1', 'F1', 'Bb1', 'F1', 'Ab1', 'Eb1', 'Ab1', 'Eb1', 'Bb1', 'F1', 'Bb1', 'D2', 'Eb1', 'Bb1', 'Eb2', null
            ],
            chords: [
                ['Eb2', 'G2', 'Bb2', 'D3', 'F3'], null, null, ['Eb2', 'G2', 'Bb2', 'D3'], null, null, ['G2', 'Bb2', 'D3', 'F3'], null,
                ['Ab2', 'C3', 'Eb3', 'G3'], null, null, ['Ab2', 'C3', 'Eb3'], null, null, ['Bb2', 'D3', 'F3', 'Ab3'], null,
                ['C2', 'Eb2', 'G2', 'Bb2', 'D3'], null, null, ['C2', 'Eb2', 'G2', 'Bb2'], null, null, ['F2', 'Ab2', 'C3', 'Eb3'], null,
                ['Bb2', 'D3', 'F3', 'Ab3'], null, null, ['Bb2', 'D3', 'F3'], null, null, ['Eb2', 'G2', 'Bb2', 'Eb3'], null,
                ['Eb2', 'G2', 'Bb2', 'D3'], null, null, ['Db2', 'F2', 'Ab2', 'C3'], null, null, ['C2', 'E2', 'G2', 'Bb2'], null,
                ['B2', 'D#3', 'F#3', 'A3'], null, null, ['Bb2', 'D3', 'F3', 'Ab3'], null, null, ['Ab2', 'C3', 'Eb3', 'G3'], null,
                ['Bb2', 'D3', 'F3', 'Ab3'], null, null, ['Bb2', 'D3', 'F3'], null, null, ['Eb2', 'G2', 'Bb2', 'Eb3'], null,
                ['Eb2', 'G2', 'Bb2', 'Eb3'], null, null, null, null, null, null, null
            ],
            melody: [
                'Eb3', 'G3', 'Bb3', 'D4', 'F4', null, 'Eb4', null, 'C4', 'Ab3', 'G3', 'F3', 'Bb3', null, 'D4', null,
                'Eb4', 'G4', 'Bb4', null, 'A4', 'G4', 'F4', null, 'D4', 'Eb4', 'F4', 'G4', 'Eb4', null, 'C4', null,
                'Bb3', 'Db4', 'F4', 'Ab4', 'G4', 'E4', 'C4', null, 'D#4', 'F#4', 'A4', 'G4', 'E4', 'C4', 'A3', null,
                'D4', 'F4', 'Ab4', 'C5', 'Bb4', 'G3', 'Eb3', null, 'F3', 'Bb3', 'D4', 'F4', 'Eb4', null, null, null
            ],
            drums: [
                'kick', 'hat', 'hat', 'kick', 'snare', 'hat', 'kick', 'hat', 'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'kick', 'hat',
                'kick', 'hat', 'hat', 'kick', 'snare', 'hat', 'kick', 'hat', 'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'kick', 'hat',
                'kick', 'hat', 'hat', 'kick', 'snare', 'hat', 'kick', 'hat', 'kick', 'hat', 'hat', 'hat', 'snare', 'hat', 'kick', 'hat',
                'kick', 'hat', 'kick', 'hat', 'snare', 'hat', 'kick', 'hat', 'snare', 'snare', 'kick', 'snare', 'snare', 'snare', 'kick', 'hat'
            ]
        }
    }
};

export class MusicSynthesizer {
    constructor(audioContext) {
        this.ctx = audioContext;
        this.masterGain = null;
        this.masterFilter = null;
        this.currentTheme = 'deep_lofi_bass';
        this.currentPhase = 'lobby';
        this.isPlaying = false;
        this.timerId = null;
        this.currentStep = 0;
        this.noiseBuffer = null;
        this.targetGain = 0.55;
    }

    init() {
        if (!this.ctx && typeof window !== 'undefined') {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (!this.ctx) return;

        if (!this.masterGain) {
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(this.targetGain, this.ctx.currentTime);

            // Dark, warm lowpass filter at 650Hz (strips out all harsh high notes and bright treble)
            this.masterFilter = this.ctx.createBiquadFilter();
            this.masterFilter.type = 'lowpass';
            this.masterFilter.frequency.setValueAtTime(650, this.ctx.currentTime);

            this.masterFilter.connect(this.masterGain);
            this.masterGain.connect(this.ctx.destination);
        }
        this.generateNoiseBuffer();
    }

    generateNoiseBuffer() {
        if (!this.ctx || this.noiseBuffer) return;
        try {
            const bufferSize = Math.floor(this.ctx.sampleRate * 2.0);
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const output = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = (Math.random() * 2 - 1) * 0.3;
            }
            this.noiseBuffer = buffer;
        } catch (e) {
            console.warn('[MusicSynthesizer] Noise buffer generation failed:', e);
        }
    }

    setGain(volume, fadeTime = 0.2) {
        this.targetGain = Math.max(0.0001, Math.min(1, volume));
        if (!this.masterGain || !this.ctx) return;
        const now = this.ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setValueAtTime(Math.max(0.0001, this.masterGain.gain.value), now);
        this.masterGain.gain.linearRampToValueAtTime(this.targetGain, now + fadeTime);
    }

    async play(theme = 'deep_lofi_bass', phase = 'lobby', volume = 0.55) {
        this.init();
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') {
            try {
                await this.ctx.resume();
            } catch (e) {
                console.warn('[MusicSynthesizer] AudioContext resume failed:', e);
            }
        }

        this.currentTheme = theme;
        this.currentPhase = phase;
        this.currentStep = 0;
        this.targetGain = Math.max(0.05, Math.min(1, volume));
        this.isPlaying = true;

        if (this.masterGain) {
            const now = this.ctx.currentTime;
            this.masterGain.gain.cancelScheduledValues(now);
            this.masterGain.gain.setValueAtTime(this.targetGain, now);
        }

        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
        this.startSequencer();
    }

    startSequencer() {
        const themeConfig = COMPOSITIONS[this.currentTheme] || COMPOSITIONS.deep_lofi_bass;
        const phaseConfig = themeConfig[this.currentPhase] || themeConfig.lobby;
        const bpm = phaseConfig.bpm || 78;
        const stepIntervalMs = (60000 / bpm) / 4; // 16th notes

        this.timerId = setInterval(() => {
            if (!this.isPlaying || !this.ctx) return;
            if (this.ctx.state === 'suspended') {
                this.ctx.resume().catch(() => {});
            }
            this.step();
        }, stepIntervalMs);
    }

    step() {
        if (!this.ctx || !this.masterFilter) return;
        const themeConfig = COMPOSITIONS[this.currentTheme] || COMPOSITIONS.deep_lofi_bass;
        const phaseConfig = themeConfig[this.currentPhase] || themeConfig.lobby;
        const totalSteps = phaseConfig.bass?.length || 64;
        const step = this.currentStep % totalSteps;
        const now = Math.max(this.ctx.currentTime, 0) + 0.04;

        // Heavy, prominent sub-bass
        const bassNote = phaseConfig.bass?.[step];
        if (bassNote) {
            const freq = getNoteFrequency(bassNote);
            if (freq) this.playBassNote(freq, now, this.currentTheme);
        }

        // Muted, dark, warm chord pads (Octaves 2-4)
        const chordNotes = phaseConfig.chords?.[step];
        if (chordNotes && Array.isArray(chordNotes)) {
            chordNotes.forEach((noteName, idx) => {
                const freq = getNoteFrequency(noteName);
                if (freq) this.playChordNote(freq, now, this.currentTheme, idx);
            });
        }

        // Soft, mellow mid-register melody (Octave 3-4 only, low volume)
        const melodyNote = phaseConfig.melody?.[step];
        if (melodyNote) {
            const freq = getNoteFrequency(melodyNote);
            if (freq) this.playMelodyNote(freq, now, this.currentTheme);
        }

        // Dark, low lo-fi percussion
        const drumType = phaseConfig.drums?.[step];
        if (drumType) {
            this.playDrum(drumType, now, this.currentTheme);
        }

        this.currentStep++;
    }

    playBassNote(freq, time, theme) {
        if (!this.ctx || !this.masterFilter) return;
        const subOsc = this.ctx.createOscillator();
        const midOsc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        // Thick sub-bass: Pure low sine + warm triangle mid-bass
        subOsc.type = 'sine';
        midOsc.type = 'triangle';

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(320, time);
        filter.frequency.exponentialRampToValueAtTime(140, time + 0.5);

        // Prominent bass volume (0.55)
        gain.gain.setValueAtTime(0.001, time);
        gain.gain.linearRampToValueAtTime(0.55, time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.55);

        subOsc.frequency.setValueAtTime(freq, time);
        midOsc.frequency.setValueAtTime(freq, time);

        subOsc.connect(filter);
        midOsc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterFilter);

        subOsc.start(time);
        midOsc.start(time);
        subOsc.stop(time + 0.58);
        midOsc.stop(time + 0.58);
    }

    playChordNote(freq, time, theme, voiceIdx = 0) {
        if (!this.ctx || !this.masterFilter) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        // Dark, muffled electric piano / soft tape pad
        osc.type = 'triangle';
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, time);
        filter.frequency.exponentialRampToValueAtTime(220, time + 0.8);

        const voiceGain = 0.09 / (1 + voiceIdx * 0.15);
        gain.gain.setValueAtTime(0.001, time);
        gain.gain.linearRampToValueAtTime(voiceGain, time + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.9);

        osc.frequency.setValueAtTime(freq, time);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterFilter);

        osc.start(time);
        osc.stop(time + 0.95);
    }

    playMelodyNote(freq, time, theme) {
        if (!this.ctx || !this.masterFilter) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        // Soft, dark flute/organ sitting behind the bass
        osc.type = 'sine';
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(480, time);

        gain.gain.setValueAtTime(0.001, time);
        gain.gain.linearRampToValueAtTime(0.08, time + 0.03); // Low subtle volume
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.45);

        osc.frequency.setValueAtTime(freq, time);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterFilter);

        osc.start(time);
        osc.stop(time + 0.5);
    }

    playDrum(type, time, theme) {
        if (!this.ctx || !this.masterFilter) return;
        if (type === 'kick') {
            // Heavy deep 808 sub kick
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.frequency.setValueAtTime(75, time);
            osc.frequency.exponentialRampToValueAtTime(24, time + 0.25);

            gain.gain.setValueAtTime(0.001, time);
            gain.gain.linearRampToValueAtTime(0.55, time + 0.008);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

            osc.connect(gain);
            gain.connect(this.masterFilter);
            osc.start(time);
            osc.stop(time + 0.32);
        } else if (type === 'snare') {
            // Muffled, soft rimshot
            if (!this.noiseBuffer) this.generateNoiseBuffer();
            if (this.noiseBuffer) {
                const noise = this.ctx.createBufferSource();
                noise.buffer = this.noiseBuffer;
                const filter = this.ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(450, time);
                filter.Q.setValueAtTime(1.2, time);

                const gain = this.ctx.createGain();
                gain.gain.setValueAtTime(0.001, time);
                gain.gain.linearRampToValueAtTime(0.09, time + 0.008);
                gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);

                noise.connect(filter);
                filter.connect(gain);
                gain.connect(this.masterFilter);
                noise.start(time);
                noise.stop(time + 0.17);
            }
        } else if (type === 'hat') {
            // Very soft, dark shaker
            if (!this.noiseBuffer) this.generateNoiseBuffer();
            if (this.noiseBuffer) {
                const noise = this.ctx.createBufferSource();
                noise.buffer = this.noiseBuffer;
                const filter = this.ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(1600, time);

                const gain = this.ctx.createGain();
                gain.gain.setValueAtTime(0.001, time);
                gain.gain.linearRampToValueAtTime(0.025, time + 0.004);
                gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

                noise.connect(filter);
                filter.connect(gain);
                gain.connect(this.masterFilter);
                noise.start(time);
                noise.stop(time + 0.05);
            }
        }
    }

    switchPhase(newPhase) {
        if (this.currentPhase === newPhase) return;
        this.currentPhase = newPhase;
        this.currentStep = 0;
        if (this.isPlaying) {
            if (this.timerId) clearInterval(this.timerId);
            this.startSequencer();
        }
    }

    switchTheme(newTheme) {
        if (this.currentTheme === newTheme) return;
        this.currentTheme = newTheme;
        this.currentStep = 0;
        if (this.isPlaying) {
            if (this.timerId) clearInterval(this.timerId);
            this.startSequencer();
        }
    }

    stop(fadeDuration = 0.25) {
        this.isPlaying = false;
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
        if (this.masterGain && this.ctx) {
            const now = this.ctx.currentTime;
            this.masterGain.gain.cancelScheduledValues(now);
            this.masterGain.gain.setValueAtTime(Math.max(0.0001, this.masterGain.gain.value), now);
            this.masterGain.gain.linearRampToValueAtTime(0.0001, now + fadeDuration);
        }
    }
}
