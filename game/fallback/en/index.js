// game/fallback/en/index.js
import { EN_HARVESTER_QUESTIONS } from './questions.js';
import { everydayObjectsPack } from './themes/everydayObjects.js';
import { badExcusesPack } from './themes/badExcuses.js';
import { historicalFiguresPack } from './themes/historicalFigures.js';
import { terribleSuperpowersPack } from './themes/terribleSuperpowers.js';
import { unusualRecipesPack } from './themes/unusualRecipes.js';
import { chaoticDinerPack } from './themes/chaoticDiner.js';

const rawPacks = [
    everydayObjectsPack,
    badExcusesPack,
    historicalFiguresPack,
    terribleSuperpowersPack,
    unusualRecipesPack,
    chaoticDinerPack
];

export const FALLBACK_CONTENT_EN = rawPacks.map(pack => ({
    theme: pack.theme,
    battlePrompts: pack.battlePrompts,
    playerQuestions: EN_HARVESTER_QUESTIONS
}));
