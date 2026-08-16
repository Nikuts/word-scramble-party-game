


import { GoogleGenAI } from "@google/genai";
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { USE_FLEXIBLE_UKRAINIAN_PROMPTS, USE_ENHANCED_QUESTION_PROMPTS, PROMPT_VERSION } from './src/lib/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let ai = null;
const primaryModel = process.env.GEMINI_MODEL || "gemini-3.7-flash";

/**
 * Initializes or returns the Gemini client. Supports both GEMINI_API_KEY and API_KEY.
 */
export function initAiClient() {
    if (ai) return ai;
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
        console.warn("⚠️ No GEMINI_API_KEY or API_KEY found in environment variables. Falling back to pre-written content.");
        return null;
    }
    try {
        ai = new GoogleGenAI({
            apiKey: apiKey,
            httpOptions: {
                headers: {
                    'User-Agent': 'aistudio-build'
                }
            }
        });
        console.log("Gemini AI Client Initialized successfully with primary model:", primaryModel);
        return ai;
    } catch (error) {
        console.error("Failed to initialize Gemini AI Client:", error);
        return null;
    }
}

function getAiClient() {
    if (!ai) {
        return initAiClient();
    }
    return ai;
}

/**
 * Executes a Gemini generateContent request with multi-model fallback and exponential backoff retry.
 * Handles transient 503 (High Demand/Service Unavailable), 429 (Resource Exhausted), and 500 errors.
 * @param {string} prompt The text prompt.
 * @param {object} customConfig Optional model configuration.
 * @returns {Promise<string | null>} The raw response text or null if all attempts fail.
 */
async function generateContentWithFallback(prompt, customConfig = {}) {
    const client = getAiClient();
    if (!client) return null;

    // Supported modern model fallback chain
    const candidateModels = Array.from(new Set([
        primaryModel,
        "gemini-flash-latest",
        "gemini-3.1-flash-lite"
    ]));

    for (let mIndex = 0; mIndex < candidateModels.length; mIndex++) {
        const candidateModel = candidateModels[mIndex];
        const maxRetries = 2;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await client.models.generateContent({
                    model: candidateModel,
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                        ...customConfig
                    },
                });

                if (response?.text) {
                    return response.text;
                }
            } catch (error) {
                const errorMessage = String(error?.message || error || '');
                const isTransientError = errorMessage.includes('503') ||
                                         errorMessage.includes('UNAVAILABLE') ||
                                         errorMessage.includes('high demand') ||
                                         errorMessage.includes('429') ||
                                         errorMessage.includes('RESOURCE_EXHAUSTED') ||
                                         errorMessage.includes('500');

                if (isTransientError) {
                    console.warn(`[Gemini] Transient error on '${candidateModel}' (attempt ${attempt}/${maxRetries}): ${errorMessage.slice(0, 100)}...`);
                    if (attempt < maxRetries) {
                        const jitter = Math.floor(Math.random() * 300);
                        await new Promise(r => setTimeout(r, (attempt * 400) + jitter));
                        continue;
                    } else if (mIndex < candidateModels.length - 1) {
                        console.warn(`[Gemini] Switching to fallback model '${candidateModels[mIndex + 1]}'`);
                    }
                } else {
                    console.error(`[Gemini] Non-transient error with model '${candidateModel}':`, error);
                    break;
                }
            }
        }
    }

    console.warn("[Gemini] All AI models currently unavailable. Using built-in content fallback.");
    return null;
}

/**
 * Reads a prompt template from the /prompts directory and injects variables.
 * Supports versioned prompt directories (e.g. /prompts/v2/ or /prompts/v1/) with fallback.
 * @param {string} promptName - The name of the prompt file (e.g., 'themes').
 * @param {object} replacements - Key/value pairs to replace placeholders in the prompt.
 * @param {string} [version] - Optional prompt version ('v1' or 'v2'). Defaults to PROMPT_VERSION.
 * @returns {Promise<string>} The processed prompt string.
 */
export async function getPrompt(promptName, replacements = {}, version = null) {
    const v = version || (typeof process !== 'undefined' && process.env?.PROMPT_VERSION) || PROMPT_VERSION || 'v2';
    let promptPath = path.join(__dirname, 'prompts', v, `${promptName}.txt`);

    try {
        await fs.access(promptPath);
    } catch {
        promptPath = path.join(__dirname, 'prompts', `${promptName}.txt`);
    }

    let template = await fs.readFile(promptPath, 'utf-8');

    for (const key in replacements) {
        const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
        template = template.replace(regex, replacements[key]);
    }
    return template;
}


/**
 * Parses a JSON string from the model response, removing markdown fences.
 * @param {string} jsonString The raw string from the model.
 * @returns {object | null} The parsed JSON object or null if parsing fails.
 */
function parseJsonResponse(jsonString) {
  if (!jsonString) return null;
  let cleanString = jsonString.trim();
  const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
  const match = cleanString.match(fenceRegex);
  if (match && match[2]) {
    cleanString = match[2].trim();
  }

  try {
    return JSON.parse(cleanString);
  } catch (e) {
    console.error("Failed to parse JSON response from Gemini:", e);
    console.error("Original string:", jsonString);
    return null;
  }
}

/**
 * Generates 3 game themes in both English and Ukrainian.
 * @param {boolean} is18PlusMode Whether to generate adult-oriented themes.
 * @param {string} [promptVersion] Optional prompt version ('v1' or 'v2').
 * @returns {Promise<object | null>} A promise that resolves to an object like { en: [], uk: [] } or null.
 */
export async function generateThemes(is18PlusMode = false, promptVersion = null) {
  const client = getAiClient();
  if (!client) {
    console.warn("AI client not available. Using fallback themes.");
    return null;
  }
  const v = promptVersion || (typeof process !== 'undefined' && process.env?.PROMPT_VERSION) || PROMPT_VERSION || 'v2';
  console.log(`Generating new themes from Gemini (Engine: ${v}, 18+ Mode: ${is18PlusMode})...`);

  const themeTypeInstruction = is18PlusMode 
    ? "adult-oriented, potentially edgy or suggestive party game themes suitable for an 18+ audience" 
    : "fun, broad, and imaginative party game themes that allow for many creative answers";
  
  const prompt = await getPrompt('themes', { themeTypeInstruction }, v);
  
  const rawText = await generateContentWithFallback(prompt);
  if (!rawText) return null;

  const themes = parseJsonResponse(rawText);
  if (themes && Array.isArray(themes.en) && Array.isArray(themes.uk) && themes.en.length > 0 && themes.uk.length > 0) {
      console.log("Successfully generated themes:", themes);
      return themes;
  }
  console.error("Failed to get valid themes JSON from Gemini. Response:", rawText);
  return null;
}

/**
 * Generates all necessary text data for a single game round in one API call.
 * @param {string} theme The game theme for battle prompts.
 * @param {'en' | 'uk'} language The language for all content.
 * @param {number} numPlayers The number of players in the game.
 * @param {number} numQuestionsPerPlayer The number of questions to generate for each player.
 * @param {boolean} sillyMode Whether to generate silly questions.
 * @param {boolean} is18PlusMode Whether to generate adult-oriented content.
 * @param {string} [promptVersion] Optional prompt version ('v1' or 'v2').
 * @returns {Promise<{playerQuestions: string[][], battlePrompts: string[], fallbackWords: string[]} | null>}
 */
export async function generateRoundData(theme, language, numPlayers, numQuestionsPerPlayer, sillyMode, is18PlusMode, promptVersion = null) {
  const client = getAiClient();
  if (!client) {
    console.warn("AI client not available. Using fallback round data.");
    return null;
  }
  const v = promptVersion || (typeof process !== 'undefined' && process.env?.PROMPT_VERSION) || PROMPT_VERSION || 'v2';
  console.log(`Generating round data (Engine: ${v}) for ${numPlayers} players. Theme: '${theme}', Language: ${language}, Silly: ${sillyMode}, 18+: ${is18PlusMode}`);
  
  const languageFullName = language === 'uk' ? 'Ukrainian' : 'English';
  const numBattlePrompts = numPlayers;
  const numQuestionSetsToGenerate = numPlayers + 2;

  let playerQuestionInstructions;
  let battlePromptToneInstruction;
  let battlePromptStructureInstruction;

  if (v === 'v2') {
    // --- V2: Streamlined Situational & Ukrainian Case-Safe Engine ---
    const baseGoal = "Your primary goal is to generate questions that prompt fast, vivid, and hilarious answers (5 to 10 words). These questions must elicit descriptive nouns, active verbs, and funny adjectives that are easy to remix in word scrambles.";
    const rules = "Strict Rules to follow:\n1. AVOID single-word answers (e.g., 'What is your favorite color?').\n2. AVOID simple yes/no questions.\n3. AVOID abstract, overly complex, or philosophical questions that take long to read.\n4. Keep questions relatable, playful, and instant to answer (bad advice, weird excuses, secrets, funny reactions).";

    let modeInstruction = '';
    if (is18PlusMode) {
      modeInstruction = "Question Tone: 18+ mode is ON. Questions should be witty, clever, edgy, cheeky, and provocative while remaining accessible.";
    } else if (sillyMode) {
      modeInstruction = "Question Tone: Silly mode is ON. Questions should be wildly absurd, bizarre, and laugh-out-loud funny.";
    }

    let examples;
    if (language === 'uk') {
        examples = `High-Quality Examples (UK):\n- "Яка найгірша порада людині, яка вперше сіла за кермо?" (elicits funny active verbs and objects).\n- "Що ви кричите, коли босою ногою наступаєте на деталь лего в темряві?" (elicits chaotic reactions and punchy words).\n- "Яку таємницю приховує ваш холодильник пізно вночі?" (elicits fun food/action words).\n- "Найдивніше виправдання, чому ви запізнилися на роботу на дві години:" (elicits creative storytelling).\n\nAnti-Examples to AVOID: "Яка ваша улюблена їжа?" (too short) or complex philosophical essays.`;
    } else {
        examples = `High-Quality Examples (EN):\n- "What is the absolute worst advice you could give to someone learning to drive?" (elicits funny active verbs and objects).\n- "What embarrassing secret is your dog hiding from you?" (elicits funny narrative words).\n- "What do you scream when you accidentally drop your phone in the toilet?" (elicits chaotic reactions).\n- "What is the most suspicious excuse for arriving 2 hours late to a party?" (elicits creative excuses).\n\nAnti-Examples to AVOID: "What is your favorite food?" (too short) or complex philosophical essays.`;
    }

    playerQuestionInstructions = `${baseGoal}\n\n${rules}\n\n${modeInstruction}\n\n${examples}`;

    battlePromptToneInstruction = is18PlusMode
      ? 'The 18+ mode is ON, so battle prompts MUST be adult-oriented, cheeky, edgy, provocative, and set in the game theme.'
      : 'These battle prompts MUST be set in the game theme and be funny, situational, and punchy.';

    if (language === 'uk') {
      battlePromptStructureInstruction = 'Critical for Ukrainian Grammar: Phrase prompts as open situational setups ending with a colon (:) or direct questions. DO NOT use fill-in-the-blanks with prepositions (avoid "для ____", "через ____", "проти ____", "керувати ____") because players have limited words with fixed cases. Good examples: "Головне правило виживання тут:", "Попереджувальний напис на дверях:", "Слоган на білборді у центрі міста:", "Скаррга відвідувача адміністратору:", "Що прошепотів шеф-кухар перед втечею:", "Порада від підозрілого лікаря:".';
    } else {
      battlePromptStructureInstruction = 'Critical for Gameplay: Phrase prompts as open situational setups ending with a colon (:) or direct questions. DO NOT use fill-in-the-blanks with prepositions (avoid "In order to ____ one must ____"). Good examples: "Slogan on the billboard for this place:", "Warning sign on the front door:", "The #1 rule of this secret club:", "A 1-star review on Yelp:", "What the villain whispered before escaping:", "The worst excuse when caught red-handed:", "Customer complaint to the manager:".';
    }

  } else {
    // --- V1: Classic Legacy Engine ---
    if (USE_ENHANCED_QUESTION_PROMPTS) {
      const baseGoal = "Your primary goal is to generate questions that prompt storytelling, description, or hypothetical scenarios. These questions must be designed to elicit answers containing vivid adjectives, strong verbs, and imaginative nouns.";
      const rules = "Strict Rules to follow:\n1. AVOID questions that can be answered with a single word (e.g., 'What is your favorite color?').\n2. AVOID simple 'yes/no' questions.\n3. The questions MUST inspire funny and creative answers.";
      
      let modeInstruction = '';
      if (is18PlusMode) {
        modeInstruction = "Question Tone: The 18+ mode is ON. The questions should be witty, clever, and creative, while also being adult-oriented, edgy, or provocative.";
      } else if (sillyMode) {
        modeInstruction = "Question Tone: The Silly mode is ON. The questions must be EXTREMELY silly, absurd, and bizarre.";
      }

      let examples;
      if (language === 'uk') {
          examples = `High-Quality Examples (UK):\n- "Ви — екскурсовод у музеї найгірших винаходів людства. Опишіть свій улюблений експонат." (This forces descriptive and funny words).\n- "Яку таємницю приховує ваш домашній улюбленець, про яку ви навіть не здогадуєтесь?" (This encourages a narrative).\n- "Якби ви могли додати одне безглузде правило до будь-якого виду спорту, що б це було і чому?" (This prompts a hypothetical scenario).\n\nAnti-Example to AVOID: "Яка ваша улюблена їжа?" (The answer is too short and simple).`;
      } else {
          examples = `High-Quality Examples (EN):\n- "You are a lawyer defending a cat that knocked over a priceless vase. What is your closing argument?" (This forces a narrative and fun words).\n- "Describe the secret life of a garden gnome." (This prompts creative description).\n- "What would be the most surprising thing to find at the bottom of the ocean?" (This encourages imagination).\n\nAnti-Example to AVOID: "What is your favorite food?" (The answer is too short and simple).`;
      }

      playerQuestionInstructions = `${baseGoal}\n\n${rules}\n\n${modeInstruction}\n\n${examples}`;
    } else {
        let contentToneInstruction;
        if (is18PlusMode) {
          contentToneInstruction = sillyMode 
            ? "Generate EXTREMELY silly, absurd, and bizarre questions that are ALSO adult-oriented, edgy, or provocative. They MUST NOT relate to the game's theme. Example: 'What is the worst possible thing to yell during a moment of passion?'"
            : "Generate witty, clever, and creative questions that are adult-oriented, edgy, or provocative. They MUST NOT relate to the game's theme. Example: 'What's a terrible pet name to call your partner in public?'";
        } else {
          contentToneInstruction = sillyMode 
            ? "Generate EXTREMELY silly, absurd, and bizarre questions. They must inspire funny answers and MUST NOT relate to the game's theme. Example: 'If you had to replace your teeth with something, what would you choose and why?'"
            : "Generate general, creative, and quirky questions. They must inspire funny answers and MUST NOT relate to the game's theme. Example: 'Describe the secret life of a garden gnome.'";
        }
        const exampleQuestionArray = Array(numQuestionsPerPlayer).fill(null).map((_, i) => `"Question ${i + 1}"`).join(', ');
        const examplePlayerQuestions = Array(2).fill(`[${exampleQuestionArray}]`).join(',\n    ');
        playerQuestionInstructions = `- Question Tone: ${contentToneInstruction}\n- Example for a single player's questions: [${examplePlayerQuestions}]`;
    }

    battlePromptToneInstruction = is18PlusMode
      ? 'The 18+ mode is ON, so the battle prompts MUST be adult-oriented, edgy, suggestive, or provocative, AND be related to the game theme. Do not generate tame prompts.'
      : 'These prompts MUST be related to the theme and should be silly, funny, or quirky.';
      
    if (language === 'uk' && USE_FLEXIBLE_UKRAINIAN_PROMPTS) {
        battlePromptStructureInstruction = 'Critical for Ukrainian: Phrase prompts to be open-ended questions or statements ending with a colon. This avoids strict grammatical requirements for the user\'s answer. Good examples: "Опишіть ідеальний вихідний день:", "Що б ви зробили, якби знайшли чарівну паличку?", "Найгірший подарунок на день народження — це...". Bad examples (avoid): "Найкраща річ у зимі це ____." because it forces a specific grammatical case.';
    } else {
        battlePromptStructureInstruction = 'They MUST be phrased as questions to be answered or as fill-in-the-blank statements. Good examples: "What is a terrible pickup line to use at a funeral?" or "A new rule for Monopoly should be ____."';
    }
  }

  const prompt = await getPrompt('roundData', {
      numPlayers,
      theme,
      languageFullName,
      is18PlusMode: is18PlusMode ? 'ON' : 'OFF',
      sillyMode: sillyMode ? 'ON' : 'OFF',
      numQuestionSetsToGenerate,
      numQuestionsPerPlayer,
      playerQuestionInstructions,
      battlePromptToneInstruction,
      battlePromptStructureInstruction,
      numBattlePrompts
  }, v);

  const rawText = await generateContentWithFallback(prompt);
  if (!rawText) return null;

  const data = parseJsonResponse(rawText);
  if (data && Array.isArray(data.playerQuestions) && Array.isArray(data.battlePrompts) && Array.isArray(data.fallbackWords)) {
      console.log("Successfully generated round data.");
      // Extra validation to ensure the model followed instructions
      data.playerQuestions = data.playerQuestions.filter(qSet => Array.isArray(qSet) && qSet.length === numQuestionsPerPlayer);
      if (data.playerQuestions.length < numPlayers) {
           console.error(`Gemini failed to provide enough valid question sets. Required: ${numPlayers}, Got: ${data.playerQuestions.length}`);
           return null;
      }
      return data;
  }
  console.error("Failed to get valid round data JSON from Gemini. Response:", rawText);
  return null;
}

/**
 * Generates the "Movie Poster" prompts (genre and premise) for the final round battles.
 * @param {string} theme The game theme.
 * @param {'en' | 'uk'} language The language for the content.
 * @param {number} numPrompts The number of prompts to generate.
 * @param {boolean} is18PlusMode Whether to generate adult-oriented content.
 * @param {string} [promptVersion] Optional prompt version ('v1' or 'v2').
 * @returns {Promise<Array<{genre: string, premise: string}> | null>}
 */
export async function generateFinalRoundData(theme, language, numPrompts, is18PlusMode, promptVersion = null) {
  const client = getAiClient();
  if (!client) {
    console.warn("AI client not available. Using fallback final round data.");
    return null;
  }
  const v = promptVersion || (typeof process !== 'undefined' && process.env?.PROMPT_VERSION) || PROMPT_VERSION || 'v2';
  console.log(`Generating ${numPrompts} final round movie prompts (Engine: ${v}). Theme: '${theme}', Language: ${language}, 18+: ${is18PlusMode}`);

  const languageFullName = language === 'uk' ? 'Ukrainian' : 'English';
  
  const toneInstruction = is18PlusMode
    ? "The genre and premise MUST be adult-oriented, edgy, or provocative."
    : "The genre and premise should be funny, epic, or absurd.";

  const prompt = await getPrompt('finalRound', {
      theme,
      languageFullName,
      toneInstruction,
      numPrompts
  }, v);

  const rawText = await generateContentWithFallback(prompt);
  if (!rawText) return null;

  const data = parseJsonResponse(rawText);
  if (data && Array.isArray(data.finalPrompts) && data.finalPrompts.length >= numPrompts) {
    // Validate that each prompt has the correct structure
    const isValid = data.finalPrompts.every(p => p.genre && p.premise);
    if (isValid) {
      console.log("Successfully generated final round data.");
      return data.finalPrompts;
    }
  }
  console.error("Failed to get valid final round data from Gemini. Response:", rawText);
  return null;
}