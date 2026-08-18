/**
 * @file This file centralizes all game configuration variables for easy tuning.
 * It's used by both the server (server.js) and the client (index.html).
 */

// --- Player and Game Settings ---
export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 14;
export const MIN_ANSWER_WORDS = 5; // Min words for a valid question answer.
export const PLAYER_RECONNECTION_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds.
export const HOST_REASSIGNMENT_TIMEOUT_SECONDS = 90; // The grace period before a disconnected host is replaced.
export const SOUNDS_ON_HOST_ONLY = false; // Set to true to play sounds only on the host display.

// --- Server Resource & Capacity Safeguards ---
// Optional manual overrides (null = dynamically auto-detected from host RAM & CPU cores)
export const MAX_CONCURRENT_GAMES = (typeof process !== 'undefined' && process.env?.MAX_CONCURRENT_GAMES)
    ? parseInt(process.env.MAX_CONCURRENT_GAMES, 10)
    : null;

export const MAX_MEMORY_THRESHOLD_MB = (typeof process !== 'undefined' && process.env?.MAX_MEMORY_THRESHOLD_MB)
    ? parseInt(process.env.MAX_MEMORY_THRESHOLD_MB, 10)
    : null;

// --- Round Structure ---
// The game now has 3 rounds. The 3rd round's battle is the special final round.
export const QUESTIONS_PER_ROUND = [4, 3, 2]; // Number of questions in Round 1, 2, and 3.

// --- Scoring ---
export const POINTS_PER_ROUND = [1000, 2000, 4000]; // Total benchmark points for round 1, 2, and 3
export const POINTS_PER_VOTE = [300, 600, 1200]; // Points per vote received in Round 1, 2, and 3
export const VICTORY_BONUS_PER_ROUND = [200, 400, 800]; // Points for winning the battle
export const CLEAN_SWEEP_BONUS_PER_ROUND = [150, 300, 600]; // Points for 100% of votes
export const FLAT_ROYALTY_PER_ROUND = [50, 75, 100]; // Flat royalty per answer to original author
export const RAINBOW_BONUS_PER_ROUND = [100, 200, 400]; // Bonus for combining words from 3+ players

// --- Word Bank Settings ---
// Toggles between the classic word bank algorithm and the new, prioritized one.
// true = New algorithm (prioritizes distributing current round content first).
// false = Classic algorithm (shuffles all content together before distributing).
export const USE_PRIORITIZED_WORD_BANK_ALGO = true;

// Tiered min/max word counts for each battle's word bank, per round.
export const WORD_BANK_SIZES = {
    1: { min: 30, max: 50 },    // Round 1
    2: { min: 40, max: 65 },    // Round 2
    3: { min: 50, max: 80 }     // Round 3 (Final Round)
};

// --- Timings (in seconds) ---
export const GET_READY_SECONDS = 5;
export const BATTLE_GET_READY_SECONDS = 5;
export const VOTING_GET_READY_SECONDS = 5;
export const SINGLE_BATTLE_REVEAL_SECONDS = 7;
export const AUTO_WIN_REVEAL_SECONDS = 12; // An extra 5 seconds for auto-win reveals.

// Time allotted for the entire Question Answering phase, calculated as: SECONDS_PER_QUESTION * num_questions_in_round
export const SECONDS_PER_QUESTION = 60;

// Time for the simultaneous battle answering phase is calculated per battle.
export const SECONDS_PER_BATTLE_ANSWER = 85; // For regular rounds
export const FINAL_BATTLE_SECONDS_PER_ANSWER = 105; // For the final round

// Time allotted per battle during the voting phase.
export const SECONDS_PER_VOTE = 20;
export const FINAL_BATTLE_SECONDS_PER_VOTE = 30; // Extra time for reading dialogue answers.


// --- Timings (in seconds) - SLOWPOKE MODE ---
export const SLOWPOKE_GET_READY_SECONDS = 5;
export const SLOWPOKE_BATTLE_GET_READY_SECONDS = 5;
export const SLOWPOKE_VOTING_GET_READY_SECONDS = 5;
export const SLOWPOKE_SINGLE_BATTLE_REVEAL_SECONDS = 12;
export const SLOWPOKE_AUTO_WIN_REVEAL_SECONDS = 17;


export const SLOWPOKE_SECONDS_PER_QUESTION = 90;

export const SLOWPOKE_SECONDS_PER_BATTLE_ANSWER = 120;
export const SLOWPOKE_FINAL_BATTLE_SECONDS_PER_ANSWER = 140;
export const SLOWPOKE_SECONDS_PER_VOTE = 35;
export const SLOWPOKE_FINAL_BATTLE_SECONDS_PER_VOTE = 50;


// --- Player Customization ---
export const AVATARS = [
    '👽', '🐶', '🦆', '⚒️', '🦊', '🐸', '👺', '🛡️', '🍄', '🦜', '🐧', '🐷', '🤖', '💀', '🦠', '🐱', '🧛', '🧙', '🐛', '🧟', '🐙'
];

export const AVATAR_MAP = {
    '👽': 'alien',
    '🐶': 'dog',
    '🦆': 'duck',
    '⚒️': 'dwarf',
    '🦊': 'fox',
    '🐸': 'frog',
    '👺': 'goblin',
    '🛡️': 'knight',
    '🍄': 'mushroom',
    '🦜': 'parrot',
    '🐧': 'penguin',
    '🐷': 'pig',
    '🤖': 'robot',
    '💀': 'skeleton',
    '🦠': 'slime',
    '🐱': 'sphynx',
    '🧛': 'vampire',
    '🧙': 'wizard',
    '🐛': 'worm',
    '🧟': 'zombie',
    '🐙': 'octopus'
};