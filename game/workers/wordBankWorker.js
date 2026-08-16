// game/workers/wordBankWorker.js
import { workerData, parentPort } from 'worker_threads';
import { FALLBACK_WORDS } from '../fallbackContent.js';
import { WORD_BANK_SIZES, USE_PRIORITIZED_WORD_BANK_ALGO } from '../../src/lib/config.js';

// --- Start of helper functions duplicated from game/helpers.js ---
// Duplicating these avoids complex module resolution issues in worker threads.

function shuffleArray(array) {
  let currentIndex = array.length, randomIndex;
  while (currentIndex > 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

function tokenizeText(text) {
    if (!text) return [];
    const tokenizerRegex = /[\p{L}\p{N}'’`-]+|_{3,}|[.,!?;:()"]/gu;
    return text.match(tokenizerRegex) || [];
}

function getChunksFromText(text) {
    if (!text) return [];
    const preliminaryChunks = text.split(/(?<=[.!?,;:—–\n])\s+/);
    
    const finalChunks = [];
    preliminaryChunks.forEach(chunk => {
        const trimmedChunk = chunk.trim();
        if (!trimmedChunk) return;

        const subParts = trimmedChunk.split(/\s+(?=(?:because|although|however|when|while|бо|тому що|якщо|коли|хоча|але)\b)/i);

        subParts.forEach(part => {
            const cleanChunk = part.replace(/^[.,!?;:—–-]+\s*|\s*[.,!?;:—–-]+$/g, '').trim();
            if (!cleanChunk) return;

            const words = cleanChunk.split(/\s+/).filter(w => w.length > 0);
            if (words.length > 8) {
                const CHUNK_SIZE = 5;
                for (let i = 0; i < words.length; i += CHUNK_SIZE) {
                    const subChunk = words.slice(i, i + CHUNK_SIZE).join(' ');
                    if (subChunk.trim().length > 0) {
                        finalChunks.push(subChunk.trim());
                    }
                }
            } else {
                finalChunks.push(cleanChunk);
            }
        });
    });

    return finalChunks.filter(c => c.length > 0);
}

// --- End of duplicated helper functions ---

function _collectAnswerChunks(playerAnswers, answerHistory) {
    const allAnswerChunks = [];
    Object.entries(playerAnswers).forEach(([playerId, pa]) => {
        pa.questions?.forEach((q, qIndex) => {
            if (q.answer && q.answer !== '::TIMEOUT::') {
                getChunksFromText(q.answer).forEach((chunkText, cIndex) => {
                    allAnswerChunks.push({
                        authorId: playerId,
                        chunkText,
                        bundleId: `${playerId}_cur_${qIndex}_${cIndex}`,
                        isCurrentRound: true
                    });
                });
            }
        });
    });
    answerHistory.forEach((entry, eIndex) => {
        if (entry.answer && entry.answer !== '::TIMEOUT::') {
            getChunksFromText(entry.answer).forEach((chunkText, cIndex) => {
                allAnswerChunks.push({
                    authorId: entry.playerId,
                    chunkText,
                    bundleId: `${entry.playerId}_hist_${eIndex}_${cIndex}`,
                    isCurrentRound: false
                });
            });
        }
    });
    return allAnswerChunks;
}

/**
 * Distributes chunks to players strictly prioritizing opponents (0% self-authored words).
 * Entire clause bundles are kept together and assigned to opponents.
 */
function _distributeChunksToPlayers_Current(chunks, playerList, seenChunksByPlayer) {
    const playerWordCounts = {};
    const playerAllottedChunks = {};
    const competitors = playerList.map(p => p.id);

    competitors.forEach(id => {
        playerWordCounts[id] = 0;
        playerAllottedChunks[id] = [];
        if (!seenChunksByPlayer.has(id)) seenChunksByPlayer.set(id, new Set());
    });
    
    const currentRoundChunks = [];
    const pastRoundChunks = [];
    chunks.forEach(c => c.isCurrentRound ? currentRoundChunks.push(c) : pastRoundChunks.push(c));
    
    shuffleArray(currentRoundChunks);
    shuffleArray(pastRoundChunks);
    
    const shuffledChunks = [...currentRoundChunks, ...pastRoundChunks]
        .map(c => ({ ...c, wordCount: tokenizeText(c.chunkText).length }));

    shuffledChunks.forEach(chunk => {
        // STRICT RULE: Player NEVER gets their own authored words (id !== chunk.authorId)
        const potentialRecipients = competitors
            .filter(id => id !== chunk.authorId && !seenChunksByPlayer.get(id).has(chunk.chunkText))
            .sort((a, b) => playerWordCounts[a] - playerWordCounts[b]);
        
        if (potentialRecipients.length > 0) {
            const targetPlayerId = potentialRecipients[0];
            playerAllottedChunks[targetPlayerId].push({
                chunkText: chunk.chunkText,
                authorId: chunk.authorId,
                bundleId: chunk.bundleId,
                isCurrentRound: chunk.isCurrentRound
            });
            playerWordCounts[targetPlayerId] += chunk.wordCount;
            seenChunksByPlayer.get(targetPlayerId).add(chunk.chunkText);
        }
    });
    return playerAllottedChunks;
}

/**
 * The prioritized algorithm. It distributes all current round clause bundles first,
 * then distributes clause bundles from past rounds.
 * STRICT RULE: 0% self-authored words.
 */
function _distributeChunksToPlayers_New(chunks, playerList, seenChunksByPlayer) {
    const playerWordCounts = {};
    const playerAllottedChunks = {};
    const competitors = playerList.map(p => p.id);

    competitors.forEach(id => {
        playerWordCounts[id] = 0;
        playerAllottedChunks[id] = [];
        if (!seenChunksByPlayer.has(id)) seenChunksByPlayer.set(id, new Set());
    });

    const currentRoundChunks = [];
    const pastRoundChunks = [];
    chunks.forEach(c => {
        const chunkWithCount = { ...c, wordCount: tokenizeText(c.chunkText).length };
        c.isCurrentRound ? currentRoundChunks.push(chunkWithCount) : pastRoundChunks.push(chunkWithCount);
    });

    shuffleArray(currentRoundChunks);
    shuffleArray(pastRoundChunks);

    const distribute = (chunkList) => {
        chunkList.forEach(chunk => {
            // STRICT RULE: Player NEVER gets their own words (id !== chunk.authorId)
            const potentialRecipients = competitors
                .filter(id => id !== chunk.authorId && !seenChunksByPlayer.get(id).has(chunk.chunkText))
                .sort((a, b) => playerWordCounts[a] - playerWordCounts[b]);
            
            if (potentialRecipients.length > 0) {
                const targetPlayerId = potentialRecipients[0];
                playerAllottedChunks[targetPlayerId].push({
                    chunkText: chunk.chunkText,
                    authorId: chunk.authorId,
                    bundleId: chunk.bundleId,
                    isCurrentRound: chunk.isCurrentRound
                });
                playerWordCounts[targetPlayerId] += chunk.wordCount;
                seenChunksByPlayer.get(targetPlayerId).add(chunk.chunkText);
            }
        });
    };

    console.log(`[WordBankWorker] NEW ALGO: Distributing ${currentRoundChunks.length} clause bundles from current round...`);
    distribute(currentRoundChunks);
    console.log(`[WordBankWorker] NEW ALGO: Distributing ${pastRoundChunks.length} clause bundles from past rounds...`);
    distribute(pastRoundChunks);

    return playerAllottedChunks;
}


function _splitPlayerChunksIntoBattleSets(playerAllottedChunks, battleSchedule) {
    const playerBattleCount = {};
    Object.keys(playerAllottedChunks).forEach(id => playerBattleCount[id] = 0);
    battleSchedule.forEach(battle => battle.competitors.forEach(id => { if (id in playerBattleCount) playerBattleCount[id]++; }));

    const playerBattleChunkSets = {};
    
    Object.keys(playerAllottedChunks).forEach(playerId => {
        const chunks = shuffleArray([...playerAllottedChunks[playerId]]);
        const numBattles = playerBattleCount[playerId] || 1;
        const sets = Array.from({ length: numBattles }, () => []);
        
        chunks.forEach((chunk, index) => {
            sets[index % numBattles].push(chunk);
        });
        playerBattleChunkSets[playerId] = sets;
    });

    return playerBattleChunkSets;
}


try {
    const { language, players, playerAnswers, answerHistory, battleSchedule, preGeneratedFallbackWords, currentRound, playerSeenChunks } = workerData;
    
    if (!battleSchedule || battleSchedule.length === 0) {
        parentPort.postMessage({ battleScheduleWithBanks: [], updatedPlayerSeenChunks: playerSeenChunks });
    } else {
        const seenChunksByPlayer = new Map();
        Object.entries(playerSeenChunks).forEach(([pid, chunks]) => {
            seenChunksByPlayer.set(pid, new Set(chunks));
        });

        const allAnswerChunks = _collectAnswerChunks(playerAnswers, answerHistory);
        const competitors = players.filter(p => [...new Set(battleSchedule.flatMap(b => b.competitors))].includes(p.id));

        let playerAllottedChunks;
        if (USE_PRIORITIZED_WORD_BANK_ALGO) {
             console.log("[WordBankWorker] Using NEW prioritized algorithm.");
             playerAllottedChunks = _distributeChunksToPlayers_New(allAnswerChunks, competitors, seenChunksByPlayer);
        } else {
             console.log("[WordBankWorker] Using CURRENT algorithm.");
             playerAllottedChunks = _distributeChunksToPlayers_Current(allAnswerChunks, competitors, seenChunksByPlayer);
        }

        const playerBattleChunkSets = _splitPlayerChunksIntoBattleSets(playerAllottedChunks, battleSchedule);

        battleSchedule.forEach(battle => {
            battle.promptTokens = tokenizeText(battle.prompt).map(word => ({ text: word, authorId: null, source: 'prompt' }));
            battle.wordBanks = {};

            const bankSizeConfig = WORD_BANK_SIZES[currentRound] || WORD_BANK_SIZES[1];
            const minBankSize = bankSizeConfig.min;
            const maxBankSize = bankSizeConfig.max;

            battle.competitors.forEach(c_id => {
                const chunkSet = playerBattleChunkSets[c_id]?.shift() || [];
                let finalWordBank = [];

                chunkSet.forEach(chunk => {
                    const chunkText = typeof chunk === 'string' ? chunk : chunk.chunkText;
                    const authorId = typeof chunk === 'object' && chunk !== null ? chunk.authorId : null;
                    const words = tokenizeText(chunkText);
                    words.forEach(tok => {
                        finalWordBank.push({
                            text: tok,
                            authorId: authorId,
                            source: 'answer'
                        });
                    });
                });

                if (finalWordBank.length < minBankSize) {
                    let fallbackPhrases = [];
                    if (preGeneratedFallbackWords && preGeneratedFallbackWords.length > 0) {
                        fallbackPhrases = [...preGeneratedFallbackWords];
                    } else {
                        fallbackPhrases = (FALLBACK_WORDS[language] || FALLBACK_WORDS.en).map(arr => arr.join(' '));
                    }
                
                    shuffleArray(fallbackPhrases);
                
                    for (const phrase of fallbackPhrases) {
                        if (finalWordBank.length >= minBankSize) break;
                        const wordsInPhrase = tokenizeText(phrase);
                        wordsInPhrase.forEach(tok => {
                            finalWordBank.push({
                                text: tok,
                                authorId: null,
                                source: 'fallback'
                            });
                        });
                    }
                }

                battle.wordBanks[c_id] = finalWordBank.slice(0, maxBankSize);
            });
        });

        const updatedPlayerSeenChunks = {};
        seenChunksByPlayer.forEach((seenSet, pid) => {
            updatedPlayerSeenChunks[pid] = [...seenSet];
        });

        parentPort.postMessage({ battleScheduleWithBanks: battleSchedule, updatedPlayerSeenChunks });
    }
} catch (error) {
    parentPort.postMessage({ error: error.message, stack: error.stack });
}