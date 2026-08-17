// game/services/wordBankEngine.js
import { FALLBACK_WORDS } from '../fallbackContent.js';
import { WORD_BANK_SIZES, USE_PRIORITIZED_WORD_BANK_ALGO } from '../../src/lib/config.js';
import { shuffleArray, tokenizeText, getChunksFromText } from '../helpers.js';

export const ESSENTIAL_CONNECTORS = {
    en: ['and', 'but', 'because', 'with', 'never', 'always', 'secretly', 'very', 'without', 'our', 'their', 'is', 'was', 'only', 'or', 'so', 'just', 'even', 'suddenly', 'if', 'this'],
    ua: ['і', 'та', 'але', 'бо', 'щоб', 'з', 'або', 'якщо', 'ніколи', 'завжди', 'дуже', 'таємно', 'просто', 'раптом', 'навіть', 'без', 'наш', 'їхній', 'це', 'було', 'треба', 'можна', 'ось', 'тільки'],
    uk: ['і', 'та', 'але', 'бо', 'щоб', 'з', 'або', 'якщо', 'ніколи', 'завжди', 'дуже', 'таємно', 'просто', 'раптом', 'навіть', 'без', 'наш', 'їхній', 'це', 'було', 'треба', 'можна', 'ось', 'тільки']
};

export const MIN_CONNECTOR_COUNT = 4;

export function collectAnswerChunks(playerAnswers = {}, answerHistory = []) {
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

export function distributeChunksToPlayers_Current(chunks, playerList, seenChunksByPlayer) {
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

export function distributeChunksToPlayers_New(chunks, playerList, seenChunksByPlayer) {
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

    distribute(currentRoundChunks);
    distribute(pastRoundChunks);

    return playerAllottedChunks;
}

export function splitPlayerChunksIntoBattleSets(playerAllottedChunks, battleSchedule) {
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

/**
 * Generates battle word banks directly in-process with maximum performance (<2ms).
 */
export function generateWordBanksDirectly({
    language = 'en',
    players = [],
    playerAnswers = {},
    answerHistory = [],
    battleSchedule = [],
    preGeneratedFallbackWords = [],
    currentRound = 1,
    playerSeenChunks = {}
}) {
    if (!battleSchedule || battleSchedule.length === 0) {
        return { battleScheduleWithBanks: [], updatedPlayerSeenChunks: playerSeenChunks };
    }

    const seenChunksByPlayer = new Map();
    Object.entries(playerSeenChunks || {}).forEach(([pid, chunks]) => {
        seenChunksByPlayer.set(pid, new Set(chunks));
    });

    const allAnswerChunks = collectAnswerChunks(playerAnswers, answerHistory);
    const competitors = players.filter(p => [...new Set(battleSchedule.flatMap(b => b.competitors))].includes(p.id));

    let playerAllottedChunks;
    if (USE_PRIORITIZED_WORD_BANK_ALGO) {
        playerAllottedChunks = distributeChunksToPlayers_New(allAnswerChunks, competitors, seenChunksByPlayer);
    } else {
        playerAllottedChunks = distributeChunksToPlayers_Current(allAnswerChunks, competitors, seenChunksByPlayer);
    }

    const playerBattleChunkSets = splitPlayerChunksIntoBattleSets(playerAllottedChunks, battleSchedule);

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

            // 🛡️ Smart Word Bank Balance Guard: Guarantee minimum essential connectors
            const langKey = (language === 'ua' || language === 'uk') ? 'ua' : 'en';
            const connectorSet = new Set((ESSENTIAL_CONNECTORS[langKey] || ESSENTIAL_CONNECTORS.en).map(w => w.toLowerCase()));
            const currentConnectors = finalWordBank.filter(tok => connectorSet.has(tok.text.toLowerCase()));
            
            if (currentConnectors.length < MIN_CONNECTOR_COUNT) {
                const missingCount = MIN_CONNECTOR_COUNT - currentConnectors.length;
                const availableConnectors = shuffleArray([...(ESSENTIAL_CONNECTORS[langKey] || ESSENTIAL_CONNECTORS.en)])
                    .filter(conn => !finalWordBank.some(tok => tok.text.toLowerCase() === conn.toLowerCase()));
                
                for (let i = 0; i < missingCount && i < availableConnectors.length; i++) {
                    finalWordBank.push({
                        text: availableConnectors[i],
                        authorId: null,
                        source: 'connector'
                    });
                }
            }

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

    return {
        battleScheduleWithBanks: battleSchedule,
        updatedPlayerSeenChunks
    };
}
