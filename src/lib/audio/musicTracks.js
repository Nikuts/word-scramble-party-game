// src/lib/audio/musicTracks.js

/**
 * Curated Retro-Arcade Soundtrack (Kevin MacLeod, incompetech.com, CC-BY 4.0)
 * + Legacy Deep Bass Procedural Synth presets for SoundTestView comparison.
 */

export const MUSIC_STAGE_LABELS = Object.freeze({
    lobby: '🏠 Lobby',
    question: '✍️ Questions',
    battle: '⚔️ Battle',
    voting: '🗳️ Voting',
    podium: '🏆 Podium'
});

export const MUSIC_PLAYLIST_TRACKS = [
    // --- 🏠 LOBBY (3 primary) ---
    {
        id: 'newer_wave',
        title: 'Newer Wave',
        artist: 'Kevin MacLeod',
        license: 'CC-BY 4.0',
        stage: 'lobby',
        stages: ['lobby'],
        genre: '📺 80s Synthpop Arcade',
        jackboxVibe: 'Pre-Game Lobby Lounge',
        bpm: 128,
        src: '/sounds/music/newer_wave.mp3',
        instruments: 'Vintage 80s Synth Chords, Bouncing Bassline, Retro Drums',
        desc: 'Upbeat 80s new wave synthpop. Vibrant retro synth melodies and energetic rhythm that fits neon party aesthetics.',
        accentColor: '#06b6d4'
    },
    {
        id: 'android_sock_hop',
        title: 'Android Sock Hop',
        artist: 'Kevin MacLeod',
        license: 'CC-BY 4.0',
        stage: 'lobby',
        stages: ['lobby'],
        genre: '🤖 Retro-Futuristic Robot Hop',
        jackboxVibe: 'Lobby & Pre-Game Party',
        bpm: 128,
        src: '/sounds/music/android_sock_hop.mp3',
        instruments: 'Bouncy Robot Synths, Retro 50s-Meets-Cyber Drums, Chip Bells',
        desc: 'Quirky, bouncy retro-futuristic arcade hop. Playful cyber melodies with infectious danceable rhythm.',
        accentColor: '#38bdf8'
    },
    {
        id: 'aurea_carmina',
        title: 'Aurea Carmina',
        artist: 'Kevin MacLeod',
        license: 'CC-BY 4.0',
        stage: 'lobby',
        stages: ['lobby', 'podium'],
        genre: '🌟 Groovy Retro Roller-Synth',
        jackboxVibe: 'Lobby Warm-Up & Replay Lounge',
        bpm: 120,
        src: '/sounds/music/aurea_carmina.mp3',
        instruments: 'Retro Disco Synths, Hustle Bassline, Uplifting Percussion',
        desc: 'Feel-good mid-tempo retro synth-disco hustle with warm, welcoming roller-rink party energy.',
        accentColor: '#10b981'
    },

    // --- ✍️ QUESTIONS (3 primary) ---
    {
        id: 'beauty_flow',
        title: 'Beauty Flow',
        artist: 'Kevin MacLeod',
        license: 'CC-BY 4.0',
        stage: 'question',
        stages: ['question'],
        genre: '🌌 Arpeggiated Synth Focus',
        jackboxVibe: 'Question Writing & Creative Prompts',
        bpm: 118,
        src: '/sounds/music/beauty_flow.mp3',
        instruments: 'Arpeggiated Synth, Clean Electronic Percussion, Warm Pads',
        desc: 'Clean, driving arpeggiated synth groove that keeps players energized and focused while writing.',
        accentColor: '#a855f7'
    },
    {
        id: 'loopster',
        title: 'Loopster',
        artist: 'Kevin MacLeod',
        license: 'CC-BY 4.0',
        stage: 'question',
        stages: ['question', 'battle'],
        genre: '🕹️ Funky Electro-Game Bop',
        jackboxVibe: 'Question Writing & Battle Scramble',
        bpm: 120,
        src: '/sounds/music/loopster.mp3',
        instruments: 'Bouncy Synth Bass, Video Game Chord Stabs, Funky Drum Groove',
        desc: 'Funky, syncopated video game loop. Bouncy bassline with quirky game synth chords that stay fresh.',
        accentColor: '#c084fc'
    },
    {
        id: 'laser_groove',
        title: 'Laser Groove',
        artist: 'Kevin MacLeod',
        license: 'CC-BY 4.0',
        stage: 'question',
        stages: ['question', 'battle'],
        genre: '🔦 80s Synth Meets Electro Beat',
        jackboxVibe: 'Question Focus & Battle Scramble',
        bpm: 128,
        src: '/sounds/music/laser_groove.mp3',
        instruments: 'Retro 80s Synth Leads, Punchy Electro Beat, Sub Bass',
        desc: '1980s retro synth leads fused with a crisp, buoyant electronic groove that shines in both writing and battles.',
        accentColor: '#818cf8'
    },

    // --- ⚔️ BATTLE (3 primary) ---
    {
        id: 'edm_detection_mode',
        title: 'EDM Detection Mode',
        artist: 'Kevin MacLeod',
        license: 'CC-BY 4.0',
        stage: 'battle',
        stages: ['battle', 'question'],
        genre: '🎧 Cyber Club Arcade Groove',
        jackboxVibe: 'Battle Scramble & Showdown',
        bpm: 128,
        src: '/sounds/music/edm_detection_mode.mp3',
        instruments: 'Gritty Electro Bass, Cyber Drops, Synth Leads, Club Drums',
        desc: 'Futuristic neon party beat. Thick bass drops and infectious electro-arcade rhythm that keeps battles hype.',
        accentColor: '#f97316'
    },
    {
        id: 'rhinoceros',
        title: 'Rhinoceros',
        artist: 'Kevin MacLeod',
        license: 'CC-BY 4.0',
        stage: 'battle',
        stages: ['battle'],
        genre: '🦏 80s Semi-8-Bit Synth Action',
        jackboxVibe: 'Fast Head-to-Head Battle',
        bpm: 136,
        src: '/sounds/music/rhinoceros.mp3',
        instruments: '80s Action Synths, Semi-8-Bit Leads, Driving Drums',
        desc: 'Fast, punchy semi-8-bit 1980s synth-pop arcade action built for competitive word-scrambling sprints.',
        accentColor: '#ef4444'
    },
    {
        id: 'ouroboros',
        title: 'Ouroboros',
        artist: 'Kevin MacLeod',
        license: 'CC-BY 4.0',
        stage: 'battle',
        stages: ['battle', 'question'],
        genre: '🔁 80s Synth-Arcade Driver',
        jackboxVibe: 'Seamless Battle Countdown',
        bpm: 128,
        src: '/sounds/music/ouroboros.mp3',
        instruments: 'Thick 80s Synths, Pulsing Electro Bass, Seamless Loop',
        desc: 'Thick, seamless-loop late-80s synth-arcade driver with a relentless pulsing bassline.',
        accentColor: '#f43f5e'
    },

    // --- 🗳️ VOTING (2 primary) ---
    {
        id: 'laserpack',
        title: 'Laserpack',
        artist: 'Kevin MacLeod',
        license: 'CC-BY 4.0',
        stage: 'voting',
        stages: ['voting', 'battle'],
        genre: '⚡ Driving Synth-Action Groove',
        jackboxVibe: 'Voting Showdown & Countdown Tension',
        bpm: 128,
        src: '/sounds/music/laserpack.mp3',
        instruments: 'Driving Analog Synths, Punchy Bass, Snappy Percussion',
        desc: 'Bouncy, driving electronic arcade track with playful rhythmic percussion and tight voting momentum.',
        accentColor: '#fb7185'
    },
    {
        id: 'voxel_revolution',
        title: 'Voxel Revolution',
        artist: 'Kevin MacLeod',
        license: 'CC-BY 4.0',
        stage: 'voting',
        stages: ['voting'],
        genre: '🧊 Happy Retro-Game Fusion',
        jackboxVibe: 'Score Tallies & Answer Voting',
        bpm: 126,
        src: '/sounds/music/voxel_revolution.mp3',
        instruments: 'Cheerful Chiptune Leads, Grooving Synth Bass, Crisp Drums',
        desc: 'Happy, grooving retro-game montage fusion track with bright playful energy for voting reveals.',
        accentColor: '#f59e0b'
    },

    // --- 🏆 PODIUM (4 primary) ---
    {
        id: 'neon_laser_horizon',
        title: 'Neon Laser Horizon',
        artist: 'Kevin MacLeod',
        license: 'CC-BY 4.0',
        stage: 'podium',
        stages: ['podium', 'lobby'],
        genre: '📺 Upbeat Retro Synthwave',
        jackboxVibe: 'Podium Finale & Trophy Screen',
        bpm: 124,
        src: '/sounds/music/neon_laser_horizon.mp3',
        instruments: 'Bright Analog Synths, Driving Retro Bass, Crisp Kit',
        desc: 'Soaring synthesizer-driven retro anthem with bright neon hooks built for victory and podium celebrations.',
        accentColor: '#22d3ee'
    },
    {
        id: 'digital_lemonade',
        title: 'Digital Lemonade',
        artist: 'Kevin MacLeod',
        license: 'CC-BY 4.0',
        stage: 'podium',
        stages: ['podium', 'voting', 'lobby'],
        genre: '⚡ Electro-Arcade Party Pop',
        jackboxVibe: 'Podium, Voting & Party Recap',
        bpm: 128,
        src: '/sounds/music/digital_lemonade.mp3',
        instruments: 'Chiptune Arps, Bouncing Electro Bass, Club Kit, Vocoder Leads',
        desc: 'Catchy, upbeat electronic arcade beat with bright retro game synths. Bouncy, infectious, and celebratory.',
        accentColor: '#fbbf24'
    },
    {
        id: 'pixel_peeker_polka',
        title: 'Pixel Peeker Polka',
        artist: 'Kevin MacLeod',
        license: 'CC-BY 4.0',
        stage: 'podium',
        stages: ['podium'],
        genre: '🎪 Comedic Chiptune Party',
        jackboxVibe: 'Joyful Podium & Winner Bounce',
        bpm: 140,
        src: '/sounds/music/pixel_peeker_polka.mp3',
        instruments: 'Fast 8-Bit Chiptunes, Bouncy Bass, Playful Lead Synths',
        desc: 'Fast, joyous, comedic 8-bit arcade bounce. Iconic party game energy with playful chiptune melodies.',
        accentColor: '#eab308'
    },
    {
        id: 'bit_quest',
        title: 'Bit Quest',
        artist: 'Kevin MacLeod',
        license: 'CC-BY 4.0',
        stage: 'podium',
        stages: ['podium', 'lobby'],
        genre: '👾 16-Bit Neon Adventure',
        jackboxVibe: 'Podium & Victory Celebration',
        bpm: 120,
        src: '/sounds/music/bit_quest.mp3',
        instruments: 'Square Waves, FM Slap Bass, SNES-era Percussion, Chiptune Chords',
        desc: 'Nostalgic 16-bit retro arcade celebration. Cheerful, adventurous chiptune melodies with a driving bass pulse.',
        accentColor: '#34d399'
    }
];

/**
 * Returns all playlist tracks eligible for a given music stage.
 * @param {'lobby'|'question'|'battle'|'voting'|'podium'} stageKey
 */
export function getTracksForStage(stageKey) {
    return MUSIC_PLAYLIST_TRACKS.filter(track => Array.isArray(track.stages) && track.stages.includes(stageKey));
}

/**
 * Deep Bass & Warm Low-Register Procedural Synth presets (comparison fallback in SoundTestView).
 */
export const MUSIC_THEMES = {
    DEEP_LOFI_BASS: 'deep_lofi_bass',
    MIDNIGHT_GROOVE: 'midnight_groove',
    DARK_DUB_AMBIENT: 'dark_dub_ambient',
    DEEP_JAZZ_BASS: 'deep_jazz_bass',
    OFF: 'off'
};

export const MUSIC_THEME_METADATA = {
    [MUSIC_THEMES.DEEP_LOFI_BASS]: {
        id: MUSIC_THEMES.DEEP_LOFI_BASS,
        name: 'Deep Lo-Fi Sub-Bass',
        tag: 'Heavy Sub & Dark Warmth',
        icon: '🎧',
        description: 'Deep 808 sub-bass groove, warm muffled low chords, and soft dark lo-fi beats with zero harsh highs.',
        bpm: { lobby: 76, question: 80, battle: 86, voting: 82, podium: 80 },
        synthStyle: 'deep_lofi_bass'
    },
    [MUSIC_THEMES.MIDNIGHT_GROOVE]: {
        id: MUSIC_THEMES.MIDNIGHT_GROOVE,
        name: 'Midnight Bass Groove',
        tag: 'Warm Low-End Rhythm',
        icon: '🕶️',
        description: 'Prominent rolling low-end bassline, muted electric keys, and a relaxed, bass-heavy late-night vibe.',
        bpm: { lobby: 80, question: 82, battle: 88, voting: 84, podium: 82 },
        synthStyle: 'midnight_groove'
    },
    [MUSIC_THEMES.DARK_DUB_AMBIENT]: {
        id: MUSIC_THEMES.DARK_DUB_AMBIENT,
        name: 'Dark Ambient Dub',
        tag: 'Hypnotic Sub Pulses',
        icon: '🌌',
        description: 'Heavy sub-frequency bass pulses, dark ambient low pads, and calming deep space resonance.',
        bpm: { lobby: 70, question: 72, battle: 78, voting: 74, podium: 72 },
        synthStyle: 'dark_dub_ambient'
    },
    [MUSIC_THEMES.DEEP_JAZZ_BASS]: {
        id: MUSIC_THEMES.DEEP_JAZZ_BASS,
        name: 'Deep Upright Jazz Bass',
        tag: 'Acoustic Walking Bass',
        icon: '🎻',
        description: 'Thick, resonant acoustic walking upright bass front and center, paired with muted low-register piano.',
        bpm: { lobby: 78, question: 80, battle: 86, voting: 82, podium: 80 },
        synthStyle: 'deep_jazz_bass'
    },
    [MUSIC_THEMES.OFF]: {
        id: MUSIC_THEMES.OFF,
        name: 'Music Off',
        tag: 'Muted',
        icon: '🔇',
        description: 'Background music is disabled. SFX and Voiceovers will still play normally.',
        bpm: {},
        synthStyle: null
    }
};

/**
 * Maps server game state phases to our 5 core music stages.
 * @param {string} phase
 * @returns {'lobby'|'question'|'battle'|'voting'|'podium'}
 */
export function mapPhaseToMusicStage(phase) {
    if (!phase) return 'lobby';

    switch (phase) {
        case 'lobby':
            return 'lobby';
        case 'generating_round':
        case 'get_ready':
        case 'question':
            return 'question';
        case 'preparing_battles':
        case 'battle_get_ready':
        case 'battle_answering':
        case 'battle':
            return 'battle';
        case 'voting_get_ready':
        case 'battle_voting':
        case 'battle_result_reveal':
        case 'battle_reveal':
        case 'voting':
            return 'voting';
        case 'results':
        case 'podium':
            return 'podium';
        default:
            return 'lobby';
    }
}
