import { generateRoundData } from '../../geminiService.js';
import * as helpers from '../helpers.js';
import * as manager from '../manager.js';
import * as timerService from './timerService.js';
import * as gameService from './gameService.js';
import { FALLBACK_CONTENT, FALLBACK_WORDS } from '../fallbackContent.js';
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
    const fallbackWords = (FALLBACK_WORDS[language] || FALLBACK_WORDS.en).flat();

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

    console.log(`[Game ${game.id}] 🚀 Background prefetching data for Round ${nextRoundIndex}...`);
    
    game.prefetchedRoundPromise = (async () => {
        try {
            const data = await generateRoundData(
                game.theme,
                game.language,
                numPlayers,
                numQuestionsPerPlayer,
                game.sillyMode,
                game.is18PlusMode
            );
            if (data) {
                game.prefetchedRoundData = { roundIndex: nextRoundIndex, data };
                console.log(`[Game ${game.id}] ✅ Pre-fetch completed for Round ${nextRoundIndex}`);
                return data;
            }
        } catch (err) {
            console.warn(`[Game ${game.id}] Background prefetch failed for Round ${nextRoundIndex}:`, err);
        }
        return null;
    })();

    // If next round is final round, also prefetch final round movie battle prompts in background!
    if (nextRoundIndex === QUESTIONS_PER_ROUND.length && !game.prefetchedFinalRoundPrompts) {
        (async () => {
            try {
                const finalPrompts = await generateFinalRoundData(game.theme, game.language, numPlayers, game.is18PlusMode);
                if (finalPrompts) {
                    game.prefetchedFinalRoundPrompts = finalPrompts;
                    console.log(`[Game ${game.id}] ✅ Pre-fetch completed for Final Round Movie Prompts`);
                }
            } catch (err) {
                console.warn(`[Game ${game.id}] Background prefetch for Final Round Movie Prompts failed:`, err);
            }
        })();
    }
}

export async function startNextRound(io, game) {
    if (!game) return;
    
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
    helpers.broadcastGameState(io, game.id);

    const MAX_RETRIES = 3;
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

    const useFallback = game.geminiApiErrorCount >= 3;

    if (!roundData) {
        if (useFallback) {
            console.log(`[Game ${game.id}] Gemini API disabled due to repeated failures. Using fallback content.`);
            const fallbackData = getFallbackRoundData(game.language, game.usedFallbackThemes);
            game.usedFallbackThemes.push(fallbackData.theme);
            roundData = { ...fallbackData };
            if (!finalTheme) finalTheme = fallbackData.theme;
        } else {
            for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                try {
                    const data = await generateRoundData(game.theme, game.language, numPlayers, numQuestionsPerPlayer, game.sillyMode, game.is18PlusMode);
                    if (data) {
                        roundData = data;
                        game.geminiApiErrorCount = 0;
                        break;
                    }
                } catch (error) {
                    console.error(`[Game ${game.id}] Attempt ${attempt} failed with error:`, error);
                }
                
                game.geminiApiErrorCount++;
                if (game.geminiApiErrorCount >= 3) {
                    console.log(`[Game ${game.id}] Gemini API failed ${game.geminiApiErrorCount} times. Switching to fallback content.`);
                    const fallbackData = getFallbackRoundData(game.language, game.usedFallbackThemes);
                    game.usedFallbackThemes.push(fallbackData.theme);
                    roundData = { ...fallbackData };
                    if (!finalTheme) finalTheme = fallbackData.theme;
                    break;
                }
                if (attempt < MAX_RETRIES) {
                    const waitTime = Math.pow(2, attempt) * 1000;
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
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

    game.theme = finalTheme;
    game.preGeneratedBattlePrompts = roundData.battlePrompts;
    game.preGeneratedFallbackWords = roundData.fallbackWords || [];
    const shuffledQuestionSets = helpers.shuffleArray(roundData.playerQuestions);

    game.players.forEach((player, playerIndex) => {
        const playerQuestionSet = shuffledQuestionSets[playerIndex % shuffledQuestionSets.length] || [];
        game.playerAnswers[player.id] = {
            questions: playerQuestionSet.map((qText, i) => ({
                id: `q-${game.currentRound}-${i}-${player.id}`,
                text: qText || `Fallback Question ${i+1}`,
                answer: ''
            })),
            submittedAll: false
        };
    });

    // 🚀 Start background prefetching of next round immediately while players prepare and answer!
    prefetchNextRoundData(game);

    helpers.playSoundOnClients(io, game, `vo_get_ready_questions_${game.language}`);
    const getReadyDuration = timerService.getTimerValue(game, GET_READY_SECONDS, SLOWPOKE_GET_READY_SECONDS);
    timerService.startPhaseTimer(io, game, 'get_ready', getReadyDuration, (io, g) => startQuestionPhase(io, g, numQuestionsPerPlayer));
}

export function startQuestionPhase(io, game, numQuestionsPerPlayer) {
    const timePerQuestion = timerService.getTimerValue(game, SECONDS_PER_QUESTION, SLOWPOKE_SECONDS_PER_QUESTION);
    const questionTime = numQuestionsPerPlayer * timePerQuestion;
    
    timerService.startPhaseTimer(io, game, 'question', questionTime, async (io, g) => {
        const { prepareBattlePhase } = await import('./battleService.js');
        Object.values(g.playerAnswers).forEach(pa => {
            if (pa.submittedAll) return;
            pa.questions.forEach(q => {
                if (!q.answer) {
                    const partial = g.partialAnswers?.[q.id];
                    q.answer = (partial && partial.trim() !== '') ? partial : '::TIMEOUT::';
                }
            });
            pa.submittedAll = true;
        });
        await prepareBattlePhase(io, g);
    });
}