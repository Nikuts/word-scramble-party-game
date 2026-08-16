import * as helpers from '../helpers.js';
import * as timerService from './timerService.js';

export function endGame(io, game) {
    if (!game) return;
    console.log(`[Game ${game.id}] Ending game.`);
    timerService.clearPhaseTimer(game);
    game.players.sort((a, b) => (b.score || 0) - (a.score || 0));
    game.phase = 'results';
    game.phaseEndTime = null;
    helpers.playSoundOnClients(io, game, `vo_final_scores_${game.language}`);
    helpers.broadcastGameState(io, game.id);
}

export function resetGameForRestart(game) {
    if (!game) return;
    console.log(`[Game ${game.id}] Resetting for a new game.`);

    const originalPlayerCount = game.players.length;
    game.players = game.players.filter(p => p.socketId);
    if (game.players.length < originalPlayerCount) {
        console.log(`[Game ${game.id}] Removed ${originalPlayerCount - game.players.length} disconnected players on restart.`);
    }
    
    timerService.clearPhaseTimer(game);
    if (game.hostReassignmentTimerId) clearTimeout(game.hostReassignmentTimerId);
    if (game.playerReconnectionTimers) Object.values(game.playerReconnectionTimers).forEach(timerId => clearTimeout(timerId));
    if (game.inactivityTimeoutId) clearTimeout(game.inactivityTimeoutId);

    Object.assign(game, {
        phase: 'lobby',
        currentRound: 0,
        theme: '',
        sillyMode: false,
        is18PlusMode: false,
        slowpokeMode: false,
        isGeneratingThemes: false,
        geminiApiErrorCount: 0,
        answerHistory: [],
        playerAnswers: {},
        battleSchedule: [],
        finalRoundData: null,
        phaseEndTime: null,
        isPaused: false,
        usedFallbackThemes: [],
        partialAnswers: {},
        playerSeenChunks: {},
        preGeneratedFallbackWords: [],
        prefetchedRoundData: null,
        prefetchedRoundPromise: null,
        prefetchedFinalRoundPrompts: null,
        currentVotingBattleIndex: 0,
        playerReconnectionTimers: {},
        hostReassignmentTimerId: null,
        inactivityTimeoutId: null,
    });

    if (game.playerActionCooldowns) game.playerActionCooldowns.clear();
    game.players.forEach(p => p.score = 0);
    helpers.assignHostPlayer(game);
    
    return game;
}