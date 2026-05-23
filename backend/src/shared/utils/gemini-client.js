import { GoogleGenAI } from '@google/genai';

const BACKOFF_BASE_MS = 200;

let nextKeyIndex = 0;

export function sleep(durationMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

export function isRateLimitError(error) {
  return error?.status === 429 || error?.code === 429 || error?.response?.status === 429;
}

export function normalizeGeminiError(error) {
  let isHighDemand = error?.status === 503 || error?.code === 503 || error?.response?.status === 503;
  if (!isHighDemand && typeof error?.message === 'string' && error.message.toLowerCase().includes('high demand')) {
    isHighDemand = true;
  }
  
  if (isHighDemand) {
    const customError = new Error('Our AI systems are currently handling exceptionally high traffic. Please try again in a few moments.');
    customError.statusCode = 503;
    return customError;
  }
  return error;
}

export function getGeminiKeys(keys) {
  const availableKeys = (keys || []).filter(Boolean);
  console.log("availableKeys", availableKeys);
  if (!availableKeys.length) {
    const error = new Error('Gemini keys are not configured yet.');
    error.statusCode = 503;
    throw error;
  }

  return availableKeys;
}

export function createGeminiClient(apiKey, clientFactory) {
  if (clientFactory) {
    if (typeof clientFactory !== "function") {
      throw new Error("clientFactory must be a function");
    }
    return clientFactory(apiKey);
  }

  return new GoogleGenAI({ apiKey });
}

export async function callGeminiWithRotation({ prompt, model, keys, clientFactory, logger, config }) {
  const totalKeys = keys.length;
  let lastError = null;

  for (let attempt = 0; attempt < totalKeys; attempt += 1) {
    const keyIndex = (nextKeyIndex + attempt) % totalKeys;
    const apiKey = keys[keyIndex];
    const client = createGeminiClient(apiKey, clientFactory);

    try {
      const response = await client.models.generateContent({
        model,
        contents: prompt,
        config
      });

      nextKeyIndex = (nextKeyIndex + 1) % totalKeys;
      return typeof response.text === "function"
        ? response.text()
        : response.text;
    } catch (error) {
      lastError = error;

      if (!isRateLimitError(error) || attempt === totalKeys - 1) {
        throw normalizeGeminiError(error);
      }

      logger?.warn?.(`Gemini key ${keyIndex + 1} hit 429. Rotating to the next key.`);
      await sleep(BACKOFF_BASE_MS * 2 ** attempt);
    }
  }

  throw normalizeGeminiError(lastError);
}
