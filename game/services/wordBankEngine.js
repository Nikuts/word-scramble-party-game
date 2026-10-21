// game/services/wordBankEngine.js
import { FALLBACK_WORDS } from '../fallback/index.js';
import { WORD_BANK_SIZES } from '../../src/lib/config.js';
import { shuffleArray, tokenizeText, getChunksFromText } from '../helpers.js';

export const ESSENTIAL_CONNECTORS = {
    en: ['and', 'but', 'because', 'with', 'never', 'always', 'secretly', 'very', 'without', 'our', 'their', 'is', 'was', 'only', 'or', 'so', 'just', 'even', 'suddenly', 'if', 'this'],
    ua: ['і', 'та', 'але', 'бо', 'щоб', 'з', 'або', 'якщо', 'ніколи', 'завжди', 'дуже', 'таємно', 'просто', 'раптом', 'навіть', 'без', 'наш', 'їхній', 'це', 'було', 'треба', 'можна', 'ось', 'тільки'],
    uk: ['і', 'та', 'але', 'бо', 'щоб', 'з', 'або', 'якщо', 'ніколи', 'завжди', 'дуже', 'таємно', 'просто', 'раптом', 'навіть', 'без', 'наш', 'їхній', 'це', 'було', 'треба', 'можна', 'ось', 'тільки']
};

export const STOPWORDS = {
    en: [
        ...ESSENTIAL_CONNECTORS.en,
        'i', 'a', 'an', 'the', 'to', 'in', 'on', 'at', 'of', 'for', 'by', 'as',
        'it', 'its', 'be', 'am', 'are', 'were', 'been', 'my', 'your', 'his', 'her',
        'we', 'they', 'me', 'you', 'him', 'us', 'them', 'that', 'these', 'those',
        'not', 'no', 'do', 'does', 'did', 'have', 'has', 'had'
    ],
    ua: [
        ...ESSENTIAL_CONNECTORS.ua,
        'я', 'ти', 'він', 'вона', 'воно', 'ми', 'ви', 'вони', 'мій', 'моя', 'моє', 'мої',
        'твій', 'його', 'її', 'їх', 'у', 'в', 'на', 'до', 'від', 'за', 'по', 'під', 'над',
        'про', 'при', 'не', 'ні', 'ж', 'же', 'би', 'б', 'чи', 'як', 'що', 'хто', 'де',
        'тут', 'там', 'той', 'те', 'ті', 'цей', 'ця', 'ці', 'є', 'був', 'була', 'були', 'буде'
    ],
    uk: [
        ...ESSENTIAL_CONNECTORS.uk,
        'я', 'ти', 'він', 'вона', 'воно', 'ми', 'ви', 'вони', 'мій', 'моя', 'моє', 'мої',
        'твій', 'його', 'її', 'їх', 'у', 'в', 'на', 'до', 'від', 'за', 'по', 'під', 'над',
        'про', 'при', 'не', 'ні', 'ж', 'же', 'би', 'б', 'чи', 'як', 'що', 'хто', 'де',
        'тут', 'там', 'той', 'те', 'ті', 'цей', 'ця', 'ці', 'є', 'був', 'була', 'були', 'буде'
    ]
};

const STOPWORD_SETS = {
    en: new Set(STOPWORDS.en.map(w => w.toLowerCase())),
    ua: new Set(STOPWORDS.ua.map(w => w.toLowerCase())),
    uk: new Set(STOPWORDS.uk.map(w => w.toLowerCase()))
};

export const MIN_CONNECTOR_COUNT = 4;

/** Guaranteed punctuation set provided at the end of each word bank (excluded from vocabulary limits & royalties). */
export const GUARANTEED_PUNCTUATION = ['.', ',', '!', '?', ':', '-'];

/**
 * Strips leading/trailing punctuation and validates that a token is a clean word.
 */
export function cleanWordToken(rawToken) {
    if (!rawToken || typeof rawToken !== 'string') return '';
    const cleaned = rawToken.replace(/^[.,!?;:—–"()\[\]{}-]+|[.,!?;:—–"()\[\]{}-]+$/gu, '').trim();
    if (cleaned && /^[\p{L}\p{N}'’`ʼ-]+$/u.test(cleaned)) {
        return cleaned;
    }
    return '';
}

/**
 * Extracts an array of clean words from a text string.
 */
export function extractCleanWords(text) {
    if (!text || typeof text !== 'string') return [];
    const words = [];
    tokenizeText(text).forEach(tok => {
        const cleaned = cleanWordToken(tok);
        if (cleaned) words.push(cleaned);
    });
    return words;
}

/**
 * Checks whether a word is a stopword or essential connector in the given language.
 */
export function isStopwordOrConnector(word, language = 'en') {
    const cleaned = cleanWordToken(String(word || '')).toLowerCase();
    if (!cleaned) return true;
    const langKey = (language === 'ua' || language === 'uk') ? 'ua' : 'en';
    return STOPWORD_SETS[langKey].has(cleaned);
}

/**
 * Counts distinct words (case-insensitive, punctuation stripped) in an array of tokens or strings.
 */
export function countDistinctWords(tokensOrWords = []) {
    const set = new Set();
    tokensOrWords.forEach(item => {
        if (!item) return;
        if (typeof item === 'object' && item.source === 'punctuation') return;
        const raw = typeof item === 'object' ? item.text : String(item);
        const cleaned = cleanWordToken(raw).toLowerCase();
        if (cleaned) set.add(cleaned);
    });
    return set.size;
}

/**
 * Collects clauses ("chunks") from current-round playerAnswers and earlier-round answerHistory.
 * Assigns deterministic per-author bundleIds (`${authorId}_${answerSeq}_${clauseIndex}`) so
 * bundleIds remain stable when current-round answers move into answerHistory in subsequent rounds.
 */
export function collectAnswerChunks(playerAnswers = {}, answerHistory = []) {
    const allAnswerChunks = [];
    const authorAnswerSeq = {};

    const nextSeq = (authorId) => {
        const seq = authorAnswerSeq[authorId] || 0;
        authorAnswerSeq[authorId] = seq + 1;
        return seq;
    };

    // Process answerHistory first so historical sequence numbers stay fixed across rounds
    (answerHistory || []).forEach((entry) => {
        if (entry && entry.answer && entry.answer !== '::TIMEOUT::') {
            const authorId = entry.playerId;
            const seq = nextSeq(authorId);
            getChunksFromText(entry.answer).forEach((chunkText, cIndex) => {
                const words = extractCleanWords(chunkText);
                if (words.length > 0) {
                    allAnswerChunks.push({
                        authorId,
                        chunkText,
                        words,
                        bundleId: entry.bundleIdPrefix
                            ? `${entry.bundleIdPrefix}_${cIndex}`
                            : `${authorId}_${seq}_${cIndex}`,
                        isCurrentRound: false
                    });
                }
            });
        }
    });

    // Process current-round playerAnswers next
    Object.entries(playerAnswers || {}).forEach(([playerId, pa]) => {
        pa?.questions?.forEach((q) => {
            if (q && q.answer && q.answer !== '::TIMEOUT::') {
                const seq = nextSeq(playerId);
                getChunksFromText(q.answer).forEach((chunkText, cIndex) => {
                    const words = extractCleanWords(chunkText);
                    if (words.length > 0) {
                        allAnswerChunks.push({
                            authorId: playerId,
                            chunkText,
                            words,
                            bundleId: `${playerId}_${seq}_${cIndex}`,
                            isCurrentRound: true
                        });
                    }
                });
            }
        });
    });

    return allAnswerChunks;
}

/**
 * Generates battle word banks directly in-process with the 4-tier slot-balanced algorithm:
 *  - Balances across slots (player × battle) by distinct word count.
 *  - Tier 1: New clauses (never shown to this player, not authored by this player, no fan-out across slots).
 *  - Soft target: max(minBankSize, average distinct words after Tier 1), capped at maxBankSize for top-ups.
 *    Slots exceeding softTarget/maxBankSize are never trimmed.
 *  - Tier 2: Shown-but-unused clauses from earlier rounds where the player used none of the non-connector words.
 *  - Tier 3: AI helper phrases distributed without replacement across deficit slots, skipping duplicate words.
 *  - Tier 4: Static fallback phrases distributed without replacement if Tier 3 runs out.
 *  - Essential connectors (>= 4) and guaranteed punctuation.
 *  - Marks bundleIds as seen at the very end only for clauses actually placed in a player's bank.
 */
export function generateWordBanksDirectly({
    language = 'en',
    players = [],
    playerAnswers = {},
    answerHistory = [],
    battleSchedule = [],
    preGeneratedFallbackWords = [],
    currentRound = 1,
    playerSeenChunks = {},
    battleHistory = [],
    playerUsedBundles = {}
}) {
    if (!battleSchedule || battleSchedule.length === 0) {
        return { battleScheduleWithBanks: [], updatedPlayerSeenChunks: playerSeenChunks || {} };
    }

    const langKey = (language === 'ua' || language === 'uk') ? 'ua' : 'en';
    const connectorList = ESSENTIAL_CONNECTORS[langKey] || ESSENTIAL_CONNECTORS.en;
    const connectorSet = new Set(connectorList.map(w => w.toLowerCase()));

    const bankSizeConfig = WORD_BANK_SIZES[currentRound] || WORD_BANK_SIZES[1];
    const minBankSize = bankSizeConfig.min;
    const maxBankSize = bankSizeConfig.max;

    // 1. Track initial seen bundleIds per player and overall shown frequency
    const initialSeenByPlayer = new Map();
    const shownFrequency = new Map();
    const allPlayerIds = new Set([
        ...(players || []).map(p => p.id),
        ...battleSchedule.flatMap(b => b.competitors || [])
    ]);

    allPlayerIds.forEach(pid => {
        const seenArr = playerSeenChunks?.[pid] || [];
        initialSeenByPlayer.set(pid, new Set(seenArr));
        seenArr.forEach(item => {
            shownFrequency.set(item, (shownFrequency.get(item) || 0) + 1);
        });
    });

    // 2. Track words & bundles previously used by each player in battle answers (for Tier 2 filtering)
    const usedBundlesByPlayer = new Map();
    const usedWordsByPlayer = new Map();
    allPlayerIds.forEach(pid => {
        usedBundlesByPlayer.set(pid, new Set(playerUsedBundles?.[pid] || []));
        usedWordsByPlayer.set(pid, new Set());
    });

    (battleHistory || []).forEach(battle => {
        if (!battle?.answers) return;
        Object.entries(battle.answers).forEach(([pid, ans]) => {
            if (!ans || ans === '::TIMEOUT::') return;
            if (!usedWordsByPlayer.has(pid)) usedWordsByPlayer.set(pid, new Set());
            const wordSet = usedWordsByPlayer.get(pid);
            const rawText = typeof ans === 'object'
                ? `${ans.title || ''} ${ans.tagline || ''}`
                : String(ans);
            extractCleanWords(rawText).forEach(w => {
                wordSet.add(w.toLowerCase());
            });
        });
    });

    // 3. Create one slot per (battleIndex, competitorId)
    const slots = [];
    battleSchedule.forEach((battle, battleIndex) => {
        (battle.competitors || []).forEach(playerId => {
            slots.push({
                slotId: `${battleIndex}_${playerId}`,
                battleIndex,
                playerId,
                chunks: [],
                tokens: [],
                connectorTokens: [],
                distinctWords: new Set(),
                authors: new Set()
            });
        });
    });

    const addClauseToSlot = (slot, chunk, tier) => {
        slot.chunks.push(chunk);
        if (chunk.authorId) slot.authors.add(chunk.authorId);
        chunk.words.forEach(w => {
            slot.distinctWords.add(w.toLowerCase());
            slot.tokens.push({
                text: w,
                authorId: chunk.authorId,
                source: 'answer',
                tier,
                bundleId: chunk.bundleId
            });
        });
    };

    // 4. Collect all clauses and split into current round vs past rounds
    const allAnswerChunks = collectAnswerChunks(playerAnswers, answerHistory);
    const currentRoundChunks = [];
    const pastRoundChunks = [];
    allAnswerChunks.forEach(c => {
        if (c.isCurrentRound) currentRoundChunks.push(c);
        else pastRoundChunks.push(c);
    });

    shuffleArray(currentRoundChunks);
    shuffleArray(pastRoundChunks);

    const usedBundleIdsThisRound = new Set();

    // 5. Tier 1: New clauses (not authored by player, never shown to player, no fan-out across slots)
    const tier1Pool = [...currentRoundChunks, ...pastRoundChunks];
    tier1Pool.forEach(chunk => {
        if (usedBundleIdsThisRound.has(chunk.bundleId)) return;

        const eligibleSlots = slots
            .filter(slot => {
                if (slot.playerId === chunk.authorId) return false;
                const seen = initialSeenByPlayer.get(slot.playerId);
                if (seen && (seen.has(chunk.bundleId) || seen.has(chunk.chunkText))) return false;
                return true;
            })
            .sort((a, b) => {
                // Primary: keep distinct word counts tightly balanced across all slots
                const diff = a.distinctWords.size - b.distinctWords.size;
                if (diff !== 0) return diff;

                // Secondary: prefer slot that does not yet have words from this author (Rainbow bonus support)
                const aHasAuthor = chunk.authorId && a.authors.has(chunk.authorId) ? 1 : 0;
                const bHasAuthor = chunk.authorId && b.authors.has(chunk.authorId) ? 1 : 0;
                if (aHasAuthor !== bHasAuthor) return aHasAuthor - bHasAuthor;

                return a.chunks.length - b.chunks.length;
            });

        if (eligibleSlots.length > 0) {
            const targetSlot = eligibleSlots[0];
            addClauseToSlot(targetSlot, chunk, 1);
            usedBundleIdsThisRound.add(chunk.bundleId);
        }
    });

    // 6. Compute Soft Target (in distinct words)
    const avgDistinctAfterTier1 = slots.length > 0
        ? slots.reduce((sum, s) => sum + s.distinctWords.size, 0) / slots.length
        : minBankSize;
    const softTarget = Math.min(maxBankSize, Math.max(minBankSize, Math.round(avgDistinctAfterTier1)));

    // 7. Tier 2: Shown in an earlier round, but unused by that player
    const tier2Candidates = allAnswerChunks
        .filter(chunk => !usedBundleIdsThisRound.has(chunk.bundleId))
        .sort((a, b) => {
            const freqDiff = (shownFrequency.get(a.bundleId) || 0) - (shownFrequency.get(b.bundleId) || 0);
            if (freqDiff !== 0) return freqDiff;
            return (b.isCurrentRound ? 1 : 0) - (a.isCurrentRound ? 1 : 0);
        });

    tier2Candidates.forEach(chunk => {
        if (usedBundleIdsThisRound.has(chunk.bundleId)) return;

        const nonConnectorWords = chunk.words
            .map(w => w.toLowerCase())
            .filter(w => !isStopwordOrConnector(w, language));
        const checkWords = nonConnectorWords.length > 0
            ? nonConnectorWords
            : chunk.words.map(w => w.toLowerCase());

        const eligibleSlots = slots
            .filter(slot => {
                if (slot.distinctWords.size >= softTarget) return false;
                if (slot.playerId === chunk.authorId) return false;
                const seen = initialSeenByPlayer.get(slot.playerId);
                if (!seen || (!seen.has(chunk.bundleId) && !seen.has(chunk.chunkText))) return false;

                // Exclude if player used this bundleId or any of its non-connector words
                if (usedBundlesByPlayer.get(slot.playerId)?.has(chunk.bundleId)) return false;
                const playerUsedWords = usedWordsByPlayer.get(slot.playerId);
                if (playerUsedWords && checkWords.some(w => playerUsedWords.has(w))) return false;

                // Must contribute at least 1 new distinct word to this slot
                return chunk.words.some(w => !slot.distinctWords.has(w.toLowerCase()));
            })
            .sort((a, b) => a.distinctWords.size - b.distinctWords.size);

        if (eligibleSlots.length > 0) {
            const targetSlot = eligibleSlots[0];
            addClauseToSlot(targetSlot, chunk, 2);
            usedBundleIdsThisRound.add(chunk.bundleId);
        }
    });

    // 8. Reserve Essential Connectors (>= MIN_CONNECTOR_COUNT per bank) so filler won't duplicate them
    slots.forEach(slot => {
        const existingConnectors = new Set(
            slot.tokens
                .map(t => t.text.toLowerCase())
                .filter(w => connectorSet.has(w))
        );
        if (existingConnectors.size < MIN_CONNECTOR_COUNT) {
            const needed = MIN_CONNECTOR_COUNT - existingConnectors.size;
            const availableConnectors = shuffleArray([...connectorList])
                .filter(conn => !slot.distinctWords.has(conn.toLowerCase()));

            for (let i = 0; i < needed && i < availableConnectors.length; i++) {
                const connWord = availableConnectors[i];
                slot.distinctWords.add(connWord.toLowerCase());
                slot.connectorTokens.push({
                    text: connWord,
                    authorId: null,
                    source: 'connector',
                    tier: 4,
                    bundleId: null
                });
            }
        }
    });

    // 9. Tier 3 (AI helper phrases) & Tier 4 (Static fallback phrases) — distributed without replacement
    const distributePhrasePoolWithoutReplacement = (phrases, tierNum) => {
        const queue = shuffleArray([...phrases]);
        while (queue.length > 0) {
            const deficitSlots = slots
                .filter(s => s.distinctWords.size < softTarget)
                .sort((a, b) => a.distinctWords.size - b.distinctWords.size);
            if (deficitSlots.length === 0) break;

            const phrase = queue.shift();
            const phraseWords = extractCleanWords(phrase);
            if (phraseWords.length === 0) continue;

            const targetSlot = deficitSlots.find(slot =>
                phraseWords.some(w => !slot.distinctWords.has(w.toLowerCase()))
            );
            if (!targetSlot) continue;

            phraseWords.forEach(w => {
                const lower = w.toLowerCase();
                if (!targetSlot.distinctWords.has(lower)) {
                    targetSlot.distinctWords.add(lower);
                    targetSlot.tokens.push({
                        text: w,
                        authorId: null,
                        source: 'fallback',
                        tier: tierNum,
                        bundleId: null
                    });
                }
            });
        }
    };

    if (preGeneratedFallbackWords && preGeneratedFallbackWords.length > 0) {
        distributePhrasePoolWithoutReplacement(preGeneratedFallbackWords, 3);
    }

    const staticPhrases = (FALLBACK_WORDS[langKey] || FALLBACK_WORDS.en).map(arr =>
        Array.isArray(arr) ? arr.join(' ') : String(arr)
    );
    distributePhrasePoolWithoutReplacement(staticPhrases, 4);

    // Safety floor pass: if a huge lobby exhausted the single-pass pool, top up remaining deficit slots
    // while strictly preventing duplicate filler words within any individual bank.
    slots.forEach(slot => {
        if (slot.distinctWords.size >= softTarget) return;
        const combinedPool = shuffleArray([
            ...(preGeneratedFallbackWords || []),
            ...staticPhrases,
            ...connectorList
        ]);
        for (const phrase of combinedPool) {
            if (slot.distinctWords.size >= softTarget) break;
            const phraseWords = extractCleanWords(phrase);
            phraseWords.forEach(w => {
                const lower = w.toLowerCase();
                if (!slot.distinctWords.has(lower)) {
                    slot.distinctWords.add(lower);
                    slot.tokens.push({
                        text: w,
                        authorId: null,
                        source: 'fallback',
                        tier: 4,
                        bundleId: null
                    });
                }
            });
        }
    });

    // 10. Finalize battle.promptTokens, battle.wordBanks, and mark shown bundleIds at the very end
    const slotMap = new Map(slots.map(s => [s.slotId, s]));
    const finalSeenByPlayer = new Map();
    allPlayerIds.forEach(pid => {
        finalSeenByPlayer.set(pid, new Set(playerSeenChunks?.[pid] || []));
    });

    battleSchedule.forEach((battle, battleIndex) => {
        battle.promptTokens = tokenizeText(battle.prompt).map((word, idx) => ({
            id: `p_${idx}`,
            text: word,
            authorId: null,
            source: 'prompt'
        }));
        battle.wordBanks = {};

        (battle.competitors || []).forEach(cId => {
            const slot = slotMap.get(`${battleIndex}_${cId}`);
            const vocabTokens = slot ? [...slot.tokens, ...slot.connectorTokens] : [];
            const punctuationTokens = GUARANTEED_PUNCTUATION.map(punc => ({
                text: punc,
                authorId: null,
                source: 'punctuation',
                bundleId: null
            }));

            const fullBank = [...vocabTokens, ...punctuationTokens].map((tok, idx) => ({
                ...tok,
                id: `b_${idx}`
            }));

            battle.wordBanks[cId] = fullBank;

            // Mark bundleId as seen ONLY for clauses that actually made it into the player's bank
            if (!finalSeenByPlayer.has(cId)) {
                finalSeenByPlayer.set(cId, new Set());
            }
            const seenSet = finalSeenByPlayer.get(cId);
            vocabTokens.forEach(tok => {
                if (tok.bundleId) {
                    seenSet.add(tok.bundleId);
                }
            });
        });
    });

    const updatedPlayerSeenChunks = {};
    finalSeenByPlayer.forEach((seenSet, pid) => {
        updatedPlayerSeenChunks[pid] = [...seenSet];
    });

    return {
        battleScheduleWithBanks: battleSchedule,
        updatedPlayerSeenChunks
    };
}
