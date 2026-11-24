// test/musicAudio.test.js
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    MUSIC_PLAYLIST_TRACKS,
    MUSIC_THEMES,
    MUSIC_THEME_METADATA,
    getTracksForStage,
    mapPhaseToMusicStage
} from '../src/lib/audio/musicTracks.js';
import { musicManager } from '../src/lib/audio/musicManager.js';
import { getNoteFrequency, COMPOSITIONS } from '../src/lib/audio/musicSynthesizer.js';
import { handleUserAudioGesture, soundEngine } from '../src/lib/utils.js';
import * as manager from '../game/manager.js';
import * as lobbyHandlers from '../game/handlers/lobbyHandlers.js';
import { getSanitizedGameState } from '../game/helpers.js';

describe('Background Music & Audio Engine Systems', () => {
    describe('Note Frequency & Composition Integrity', () => {
        it('calculates exact pitch frequencies for standard, sharp, and flat notes', () => {
            expect(Math.round(getNoteFrequency('A4'))).toBe(440);
            expect(Math.round(getNoteFrequency('C4'))).toBe(262);
            expect(Math.round(getNoteFrequency('A2'))).toBe(110);
            expect(Math.round(getNoteFrequency('Ab2'))).toBe(104);
            expect(Math.round(getNoteFrequency('F#4'))).toBe(370);
            expect(Math.round(getNoteFrequency('Eb5'))).toBe(622);
            expect(getNoteFrequency('invalid')).toBeNull();
            expect(getNoteFrequency(null)).toBeNull();
        });

        it('verifies that every note in all theme compositions maps to a valid frequency', () => {
            Object.entries(COMPOSITIONS).forEach(([, phases]) => {
                Object.entries(phases).forEach(([, track]) => {
                    track.bass?.forEach(note => {
                        if (note !== null) {
                            const freq = getNoteFrequency(note);
                            expect(freq).toBeGreaterThan(20);
                            expect(freq).toBeLessThan(10000);
                        }
                    });

                    track.chords?.forEach(chord => {
                        if (Array.isArray(chord)) {
                            chord.forEach(note => {
                                const freq = getNoteFrequency(note);
                                expect(freq).toBeGreaterThan(20);
                                expect(freq).toBeLessThan(10000);
                            });
                        }
                    });

                    track.melody?.forEach(note => {
                        if (note !== null) {
                            const freq = getNoteFrequency(note);
                            expect(freq).toBeGreaterThan(20);
                            expect(freq).toBeLessThan(10000);
                        }
                    });
                });
            });
        });
    });

    describe('Curated 15-Track Live Soundtrack & Stage Mapping', () => {
        it('defines 15 unique Kevin MacLeod CC-BY tracks with existing MP3 files on disk', () => {
            expect(MUSIC_PLAYLIST_TRACKS).toHaveLength(15);

            const ids = new Set();
            const publicDir = path.resolve(process.cwd(), 'public');

            MUSIC_PLAYLIST_TRACKS.forEach(track => {
                expect(track.id).toBeTruthy();
                expect(ids.has(track.id)).toBe(false);
                ids.add(track.id);

                expect(track.artist).toBe('Kevin MacLeod');
                expect(track.license).toBe('CC-BY 4.0');
                expect(track.stages).toContain(track.stage);

                const filePath = path.join(publicDir, track.src.replace(/^\//, ''));
                expect(fs.existsSync(filePath), `Missing MP3 asset on disk: ${track.src}`).toBe(true);
            });

            ['lobby', 'question', 'battle', 'voting', 'podium'].forEach(stage => {
                expect(getTracksForStage(stage).length).toBeGreaterThanOrEqual(2);
            });
        });

        it('defines all required synth theme presets with metadata', () => {
            const expectedThemes = [
                MUSIC_THEMES.DEEP_LOFI_BASS,
                MUSIC_THEMES.MIDNIGHT_GROOVE,
                MUSIC_THEMES.DARK_DUB_AMBIENT,
                MUSIC_THEMES.DEEP_JAZZ_BASS,
                MUSIC_THEMES.OFF
            ];

            expectedThemes.forEach(theme => {
                const meta = MUSIC_THEME_METADATA[theme];
                expect(meta).toBeDefined();
                expect(meta.id).toBe(theme);
                expect(meta.name).toBeTruthy();
                expect(meta.icon).toBeTruthy();
                expect(meta.description).toBeTruthy();
            });
        });

        it('correctly maps all server game phases to corresponding music stages', () => {
            expect(mapPhaseToMusicStage('lobby')).toBe('lobby');
            expect(mapPhaseToMusicStage('generating_round')).toBe('question');
            expect(mapPhaseToMusicStage('get_ready')).toBe('question');
            expect(mapPhaseToMusicStage('question')).toBe('question');
            expect(mapPhaseToMusicStage('preparing_battles')).toBe('battle');
            expect(mapPhaseToMusicStage('battle_get_ready')).toBe('battle');
            expect(mapPhaseToMusicStage('battle_answering')).toBe('battle');
            expect(mapPhaseToMusicStage('voting_get_ready')).toBe('voting');
            expect(mapPhaseToMusicStage('battle_voting')).toBe('voting');
            expect(mapPhaseToMusicStage('battle_result_reveal')).toBe('voting');
            expect(mapPhaseToMusicStage('battle_reveal')).toBe('voting');
            expect(mapPhaseToMusicStage('results')).toBe('podium');
            expect(mapPhaseToMusicStage('unknown_phase')).toBe('lobby');
        });
    });

    describe('BackgroundMusicManager Live Soundtrack & Lifecycle', () => {
        let originalAudio;
        let createdAudioInstances;

        beforeEach(() => {
            originalAudio = globalThis.Audio;
            createdAudioInstances = [];
            globalThis.Audio = class MockAudio {
                constructor(src) {
                    this.src = src;
                    this.loop = false;
                    this.preload = 'none';
                    this.volume = 1;
                    this.paused = true;
                    createdAudioInstances.push(this);
                }
                play() {
                    this.paused = false;
                    return Promise.resolve();
                }
                pause() {
                    this.paused = true;
                }
            };

            musicManager.stop(0);
            musicManager.setTheme(MUSIC_THEMES.DEEP_LOFI_BASS);
            musicManager.setMuted(false);
            musicManager.setVolume(0.5);
        });

        afterEach(() => {
            musicManager.stop(0);
            globalThis.Audio = originalAudio;
            vi.useRealTimers();
        });

        it('prioritizes unplayed primary tracks and avoids immediate repeats', () => {
            const first = musicManager.selectTrackForStage('question', () => 0);
            expect(first.stage).toBe('question');

            musicManager.currentTrack = first;
            musicManager.playedTrackIds.add(first.id);
            musicManager.recentTrackIds = [first.id];

            const second = musicManager.selectTrackForStage('question', () => 0);
            expect(second.id).not.toBe(first.id);
            expect(second.stage).toBe('question');
        });

        it('plays across sub-phases without restarting and rotates cleanly on new round', async () => {
            await musicManager.syncGamePhase('battle_get_ready', { round: 1, fadeDuration: 0 });
            expect(musicManager.isSoundtrackPlaying).toBe(true);
            const round1TrackId = musicManager.currentTrack.id;
            expect(createdAudioInstances).toHaveLength(1);
            expect(createdAudioInstances[0].volume).toBe(0.5);

            // Moving to battle_answering stays in 'battle' stage — keeps same track
            await musicManager.syncGamePhase('battle_answering', { round: 1, fadeDuration: 0 });
            expect(createdAudioInstances).toHaveLength(1);
            expect(musicManager.currentTrack.id).toBe(round1TrackId);

            // Entering a new round rotates to another battle track
            await musicManager.syncGamePhase('battle_get_ready', { round: 2, fadeDuration: 0 });
            expect(createdAudioInstances).toHaveLength(2);
            expect(musicManager.currentTrack.id).not.toBe(round1TrackId);
        });

        it('handles autoplay rejection gracefully and resumes on resumePendingPlayback', async () => {
            let blockPlay = true;
            globalThis.Audio = class BlockingAudio {
                constructor(src) {
                    this.src = src;
                    this.volume = 1;
                    this.paused = true;
                    createdAudioInstances.push(this);
                }
                play() {
                    if (blockPlay) {
                        return Promise.reject(new Error('NotAllowedError'));
                    }
                    this.paused = false;
                    return Promise.resolve();
                }
                pause() {
                    this.paused = true;
                }
            };

            await musicManager.syncGamePhase('lobby', { fadeDuration: 0 });
            expect(musicManager.needsUserGestureUnlock).toBe(true);
            expect(musicManager.isSoundtrackPlaying).toBe(false);

            blockPlay = false;
            await musicManager.resumePendingPlayback();
            expect(musicManager.needsUserGestureUnlock).toBe(false);
            expect(musicManager.isSoundtrackPlaying).toBe(true);
        });

        it('keeps retrying on repeated resumePendingPlayback calls without recreating Audio elements or skipping tracks', async () => {
            let blockPlay = true;
            globalThis.Audio = class BlockingAudio {
                constructor(src) {
                    this.src = src;
                    this.volume = 1;
                    this.paused = true;
                    createdAudioInstances.push(this);
                }
                play() {
                    if (blockPlay) {
                        return Promise.reject(new Error('NotAllowedError'));
                    }
                    this.paused = false;
                    return Promise.resolve();
                }
                pause() {
                    this.paused = true;
                }
            };

            await musicManager.syncGamePhase('lobby', { fadeDuration: 0 });
            const initialTrackId = musicManager.currentTrack?.id;
            expect(initialTrackId).toBeTruthy();
            expect(createdAudioInstances).toHaveLength(1);
            expect(musicManager.needsUserGestureUnlock).toBe(true);

            // Simulate multiple non-activating TV remote presses while autoplay remains blocked
            await musicManager.resumePendingPlayback();
            await musicManager.resumePendingPlayback();
            expect(createdAudioInstances).toHaveLength(1);
            expect(musicManager.currentTrack?.id).toBe(initialTrackId);
            expect(musicManager.needsUserGestureUnlock).toBe(true);
            expect(musicManager.isSoundtrackPlaying).toBe(false);

            // Next activating click/OK press unlocks the same existing Audio element
            blockPlay = false;
            await musicManager.resumePendingPlayback();
            expect(createdAudioInstances).toHaveLength(1);
            expect(musicManager.currentTrack?.id).toBe(initialTrackId);
            expect(musicManager.needsUserGestureUnlock).toBe(false);
            expect(musicManager.isSoundtrackPlaying).toBe(true);
        });

        it('retries blocked audio via handleUserAudioGesture across multiple gestures and re-arms if re-locked', async () => {
            let blockPlay = true;
            let allowCtxResume = false;
            globalThis.Audio = class BlockingAudio {
                constructor(src) {
                    this.src = src;
                    this.volume = 1;
                    this.paused = true;
                    createdAudioInstances.push(this);
                }
                play() {
                    if (blockPlay) {
                        return Promise.reject(new Error('NotAllowedError'));
                    }
                    this.paused = false;
                    return Promise.resolve();
                }
                pause() {
                    this.paused = true;
                }
            };

            const origWindow = globalThis.window;
            const origCtx = soundEngine.ctx;
            const origUnlocked = soundEngine.isUnlocked;
            const origHostPreload = soundEngine.hostPreloadEnabled;

            soundEngine.ctx = null;
            soundEngine.isUnlocked = false;
            soundEngine.hostPreloadEnabled = false;
            globalThis.window = {
                AudioContext: class MockAudioContext {
                    constructor() {
                        this.state = 'suspended';
                    }
                    resume() {
                        if (allowCtxResume) {
                            this.state = 'running';
                            return Promise.resolve();
                        }
                        return Promise.reject(new Error('NotAllowedError'));
                    }
                }
            };

            try {
                await musicManager.syncGamePhase('lobby', { fadeDuration: 0 });
                expect(musicManager.needsUserGestureUnlock).toBe(true);

                // Gesture 1: Still blocked — neither soundEngine nor musicManager should mark unlocked
                handleUserAudioGesture();
                await vi.waitFor(() => {
                    expect(musicManager._resumeInFlight).toBe(false);
                });
                expect(soundEngine.isUnlocked).toBe(false);
                expect(musicManager.needsUserGestureUnlock).toBe(true);
                expect(createdAudioInstances).toHaveLength(1);

                // Gesture 2: Activating gesture (e.g. TV OK button) unlocks both cleanly
                blockPlay = false;
                allowCtxResume = true;
                handleUserAudioGesture();
                await vi.waitFor(() => {
                    expect(soundEngine.isUnlocked).toBe(true);
                    expect(musicManager.needsUserGestureUnlock).toBe(false);
                });
                expect(musicManager.isSoundtrackPlaying).toBe(true);
                expect(createdAudioInstances).toHaveLength(1);

                // Fast-path: no-op when both SFX and soundtrack are already unlocked
                const resumeSpy = vi.spyOn(musicManager, 'resumePendingPlayback');
                const unlockSpy = vi.spyOn(soundEngine, 'unlock');
                handleUserAudioGesture();
                expect(resumeSpy).not.toHaveBeenCalled();
                expect(unlockSpy).not.toHaveBeenCalled();

                // Re-locked scenario (e.g. after tab resume): next gesture retries resumePendingPlayback
                musicManager.needsUserGestureUnlock = true;
                musicManager.isSoundtrackPlaying = false;
                musicManager.audioElement.paused = true;
                handleUserAudioGesture();
                await vi.waitFor(() => {
                    expect(musicManager.needsUserGestureUnlock).toBe(false);
                });
                expect(resumeSpy).toHaveBeenCalledTimes(1);
                expect(unlockSpy).not.toHaveBeenCalled();
                expect(musicManager.isSoundtrackPlaying).toBe(true);
            } finally {
                vi.restoreAllMocks();
                soundEngine.ctx = origCtx;
                soundEngine.isUnlocked = origUnlocked;
                soundEngine.hostPreloadEnabled = origHostPreload;
                if (origWindow === undefined) {
                    delete globalThis.window;
                } else {
                    globalThis.window = origWindow;
                }
            }
        });

        it('ducks live audio volume smoothly on voiceover and restores after timeout', async () => {
            vi.useFakeTimers();

            await musicManager.syncGamePhase('voting_get_ready', { fadeDuration: 0 });
            expect(musicManager.isSoundtrackPlaying).toBe(true);
            expect(musicManager.audioElement.volume).toBe(0.5);

            musicManager.duck(1000);
            expect(musicManager.isDucked).toBe(true);
            vi.advanceTimersByTime(220);
            expect(musicManager.audioElement.volume).toBeCloseTo(0.11, 2);

            vi.advanceTimersByTime(1400);
            expect(musicManager.isDucked).toBe(false);
            expect(musicManager.audioElement.volume).toBeCloseTo(0.5, 2);
        });

        it('mutes active audio and resumes pending stage when unmuted', async () => {
            await musicManager.syncGamePhase('question', { fadeDuration: 0 });
            expect(musicManager.isSoundtrackPlaying).toBe(true);

            musicManager.setMuted(true);
            expect(musicManager.isMuted).toBe(true);
            expect(musicManager.isSoundtrackPlaying).toBe(false);
            expect(musicManager.audioElement.paused).toBe(true);

            musicManager.setMuted(false);
            await Promise.resolve();
            expect(musicManager.isMuted).toBe(false);
            expect(musicManager.isSoundtrackPlaying).toBe(true);
        });

        it('allows switching between legacy synth themes and persists valid theme', () => {
            musicManager.setTheme(MUSIC_THEMES.MIDNIGHT_GROOVE);
            expect(musicManager.getTheme()).toBe(MUSIC_THEMES.MIDNIGHT_GROOVE);

            musicManager.setTheme(MUSIC_THEMES.DARK_DUB_AMBIENT);
            expect(musicManager.getTheme()).toBe(MUSIC_THEMES.DARK_DUB_AMBIENT);

            musicManager.setTheme(MUSIC_THEMES.DEEP_JAZZ_BASS);
            expect(musicManager.getTheme()).toBe(MUSIC_THEMES.DEEP_JAZZ_BASS);

            musicManager.setTheme('invalid_disco_theme');
            expect(musicManager.getTheme()).toBe(MUSIC_THEMES.DEEP_JAZZ_BASS);
        });

        it('handles volume clamping and stops cleanly when theme is OFF', () => {
            musicManager.setVolume(1.5);
            expect(musicManager.baseVolume).toBe(1.0);

            musicManager.setVolume(-0.5);
            expect(musicManager.baseVolume).toBe(0.0);

            musicManager.setVolume(0.7);
            expect(musicManager.baseVolume).toBe(0.7);

            musicManager.setTheme(MUSIC_THEMES.OFF);
            expect(musicManager.getTheme()).toBe(MUSIC_THEMES.OFF);
            expect(musicManager.isPlaying).toBe(false);
        });
    });

    describe('Host Music Mute Socket Sync & Privacy Filtering', () => {
        let io;
        let game;

        beforeEach(() => {
            io = {
                to: vi.fn().mockReturnThis(),
                emit: vi.fn(),
            };
            Object.keys(manager.getGames()).forEach(id => manager.deleteGame(id));
            game = {
                id: 'MUSC',
                language: 'en',
                phase: 'lobby',
                hostDisplaySocketId: 'socket-tv',
                tvMode: false,
                musicMuted: false,
                players: [
                    { id: 'p1', name: 'Alice', socketId: 'socket-p1', isHost: true, score: 0 },
                    { id: 'p2', name: 'Bob', socketId: 'socket-p2', isHost: false, score: 0 }
                ],
                playerAnswers: {},
                battleSchedule: [],
                battleHistory: [],
                currentRound: 1,
                preGeneratedThemes: { en: [], uk: [] },
                playerActionCooldowns: new Map(),
            };
            manager.addGame('MUSC', game);
        });

        it('allows host display and host player to toggle musicMuted and broadcasts game state', () => {
            const tvSocket = { id: 'socket-tv', emit: vi.fn() };
            lobbyHandlers.handleSetMusicMuted(io, tvSocket, { gameId: 'MUSC', musicMuted: true });
            expect(game.musicMuted).toBe(true);
            expect(io.to).toHaveBeenCalledWith('socket-tv');
            expect(io.to).toHaveBeenCalledWith('socket-p1');
            expect(io.emit).toHaveBeenCalledWith('game-state-update', expect.objectContaining({ musicMuted: true }));

            const hostPlayerSocket = { id: 'socket-p1', emit: vi.fn() };
            lobbyHandlers.handleSetMusicMuted(io, hostPlayerSocket, { gameId: 'MUSC', musicMuted: false });
            expect(game.musicMuted).toBe(false);
        });

        it('rejects musicMuted updates from non-host players', () => {
            const guestSocket = { id: 'socket-p2', emit: vi.fn() };
            lobbyHandlers.handleSetMusicMuted(io, guestSocket, { gameId: 'MUSC', musicMuted: true });
            expect(game.musicMuted).toBe(false);
            expect(io.emit).not.toHaveBeenCalled();
        });

        it('exposes musicMuted boolean in getSanitizedGameState alongside tvMode', () => {
            game.tvMode = true;
            game.musicMuted = true;
            const hostState = getSanitizedGameState(game, { role: 'hostDisplay' });
            const playerState = getSanitizedGameState(game, { role: 'player', playerId: 'p1' });
            expect(hostState.tvMode).toBe(true);
            expect(hostState.musicMuted).toBe(true);
            expect(playerState.musicMuted).toBe(true);
        });
    });
});
