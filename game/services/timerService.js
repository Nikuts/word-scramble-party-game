import * as manager from '../manager.js';
import * as helpers from '../helpers.js';
import * as roundService from './roundService.js';
import * as battleService from './battleService.js';
import {
    GET_READY_SECONDS,
    BATTLE_GET_READY_SECONDS,
    VOTING_GET_READY_SECONDS,
    SINGLE_BATTLE_REVEAL_SECONDS,
    AUTO_WIN_REVEAL_SECONDS,
    SECONDS_PER_QUESTION,
    SECONDS_PER_VOTE,
    FINAL_BATTLE_SECONDS_PER_VOTE,
    SLOWPOKE_GET_READY_SECONDS,
    SLOWPOKE_BATTLE_GET_READY_SECONDS,
    SLOWPOKE_VOTING_GET_READY_SECONDS,
    SLOWPOKE_SINGLE_BATTLE_REVEAL_SECONDS,
    SLOWPOKE_AUTO_WIN_REVEAL_SECONDS,
    SLOWPOKE_SECONDS_PER_QUESTION,
    SLOWPOKE_SECONDS_PER_VOTE,
    SLOWPOKE_FINAL_BATTLE_SECONDS_PER_VOTE,
    SECONDS_PER_BATTLE_ANSWER,
    FINAL_BATTLE_SECONDS_PER_ANSWER,
    SLOWPOKE_SECONDS_PER_BATTLE_ANSWER,
    SLOWPOKE_FINAL_BATTLE_SECONDS_PER_ANSWER,
    QUESTIONS_PER_ROUND
} from '../../src/lib/config.js';

export function getTimerValue(game, normalKey, slowpokeKey) {
    return game.slowpokeMode ? slowpokeKey : normalKey;
}

/**
 * A helper function to safely clear the compound timer object.
 * This is critical for preventing memory leaks from orphaned timers.
 * @param {object} game The game object.
 */
export function clearPhaseTimer(game) {
    if (game.phaseTimerId) {
        clearTimeout(game.phaseTimerId.serverTimeout);
        clearInterval(game.phaseTimerId.broadcastInterval);
        game.phaseTimerId = null;
    }
}

/**
 * Starts a timer for a specific game phase. If the timer completes, it will
 * automatically advance the game state. This implementation uses a precise server
 * timeout for logic and a robust setInterval for broadcasting updates.
 */
export function startPhaseTimer(io, game, phase, duration, nextStateFn) {
    clearPhaseTimer(game);
    game.phase = phase;
    game.phaseEndTime = Date.now() + (duration * 1000);
    game.isPaused = false;

    // The server-side logic timer. This must be a setTimeout.
    const serverTimeout = setTimeout(() => {
        try {
            const currentGame = manager.getGame(game.id);
            if (!currentGame || currentGame.phase !== phase || currentGame.isPaused) {
                return;
            }
            clearPhaseTimer(currentGame); // Clears the broadcast interval
            console.log(`[Game ${game.id}] Server timer for phase '${phase}' ended.`);
            nextStateFn(io, currentGame);
        } catch (e) {
            console.error(`Error in timer timeout for game ${game.id}, phase ${phase}:`, e);
        }
    }, duration * 1000);

    // The client-side broadcast timer.
    const broadcastInterval = setInterval(() => {
        const currentGame = manager.getGame(game.id);
        // If the game ends, the phase changes, or time runs out, stop the interval.
        if (!currentGame || currentGame.phase !== phase || Date.now() >= currentGame.phaseEndTime) {
            clearPhaseTimer(currentGame);
            return;
        }
        helpers.broadcastGameState(io, game.id);
    }, 1000);

    // Broadcast the initial state immediately so the timer appears instantly.
    helpers.broadcastGameState(io, game.id);
    
    // Store both timer IDs on the game object for cleanup.
    game.phaseTimerId = { serverTimeout, broadcastInterval };
}


export function pauseTimer(game) {
    if (!game || !game.phaseTimerId || game.isPaused) return;
    
    clearPhaseTimer(game);
    game.isPaused = true;
    console.log(`[Game ${game.id}] Timer paused.`);
}

export function resumeTimer(io, game) {
    if (!game || !game.isPaused) return;
    
    let nextFn;
    switch(game.phase) {
        case 'question': nextFn = battleService.prepareBattlePhase; break;
        case 'get_ready': nextFn = (io, g) => roundService.startQuestionPhase(io, g, QUESTIONS_PER_ROUND[g.currentRound - 1]); break;
        case 'battle_get_ready': nextFn = battleService.startBattleAnsweringPhase; break;
        case 'battle_answering': nextFn = battleService.startVotingGetReadyPhase; break;
        case 'voting_get_ready': nextFn = battleService.startVotingPhase; break;
        case 'battle_voting': nextFn = (io, g) => battleService.processVoteAndStartReveal(io, g, false); break;
        case 'battle_result_reveal': nextFn = battleService.advanceToNextBattleOrRound; break;
        default:
            console.log(`[Game ${game.id}] No resume action for phase ${game.phase}`);
            return;
    }
    
    const remainingSeconds = Math.max(0, Math.round((game.phaseEndTime - Date.now()) / 1000));
    console.log(`[Game ${game.id}] Timer resumed.`);
    startPhaseTimer(io, game, game.phase, remainingSeconds, nextFn);
}
