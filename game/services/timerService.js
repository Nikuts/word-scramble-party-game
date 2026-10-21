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
 * Unified phase configuration table (R1).
 * Centralizes durations, expiry callbacks, and boost eligibility.
 */
export const PHASES = {
    get_ready: {
        duration: (game) => getTimerValue(game, GET_READY_SECONDS, SLOWPOKE_GET_READY_SECONDS),
        onExpire: (io, game) => roundService.startQuestionPhase(io, game, QUESTIONS_PER_ROUND[(game.currentRound || 1) - 1]),
        boostable: false,
    },
    question: {
        duration: (game) => {
            const numQ = QUESTIONS_PER_ROUND[(game.currentRound || 1) - 1] || QUESTIONS_PER_ROUND[0];
            return numQ * getTimerValue(game, SECONDS_PER_QUESTION, SLOWPOKE_SECONDS_PER_QUESTION);
        },
        onExpire: (io, game) => roundService.expireQuestionPhase(io, game),
        boostable: true,
    },
    preparing_battles: {
        duration: () => 0,
        onExpire: () => {},
        boostable: false,
    },
    battle_get_ready: {
        duration: (game) => getTimerValue(game, BATTLE_GET_READY_SECONDS, SLOWPOKE_BATTLE_GET_READY_SECONDS),
        onExpire: (io, game) => battleService.startBattleAnsweringPhase(io, game),
        boostable: false,
    },
    battle_answering: {
        duration: (game) => {
            const isFinal = game.currentRound === QUESTIONS_PER_ROUND.length;
            const perBattle = isFinal
                ? getTimerValue(game, FINAL_BATTLE_SECONDS_PER_ANSWER, SLOWPOKE_FINAL_BATTLE_SECONDS_PER_ANSWER)
                : getTimerValue(game, SECONDS_PER_BATTLE_ANSWER, SLOWPOKE_SECONDS_PER_BATTLE_ANSWER);
            return perBattle * 2;
        },
        onExpire: (io, game) => battleService.expireBattleAnsweringPhase(io, game),
        boostable: true,
    },
    voting_get_ready: {
        duration: (game) => getTimerValue(game, VOTING_GET_READY_SECONDS, SLOWPOKE_VOTING_GET_READY_SECONDS),
        onExpire: (io, game) => battleService.startVotingPhase(io, game),
        boostable: false,
    },
    battle_voting: {
        duration: (game) => {
            const isFinal = game.currentRound === QUESTIONS_PER_ROUND.length;
            return isFinal
                ? getTimerValue(game, FINAL_BATTLE_SECONDS_PER_VOTE, SLOWPOKE_FINAL_BATTLE_SECONDS_PER_VOTE)
                : getTimerValue(game, SECONDS_PER_VOTE, SLOWPOKE_SECONDS_PER_VOTE);
        },
        onExpire: (io, game) => battleService.processVoteAndStartReveal(io, game, false),
        boostable: false,
    },
    battle_result_reveal: {
        duration: (game) => getTimerValue(game, SINGLE_BATTLE_REVEAL_SECONDS, SLOWPOKE_SINGLE_BATTLE_REVEAL_SECONDS),
        onExpire: (io, game) => battleService.advanceToNextBattleOrRound(io, game),
        boostable: false,
    }
};

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
export function startPhaseTimer(io, game, phase, duration, nextStateFn, { preserveInitialDuration = false } = {}) {
    clearPhaseTimer(game);
    const resolvedOnExpire = nextStateFn || PHASES[phase]?.onExpire;
    const isSamePhase = game.phase === phase;

    game.phase = phase;
    if (!preserveInitialDuration || !isSamePhase || !game.phaseInitialDuration) {
        game.phaseInitialDuration = duration;
    }
    game.phaseOnExpire = resolvedOnExpire;
    game.phaseEndTime = Date.now() + (duration * 1000);
    game.pausedRemainingMs = null;
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
            if (resolvedOnExpire) {
                resolvedOnExpire(io, currentGame);
            }
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
        helpers.broadcastTimerTick(io, game.id);
    }, 1000);

    // Broadcast the initial state immediately so the timer appears instantly.
    helpers.broadcastGameState(io, game.id);
    
    // Store both timer IDs on the game object for cleanup.
    game.phaseTimerId = { serverTimeout, broadcastInterval };
}


export function pauseTimer(game) {
    if (!game || !game.phaseTimerId || game.isPaused) return;
    
    game.pausedRemainingMs = game.phaseEndTime ? Math.max(0, game.phaseEndTime - Date.now()) : 0;
    clearPhaseTimer(game);
    game.isPaused = true;
    console.log(`[Game ${game.id}] Timer paused.`);
}

export function resumeTimer(io, game) {
    if (!game || !game.isPaused) return;
    
    const nextFn = game.phaseOnExpire || PHASES[game.phase]?.onExpire;
    if (!nextFn) {
        console.log(`[Game ${game.id}] No resume action for phase ${game.phase}`);
        return;
    }
    
    const remainingMs = (typeof game.pausedRemainingMs === 'number')
        ? game.pausedRemainingMs
        : Math.max(0, (game.phaseEndTime || Date.now()) - Date.now());
    const remainingSeconds = Math.max(0, Math.round(remainingMs / 1000));
    console.log(`[Game ${game.id}] Timer resumed (${remainingSeconds}s remaining).`);
    startPhaseTimer(io, game, game.phase, remainingSeconds, nextFn, { preserveInitialDuration: true });
}

export function extendPhaseTimer(io, game, extraSeconds = 30) {
    if (!game || !game.phaseEndTime || game.isPaused) return;

    const phaseSpec = PHASES[game.phase];
    if (!phaseSpec?.boostable) return;

    const currentRemaining = Math.max(0, Math.round((game.phaseEndTime - Date.now()) / 1000));
    const baseInitial = Math.max(
        180,
        game.phaseInitialDuration || 0,
        phaseSpec.duration ? phaseSpec.duration(game) : 0
    );
    const maxAllowedRemaining = baseInitial + 120;
    const newRemaining = Math.max(currentRemaining, Math.min(maxAllowedRemaining, currentRemaining + extraSeconds));
    const nextFn = game.phaseOnExpire || phaseSpec.onExpire;
    
    console.log(`[Game ${game.id}] Extended phase timer for '${game.phase}' by ${extraSeconds}s (new total: ${newRemaining}s).`);
    startPhaseTimer(io, game, game.phase, newRemaining, nextFn, { preserveInitialDuration: true });
}
