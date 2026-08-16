

import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';
import path from 'path';
import { generateFinalRoundData } from '../../geminiService.js';
import * as helpers from '../helpers.js';
import * as timerService from './timerService.js';
import * as roundService from './roundService.js';

import {
    QUESTIONS_PER_ROUND,
    POINTS_PER_ROUND,
    POINTS_PER_VOTE,
    VICTORY_BONUS_PER_ROUND,
    CLEAN_SWEEP_BONUS_PER_ROUND,
    FLAT_ROYALTY_PER_ROUND,
    RAINBOW_BONUS_PER_ROUND,
    BATTLE_GET_READY_SECONDS,
    VOTING_GET_READY_SECONDS,
    SINGLE_BATTLE_REVEAL_SECONDS,
    AUTO_WIN_REVEAL_SECONDS,
    SECONDS_PER_VOTE,
    FINAL_BATTLE_SECONDS_PER_VOTE,
    SLOWPOKE_BATTLE_GET_READY_SECONDS,
    SLOWPOKE_VOTING_GET_READY_SECONDS,
    SLOWPOKE_SINGLE_BATTLE_REVEAL_SECONDS,
    SLOWPOKE_AUTO_WIN_REVEAL_SECONDS,
    SLOWPOKE_SECONDS_PER_VOTE,
    SLOWPOKE_FINAL_BATTLE_SECONDS_PER_VOTE,
    SECONDS_PER_BATTLE_ANSWER,
    FINAL_BATTLE_SECONDS_PER_ANSWER,
    SLOWPOKE_SECONDS_PER_BATTLE_ANSWER,
    SLOWPOKE_FINAL_BATTLE_SECONDS_PER_ANSWER,
} from '../../src/lib/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workerPath = path.resolve(__dirname, '../workers/wordBankWorker.js');


const TIMEOUT_ANSWER_PLACEHOLDER = '::TIMEOUT::';

/**
 * Offloads the word bank generation to a worker thread.
 * @param {object} game The game object.
 * @returns {Promise<object>} A promise that resolves with the battle schedule and updated seen chunks.
 */
function generateWordBanksWithWorker(game) {
    return new Promise((resolve, reject) => {
        const worker = new Worker(workerPath, {
            workerData: {
                language: game.language,
                players: game.players.map(p => ({ id: p.id, name: p.name })), // Pass sanitized players for logging
                playerAnswers: game.playerAnswers,
                answerHistory: game.answerHistory,
                battleSchedule: game.battleSchedule,
                playerSeenChunks: game.playerSeenChunks,
                preGeneratedFallbackWords: game.preGeneratedFallbackWords,
                currentRound: game.currentRound,
            }
        });

        worker.on('message', (result) => {
            if (result.error) {
                reject(new Error(result.error));
            } else {
                resolve({ 
                    battleScheduleWithBanks: result.battleScheduleWithBanks, 
                    updatedPlayerSeenChunks: result.updatedPlayerSeenChunks 
                });
            }
        });

        worker.on('error', reject);

        worker.on('exit', (code) => {
            if (code !== 0) {
                reject(new Error(`Worker stopped with exit code ${code}`));
            }
        });
    });
}


export function generateBattlePairings(playerIds, roundNumber = 1) {
    if (!playerIds || playerIds.length < 2) return [];
    const N = playerIds.length;
    if (N === 2) {
        return [[playerIds[0], playerIds[1]], [playerIds[0], playerIds[1]]];
    }
    
    // For 3 to 8 players: standard 2-player duos (N battles)
    if (N < 9) {
        const offset = ((roundNumber - 1) * 2) % N;
        const rotated = [];
        for (let i = 0; i < N; i++) {
            rotated.push(playerIds[(i + offset) % N]);
        }
        const pairs = [];
        for (let i = 0; i < N; i++) {
            pairs.push([rotated[i], rotated[(i + 1) % N]]);
        }
        return pairs;
    }

    // For 9 players: 6 3-player trios (3-way brawls)
    // For 10+ players: switch to 4-player quads (4-way brawls) with trios for non-multiples of 4
    const totalSlots = 2 * N;
    let numQuads = 0;
    let numTrios = 0;
    let numDuos = 0;

    if (N === 9) {
        numTrios = 6;
        numQuads = 0;
    } else {
        if (totalSlots % 4 === 0) {
            numQuads = totalSlots / 4;
            numTrios = 0;
        } else {
            // totalSlots % 4 === 2 (since 2N is always even)
            numTrios = 2;
            numQuads = (totalSlots - 6) / 4;
        }
    }

    const targetSizes = [
        ...Array(numQuads).fill(4),
        ...Array(numTrios).fill(3),
        ...Array(numDuos).fill(2)
    ];
    const totalGroups = targetSizes.length;

    // Rotate player order based on round so group assignment rotates fairly across rounds
    const roundOffset = ((roundNumber - 1) * Math.max(1, Math.floor(N / 3))) % N;
    const orderedPlayerIds = [];
    for (let i = 0; i < N; i++) {
        orderedPlayerIds.push(playerIds[(i + roundOffset) % N]);
    }

    // Solve exact partition where every player appears 2x and has distinct opponents
    function solve(groupIndex, slotIndex, appearances, opponents, groups) {
        if (groupIndex === totalGroups) {
            for (let i = 0; i < N; i++) {
                if (appearances[i] !== 2) return null;
            }
            return groups;
        }

        const currentTarget = targetSizes[groupIndex];
        if (slotIndex === currentTarget) {
            return solve(groupIndex + 1, 0, appearances, opponents, groups);
        }

        const currentGroup = groups[groupIndex];
        const minP = slotIndex > 0 
            ? currentGroup[slotIndex - 1] + 1 
            : (groupIndex > 0 && targetSizes[groupIndex] === targetSizes[groupIndex - 1] ? groups[groupIndex - 1][0] : 0);

        for (let p = minP; p < N; p++) {
            if (appearances[p] >= 2) continue;
            if (currentGroup.includes(p)) continue;

            let conflict = false;
            for (const member of currentGroup) {
                if (opponents[p].has(member)) {
                    conflict = true;
                    break;
                }
            }
            if (conflict) continue;

            currentGroup.push(p);
            appearances[p]++;
            for (const member of currentGroup) {
                if (member !== p) {
                    opponents[p].add(member);
                    opponents[member].add(p);
                }
            }

            const res = solve(groupIndex, slotIndex + 1, appearances, opponents, groups);
            if (res) return res;

            currentGroup.pop();
            appearances[p]--;
            for (const member of currentGroup) {
                opponents[p].delete(member);
                opponents[member].delete(p);
            }
        }

        return null;
    }

    const appearances = new Array(N).fill(0);
    const opponents = Array.from({ length: N }, () => new Set());
    const groups = Array.from({ length: totalGroups }, () => []);

    const solvedGroups = solve(0, 0, appearances, opponents, groups);

    if (solvedGroups) {
        return solvedGroups.map(grp => grp.map(idx => orderedPlayerIds[idx]));
    }

    // Fallback: 2-player cyclic pairs
    const pairs = [];
    for (let i = 0; i < N; i++) {
        pairs.push([playerIds[i], playerIds[(i + 1) % N]]);
    }
    return pairs;
}

export function generateBattleSchedule(game, prompts, isFinalRound = false) {
    const playersInRound = game.players.filter(p => p.id in game.playerAnswers);
    if (playersInRound.length < 2) {
        game.battleSchedule = [];
        return;
    }

    const playerIds = playersInRound.map(p => p.id);
    const battleGroups = generateBattlePairings(playerIds, game.currentRound || 1);
    helpers.shuffleArray(battleGroups);

    const shuffledPrompts = helpers.shuffleArray([...prompts]);

    game.battleSchedule = battleGroups.map((group, index) => {
        const promptData = shuffledPrompts.pop() || (isFinalRound ? { genre: 'Action', premise: `A secret agent teams up with their talking cat.` } : `Creative battle! #${index + 1}`);
        
        return {
            id: `b-${game.currentRound}-${index}`,
            competitors: group,
            prompt: isFinalRound ? `${promptData.genre}: ${promptData.premise}` : promptData,
            genre: isFinalRound ? promptData.genre : null,
            premise: isFinalRound ? promptData.premise : null,
            promptTokens: [], wordBanks: {}, answers: {}, votes: {},
        };
    });
    console.log(`[Game ${game.id}] Generated ${game.battleSchedule.length} battles for ${playerIds.length} players.`);
}

export async function prepareBattlePhase(io, game) {
    if (!game || game.phase !== 'question') return;

    console.log(`[Game ${game.id}] Preparing Battle Phase.`);
    timerService.clearPhaseTimer(game);

    const isFinalRound = game.currentRound === QUESTIONS_PER_ROUND.length;
    const playersInRound = game.players.filter(p => p.id in game.playerAnswers);
    const playerIds = playersInRound.map(p => p.id);
    const battleGroups = generateBattlePairings(playerIds, game.currentRound || 1);
    const numBattles = battleGroups.length || game.players.length;

    let promptsForThisRound = [];
    
    if (isFinalRound) {
        if (game.prefetchedFinalRoundPrompts && game.prefetchedFinalRoundPrompts.length >= numBattles) {
            console.log(`[Game ${game.id}] ⚡ Using pre-fetched Final Round Movie Prompts!`);
            promptsForThisRound = game.prefetchedFinalRoundPrompts;
            game.prefetchedFinalRoundPrompts = null;
        } else {
            const finalPrompts = await generateFinalRoundData(game.theme, game.language, numBattles, game.is18PlusMode);
            if (finalPrompts) {
                promptsForThisRound = finalPrompts;
            } else {
                promptsForThisRound = Array(numBattles).fill(null).map((_, i) => ({
                    genre: `Sci-Fi Comedy #${i + 1}`,
                    premise: "A time-traveling hamster tries to prevent the invention of the wheel."
                }));
            }
        }
    } else {
        promptsForThisRound = game.preGeneratedBattlePrompts;
    }
    
    generateBattleSchedule(game, promptsForThisRound, isFinalRound);
    
    if (game.battleSchedule.length > 0) {
        try {
            console.log(`[Game ${game.id}] Offloading word bank generation to worker...`);
            const { battleScheduleWithBanks, updatedPlayerSeenChunks } = await generateWordBanksWithWorker(game);
            game.battleSchedule = battleScheduleWithBanks;
            game.playerSeenChunks = updatedPlayerSeenChunks;
            console.log(`[Game ${game.id}] Word banks generated successfully by worker.`);
            
            helpers.playSoundOnClients(io, game, `vo_battle_incoming_${game.language}`);
            const duration = timerService.getTimerValue(game, BATTLE_GET_READY_SECONDS, SLOWPOKE_BATTLE_GET_READY_SECONDS);
            timerService.startPhaseTimer(io, game, 'battle_get_ready', duration, startBattleAnsweringPhase);

        } catch (error) {
            console.error(`[Game ${game.id}] Word bank generation worker failed:`, error);
            // Handle error, maybe use a simpler fallback or end the game
            io.to(game.id).emit('error-message', { key: 'wordBankGenerationFailed', defaultText: "A critical error occurred preparing the battles." });
        }
    } else {
        console.log(`[Game ${game.id}] No battles scheduled. Advancing round.`);
        roundService.startNextRound(io, game);
    }
}

export function startBattleAnsweringPhase(io, game) {
    const isFinalRound = game.currentRound === QUESTIONS_PER_ROUND.length;
    const battlesPerPlayer = 2;

    let timePerBattle;
    if (game.slowpokeMode) {
        timePerBattle = isFinalRound ? SLOWPOKE_FINAL_BATTLE_SECONDS_PER_ANSWER : SLOWPOKE_SECONDS_PER_BATTLE_ANSWER;
    } else {
        timePerBattle = isFinalRound ? FINAL_BATTLE_SECONDS_PER_ANSWER : SECONDS_PER_BATTLE_ANSWER;
    }

    const duration = timePerBattle * battlesPerPlayer;

    timerService.startPhaseTimer(io, game, 'battle_answering', duration, (io, g) => {
        g.battleSchedule.forEach(battle => {
            battle.competitors.forEach(cId => {
                if (!battle.answers[cId]) {
                    const isFinal = !!battle.genre;
                    const partial = g.partialAnswers?.[`b-${battle.id}-${cId}`];
                    const hasPartial = isFinal ? (partial && (partial.title.trim() || partial.tagline.trim())) : (partial && partial.trim());
                    if (isFinal) {
                        battle.answers[cId] = hasPartial ? partial : { title: TIMEOUT_ANSWER_PLACEHOLDER, tagline: '' };
                    } else {
                        battle.answers[cId] = hasPartial ? partial : TIMEOUT_ANSWER_PLACEHOLDER;
                    }
                }
            });
        });
        startVotingGetReadyPhase(io, g);
    });
}

export function startVotingGetReadyPhase(io, game) {
    if (game.phase !== 'battle_answering') return;
    game.currentVotingBattleIndex = 0; // Reset for the new round of voting.
    helpers.playSoundOnClients(io, game, `vo_voting_starts_${game.language}`);
    const duration = timerService.getTimerValue(game, VOTING_GET_READY_SECONDS, SLOWPOKE_VOTING_GET_READY_SECONDS);
    timerService.startPhaseTimer(io, game, 'voting_get_ready', duration, startVotingPhase);
}

export function startVotingPhase(io, game) {
    if (!game || (game.phase !== 'voting_get_ready' && game.phase !== 'battle_result_reveal')) return;
    
    const currentBattle = game.battleSchedule[game.currentVotingBattleIndex];
    if (currentBattle) {
        const answeredCompetitors = currentBattle.competitors.filter(cId => {
            const ans = currentBattle.answers[cId];
            return ans && ans !== TIMEOUT_ANSWER_PLACEHOLDER && (!ans.title || ans.title !== TIMEOUT_ANSWER_PLACEHOLDER);
        });

        if (answeredCompetitors.length <= 1) {
            console.log(`[Game ${game.id}] Auto-event for battle ${currentBattle.id} (${answeredCompetitors.length}/${currentBattle.competitors.length} answered). Skipping vote.`);
            processVoteAndStartReveal(io, game, true);
            return;
        }
    }

    const isFinalRound = game.currentRound === QUESTIONS_PER_ROUND.length;
    let secondsPerVote = timerService.getTimerValue(
        game, 
        isFinalRound ? FINAL_BATTLE_SECONDS_PER_VOTE : SECONDS_PER_VOTE,
        isFinalRound ? SLOWPOKE_FINAL_BATTLE_SECONDS_PER_VOTE : SLOWPOKE_SECONDS_PER_VOTE
    );

    timerService.startPhaseTimer(io, game, 'battle_voting', secondsPerVote, (io, g) => processVoteAndStartReveal(io, g, false));
}

export function processVoteAndStartReveal(io, game, isAutoWin = false) {
    if (!game) return;
    const validPhases = ['battle_voting', 'voting_get_ready', 'battle_result_reveal'];
    if (!validPhases.includes(game.phase)) return;

    timerService.clearPhaseTimer(game);

    const currentBattle = game.battleSchedule[game.currentVotingBattleIndex];
    if (currentBattle) {
        calculateBattlePoints(game, currentBattle);
    }
    
    let duration = timerService.getTimerValue(
        game,
        isAutoWin ? AUTO_WIN_REVEAL_SECONDS : SINGLE_BATTLE_REVEAL_SECONDS,
        isAutoWin ? SLOWPOKE_AUTO_WIN_REVEAL_SECONDS : SLOWPOKE_SINGLE_BATTLE_REVEAL_SECONDS
    );
    timerService.startPhaseTimer(io, game, 'battle_result_reveal', duration, advanceToNextBattleOrRound);
}

export function advanceToNextBattleOrRound(io, game) {
    if (!game || game.phase !== 'battle_result_reveal') return;

    game.currentVotingBattleIndex++;

    if (game.currentVotingBattleIndex < game.battleSchedule.length) {
        startVotingPhase(io, game);
    } else {
        roundService.startNextRound(io, game);
    }
}

export function calculateBattlePoints(game, battle) {
    if (!battle || battle.pointsAwarded) return;

    const competitors = battle.competitors || [];
    battle.pointsAwarded = {};
    battle.winnerId = null;
    battle.royalties = [];

    const compPlayers = competitors.map(cId => game.players.find(p => p.id === cId)).filter(Boolean);
    if (compPlayers.length < competitors.length) {
        console.error(`[Game ${game.id}] One or more competitors missing in battle ${battle.id}.`);
    }
    
    competitors.forEach(cId => {
        battle.pointsAwarded[cId] = 0;
    });

    const roundIdx = Math.max(0, Math.min((game.currentRound || 1) - 1, 2));
    const ptsPerVote = POINTS_PER_VOTE[roundIdx] || 300;
    const winBonus = VICTORY_BONUS_PER_ROUND[roundIdx] || 200;
    const sweepBonus = CLEAN_SWEEP_BONUS_PER_ROUND[roundIdx] || 150;
    const flatRoyalty = FLAT_ROYALTY_PER_ROUND[roundIdx] || 50;
    const rainbowBonus = RAINBOW_BONUS_PER_ROUND[roundIdx] || 100;

    const answeredCompetitors = [];
    const voteCounts = {};
    competitors.forEach(cId => {
        voteCounts[cId] = 0;
        const ans = battle.answers[cId];
        const hasAnswer = ans && ans !== TIMEOUT_ANSWER_PLACEHOLDER && (!ans.title || ans.title !== TIMEOUT_ANSWER_PLACEHOLDER);
        if (hasAnswer) {
            answeredCompetitors.push(cId);
        }
    });

    Object.values(battle.votes || {}).forEach(vId => {
        if (vId in voteCounts) {
            voteCounts[vId]++;
        }
    });

    const totalVotes = Object.values(voteCounts).reduce((sum, v) => sum + v, 0);
    const compPoints = {};
    competitors.forEach(cId => {
        compPoints[cId] = 0;
    });

    if (answeredCompetitors.length === 1) {
        // Auto-win for the single competitor who submitted an answer
        const winnerId = answeredCompetitors[0];
        compPoints[winnerId] = (ptsPerVote * 2) + winBonus + sweepBonus;
        battle.winnerId = winnerId;
        voteCounts[winnerId] = 2; // Treat as voted for royalties calculation
    } else if (answeredCompetitors.length === 0) {
        // No one answered - all get 0
    } else {
        // 2 or more answered
        competitors.forEach(cId => {
            compPoints[cId] = voteCounts[cId] * ptsPerVote;
        });

        // Find max votes among answered competitors
        const maxVotes = Math.max(...answeredCompetitors.map(cId => voteCounts[cId]));
        const topCompetitors = answeredCompetitors.filter(cId => voteCounts[cId] === maxVotes && maxVotes > 0);

        if (topCompetitors.length === 1) {
            const winnerId = topCompetitors[0];
            battle.winnerId = winnerId;
            compPoints[winnerId] += winBonus;
            // Clean sweep: received 100% of all votes cast
            if (totalVotes > 0 && maxVotes === totalVotes) {
                compPoints[winnerId] += sweepBonus;
            }
        } else if (topCompetitors.length > 1) {
            // Tie among top competitors: split victory bonus evenly
            const splitWin = Math.round(winBonus / topCompetitors.length);
            topCompetitors.forEach(cId => {
                compPoints[cId] += splitWin;
            });
        }
    }

    // --- Royalty & Rainbow Bonus Calculation ---
    const tokenizeAnswer = (ans) => {
        if (!ans || ans === TIMEOUT_ANSWER_PLACEHOLDER) return [];
        if (typeof ans === 'object') {
            return helpers.tokenizeText(`${ans.title || ''} ${ans.tagline || ''}`);
        }
        return helpers.tokenizeText(ans);
    };

    const processCompetitorRoyalties = (competitorId, competitorVotes) => {
        if (competitorVotes <= 0) return 0; // Only award royalties & rainbow if answer earned votes

        const ansWords = tokenizeAnswer(battle.answers[competitorId]).map(w => w.toLowerCase());
        const bankTokens = battle.wordBanks[competitorId] || [];
        const distinctAuthors = new Set();

        ansWords.forEach(wordText => {
            const match = bankTokens.find(bt => {
                const text = (typeof bt === 'object' && bt !== null ? bt.text : bt).toLowerCase();
                const authorId = typeof bt === 'object' && bt !== null ? bt.authorId : null;
                return text === wordText && authorId && authorId !== competitorId;
            });
            if (match && match.authorId) {
                distinctAuthors.add(match.authorId);
            }
        });

        // Award flat royalty to each contributing author
        distinctAuthors.forEach(authorId => {
            const author = game.players.find(p => p.id === authorId);
            if (author) {
                author.score += flatRoyalty;
                battle.pointsAwarded[authorId] = (battle.pointsAwarded[authorId] || 0) + flatRoyalty;
                battle.royalties.push({
                    authorId,
                    authorName: author.name,
                    usedBy: competitorId,
                    points: flatRoyalty
                });
            }
        });

        // Rainbow Bonus if 3+ distinct other players' words were harmonized
        if (distinctAuthors.size >= 3) {
            return rainbowBonus;
        }
        return 0;
    };

    competitors.forEach(cId => {
        const rainbow = processCompetitorRoyalties(cId, voteCounts[cId]);
        compPoints[cId] += rainbow;

        const player = game.players.find(p => p.id === cId);
        if (player) {
            player.score += compPoints[cId];
        }
        battle.pointsAwarded[cId] = (battle.pointsAwarded[cId] || 0) + compPoints[cId];
    });
}