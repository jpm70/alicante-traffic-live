import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GEMINI_MODEL_STORAGE_KEY,
  GeminiClient,
  GeminiModelsUnavailableError,
  PREFERRED_MODELS,
  generateWithFallback,
  isModelUnavailable,
  pickModelFromList,
} from '../../src/services/gemini';

const notFound = (model: string) =>
  Object.assign(new Error(`{"error":{"code":404,"message":"models/${model} is not found for API version v1beta, or is not supported for generateContent.","status":"NOT_FOUND"}}`), { status: 404 });

// Fake SDK client: `available` models answer, the rest are 404
function fakeClient(available: string[], listed = available) {
  const calls: string[] = [];
  const ai: GeminiClient = {
    models: {
      async generateContent({ model }) {
        calls.push(model);
        if (!available.includes(model)) throw notFound(model);
        return { text: `hola desde ${model}` };
      },
      async list() {
        calls.push('list');
        return (async function* () {
          for (const id of listed) yield { name: `models/${id}`, supportedActions: ['generateContent', 'countTokens'] };
        })();
      },
    },
  };
  return { ai, calls };
}

let store: Record<string, string>;
beforeEach(() => {
  store = {};
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => void (store[k] = v),
    removeItem: (k: string) => void delete store[k],
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('Gemini model errors', () => {
  it('tells a retired model from a bad key or quota', () => {
    expect(isModelUnavailable(notFound('gemini-1.5-flash'))).toBe(true);
    expect(isModelUnavailable(new Error('models/x has been shut down'))).toBe(true);
    expect(isModelUnavailable(Object.assign(new Error('API key not valid. Please pass a valid API key.'), { status: 400 }))).toBe(false);
    expect(isModelUnavailable(Object.assign(new Error('RESOURCE_EXHAUSTED: quota'), { status: 429 }))).toBe(false);
    expect(isModelUnavailable(new TypeError('Failed to fetch'))).toBe(false);
  });
});

describe('Gemini model choice', () => {
  it('picks the newest stable Flash text model', () => {
    const list = ['gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-3.8-flash-tts', 'gemini-3.10-flash-image', 'gemini-4-argon', 'gemini-3.8-live', 'text-embedding-004']
      .map((id) => ({ name: `models/${id}`, supportedActions: ['generateContent'] }));
    expect(pickModelFromList(list)).toBe('gemini-3.8-flash');
    // Version numbers compare as numbers: 3.10 is newer than 3.9
    expect(pickModelFromList([{ name: 'models/gemini-3.9-flash' }, { name: 'models/gemini-3.10-flash' }])).toBe('gemini-3.10-flash');
  });

  it('falls back to the alias, previews and other models', () => {
    expect(pickModelFromList([{ name: 'models/gemini-flash-latest' }, { name: 'models/gemini-3-flash-preview' }])).toBe('gemini-flash-latest');
    expect(pickModelFromList([{ name: 'models/gemini-3-flash-preview' }, { name: 'models/gemini-4-argon' }])).toBe('gemini-3-flash-preview');
    expect(pickModelFromList([{ name: 'models/gemini-4-argon' }])).toBe('gemini-4-argon');
    expect(pickModelFromList([{ name: 'models/gemini-3.8-flash', supportedActions: ['embedContent'] }])).toBeNull();
  });
});

describe('Gemini generation with fallback', () => {
  it('uses the pinned model while it exists', async () => {
    const { ai, calls } = fakeClient([PREFERRED_MODELS[0]]);
    expect(await generateWithFallback(ai, 'hola')).toEqual({ text: `hola desde ${PREFERRED_MODELS[0]}`, model: PREFERRED_MODELS[0] });
    expect(calls).toEqual([PREFERRED_MODELS[0]]);
  });

  it('moves to the alias when the pinned model is retired', async () => {
    const { ai, calls } = fakeClient(['gemini-flash-latest']);
    expect((await generateWithFallback(ai, 'hola')).model).toBe('gemini-flash-latest');
    expect(calls).toEqual([PREFERRED_MODELS[0], 'gemini-flash-latest']);
  });

  it('discovers a model from Google\'s list and remembers it', async () => {
    const { ai, calls } = fakeClient(['gemini-9-flash'], ['gemini-9-flash', 'gemini-9-flash-tts']);
    expect((await generateWithFallback(ai, 'hola')).model).toBe('gemini-9-flash');
    expect(calls).toEqual([...PREFERRED_MODELS, 'list', 'gemini-9-flash']);
    expect(store[GEMINI_MODEL_STORAGE_KEY]).toBe('gemini-9-flash');

    // Next time the remembered model saves the list request
    const again = fakeClient(['gemini-9-flash'], []);
    expect((await generateWithFallback(again.ai, 'hola')).model).toBe('gemini-9-flash');
    expect(again.calls).toEqual([...PREFERRED_MODELS, 'gemini-9-flash']);
  });

  it('does not hide a bad key behind the fallback', async () => {
    const ai: GeminiClient = {
      models: {
        generateContent: async () => {
          throw Object.assign(new Error('API key not valid'), { status: 400 });
        },
        list: async () => (async function* () {})(),
      },
    };
    await expect(generateWithFallback(ai, 'hola')).rejects.toThrow('API key not valid');
  });

  it('explains when Google offers no usable model', async () => {
    const { ai } = fakeClient([], []);
    await expect(generateWithFallback(ai, 'hola')).rejects.toBeInstanceOf(GeminiModelsUnavailableError);
  });
});
