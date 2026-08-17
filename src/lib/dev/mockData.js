// src/lib/dev/mockData.js
import { AVATARS } from '../config.js';

export const MOCK_PLAYERS = [
    { id: 'p1', name: 'Alice', avatar: '🦊', isHost: true, isReady: true, isConnected: true, score: 2800 },
    { id: 'p2', name: 'Bob', avatar: '🐸', isHost: false, isReady: true, isConnected: true, score: 3400 },
    { id: 'p3', name: 'Charlie', avatar: '🤖', isHost: false, isReady: true, isConnected: true, score: 2100 },
    { id: 'p4', name: 'Diana', avatar: '🐱', isHost: false, isReady: true, isConnected: true, score: 3950 },
    { id: 'p5', name: 'Evan', avatar: '🐼', isHost: false, isReady: false, isConnected: true, score: 1800 },
    { id: 'p6', name: 'Fiona', avatar: '🦄', isHost: false, isReady: true, isConnected: false, score: 1500 }
];

export const MOCK_WORD_BANK_EN = [
    { word: 'giant', authorId: 'p2', isBonus: false },
    { word: 'laser', authorId: 'p3', isBonus: false },
    { word: 'potato', authorId: 'p4', isBonus: false },
    { word: 'screaming', authorId: 'p2', isBonus: false },
    { word: 'internally', authorId: 'p3', isBonus: false },
    { word: 'at', authorId: 'p5', isBonus: false },
    { word: 'maximum', authorId: 'p4', isBonus: false },
    { word: 'volume', authorId: 'p2', isBonus: false },
    { word: 'secretly', authorId: 'p5', isBonus: false },
    { word: 'stole', authorId: 'p3', isBonus: false },
    { word: 'all', authorId: 'p4', isBonus: false },
    { word: 'the', authorId: 'p2', isBonus: false },
    { word: 'hot', authorId: 'p3', isBonus: false },
    { word: 'pizzas', authorId: 'p5', isBonus: false },
    { word: 'because', authorId: 'p4', isBonus: false },
    { word: 'dragons', authorId: 'p2', isBonus: false },
    { word: 'love', authorId: 'p3', isBonus: false },
    { word: 'spicy', authorId: 'p4', isBonus: false },
    { word: 'cheese', authorId: 'p5', isBonus: false },
    { word: 'and', authorId: 'p2', isBonus: false },
    { word: 'never', authorId: 'p3', isBonus: false },
    { word: 'apologize', authorId: 'p4', isBonus: false },
    { word: 'under', authorId: 'p5', isBonus: false },
    { word: 'any', authorId: 'p2', isBonus: false },
    { word: 'circumstances', authorId: 'p3', isBonus: false },
    { word: 'with', authorId: 'p4', isBonus: false },
    { word: 'fluffy', authorId: 'p5', isBonus: false },
    { word: 'slippers', authorId: 'p2', isBonus: false },
    { word: 'very', authorId: 'p3', isBonus: false },
    { word: 'dangerously', authorId: 'p4', isBonus: false },
    { word: 'unstable', authorId: 'p5', isBonus: false },
    { word: 'disco', authorId: 'p2', isBonus: false },
    { word: 'champion', authorId: 'p3', isBonus: false },
    { word: 'flying', authorId: 'p4', isBonus: false },
    { word: 'badger', authorId: 'p5', isBonus: false }
];

export const MOCK_WORD_BANK_UA = [
    { word: 'гігантська', authorId: 'p2', isBonus: false },
    { word: 'лазерна', authorId: 'p3', isBonus: false },
    { word: 'картопля', authorId: 'p4', isBonus: false },
    { word: 'кричить', authorId: 'p2', isBonus: false },
    { word: 'в', authorId: 'p3', isBonus: false },
    { word: 'подушку', authorId: 'p5', isBonus: false },
    { word: 'на', authorId: 'p4', isBonus: false },
    { word: 'повну', authorId: 'p2', isBonus: false },
    { word: 'гучність', authorId: 'p3', isBonus: false },
    { word: 'таємно', authorId: 'p5', isBonus: false },
    { word: 'викрала', authorId: 'p3', isBonus: false },
    { word: 'всю', authorId: 'p4', isBonus: false },
    { word: 'гарячу', authorId: 'p2', isBonus: false },
    { word: 'піцу', authorId: 'p3', isBonus: false },
    { word: 'бо', authorId: 'p5', isBonus: false },
    { word: 'дракони', authorId: 'p4', isBonus: false },
    { word: 'обожнюють', authorId: 'p2', isBonus: false },
    { word: 'гострий', authorId: 'p3', isBonus: false },
    { word: 'сир', authorId: 'p4', isBonus: false },
    { word: 'і', authorId: 'p5', isBonus: false },
    { word: 'ніколи', authorId: 'p2', isBonus: false },
    { word: 'не', authorId: 'p3', isBonus: false },
    { word: 'вибачаються', authorId: 'p4', isBonus: false },
    { word: 'за', authorId: 'p5', isBonus: false },
    { word: 'свої', authorId: 'p2', isBonus: false },
    { word: 'пухнасті', authorId: 'p3', isBonus: false },
    { word: 'капці', authorId: 'p4', isBonus: false },
    { word: 'дуже', authorId: 'p5', isBonus: false },
    { word: 'небезпечно', authorId: 'p2', isBonus: false },
    { word: 'святковий', authorId: 'p3', isBonus: false },
    { word: 'борсук', authorId: 'p4', isBonus: false },
    { word: 'раптом', authorId: 'p5', isBonus: false },
    { word: 'переміг', authorId: 'p2', isBonus: false },
    { word: 'усіх', authorId: 'p3', isBonus: false }
];

export const MOCK_SUPERLATIVES = [
    {
        title: "Clean Sweeper",
        title_uk: "Гроза Раундів",
        description: "Won 100% of votes in 2 or more battles.",
        description_uk: "Здобув 100% голосів у двох або більше битвах.",
        playerId: "p4",
        playerName: "Diana",
        avatar: "🐱",
        icon: "🧹"
    },
    {
        title: "Ammo Factory",
        title_uk: "Збройовий Барон",
        description: "Contributed the most words used in winning answers (+350 royalties).",
        description_uk: "Надав найбільше слів для переможних відповідей (+350 роялті).",
        playerId: "p2",
        playerName: "Bob",
        avatar: "🐸",
        icon: "🏭"
    },
    {
        title: "Rainbow Alchemist",
        title_uk: "Веселковий Алхімік",
        description: "Crafted answers uniting words from 4 different players.",
        description_uk: "Створив відповіді зі слів 4 різних авторів.",
        playerId: "p1",
        playerName: "Alice",
        avatar: "🦊",
        icon: "🌈"
    }
];

export function createMockGameState(overrides = {}) {
    return {
        id: 'TEST',
        phase: 'lobby',
        currentRound: 1,
        maxRounds: 3,
        theme: 'Everyday Objects, Epic Backstories',
        language: 'en',
        is18PlusMode: false,
        sillyMode: true,
        players: [...MOCK_PLAYERS],
        preGeneratedThemes: {
            en: ['Everyday Objects, Epic Backstories', 'Bad Excuses For Being Late', 'Haunted 24-Hour Diner'],
            uk: ['Звичайні речі, епічні передісторії', 'Погані виправдання запізнення', 'Цілодобова забігайлівка з привидами']
        },
        playerAnswers: {
            p1: { questions: [{ text: "What is your secret weapon?", answer: "giant laser potato" }] },
            p2: { questions: [{ text: "What is your secret weapon?", answer: "screaming fluffy badger" }] }
        },
        battleSchedule: [
            {
                id: 'b-1-0',
                prompt: 'Warning sign on the office coffee mug:',
                competitors: [
                    { id: 'p1', name: 'Alice', avatar: '🦊', score: 2800 },
                    { id: 'p2', name: 'Bob', avatar: '🐸', score: 3400 },
                    { id: 'p3', name: 'Charlie', avatar: '🤖', score: 2100 }
                ],
                formatConfig: { type: 'single_line' },
                answers: {
                    p1: 'giant laser potato under cheese',
                    p2: 'screaming fluffy badger disco champion',
                    p3: 'never apologize with hot pizzas'
                },
                votes: { p1: ['p4'], p2: ['p5', 'p6'], p3: [] }
            }
        ],
        currentBattleIndex: 0,
        ...overrides
    };
}
