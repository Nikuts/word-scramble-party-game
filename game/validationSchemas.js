// game/validationSchemas.js
import { z } from 'zod';
import { AVATARS } from '../src/lib/config.js';

const gameIdSchemaBase = z.string().length(4).regex(/^[A-Z0-9]+$/);
const playerIdSchemaBase = z.string().min(1);

export const gameIdSchema = z.object({
    gameId: gameIdSchemaBase
});

export const playerAndGameIdSchema = z.object({
    gameId: gameIdSchemaBase,
    playerId: playerIdSchemaBase,
});

export const createGameSchema = z.object({
    language: z.enum(['en', 'uk'])
});

export const joinGameSchema = z.object({
    gameId: gameIdSchemaBase,
    playerName: z.string().trim().min(1, { message: "Name required." }).max(25),
    language: z.enum(['en', 'uk']),
    avatar: z.enum(AVATARS).optional()
});

export const changeAvatarSchema = z.object({
    gameId: gameIdSchemaBase,
    avatar: z.string().refine(val => AVATARS.includes(val), { message: "Invalid avatar." })
});

export const changeNameSchema = z.object({
    gameId: gameIdSchemaBase,
    newName: z.string().trim().min(1, { message: "Name required." }).max(25)
});

export const reconnectPlayerSchema = z.object({
    gameId: gameIdSchemaBase,
    playerId: playerIdSchemaBase,
    playerToken: z.string().min(1)
});

export const setThemeSchema = z.object({
    gameId: gameIdSchemaBase,
    theme: z.string().trim().max(250)
});

export const setColorThemeSchema = z.object({
    gameId: gameIdSchemaBase,
    theme: z.enum(['arcade', 'vaporwave', 'outrun'])
});

export const setBooleanOptionSchema = (optionName) => z.object({
    gameId: gameIdSchemaBase,
    [optionName]: z.boolean()
});

export const submitAnswerSchema = z.object({
    gameId: gameIdSchemaBase,
    playerId: playerIdSchemaBase,
    questionId: z.string().min(1),
    answer: z.string().max(500)
});

export const submitBattleAnswerSchema = z.object({
    gameId: gameIdSchemaBase,
    playerId: playerIdSchemaBase,
    battleId: z.string().min(1),
    answer: z.union([
        z.string().max(1000), // Regular answer
        z.object({ // Final round answer
            title: z.string().max(500),
            tagline: z.string().max(500)
        })
    ])
});

export const voteSchema = z.object({
    gameId: gameIdSchemaBase,
    playerId: playerIdSchemaBase,
    battleId: z.string().min(1),
    voteForPlayerId: playerIdSchemaBase
});

export const updatePartialAnswerSchema = z.object({
    gameId: gameIdSchemaBase,
    playerId: playerIdSchemaBase,
    payload: z.union([
        z.object({
            type: z.literal('question'),
            questionId: z.string().min(1),
            text: z.string().max(500)
        }),
        z.object({
            type: z.literal('battle'),
            battleId: z.string().min(1),
            answer: z.string().max(1000)
        }),
        z.object({
            type: z.literal('final_battle'),
            battleId: z.string().min(1),
            title: z.string().max(500),
            tagline: z.string().max(500),
        })
    ])
});

export const rerollQuestionSchema = z.object({
    gameId: gameIdSchemaBase,
    playerId: playerIdSchemaBase,
    questionId: z.string().min(1)
});