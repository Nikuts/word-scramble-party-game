

import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';
import path from 'path';
import { generateFinalRoundData } from '../../geminiService.js';
import { getFallbackFinalRoundPrompts } from '../fallback/index.js';
import * as helpers from '../helpers.js';
import * as timerService from './timerService.js';
import * as roundService from './roundService.js';
import { generateWordBanksDirectly, isStopwordOrConnector } from './wordBankEngine.js';

import {
    TIMEOUT_ANSWER_PLACEHOLDER,
    QUESTIONS_PER_ROUND,
    POINTS_PER_ROUND,
    VICTORY_BONUS_PER_ROUND,
    CLEAN_SWEEP_BONUS_PER_ROUND,
    FLAT_ROYALTY_PER_ROUND,
    RAINBOW_BONUS_PER_ROUND,
    BATTLE_GET_READY_SECONDS,
    VOTING_GET_READY_SECONDS,
    SECONDS_PER_VOTE,
    FINAL_BATTLE_SECONDS_PER_VOTE,
    SLOWPOKE_BATTLE_GET_READY_SECONDS,
    SLOWPOKE_VOTING_GET_READY_SECONDS,
    SLOWPOKE_SECONDS_PER_VOTE,
    SLOWPOKE_FINAL_BATTLE_SECONDS_PER_VOTE,
    SECONDS_PER_BATTLE_ANSWER,
    FINAL_BATTLE_SECONDS_PER_ANSWER,
    SLOWPOKE_SECONDS_PER_BATTLE_ANSWER,
    SLOWPOKE_FINAL_BATTLE_SECONDS_PER_ANSWER,
    getBattleRevealDurationSeconds
} from '../../shared/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workerPath = path.resolve(__dirname, '../workers/wordBankWorker.js');

function getPairKey(idA, idB) {
    return idA < idB ? `${idA}|${idB}` : `${idB}|${idA}`;
}

/**
 * Generates word banks for battles with sub-millisecond execution and worker fallback.
 * @param {object} game The game object.
 * @returns {Promise<object>} A promise that resolves with the battle schedule and updated seen chunks.
 */
export async function generateWordBanks(game) {
    try {
        const result = generateWordBanksDirectly({
            language: game.language,
            players: game.players.map(p => ({ id: p.id, name: p.name })),
            playerAnswers: game.playerAnswers,
            answerHistory: game.answerHistory,
            battleSchedule: game.battleSchedule,
            playerSeenChunks: game.playerSeenChunks,
            preGeneratedFallbackWords: game.preGeneratedFallbackWords,
            currentRound: game.currentRound,
            battleHistory: game.battleHistory || [],
            playerUsedBundles: game.playerUsedBundles || {}
        });
        return result;
    } catch (directError) {
        console.warn(`[Game ${game.id}] Direct word bank generation encountered error, falling back to worker:`, directError);
        return generateWordBanksWithWorker(game);
    }
}

/**
 * Offloads the word bank generation to a worker thread.
 * @param {object} game The game object.
 * @returns {Promise<object>} A promise that resolves with the battle schedule and updated seen chunks.
 */
export function generateWordBanksWithWorker(game) {
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
                battleHistory: game.battleHistory || [],
                playerUsedBundles: game.playerUsedBundles || {}
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


export function generateBattlePairings(playerIds, roundNumber = 1, pairHistory = null) {
    if (!playerIds || playerIds.length < 2) return [];
    const N = playerIds.length;
    if (N === 2) {
        return [[playerIds[0], playerIds[1]], [playerIds[0], playerIds[1]]];
    }

    // If pairHistory is not provided and roundNumber > 1, derive cumulative pairHistory from previous rounds
    let effectiveHistory = pairHistory;
    if (!effectiveHistory) {
        effectiveHistory = {};
        for (let r = 1; r < roundNumber; r++) {
            const prevGroups = generateBattlePairings(playerIds, r, effectiveHistory);
            prevGroups.forEach(group => {
                for (let i = 0; i < group.length; i++) {
                    for (let j = i + 1; j < group.length; j++) {
                        const key = getPairKey(group[i], group[j]);
                        effectiveHistory[key] = (effectiveHistory[key] || 0) + 1;
                    }
                }
            });
        }
    }

    // For 3 to 8 players: 2-player duos (N battles), optimizing against effectiveHistory
    if (N < 9) {
        const appearances = new Array(N).fill(0);
        const opponents = Array.from({ length: N }, () => new Set());
        const groups = Array.from({ length: N }, () => []);

        let bestGroups = null;
        let bestScore = Infinity;

        const pairCost = (idxA, idxB) => {
            const count = effectiveHistory[getPairKey(playerIds[idxA], playerIds[idxB])] || 0;
            return count * count * 100 + count * 10;
        };

        function solveDuos(groupIdx, currentScore) {
            if (currentScore >= bestScore) return;
            if (groupIdx === N) {
                for (let i = 0; i < N; i++) {
                    if (appearances[i] !== 2) return;
                }
                bestScore = currentScore;
                bestGroups = groups.map(g => [...g]);
                return;
            }

            // Pick the smallest index player who still needs a battle slot
            let pMin = -1;
            for (let i = 0; i < N; i++) {
                if (appearances[i] < 2) {
                    pMin = i;
                    break;
                }
            }
            if (pMin === -1) return;

            const minPartner = (groupIdx > 0 && groups[groupIdx - 1][0] === pMin)
                ? groups[groupIdx - 1][1] + 1
                : pMin + 1;

            const candidates = [];
            for (let p = minPartner; p < N; p++) {
                if (appearances[p] >= 2) continue;
                if (opponents[pMin].has(p)) continue;
                candidates.push({ p, cost: pairCost(pMin, p) });
            }

            // Try lowest-history pairs first
            candidates.sort((a, b) => a.cost - b.cost || a.p - b.p);

            for (const { p, cost } of candidates) {
                groups[groupIdx][0] = pMin;
                groups[groupIdx][1] = p;
                appearances[pMin]++;
                appearances[p]++;
                opponents[pMin].add(p);
                opponents[p].add(pMin);

                solveDuos(groupIdx + 1, currentScore + cost);

                appearances[pMin]--;
                appearances[p]--;
                opponents[pMin].delete(p);
                opponents[p].delete(pMin);

                if (bestScore === 0) return;
            }
        }

        solveDuos(0, 0);

        if (bestGroups) {
            return bestGroups.map(grp => grp.map(idx => playerIds[idx]));
        }
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

    // Rotate player order based on round so group assignment (quads vs trios) rotates fairly across rounds
    const roundOffset = ((roundNumber - 1) * Math.max(1, Math.floor(N / 3))) % N;
    const orderedPlayerIds = [];
    for (let i = 0; i < N; i++) {
        orderedPlayerIds.push(playerIds[(i + roundOffset) % N]);
    }

    // Solve exact partition where every player appears 2x, has distinct opponents, and minimizes repeat pairings
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

    if (!game.pairHistory) {
        game.pairHistory = {};
    }

    const playerIds = playersInRound.map(p => p.id);
    const battleGroups = generateBattlePairings(playerIds, game.currentRound || 1, game.pairHistory);

    // Record generated pairings in game.pairHistory so future rounds minimize repeat matchups
    battleGroups.forEach(group => {
        for (let i = 0; i < group.length; i++) {
            for (let j = i + 1; j < group.length; j++) {
                const key = getPairKey(group[i], group[j]);
                game.pairHistory[key] = (game.pairHistory[key] || 0) + 1;
            }
        }
    });

    helpers.shuffleArray(battleGroups);

    const shuffledPrompts = helpers.shuffleArray([...prompts]);

    game.battleSchedule = battleGroups.map((group, index) => {
        const promptData = shuffledPrompts.pop() || (isFinalRound ? { genre: 'Action', premise: `A secret agent teams up with their talking cat.` } : `Creative battle! #${index + 1}`);
        
        const formatConfig = isFinalRound
            ? {
                formatType: 'multi_line',
                genre: promptData.genre,
                premise: promptData.premise,
                lines: [
                    { id: 'title', label: 'Movie Title', placeholder: 'Build Movie Title' },
                    { id: 'tagline', label: 'Tagline', placeholder: 'Build Tagline' }
                ]
            }
            : {
                formatType: 'single_line',
                prompt: promptData,
                lines: [
                    { id: 'main', label: 'Your Answer', placeholder: 'Click words to build your answer' }
                ]
            };

        return {
            id: `b-${game.currentRound}-${index}`,
            competitors: group,
            optionOrder: helpers.shuffleArray([...group]),
            formatConfig,
            prompt: isFinalRound ? `${promptData.genre}: ${promptData.premise}` : promptData,
            genre: isFinalRound ? promptData.genre : null,
            premise: isFinalRound ? promptData.premise : null,
            promptTokens: [],
            wordBanks: {},
            answers: {},
            answerTileIds: {},
            votes: {},
        };
    });
    console.log(`[Game ${game.id}] Generated ${game.battleSchedule.length} battles for ${playerIds.length} players.`);
}

export function buildBattleTileLookup(battle, playerId) {
    const tileMap = new Map();
    (battle?.promptTokens || []).forEach((tok, idx) => {
        const isObj = typeof tok === 'object' && tok !== null;
        const id = isObj && tok.id ? tok.id : `p_${idx}`;
        const text = isObj ? tok.text : String(tok);
        tileMap.set(id, {
            id,
            text,
            authorId: null,
            source: 'prompt',
            bundleId: null
        });
    });
    (battle?.wordBanks?.[playerId] || []).forEach((tok, idx) => {
        const isObj = typeof tok === 'object' && tok !== null;
        const id = isObj && tok.id ? tok.id : `b_${idx}`;
        const text = isObj ? tok.text : String(tok);
        tileMap.set(id, {
            id,
            text,
            authorId: isObj ? (tok.authorId || null) : null,
            source: isObj ? (tok.source || 'bank') : 'bank',
            bundleId: isObj ? (tok.bundleId || null) : null
        });
    });
    return tileMap;
}

export function recordPlayerUsedBundles(game, playerId, bundleIds) {
    if (!game || !playerId || !Array.isArray(bundleIds) || bundleIds.length === 0) return;
    if (!game.playerUsedBundles) game.playerUsedBundles = {};
    const existing = new Set(game.playerUsedBundles[playerId] || []);
    bundleIds.forEach(bid => {
        if (bid) existing.add(bid);
    });
    game.playerUsedBundles[playerId] = [...existing];
}

export function resolveBattleSubmission(game, battle, playerId, submissionPayload) {
    if (!battle || !playerId || submissionPayload === undefined || submissionPayload === null) return null;

    const tileMap = buildBattleTileLookup(battle, playerId);
    const hasWordBank = (battle.wordBanks?.[playerId]?.length || 0) > 0;

    // Extract raw tileIds if present
    let rawTileIds = null;
    if (submissionPayload && typeof submissionPayload === 'object' && submissionPayload.tileIds !== undefined) {
        rawTileIds = submissionPayload.tileIds;
    } else if (Array.isArray(submissionPayload)) {
        rawTileIds = submissionPayload;
    } else if (submissionPayload && typeof submissionPayload === 'object' && Array.isArray(submissionPayload.answer)) {
        rawTileIds = submissionPayload.answer;
    } else if (
        submissionPayload &&
        typeof submissionPayload === 'object' &&
        submissionPayload.answer &&
        typeof submissionPayload.answer === 'object' &&
        (Array.isArray(submissionPayload.answer.title) || Array.isArray(submissionPayload.answer.tagline))
    ) {
        rawTileIds = submissionPayload.answer;
    }

    if (rawTileIds !== null) {
        if (Array.isArray(rawTileIds)) {
            if (rawTileIds.length === 0) return null;
            for (const tid of rawTileIds) {
                if (!tileMap.has(tid)) return null;
            }
            const tiles = rawTileIds.map(tid => tileMap.get(tid));
            const answer = helpers.formatAnswerText(tiles.map(t => t.text).join(' '));
            const usedBundles = tiles.map(t => t.bundleId).filter(Boolean);
            return { answer, tileIds: [...rawTileIds], usedBundles };
        }
        if (typeof rawTileIds === 'object') {
            const titleIds = Array.isArray(rawTileIds.title) ? rawTileIds.title : [];
            const taglineIds = Array.isArray(rawTileIds.tagline) ? rawTileIds.tagline : [];
            if (titleIds.length === 0 && taglineIds.length === 0) return null;
            for (const tid of [...titleIds, ...taglineIds]) {
                if (!tileMap.has(tid)) return null;
            }
            const titleTiles = titleIds.map(tid => tileMap.get(tid));
            const taglineTiles = taglineIds.map(tid => tileMap.get(tid));
            const answer = {
                title: helpers.formatAnswerText(titleTiles.map(t => t.text).join(' ')),
                tagline: helpers.formatAnswerText(taglineTiles.map(t => t.text).join(' '))
            };
            const usedBundles = [...titleTiles, ...taglineTiles].map(t => t.bundleId).filter(Boolean);
            return {
                answer,
                tileIds: { title: [...titleIds], tagline: [...taglineIds] },
                usedBundles
            };
        }
        return null;
    }

    // Legacy / fallback string or { title, tagline } payload
    const rawAns = (submissionPayload && typeof submissionPayload === 'object' && submissionPayload.answer !== undefined)
        ? submissionPayload.answer
        : submissionPayload;

    if (hasWordBank) {
        // Validate every word in the submitted string exists in the player's bank or prompt
        const matchWordToTile = (word) => {
            const lower = word.toLowerCase();
            for (const tile of tileMap.values()) {
                if (String(tile.text).toLowerCase() === lower) {
                    return tile;
                }
            }
            return null;
        };

        if (typeof rawAns === 'string') {
            const tokens = helpers.tokenizeText(rawAns);
            if (tokens.length === 0) return null;
            const matchedTiles = [];
            for (const tok of tokens) {
                const matched = matchWordToTile(tok);
                if (!matched) return null;
                matchedTiles.push(matched);
            }
            return {
                answer: helpers.formatAnswerText(matchedTiles.map(t => t.text).join(' ')),
                tileIds: matchedTiles.map(t => t.id),
                usedBundles: matchedTiles.map(t => t.bundleId).filter(Boolean)
            };
        } else if (rawAns && typeof rawAns === 'object' && (typeof rawAns.title === 'string' || typeof rawAns.tagline === 'string')) {
            const titleTokens = helpers.tokenizeText(rawAns.title || '');
            const taglineTokens = helpers.tokenizeText(rawAns.tagline || '');
            if (titleTokens.length === 0 && taglineTokens.length === 0) return null;
            const matchedTitle = [];
            for (const tok of titleTokens) {
                const m = matchWordToTile(tok);
                if (!m) return null;
                matchedTitle.push(m);
            }
            const matchedTagline = [];
            for (const tok of taglineTokens) {
                const m = matchWordToTile(tok);
                if (!m) return null;
                matchedTagline.push(m);
            }
            return {
                answer: {
                    title: helpers.formatAnswerText(matchedTitle.map(t => t.text).join(' ')),
                    tagline: helpers.formatAnswerText(matchedTagline.map(t => t.text).join(' '))
                },
                tileIds: {
                    title: matchedTitle.map(t => t.id),
                    tagline: matchedTagline.map(t => t.id)
                },
                usedBundles: [...matchedTitle, ...matchedTagline].map(t => t.bundleId).filter(Boolean)
            };
        }
        return null;
    }

    // Bare unit test fixture without wordBanks: accept non-empty string or { title, tagline }
    if (typeof rawAns === 'string' && rawAns.trim()) {
        return { answer: rawAns, tileIds: null, usedBundles: [] };
    }
    if (rawAns && typeof rawAns === 'object' && ((rawAns.title && String(rawAns.title).trim()) || (rawAns.tagline && String(rawAns.tagline).trim()))) {
        return { answer: { title: rawAns.title || '', tagline: rawAns.tagline || '' }, tileIds: null, usedBundles: [] };
    }
    return null;
}

export async function prepareBattlePhase(io, game) {
    if (!game || game.phase !== 'question') return;

    console.log(`[Game ${game.id}] Preparing Battle Phase.`);
    game.phase = 'preparing_battles';
    timerService.clearPhaseTimer(game);
    roundService.finalizeMissingQuestionAnswers(game);

    const isFinalRound = game.currentRound === QUESTIONS_PER_ROUND.length;
    const playersInRound = game.players.filter(p => p.id in game.playerAnswers);
    const playerIds = playersInRound.map(p => p.id);
    const battleGroups = generateBattlePairings(playerIds, game.currentRound || 1, game.pairHistory || null);
    const numBattles = battleGroups.length || game.players.length;

    let promptsForThisRound = [];
    
    if (isFinalRound) {
        if (!game.prefetchedFinalRoundPrompts && game.prefetchedFinalRoundPromise) {
            try {
                await game.prefetchedFinalRoundPromise;
            } catch (e) {
                console.warn(`[Game ${game.id}] Final round prefetch promise rejected:`, e);
            }
            game.prefetchedFinalRoundPromise = null;
        }
        if (game.prefetchedFinalRoundPrompts && game.prefetchedFinalRoundPrompts.length >= numBattles) {
            console.log(`[Game ${game.id}] ⚡ Using pre-fetched Final Round Movie Prompts!`);
            promptsForThisRound = game.prefetchedFinalRoundPrompts;
            game.prefetchedFinalRoundPrompts = null;
            game.prefetchedFinalRoundPromise = null;
        } else {
            const finalPrompts = await generateFinalRoundData(game.theme, game.language, numBattles, game.is18PlusMode);
            if (finalPrompts) {
                promptsForThisRound = finalPrompts;
            } else {
                promptsForThisRound = getFallbackFinalRoundPrompts(game.language, numBattles);
            }
        }
    } else {
        promptsForThisRound = game.preGeneratedBattlePrompts;
    }
    
    generateBattleSchedule(game, promptsForThisRound, isFinalRound);
    
    if (game.battleSchedule.length > 0) {
        try {
            console.log(`[Game ${game.id}] ⚡ Generating word banks for battle schedule...`);
            const { battleScheduleWithBanks, updatedPlayerSeenChunks } = await generateWordBanks(game);
            game.battleSchedule = battleScheduleWithBanks;
            game.playerSeenChunks = updatedPlayerSeenChunks;
            console.log(`[Game ${game.id}] Word banks generated successfully.`);
            
            helpers.playSoundOnClients(io, game, `vo_battle_incoming_${game.language}`);
            const duration = timerService.getTimerValue(game, BATTLE_GET_READY_SECONDS, SLOWPOKE_BATTLE_GET_READY_SECONDS);
            timerService.startPhaseTimer(io, game, 'battle_get_ready', duration, startBattleAnsweringPhase);

        } catch (error) {
            console.error(`[Game ${game.id}] Word bank generation failed:`, error);
            // Handle error, maybe use a simpler fallback or end the game
            io.to(game.id).emit('error-message', { key: 'wordBankGenerationFailed', defaultText: "A critical error occurred preparing the battles." });
        }
    } else {
        console.log(`[Game ${game.id}] No battles scheduled. Advancing round.`);
        roundService.startNextRound(io, game);
    }
}

export function finalizeMissingBattleAnswers(game) {
    if (!game?.battleSchedule) return;
    game.battleSchedule.forEach(battle => {
        if (!battle.answerTileIds) battle.answerTileIds = {};
        battle.competitors.forEach(cId => {
            if (!battle.answers[cId]) {
                const isFinal = !!battle.genre;
                const partial = game.partialAnswers?.[`b-${battle.id}-${cId}`];
                const resolved = partial ? resolveBattleSubmission(game, battle, cId, partial) : null;
                if (resolved) {
                    battle.answers[cId] = resolved.answer;
                    if (resolved.tileIds) {
                        battle.answerTileIds[cId] = resolved.tileIds;
                    }
                    recordPlayerUsedBundles(game, cId, resolved.usedBundles);
                } else if (isFinal) {
                    battle.answers[cId] = { title: TIMEOUT_ANSWER_PLACEHOLDER, tagline: '' };
                } else {
                    battle.answers[cId] = TIMEOUT_ANSWER_PLACEHOLDER;
                }
            }
        });
    });
}

export function expireBattleAnsweringPhase(io, game) {
    finalizeMissingBattleAnswers(game);
    startVotingGetReadyPhase(io, game);
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

    timerService.startPhaseTimer(io, game, 'battle_answering', duration, expireBattleAnsweringPhase);
}

export function startVotingGetReadyPhase(io, game) {
    if (game.phase !== 'battle_answering') return;
    finalizeMissingBattleAnswers(game);
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
    
    const competitorCount = currentBattle?.competitors?.length || 2;
    const duration = getBattleRevealDurationSeconds(competitorCount, Boolean(game.slowpokeMode), isAutoWin);
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
    battle.scoreBreakdown = {};
    battle.annotatedAnswers = {};
    battle.winnerId = null;
    battle.royalties = [];

    const compPlayers = competitors.map(cId => game.players.find(p => p.id === cId)).filter(Boolean);
    if (compPlayers.length < competitors.length) {
        console.error(`[Game ${game.id}] One or more competitors missing in battle ${battle.id}.`);
    }
    
    competitors.forEach(cId => {
        battle.pointsAwarded[cId] = 0;
        battle.scoreBreakdown[cId] = {
            votes: 0,
            votePoints: 0,
            winBonus: 0,
            sweepBonus: 0,
            rainbowBonus: 0,
            total: 0
        };
    });

    const roundIdx = Math.max(0, Math.min((game.currentRound || 1) - 1, 2));
    const battlePool = POINTS_PER_ROUND[roundIdx] || 1000;
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
        // Auto-win for the single competitor who submitted an answer:
        // Scores an average vote-share win (Math.floor(battlePool / competitors.length) + winBonus) with 0 sweepBonus
        const winnerId = answeredCompetitors[0];
        const autoWinVotePoints = Math.floor(battlePool / Math.max(1, competitors.length));
        compPoints[winnerId] = autoWinVotePoints + winBonus;
        battle.winnerId = winnerId;
        voteCounts[winnerId] = 1; // Eligible for royalties & rainbow bonus calculation
        battle.scoreBreakdown[winnerId] = {
            votes: 0,
            votePoints: autoWinVotePoints,
            winBonus: winBonus,
            sweepBonus: 0,
            rainbowBonus: 0,
            total: compPoints[winnerId]
        };
    } else if (answeredCompetitors.length === 0) {
        // No one answered - all get 0
    } else {
        // 2 or more answered: distribute fixed battlePool proportionally by vote share
        competitors.forEach(cId => {
            const vCount = voteCounts[cId] || 0;
            const vPts = totalVotes > 0 ? Math.floor((vCount / totalVotes) * battlePool) : 0;
            compPoints[cId] = vPts;
            battle.scoreBreakdown[cId].votes = vCount;
            battle.scoreBreakdown[cId].votePoints = vPts;
        });

        // Find max votes among answered competitors
        const maxVotes = Math.max(...answeredCompetitors.map(cId => voteCounts[cId]));
        const topCompetitors = answeredCompetitors.filter(cId => voteCounts[cId] === maxVotes && maxVotes > 0);

        if (topCompetitors.length === 1) {
            const winnerId = topCompetitors[0];
            battle.winnerId = winnerId;
            compPoints[winnerId] += winBonus;
            battle.scoreBreakdown[winnerId].winBonus = winBonus;
            // Clean sweep: received 100% of all votes cast when at least 2 votes were cast
            if (totalVotes >= 2 && maxVotes === totalVotes) {
                compPoints[winnerId] += sweepBonus;
                battle.scoreBreakdown[winnerId].sweepBonus = sweepBonus;
            }
        } else if (topCompetitors.length > 1) {
            // Tie among top competitors: split victory bonus with Math.floor (A7)
            const splitWin = Math.floor(winBonus / topCompetitors.length);
            topCompetitors.forEach(cId => {
                compPoints[cId] += splitWin;
                battle.scoreBreakdown[cId].winBonus = splitWin;
            });
        }
    }

    // --- Royalty & Rainbow Bonus Calculation (excluding stopwords/connectors per A5) ---
    const tokenizeAnswer = (ans) => {
        if (!ans || ans === TIMEOUT_ANSWER_PLACEHOLDER) return [];
        if (typeof ans === 'object') {
            return helpers.tokenizeText(`${ans.title || ''} ${ans.tagline || ''}`);
        }
        return helpers.tokenizeText(ans);
    };

    const processCompetitorRoyalties = (competitorId, competitorVotes) => {
        if (competitorVotes <= 0) return 0; // Only award royalties & rainbow if answer earned votes (or auto-won)

        const distinctAuthors = new Set();
        const submittedTileIds = battle.answerTileIds?.[competitorId];

        if (submittedTileIds) {
            const tileMap = buildBattleTileLookup(battle, competitorId);
            const flatIds = Array.isArray(submittedTileIds)
                ? submittedTileIds
                : [...(submittedTileIds.title || []), ...(submittedTileIds.tagline || [])];

            flatIds.forEach(tid => {
                const tile = tileMap.get(tid);
                if (!tile || !tile.authorId || tile.authorId === competitorId) return;
                if (tile.source === 'prompt' || tile.source === 'punctuation' || tile.source === 'connector') return;
                const cleanWord = String(tile.text || '').replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '').toLowerCase();
                if (!cleanWord || isStopwordOrConnector(cleanWord, game.language)) return;
                distinctAuthors.add(tile.authorId);
            });
        } else {
            const ansWords = tokenizeAnswer(battle.answers[competitorId]).map(w => w.toLowerCase());
            const bankTokens = battle.wordBanks[competitorId] || [];

            ansWords.forEach(wordText => {
                const cleanWord = wordText.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '').toLowerCase();
                if (!cleanWord) return;
                if (isStopwordOrConnector(cleanWord, game.language)) return;

                const match = bankTokens.find(bt => {
                    const text = (typeof bt === 'object' && bt !== null ? bt.text : bt).toLowerCase();
                    const authorId = typeof bt === 'object' && bt !== null ? bt.authorId : null;
                    const source = typeof bt === 'object' && bt !== null ? bt.source : null;
                    const isPunc = source === 'punctuation' || source === 'connector' || /^[^\p{L}\p{N}]+$/u.test(text);
                    return !isPunc && text === cleanWord && authorId && authorId !== competitorId;
                });
                if (match && match.authorId) {
                    distinctAuthors.add(match.authorId);
                }
            });
        }

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

    // --- Anonymous Word Highlighting Generator ---
    const annotateFromTileIds = (tileIdsList, tileMap, competitorId, authorIndexMap, nextIndexRef) => {
        if (!Array.isArray(tileIdsList) || tileIdsList.length === 0) return [];
        return tileIdsList.map(tid => {
            const tile = tileMap.get(tid);
            if (!tile) return null;
            const text = String(tile.text || '');
            const cleanWord = text.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '').toLowerCase();
            let authorIndex = -1;
            const isPuncOrPrompt = tile.source === 'prompt' || tile.source === 'punctuation' || tile.source === 'connector' || /^[^\p{L}\p{N}]+$/u.test(text);
            if (!isPuncOrPrompt && cleanWord && !isStopwordOrConnector(cleanWord, game.language) && tile.authorId && tile.authorId !== competitorId) {
                if (!authorIndexMap.has(tile.authorId)) {
                    authorIndexMap.set(tile.authorId, nextIndexRef.value++);
                }
                authorIndex = authorIndexMap.get(tile.authorId);
            }
            return { text, authorIndex };
        }).filter(Boolean);
    };

    const annotateWords = (rawText, bankTokens, competitorId) => {
        if (!rawText || rawText === TIMEOUT_ANSWER_PLACEHOLDER) return [];
        const words = String(rawText).trim().split(/\s+/).filter(Boolean);
        const authorIndexMap = new Map();
        let nextIndex = 0;

        return words.map(w => {
            const cleanWord = w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '').toLowerCase();
            let authorIndex = -1;
            if (cleanWord && !isStopwordOrConnector(cleanWord, game.language)) {
                const match = bankTokens.find(bt => {
                    const bText = (typeof bt === 'object' && bt !== null ? bt.text : bt).toLowerCase();
                    const bAuthor = typeof bt === 'object' && bt !== null ? bt.authorId : null;
                    const bSource = typeof bt === 'object' && bt !== null ? bt.source : null;
                    const isPunc = bSource === 'punctuation' || bSource === 'connector' || /^[^\p{L}\p{N}]+$/u.test(bText);
                    return !isPunc && bText === cleanWord && bAuthor && bAuthor !== competitorId;
                });
                if (match && match.authorId) {
                    if (!authorIndexMap.has(match.authorId)) {
                        authorIndexMap.set(match.authorId, nextIndex++);
                    }
                    authorIndex = authorIndexMap.get(match.authorId);
                }
            }
            return { text: w, authorIndex };
        });
    };

    competitors.forEach(cId => {
        const rainbow = processCompetitorRoyalties(cId, voteCounts[cId]);
        compPoints[cId] += rainbow;

        battle.scoreBreakdown[cId].rainbowBonus = rainbow;
        battle.scoreBreakdown[cId].total = compPoints[cId];

        const player = game.players.find(p => p.id === cId);
        if (player) {
            player.score += compPoints[cId];
        }
        battle.pointsAwarded[cId] = (battle.pointsAwarded[cId] || 0) + compPoints[cId];

        const rawAns = battle.answers[cId];
        const submittedTileIds = battle.answerTileIds?.[cId];
        if (submittedTileIds) {
            const tileMap = buildBattleTileLookup(battle, cId);
            const authorIndexMap = new Map();
            const nextIndexRef = { value: 0 };
            if (Array.isArray(submittedTileIds)) {
                battle.annotatedAnswers[cId] = {
                    isFinal: false,
                    words: annotateFromTileIds(submittedTileIds, tileMap, cId, authorIndexMap, nextIndexRef)
                };
            } else if (typeof submittedTileIds === 'object') {
                battle.annotatedAnswers[cId] = {
                    isFinal: true,
                    title: annotateFromTileIds(submittedTileIds.title || [], tileMap, cId, authorIndexMap, nextIndexRef),
                    tagline: annotateFromTileIds(submittedTileIds.tagline || [], tileMap, cId, authorIndexMap, nextIndexRef)
                };
            }
        } else {
            const bankTokens = battle.wordBanks[cId] || [];
            if (rawAns && typeof rawAns === 'object' && (rawAns.title || rawAns.tagline)) {
                battle.annotatedAnswers[cId] = {
                    isFinal: true,
                    title: annotateWords(rawAns.title, bankTokens, cId),
                    tagline: annotateWords(rawAns.tagline, bankTokens, cId)
                };
            } else if (typeof rawAns === 'string') {
                battle.annotatedAnswers[cId] = {
                    isFinal: false,
                    words: annotateWords(rawAns, bankTokens, cId)
                };
            }
        }
    });
}