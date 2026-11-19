import { generateRoundData, generateFinalRoundData } from '../../geminiService.js';
import * as helpers from '../helpers.js';
import * as manager from '../manager.js';
import * as timerService from './timerService.js';
import * as gameService from './gameService.js';
import { FALLBACK_CONTENT, FALLBACK_WORDS } from '../fallback/index.js';
import {
    QUESTIONS_PER_ROUND,
    GET_READY_SECONDS,
    SECONDS_PER_QUESTION,
    SLOWPOKE_GET_READY_SECONDS,
    SLOWPOKE_SECONDS_PER_QUESTION
} from '../../src/lib/config.js';

export function getFallbackRoundData(language, usedThemes = []) {
    const fallbackSet = FALLBACK_CONTENT[language] || FALLBACK_CONTENT.en;
    const availablePacks = fallbackSet.filter(pack => !usedThemes.includes(pack.theme));
    const themeSetToUse = availablePacks.length > 0 ? availablePacks : fallbackSet;
    
    const randomThemePack = themeSetToUse[Math.floor(Math.random() * themeSetToUse.length)];
    
    const playerQuestions = helpers.shuffleArray([...randomThemePack.playerQuestions]);
    const battlePrompts = helpers.shuffleArray([...randomThemePack.battlePrompts]);
    const fallbackWords = (FALLBACK_WORDS[language] || FALLBACK_WORDS.en)
        .map(arr => Array.isArray(arr) ? arr.join(' ') : String(arr));

    return {
        theme: randomThemePack.theme,
        playerQuestions, battlePrompts, fallbackWords,
    };
}

export function prefetchNextRoundData(game) {
    if (!game) return;
    const nextRoundIndex = (game.currentRound || 0) + 1;
    if (nextRoundIndex > QUESTIONS_PER_ROUND.length) return;
    if (game.prefetchedRoundData && game.prefetchedRoundData.roundIndex === nextRoundIndex) return;
    if (game.geminiApiErrorCount >= 3) return;

    const numQuestionsPerPlayer = QUESTIONS_PER_ROUND[nextRoundIndex - 1];
    const numPlayers = game.players.length;
    if (numPlayers === 0) return;

    const expectedInstanceId = game.gameInstanceId || 1;
    const expectedTheme = game.theme;

    console.log(`[Game ${game.id}] 🚀 Background prefetching data for Round ${nextRoundIndex}...`);
    const recentAvoidPrompts = [
        ...(game.usedQuestions || []).slice(-15),
        ...(game.usedBattlePrompts || []).slice(-12),
        ...(game.preGeneratedBattlePrompts || []).slice(-12)
    ];

    const roundPromise = (async () => {
        try {
            const data = await generateRoundData(
                expectedTheme,
                game.language,
                numPlayers,
                numQuestionsPerPlayer,
                game.sillyMode,
                game.is18PlusMode,
                recentAvoidPrompts
            );
            if (data && (game.gameInstanceId || 1) === expectedInstanceId && game.phase !== 'lobby' && game.theme === expectedTheme) {
                game.prefetchedRoundData = { roundIndex: nextRoundIndex, gameInstanceId: expectedInstanceId, data };
                console.log(`[Game ${game.id}] ✅ Pre-fetch completed for Round ${nextRoundIndex}`);
                return data;
            }
        } catch (err) {
            console.warn(`[Game ${game.id}] Background prefetch failed for Round ${nextRoundIndex}:`, err);
        } finally {
            if (game.prefetchedRoundPromise === roundPromise) {
                game.prefetchedRoundPromise = null;
            }
        }
        return null;
    })();
    game.prefetchedRoundPromise = roundPromise;

    // If next round is final round, also prefetch final round movie battle prompts in background!
    if (nextRoundIndex === QUESTIONS_PER_ROUND.length && !game.prefetchedFinalRoundPrompts && !game.prefetchedFinalRoundPromise) {
        const finalPromise = (async () => {
            try {
                const { generateBattlePairings } = await import('./battleService.js');
                const battleGroups = generateBattlePairings(
                    game.players.map(p => p.id),
                    nextRoundIndex,
                    game.pairHistory || null
                );
                const numFinalPromptsNeeded = battleGroups.length || numPlayers;
                const finalPrompts = await generateFinalRoundData(expectedTheme, game.language, numFinalPromptsNeeded, game.is18PlusMode);
                if (finalPrompts && (game.gameInstanceId || 1) === expectedInstanceId && game.phase !== 'lobby' && game.theme === expectedTheme) {
                    game.prefetchedFinalRoundPrompts = finalPrompts;
                    console.log(`[Game ${game.id}] ✅ Pre-fetch completed for Final Round Movie Prompts`);
                    return finalPrompts;
                }
            } catch (err) {
                console.warn(`[Game ${game.id}] Background prefetch for Final Round Movie Prompts failed:`, err);
            } finally {
                if (game.prefetchedFinalRoundPromise === finalPromise) {
                    game.prefetchedFinalRoundPromise = null;
                }
            }
            return null;
        })();
        game.prefetchedFinalRoundPromise = finalPromise;
    }
}

export async function startNextRound(io, game) {
    if (!game) return;
    const expectedInstanceId = game.gameInstanceId || 1;
    
    timerService.clearPhaseTimer(game);
    
    // Archive previous round answers and battles
    if (game.currentRound > 0) {
        if (game.playerAnswers) {
            for (const playerId in game.playerAnswers) {
                game.playerAnswers[playerId].questions?.forEach(q => {
                    if(q.answer) game.answerHistory.push({ round: game.currentRound, playerId, answer: q.answer });
                });
            }
        }
        if (game.battleSchedule?.length > 0) {
            game.battleHistory.push(...game.battleSchedule);
            game.battleSchedule = [];
        }
    }

    game.currentRound++;
    console.log(`[Game ${game.id}] Starting Round ${game.currentRound}`);
    if (game.currentRound > QUESTIONS_PER_ROUND.length) {
        gameService.endGame(io, game);
        return;
    }

    game.phase = 'generating_round';
    game.playerAnswers = {};
    game.battleSchedule = [];
    game.partialAnswers = {};
    helpers.broadcastGameState(io, game.id);

    let roundData = null;
    let finalTheme = game.theme;
    
    const numQuestionsPerPlayer = QUESTIONS_PER_ROUND[game.currentRound - 1];
    const numPlayers = game.players.length;

    if (numPlayers === 0) {
        console.log(`[Game ${game.id}] No players. Ending game.`);
        gameService.endGame(io, game);
        return;
    }
    
    // Check if we already have pre-fetched data for this round
    if (game.prefetchedRoundData && game.prefetchedRoundData.roundIndex === game.currentRound) {
        console.log(`[Game ${game.id}] ⚡ Using pre-fetched round data for Round ${game.currentRound}! (Zero wait time)`);
        roundData = game.prefetchedRoundData.data;
        game.prefetchedRoundData = null;
        game.prefetchedRoundPromise = null;
    } else if (game.prefetchedRoundPromise) {
        console.log(`[Game ${game.id}] ⏳ Awaiting in-flight background prefetch for Round ${game.currentRound}...`);
        try {
            roundData = await game.prefetchedRoundPromise;
        } catch (e) {
            console.warn(`[Game ${game.id}] Pre-fetch promise rejected:`, e);
        }
        game.prefetchedRoundData = null;
        game.prefetchedRoundPromise = null;
    }

    if (!Array.isArray(game.usedFallbackThemes)) game.usedFallbackThemes = [];
    const useFallback = game.geminiApiErrorCount >= 3;

    if (!roundData) {
        if (useFallback) {
            console.log(`[Game ${game.id}] Gemini API disabled due to repeated failures. Using fallback content.`);
            const fallbackData = getFallbackRoundData(game.language, game.usedFallbackThemes);
            game.usedFallbackThemes.push(fallbackData.theme);
            roundData = { ...fallbackData };
            if (!finalTheme) finalTheme = fallbackData.theme;
        } else {
            const recentAvoidPrompts = [
                ...(game.usedQuestions || []).slice(-12),
                ...(game.usedBattlePrompts || []).slice(-10)
            ];
            // generateRoundData already traverses candidate models & backoff internally
            try {
                const data = await generateRoundData(
                    game.theme,
                    game.language,
                    numPlayers,
                    numQuestionsPerPlayer,
                    game.sillyMode,
                    game.is18PlusMode,
                    recentAvoidPrompts
                );
                if (data) {
                    roundData = data;
                    game.geminiApiErrorCount = 0;
                } else {
                    game.geminiApiErrorCount++;
                }
            } catch (error) {
                console.error(`[Game ${game.id}] Synchronous AI round generation error:`, error);
                game.geminiApiErrorCount++;
            }

            if (!roundData && game.geminiApiErrorCount >= 3) {
                console.log(`[Game ${game.id}] Gemini API failed ${game.geminiApiErrorCount} times. Switching to fallback content.`);
                const fallbackData = getFallbackRoundData(game.language, game.usedFallbackThemes);
                game.usedFallbackThemes.push(fallbackData.theme);
                roundData = { ...fallbackData };
                if (!finalTheme) finalTheme = fallbackData.theme;
            }
        }
    }
        
    if (!roundData) {
        console.warn(`[Game ${game.id}] AI round generation returned null. Falling back to built-in content pack.`);
        const fallbackData = getFallbackRoundData(game.language, game.usedFallbackThemes);
        game.usedFallbackThemes.push(fallbackData.theme);
        roundData = { ...fallbackData };
        if (!finalTheme) finalTheme = fallbackData.theme;
    }

    if (manager.getGame(game.id) !== game || game.phase !== 'generating_round' || (game.gameInstanceId || 1) !== expectedInstanceId) {
        console.log(`[Game ${game.id}] Aborting stale startNextRound.`);
        return;
    }

    game.theme = finalTheme;
    if (!game.usedQuestions) game.usedQuestions = [];
    if (!game.usedBattlePrompts) game.usedBattlePrompts = [];
    const usedQuestionsSet = new Set(game.usedQuestions);
    const usedBattlePromptsSet = new Set(game.usedBattlePrompts);

    // Filter battle prompts against previously used prompts across rounds/games
    const rawBattlePrompts = Array.isArray(roundData.battlePrompts) ? roundData.battlePrompts : [];
    const freshBattlePrompts = rawBattlePrompts.filter(bp => bp && !usedBattlePromptsSet.has(bp));
    if (freshBattlePrompts.length >= game.players.length) {
        game.preGeneratedBattlePrompts = freshBattlePrompts;
    } else {
        // Keep all on-theme generated prompts first before falling back to off-theme static packs
        const remainingThemePrompts = rawBattlePrompts.filter(bp => bp && !freshBattlePrompts.includes(bp));
        const themePool = [...freshBattlePrompts, ...remainingThemePrompts];
        if (themePool.length >= game.players.length) {
            game.preGeneratedBattlePrompts = themePool;
        } else {
            const fallbackSet = FALLBACK_CONTENT[game.language] || FALLBACK_CONTENT.en || [];
            const sparePrompts = helpers.shuffleArray(fallbackSet.flatMap(p => p.battlePrompts || []))
                .filter(bp => bp && !usedBattlePromptsSet.has(bp) && !themePool.includes(bp));
            game.preGeneratedBattlePrompts = [...themePool, ...sparePrompts];
        }
    }

    game.preGeneratedFallbackWords = roundData.fallbackWords || [];
    const shuffledQuestionSets = helpers.shuffleArray([...(roundData.playerQuestions || [])]);
    game.reserveQuestions = {};

    // Build a deduplicated pool of unseen spare questions across all sets and fallback packs
    const fallbackQuestionPool = helpers.shuffleArray(
        ((FALLBACK_CONTENT[game.language] || FALLBACK_CONTENT.en || []).flatMap(p => (p.playerQuestions || []).flat()))
    ).filter(q => q && !usedQuestionsSet.has(q));

    const extraQuestions = [
        ...shuffledQuestionSets.slice(game.players.length).flat().filter(q => q && !usedQuestionsSet.has(q)),
        ...fallbackQuestionPool
    ];

    const instancePrefix = (game.gameInstanceId && game.gameInstanceId > 1) ? `g${game.gameInstanceId}-` : '';

    game.players.forEach((player, playerIndex) => {
        const rawSet = shuffledQuestionSets[playerIndex % Math.max(1, shuffledQuestionSets.length)] || [];
        const unseenInSet = rawSet.filter(q => q && !usedQuestionsSet.has(q));
        const mainQuestions = [];

        for (const q of unseenInSet) {
            if (mainQuestions.length >= numQuestionsPerPlayer) break;
            mainQuestions.push(q);
            usedQuestionsSet.add(q);
            game.usedQuestions.push(q);
        }
        while (mainQuestions.length < numQuestionsPerPlayer && extraQuestions.length > 0) {
            const nextQ = extraQuestions.shift();
            if (nextQ && !usedQuestionsSet.has(nextQ)) {
                mainQuestions.push(nextQ);
                usedQuestionsSet.add(nextQ);
                game.usedQuestions.push(nextQ);
            }
        }
        if (mainQuestions.length < numQuestionsPerPlayer) {
            for (const q of rawSet) {
                if (mainQuestions.length >= numQuestionsPerPlayer) break;
                if (q && !mainQuestions.includes(q)) {
                    mainQuestions.push(q);
                }
            }
        }
        
        // Spare questions for this player
        const playerReserves = [
            ...unseenInSet.filter(q => !mainQuestions.includes(q)),
            ...(extraQuestions.length > 0 ? [extraQuestions.shift()] : [])
        ].filter(Boolean);
        
        if (playerReserves.length === 0) {
            const fallbackPack = getFallbackRoundData(game.language, game.usedFallbackThemes);
            playerReserves.push(fallbackPack.playerQuestions[0]?.[0] || 'What is your secret superpower?');
        }
        
        game.reserveQuestions[player.id] = playerReserves;

        game.playerAnswers[player.id] = {
            questions: mainQuestions.map((qText, i) => ({
                id: `q-${instancePrefix}${game.currentRound}-${i}-${player.id}`,
                text: qText || `Fallback Question ${i+1}`,
                answer: ''
            })),
            rerollsLeft: 1,
            submittedAll: false
        };
    });

    // 🚀 Start background prefetching of next round immediately while players prepare and answer!
    prefetchNextRoundData(game);

    const voLang = (game.language === 'ua' || game.language === 'uk') ? 'uk' : 'en';
    helpers.playSoundOnClients(io, game, `vo_get_ready_questions_${voLang}`);
    const getReadyDuration = timerService.getTimerValue(game, GET_READY_SECONDS, SLOWPOKE_GET_READY_SECONDS);
    timerService.startPhaseTimer(io, game, 'get_ready', getReadyDuration, (io, g) => startQuestionPhase(io, g, numQuestionsPerPlayer));
}

export function finalizeMissingQuestionAnswers(game) {
    if (!game?.playerAnswers) return;
    Object.values(game.playerAnswers).forEach(pa => {
        if (pa.submittedAll) return;
        pa.questions?.forEach(q => {
            if (!q.answer) {
                const partial = game.partialAnswers?.[q.id];
                q.answer = (partial && partial.trim() !== '') ? partial : '::TIMEOUT::';
            }
        });
        pa.submittedAll = true;
    });
}

export async function expireQuestionPhase(io, game) {
    finalizeMissingQuestionAnswers(game);
    const { prepareBattlePhase } = await import('./battleService.js');
    await prepareBattlePhase(io, game);
}

export function startQuestionPhase(io, game, numQuestionsPerPlayer) {
    const timePerQuestion = timerService.getTimerValue(game, SECONDS_PER_QUESTION, SLOWPOKE_SECONDS_PER_QUESTION);
    const questionTime = numQuestionsPerPlayer * timePerQuestion;
    
    timerService.startPhaseTimer(io, game, 'question', questionTime, expireQuestionPhase);
}