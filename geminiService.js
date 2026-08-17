


import { GoogleGenAI } from "@google/genai";
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
                    'User-Agent': 'aistudio-build',
                    'Connection': 'keep-alive'
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
 * Automatically resolves language-specific prompt files (e.g. /prompts/uk/ or /prompts/en/).
 * @param {string} promptName - The name of the prompt file (e.g., 'themes').
 * @param {object} replacements - Key/value pairs to replace placeholders in the prompt.
 * @param {string} [language] - Language code ('en' or 'uk'). Defaults to 'en'.
 * @returns {Promise<string>} The processed prompt string.
 */
export async function getPrompt(promptName, replacements = {}, language = 'en') {
    const lang = (language === 'ua' || language === 'uk' || language === 'Ukrainian') ? 'ua' : 'en';
    let promptPath = path.join(__dirname, 'prompts', lang, `${promptName}.txt`);

    try {
        await fs.access(promptPath);
    } catch {
        promptPath = path.join(__dirname, 'prompts', 'en', `${promptName}.txt`);
    }

    let template = await fs.readFile(promptPath, 'utf-8');

    for (const key in replacements) {
        const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
        template = template.replace(regex, replacements[key]);
    }
    return template;
}

/**
 * Parses a JSON string from the model response, removing markdown fences or surrounding chatter.
 * @param {string} jsonString The raw string from the model.
 * @returns {object | null} The parsed JSON object or null if parsing fails.
 */
function parseJsonResponse(jsonString) {
  if (!jsonString || typeof jsonString !== 'string') return null;
  let cleanString = jsonString.trim();

  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  const fenceRegex = /```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/i;
  const match = cleanString.match(fenceRegex);
  if (match && match[1]) {
    cleanString = match[1].trim();
  }

  // Find outermost JSON object/array boundaries if extra conversational text exists
  const firstBrace = cleanString.indexOf('{');
  const firstBracket = cleanString.indexOf('[');
  let startIdx = -1;
  if (firstBrace !== -1 && firstBracket !== -1) {
    startIdx = Math.min(firstBrace, firstBracket);
  } else if (firstBrace !== -1) {
    startIdx = firstBrace;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
  }

  if (startIdx > 0) {
    cleanString = cleanString.slice(startIdx);
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
 * Generates 3 game themes in both English and Ukrainian natively.
 * @param {boolean} is18PlusMode Whether to generate adult-oriented themes.
 * @param {boolean} sillyMode Whether to generate silly/absurd themes.
 * @returns {Promise<object | null>} A promise that resolves to an object like { en: [], uk: [] } or null.
 */
export async function generateThemes(is18PlusMode = false, sillyMode = false) {
  const client = getAiClient();
  if (!client) {
    console.warn("AI client not available. Using fallback themes.");
    return null;
  }
  console.log(`Generating new themes from Gemini (18+ Mode: ${is18PlusMode}, Silly Mode: ${sillyMode})...`);

  const enThemeInstruction = is18PlusMode
    ? "adult-oriented, potentially edgy or suggestive party game themes suitable for an 18+ audience"
    : sillyMode
    ? "wildly absurd, silly, surreal, and laugh-out-loud funny party game themes (e.g. Secret Cult of Pigeon Worshippers, Vikings at an IKEA, Alien Abduction Support Group)"
    : "fun, broad, and imaginative party game themes that allow for many creative answers";

  const uaThemeInstruction = is18PlusMode
    ? "теми для дорослих (18+), дотепні, пікантні, зухвалі та провокаційні"
    : sillyMode
    ? "абсурдні, шалені, сюрреалістичні та дуже смішні теми для вечірки (наприклад: Таємне товариство ледачих котів, Вікінги в ІКЕА, Курси підвищення кваліфікації прибульців)"
    : "веселі, яскраві та цікаві теми для вечірки, які надихають на творчі відповіді";

  try {
    const [promptEn, promptUa] = await Promise.all([
      getPrompt('themes', { themeTypeInstruction: enThemeInstruction }, 'en'),
      getPrompt('themes', { themeTypeInstruction: uaThemeInstruction }, 'ua')
    ]);

    const [rawTextEn, rawTextUa] = await Promise.all([
      generateContentWithFallback(promptEn),
      generateContentWithFallback(promptUa)
    ]);

    const parsedEn = rawTextEn ? parseJsonResponse(rawTextEn) : null;
    const parsedUa = rawTextUa ? parseJsonResponse(rawTextUa) : null;

    const enThemes = (parsedEn && Array.isArray(parsedEn.themes)) ? parsedEn.themes : (parsedEn && Array.isArray(parsedEn.en) ? parsedEn.en : null);
    const uaThemes = (parsedUa && Array.isArray(parsedUa.themes)) ? parsedUa.themes : (parsedUa && (Array.isArray(parsedUa.uk) ? parsedUa.uk : (Array.isArray(parsedUa.ua) ? parsedUa.ua : null)));

    if (enThemes && uaThemes && enThemes.length > 0 && uaThemes.length > 0) {
      const result = { en: enThemes, uk: uaThemes, ua: uaThemes };
      console.log("Successfully generated themes:", result);
      return result;
    }
  } catch (err) {
    console.error("Failed to generate parallel themes:", err);
  }

  return null;
}

/**
 * Generates all necessary text data for a single game round in one API call.
 * @param {string} theme The game theme for battle prompts.
 * @param {'en' | 'ua' | 'uk'} language The language for all content.
 * @param {number} numPlayers The number of players in the game.
 * @param {number} numQuestionsPerPlayer The number of questions to generate for each player.
 * @param {boolean} sillyMode Whether to generate silly questions.
 * @param {boolean} is18PlusMode Whether to generate adult-oriented content.
 * @returns {Promise<{playerQuestions: string[][], battlePrompts: string[], fallbackWords: string[]} | null>}
 */
export async function generateRoundData(theme, language, numPlayers, numQuestionsPerPlayer, sillyMode, is18PlusMode) {
  const client = getAiClient();
  if (!client) {
    console.warn("AI client not available. Using fallback round data.");
    return null;
  }
  console.log(`Generating round data for ${numPlayers} players. Theme: '${theme}', Language: ${language}, Silly: ${sillyMode}, 18+: ${is18PlusMode}`);
  
  const numBattlePrompts = numPlayers;
  const numQuestionSetsToGenerate = numPlayers + 2;

  let playerQuestionInstructions;
  let battlePromptToneInstruction;
  let battlePromptStructureInstruction;

  const isUkrainian = (language === 'ua' || language === 'uk' || language === 'Ukrainian');

  if (isUkrainian) {
    const baseGoal = "Головна мета: генерувати запитання, які провокують швидкі, дотепні та смішні відповіді (5–10 слів). Ці запитання мають спонукати гравців писати активні дієслова, повсякденні предмети та кумедні прикметники, якими друзям буде зручно грати в битвах.";
    const rules = "Суворі правила:\n1. УНИКАЙТЕ однослівних відповідей.\n2. УНИКАЙТЕ простих запитань 'так/ні'.\n3. УНИКАЙТЕ занадто складних чи філософських есе.\n4. Тримайте запитання живими та близькими (погані поради, безглузді виправдання, таємниці, дивні реакції).";

    let modeInstruction = '';
    if (is18PlusMode) {
      modeInstruction = "Тон запитань: Режим 18+ УВІМКНЕНО. Запитання мають бути дотепними, пікантними, зухвалими та провокаційними.";
    } else if (sillyMode) {
      modeInstruction = "Тон запитань: Кумедний режим (Silly Mode) УВІМКНЕНО. Запитання мають бути максимально абсурдними, дивними та смішними.";
    }

    const examples = `Якісні приклади (UA):\n- "Яка найгірша порада людині, яка вперше сіла за кермо?" (провокує активні дієслова та предмети).\n- "Що ви кричите, коли босою ногою наступаєте на деталь лего в темряві?" (провокує хаотичні реакції).\n- "Яку таємницю приховує ваш холодильник пізно вночі?" (провокує кумедні слова).\n- "Найдивніше виправдання, чому ви запізнилися на роботу на дві години:" (провокує творчі історії).\n\nАнти-приклади (УНИКАТИ): "Яка ваша улюблена їжа?" (занадто коротко).`;

    playerQuestionInstructions = `${baseGoal}\n\n${rules}\n\n${modeInstruction}\n\n${examples}`;

    battlePromptToneInstruction = is18PlusMode
      ? 'Режим 18+ УВІМКНЕНО, тому завдання для битв МАЮТЬ бути дорослими, пікантними, зухвалими та прив\'язаними до теми.'
      : 'Завдання для битв МАЮТЬ бути прив\'язані до теми гри, бути смішними, ситуативними та динамічними.';

    battlePromptStructureInstruction = 'Критично для української граматики: Оформлюйте завдання як відкриті ситуативні конструкції, що закінчуються двокрапкою (:) або прямим запитанням. НЕ використовуйте пропуски з прийменниками (уникайте "для ____", "через ____", "проти ____", "керувати ____") тому що гравці мають слова лише у фіксованих відмінках. Гарні приклади: "Головне правило виживання тут:", "Попереджувальний напис на дверях:", "Слоган на білборді у центрі міста:", "Скарга відвідувача адміністратору:", "Що прошепотів шеф-кухар перед втечею:", "Порада від підозрілого лікаря:".';

  } else {
    const baseGoal = "Your primary goal is to generate questions that prompt fast, vivid, and hilarious answers (5 to 10 words). These questions must elicit descriptive nouns, active verbs, and funny adjectives that are easy to remix in word scrambles.";
    const rules = "Strict Rules to follow:\n1. AVOID single-word answers (e.g., 'What is your favorite color?').\n2. AVOID simple yes/no questions.\n3. AVOID abstract, overly complex, or philosophical questions that take long to read.\n4. Keep questions relatable, playful, and instant to answer (bad advice, weird excuses, secrets, funny reactions).";

    let modeInstruction = '';
    if (is18PlusMode) {
      modeInstruction = "Question Tone: 18+ mode is ON. Questions should be witty, clever, edgy, cheeky, and provocative while remaining accessible.";
    } else if (sillyMode) {
      modeInstruction = "Question Tone: Silly mode is ON. Questions should be wildly absurd, bizarre, and laugh-out-loud funny.";
    }

    const examples = `High-Quality Examples (EN):\n- "What is the absolute worst advice you could give to someone learning to drive?" (elicits funny active verbs and objects).\n- "What embarrassing secret is your dog hiding from you?" (elicits funny narrative words).\n- "What do you scream when you accidentally drop your phone in the toilet?" (elicits chaotic reactions).\n- "What is the most suspicious excuse for arriving 2 hours late to a party?" (elicits creative excuses).\n\nAnti-Examples to AVOID: "What is your favorite food?" (too short) or complex philosophical essays.`;

    playerQuestionInstructions = `${baseGoal}\n\n${rules}\n\n${modeInstruction}\n\n${examples}`;

    battlePromptToneInstruction = is18PlusMode
      ? 'The 18+ mode is ON, so battle prompts MUST be adult-oriented, cheeky, edgy, provocative, and set in the game theme.'
      : 'These battle prompts MUST be set in the game theme and be funny, situational, and punchy.';

    battlePromptStructureInstruction = 'Critical for Gameplay: Phrase prompts as open situational setups ending with a colon (:) or direct questions. DO NOT use fill-in-the-blanks with prepositions (avoid "In order to ____ one must ____"). Good examples: "Slogan on the billboard for this place:", "Warning sign on the front door:", "The #1 rule of this secret club:", "A 1-star review on Yelp:", "What the villain whispered before escaping:", "The worst excuse when caught red-handed:", "Customer complaint to the manager:".';
  }

  const prompt = await getPrompt('roundData', {
      numPlayers,
      theme,
      is18PlusMode: is18PlusMode ? 'ON' : 'OFF',
      sillyMode: sillyMode ? 'ON' : 'OFF',
      numQuestionSetsToGenerate,
      numQuestionsPerPlayer,
      playerQuestionInstructions,
      battlePromptToneInstruction,
      battlePromptStructureInstruction,
      numBattlePrompts
  }, language);

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
 * @param {'en' | 'ua' | 'uk'} language The language for the content.
 * @param {number} numPrompts The number of prompts to generate.
 * @param {boolean} is18PlusMode Whether to generate adult-oriented content.
 * @returns {Promise<Array<{genre: string, premise: string}> | null>}
 */
export async function generateFinalRoundData(theme, language, numPrompts, is18PlusMode) {
  const client = getAiClient();
  if (!client) {
    console.warn("AI client not available. Using fallback final round data.");
    return null;
  }
  console.log(`Generating ${numPrompts} final round movie prompts. Theme: '${theme}', Language: ${language}, 18+: ${is18PlusMode}`);

  const isUkrainian = (language === 'ua' || language === 'uk' || language === 'Ukrainian');

  let toneInstruction;
  if (isUkrainian) {
    toneInstruction = is18PlusMode
      ? "Жанр і зав'язка мають бути дорослими (18+), зухвалими або провокаційними."
      : "Жанр і зав'язка мають бути смішними, епічними або абсурдними.";
  } else {
    toneInstruction = is18PlusMode
      ? "The genre and premise MUST be adult-oriented, edgy, or provocative."
      : "The genre and premise should be funny, epic, or absurd.";
  }

  const prompt = await getPrompt('finalRound', {
      theme,
      toneInstruction,
      numPrompts
  }, language);

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