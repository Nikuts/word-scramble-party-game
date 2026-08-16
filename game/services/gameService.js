import * as helpers from '../helpers.js';
import * as timerService from './timerService.js';

export function calculateGameSuperlatives(game) {
    const allBattles = [...(game.battleHistory || []), ...(game.battleSchedule || [])];
    if (allBattles.length === 0 || !game.players || game.players.length === 0) return {};

    const royaltiesByPlayer = {};
    const rainbowCountsByPlayer = {};
    const sweepCountsByPlayer = {};
    let shortestWin = null;
    let longestWin = null;

    game.players.forEach(p => {
        royaltiesByPlayer[p.id] = 0;
        rainbowCountsByPlayer[p.id] = 0;
        sweepCountsByPlayer[p.id] = 0;
    });

    allBattles.forEach(battle => {
        // Royalties
        if (Array.isArray(battle.royalties)) {
            battle.royalties.forEach(r => {
                if (r.authorId && r.authorId in royaltiesByPlayer) {
                    royaltiesByPlayer[r.authorId] += (r.royalty || 0);
                }
            });
        }

        // Score breakdowns for rainbow and sweeps
        if (battle.scoreBreakdown) {
            Object.entries(battle.scoreBreakdown).forEach(([cId, breakdown]) => {
                if (breakdown.rainbowBonus > 0 && cId in rainbowCountsByPlayer) {
                    rainbowCountsByPlayer[cId]++;
                }
                if (breakdown.sweepBonus > 0 && cId in sweepCountsByPlayer) {
                    sweepCountsByPlayer[cId]++;
                }
            });
        }

        // Winning answer length
        if (battle.winnerId && battle.answers?.[battle.winnerId]) {
            const rawAns = battle.answers[battle.winnerId];
            let ansText = '';
            if (typeof rawAns === 'string' && rawAns !== '::TIMEOUT::') {
                ansText = rawAns;
            } else if (typeof rawAns === 'object' && rawAns !== null) {
                ansText = `${rawAns.title || ''} ${rawAns.tagline || ''}`.trim();
            }

            const wordTokens = helpers.tokenizeText(ansText);
            if (wordTokens.length > 0) {
                const count = wordTokens.length;
                if (!shortestWin || count < shortestWin.count) {
                    shortestWin = { playerId: battle.winnerId, count, snippet: ansText };
                }
                if (!longestWin || count > longestWin.count) {
                    longestWin = { playerId: battle.winnerId, count, snippet: ansText };
                }
            }
        }
    });

    const getTopPlayer = (statsMap) => {
        let topId = null;
        let topVal = 0;
        Object.entries(statsMap).forEach(([pid, val]) => {
            if (val > topVal) {
                topVal = val;
                topId = pid;
            }
        });
        return topVal > 0 ? { playerId: topId, value: topVal } : null;
    };

    const superlatives = {};

    const topAmmo = getTopPlayer(royaltiesByPlayer);
    if (topAmmo) superlatives.ammoFactory = topAmmo;

    const topRainbow = getTopPlayer(rainbowCountsByPlayer);
    if (topRainbow) superlatives.rainbowAlchemist = topRainbow;

    const topSweep = getTopPlayer(sweepCountsByPlayer);
    if (topSweep) superlatives.cleanSweeper = topSweep;

    if (shortestWin) superlatives.minimalist = shortestWin;
    if (longestWin) superlatives.shakespeare = longestWin;

    return superlatives;
}

export function endGame(io, game) {
    if (!game) return;
    console.log(`[Game ${game.id}] Ending game.`);
    timerService.clearPhaseTimer(game);
    game.players.sort((a, b) => (b.score || 0) - (a.score || 0));
    game.superlatives = calculateGameSuperlatives(game);
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