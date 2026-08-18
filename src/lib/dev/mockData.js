// src/lib/dev/mockData.js
import { AVATARS } from '../config.js';

export const MOCK_PLAYERS_6 = [
    { id: 'p1', name: 'Alice', avatar: '🦊', isHost: true, isReady: true, isConnected: true, socketId: 'sock_p1', score: 2800 },
    { id: 'p2', name: 'Bob', avatar: '🐸', isHost: false, isReady: false, isConnected: true, socketId: 'sock_p2', score: 2400 },
    { id: 'p3', name: 'Charlie', avatar: '🤖', isHost: false, isReady: false, isConnected: true, socketId: 'sock_p3', score: 1950 },
    { id: 'p4', name: 'Diana', avatar: '🧙', isHost: false, isReady: true, isConnected: true, socketId: 'sock_p4', score: 2200 },
    { id: 'p5', name: 'Evan', avatar: '🦁', isHost: false, isReady: false, isConnected: true, socketId: 'sock_p5', score: 1800 },
    { id: 'p6', name: 'Fiona', avatar: '🐱', isHost: false, isReady: false, isConnected: true, socketId: 'sock_p6', score: 2100 }
];

export const MOCK_PLAYERS_14 = [
    { id: 'p1', name: 'Alice', avatar: '🦊', isHost: true, isReady: true, isConnected: true, socketId: 'sock_p1', score: 2800 },
    { id: 'p2', name: 'Bob', avatar: '🐸', isHost: false, isReady: false, isConnected: true, socketId: 'sock_p2', score: 2400 },
    { id: 'p3', name: 'Charlie', avatar: '🤖', isHost: false, isReady: false, isConnected: true, socketId: 'sock_p3', score: 1950 },
    { id: 'p4', name: 'Diana', avatar: '🧙', isHost: false, isReady: true, isConnected: true, socketId: 'sock_p4', score: 2200 },
    { id: 'p5', name: 'Evan', avatar: '🦁', isHost: false, isReady: false, isConnected: true, socketId: 'sock_p5', score: 1800 },
    { id: 'p6', name: 'Fiona', avatar: '🐱', isHost: false, isReady: false, isConnected: true, socketId: 'sock_p6', score: 2100 },
    { id: 'p7', name: 'George', avatar: '🐵', isHost: false, isReady: true, isConnected: true, socketId: 'sock_p7', score: 1650 },
    { id: 'p8', name: 'Hannah', avatar: '🐼', isHost: false, isReady: true, isConnected: true, socketId: 'sock_p8', score: 2300 },
    { id: 'p9', name: 'Ivan', avatar: '🐯', isHost: false, isReady: false, isConnected: true, socketId: 'sock_p9', score: 1900 },
    { id: 'p10', name: 'Julia', avatar: '🦄', isHost: false, isReady: true, isConnected: true, socketId: 'sock_p10', score: 2750 },
    { id: 'p11', name: 'Kevin', avatar: '🐲', isHost: false, isReady: false, isConnected: true, socketId: 'sock_p11', score: 1400 },
    { id: 'p12', name: 'Luna', avatar: '👾', isHost: false, isReady: true, isConnected: true, socketId: 'sock_p12', score: 2150 },
    { id: 'p13', name: 'Max', avatar: '👻', isHost: false, isReady: true, isConnected: true, socketId: 'sock_p13', score: 1750 },
    { id: 'p14', name: 'Nora', avatar: '🐧', isHost: false, isReady: true, isConnected: true, socketId: 'sock_p14', score: 2050 }
];

export const MOCK_PLAYERS = MOCK_PLAYERS_6;

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

export const MOCK_ACTIVE_BATTLE_DUO = {
    id: 'b-1-0',
    prompt: 'Warning sign on the office coffee mug:',
    competitors: ['p1', 'p2'],
    formatConfig: { type: 'single_line' },
    answers: {
        p1: 'giant laser potato under cheese',
        p2: 'screaming fluffy badger disco champion'
    },
    votes: { p3: 'p2', p4: 'p1' }
};

export const MOCK_ACTIVE_BATTLE_TRIO = {
    id: 'b-1-0',
    prompt: 'Warning sign on the office coffee mug:',
    competitors: ['p1', 'p2', 'p3'],
    formatConfig: { type: 'single_line' },
    answers: {
        p1: 'giant laser potato under cheese',
        p2: 'screaming fluffy badger disco champion',
        p3: 'never apologize with hot pizzas'
    },
    votes: { p4: 'p2', p5: 'p2', p6: 'p1' }
};

export const MOCK_ACTIVE_BATTLE_QUAD = {
    id: 'b-1-0',
    prompt: 'Warning sign on the office coffee mug:',
    competitors: ['p1', 'p2', 'p3', 'p4'],
    formatConfig: { type: 'single_line' },
    answers: {
        p1: 'giant laser potato under cheese',
        p2: 'screaming fluffy badger disco champion',
        p3: 'never apologize with hot pizzas',
        p4: 'unleash turbo ducks across the universe'
    },
    votes: { p5: 'p2', p6: 'p1', p7: 'p4', p8: 'p2' }
};

export const MOCK_ACTIVE_BATTLE_REVEAL = {
    id: 'b-1-0',
    prompt: 'Warning sign on the office coffee mug:',
    competitors: ['p1', 'p2', 'p3'],
    formatConfig: { type: 'single_line' },
    answers: {
        p1: 'giant laser potato under cheese',
        p2: 'screaming fluffy badger disco champion',
        p3: 'never apologize with hot pizzas'
    },
    annotatedAnswers: {
        p1: {
            words: [
                { text: 'giant', authorIndex: 1 },
                { text: 'laser', authorIndex: 2 },
                { text: 'potato', authorIndex: 3 },
                { text: 'under', authorIndex: 4 },
                { text: 'cheese', authorIndex: 1 }
            ]
        },
        p2: {
            words: [
                { text: 'screaming', authorIndex: 0 },
                { text: 'fluffy', authorIndex: 2 },
                { text: 'badger', authorIndex: 3 },
                { text: 'disco', authorIndex: 0 },
                { text: 'champion', authorIndex: 2 }
            ]
        },
        p3: {
            words: [
                { text: 'never', authorIndex: 0 },
                { text: 'apologize', authorIndex: 1 },
                { text: 'with', authorIndex: 3 },
                { text: 'hot', authorIndex: 1 },
                { text: 'pizzas', authorIndex: 4 }
            ]
        }
    },
    votes: { p4: 'p2', p5: 'p2', p6: 'p1' },
    winnerId: 'p2',
    pointsAwarded: {
        p1: 250,
        p2: 1450,
        p3: 100
    },
    scoreBreakdown: {
        p1: { votes: 1, votePoints: 250, winBonus: 0, sweepBonus: 0, rainbowBonus: 0 },
        p2: { votes: 2, votePoints: 500, winBonus: 500, sweepBonus: 0, rainbowBonus: 450 },
        p3: { votes: 0, votePoints: 0, winBonus: 0, sweepBonus: 0, rainbowBonus: 100 }
    }
};

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
            uk: ['Звичайні речі, епічні передісторії', 'Погані виправдання запізнення', 'Цілодобова забігайлівка з привидами'],
            ua: ['Звичайні речі, епічні передісторії', 'Погані виправдання запізнення', 'Цілодобова забігайлівка з привидами']
        },
        playerAnswers: {
            p1: { questions: [{ text: "What is your secret weapon?", answer: "giant laser potato" }] },
            p2: { questions: [{ text: "What is your secret weapon?", answer: "screaming fluffy badger" }] }
        },
        battleSchedule: [MOCK_ACTIVE_BATTLE_TRIO],
        currentVotingBattleIndex: 0,
        currentBattleIndex: 0,
        ...overrides
    };
}
