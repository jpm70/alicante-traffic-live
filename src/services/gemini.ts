// Optional AI traffic advisor with the user's own Gemini key, called directly from the
// browser (Google's API allows it). The key never leaves the device except to Google.
//
// Google retires and renames models every few months. The app asks for a pinned model
// first; if Google answers that it no longer exists, it tries the "latest" alias and then
// the newest Flash model the key can use (from Google's own model list), and remembers it.
// A weekly workflow (scripts/check-gemini.ts) warns when the pinned model is gone, so it
// can be updated here.
import type { CalculatedRoute } from './routing';

export const GEMINI_API_KEY_STORAGE_KEY = 'alicante_gemini_api_key';
export const GEMINI_MODEL_STORAGE_KEY = 'alicante_gemini_model';

// Stable model checked on 2026-10-15 (no shutdown date announced), then Google's alias
// that always points to the current Flash model
export const PREFERRED_MODELS = ['gemini-3.8-flash', 'gemini-flash-latest'];

export function getStoredGeminiKey(): string {
  try {
    return localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function storedModel(): string | null {
  try {
    return localStorage.getItem(GEMINI_MODEL_STORAGE_KEY);
  } catch {
    return null;
  }
}

function rememberModel(model: string | null): void {
  try {
    if (model) localStorage.setItem(GEMINI_MODEL_STORAGE_KEY, model);
    else localStorage.removeItem(GEMINI_MODEL_STORAGE_KEY);
  } catch {
    // Private mode: it is found again next time
  }
}

// The part of the SDK client this module uses (lets the tests use a fake one)
export interface GeminiClient {
  models: {
    generateContent(params: { model: string; contents: string }): Promise<{ text?: string }>;
    list(params?: { config?: { pageSize?: number } }): Promise<AsyncIterable<{ name?: string; supportedActions?: string[] }>>;
  };
}

// Loaded on demand: the SDK is only needed by people who configured a key
async function client(apiKey: string): Promise<GeminiClient> {
  const { GoogleGenAI } = await import('@google/genai');
  return new GoogleGenAI({ apiKey }) as unknown as GeminiClient;
}

// Google's answer when a model id does not exist (any more) or cannot generate text
export function isModelUnavailable(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  const message = err instanceof Error ? err.message : String(err);
  if (/API key not valid|API_KEY_INVALID|RESOURCE_EXHAUSTED|quota/i.test(message)) return false;
  return status === 404 || /NOT_FOUND|is not found|not supported for generateContent|no longer available|has been (shut down|retired|deprecated)/i.test(message);
}

const versionOf = (id: string) => (id.match(/^gemini-(\d+(?:\.\d+)*)/)?.[1] || '0').split('.').map(Number);
const newerFirst = (a: string, b: string) => {
  const va = versionOf(a);
  const vb = versionOf(b);
  for (let i = 0; i < Math.max(va.length, vb.length); i++) {
    const d = (vb[i] || 0) - (va[i] || 0);
    if (d) return d;
  }
  return a.localeCompare(b);
};

// Best general text model in Google's list: the newest stable Flash, then the Flash alias,
// then the newest Flash preview/lite, then any other Gemini text model.
export function pickModelFromList(models: { name?: string; supportedActions?: string[] }[]): string | null {
  const ids = models
    .filter((m) => !m.supportedActions || m.supportedActions.includes('generateContent'))
    .map((m) => (m.name || '').replace(/^models\//, ''))
    .filter((id) => id.startsWith('gemini-') && !/tts|image|live|audio|embed|transcribe|translate|computer-use|robotics|nano|omni/i.test(id));
  const tiers = [
    ids.filter((id) => /^gemini-\d+(\.\d+)*-flash$/.test(id)),
    ids.filter((id) => id === 'gemini-flash-latest'),
    ids.filter((id) => /^gemini-\d+(\.\d+)*-flash/.test(id)),
    ids,
  ];
  for (const tier of tiers) {
    if (tier.length) return [...tier].sort(newerFirst)[0];
  }
  return null;
}

export class GeminiModelsUnavailableError extends Error {
  constructor() {
    super('Google ha retirado los modelos de Gemini que usa la app y no ofrece ninguno compatible para esta clave.');
    this.name = 'GeminiModelsUnavailableError';
  }
}

// Generates with the preferred models, the remembered one, or one discovered in Google's
// list. Errors other than "model unavailable" (bad key, quota, network) are thrown as is.
export async function generateWithFallback(ai: GeminiClient, contents: string): Promise<{ text: string; model: string }> {
  const remembered = storedModel();
  const tried = new Set<string>();

  const attempt = async (model: string) => {
    tried.add(model);
    const response = await ai.models.generateContent({ model, contents });
    if (model !== remembered) rememberModel(model);
    return { text: response.text || '', model };
  };

  // Preferred models first, so a model pinned in a later version of the app takes over;
  // the remembered one saves the model list request when they are all gone.
  for (const model of [...new Set([...PREFERRED_MODELS, remembered].filter((m): m is string => Boolean(m)))]) {
    try {
      return await attempt(model);
    } catch (err) {
      if (!isModelUnavailable(err)) throw err;
      if (model === remembered) rememberModel(null);
    }
  }

  const listed: { name?: string; supportedActions?: string[] }[] = [];
  for await (const m of await ai.models.list({ config: { pageSize: 1000 } })) listed.push(m);
  const discovered = pickModelFromList(listed.filter((m) => !tried.has((m.name || '').replace(/^models\//, ''))));
  if (!discovered) throw new GeminiModelsUnavailableError();
  return attempt(discovered);
}

export function explainGeminiError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes('API key not valid') || message.includes('API_KEY_INVALID')) {
    return 'La clave API no es válida según Google. Revisa que la has copiado completa desde Google AI Studio.';
  }
  if (message.includes('quota') || message.includes('RESOURCE_EXHAUSTED')) {
    return 'La clave ha alcanzado el límite de cuota temporal de Google. Inténtalo más tarde.';
  }
  if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
    return 'Error de red al contactar con Gemini. Verifica tu conexión.';
  }
  return message;
}

// Returns the model that answered
export async function testGeminiKey(apiKey: string): Promise<string> {
  const ai = await client(apiKey);
  const { text, model } = await generateWithFallback(ai, 'Responde exclusivamente con la palabra OK.');
  if (!text) throw new Error('No se recibió respuesta válida del modelo Gemini.');
  return model;
}

export async function askTrafficAdvisor(params: {
  apiKey: string;
  originName: string;
  destinationName: string;
  routes: CalculatedRoute[];
  rushHourActive: boolean;
}): Promise<string> {
  const { apiKey, originName, destinationName, routes, rushHourActive } = params;
  const summary = routes.map((r) => ({
    id: r.id,
    name: r.name,
    distanceKm: r.distanceKm,
    baseMinutes: r.baseMinutes,
    trafficDelayMinutes: r.trafficDelayMinutes,
    totalMinutes: r.totalMinutes,
    status: r.status,
    camerasCount: r.cameras.length,
    congestedCameras: r.cameras.filter((c) => c.status !== 'fluido').map((c) => `${c.name}: ${c.status} (estimado)`),
    officialIncidents: r.incidents.map((a) => `${a.title} · ${a.street}`),
  }));

  const prompt = `Actúa como el Ingeniero Jefe del Centro de Control de Tráfico de Alicante.
Analiza las opciones de ruta solicitadas por el conductor entre:
- Origen: ${originName}
- Destino: ${destinationName}
- Hora actual / Contexto: ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}, ${rushHourActive ? 'HORA PUNTA ACTIVA' : 'Tráfico estándar'}.

Rutas calculadas (las retenciones por cámara son estimaciones por franja horaria; las incidencias son oficiales de la DGT):
${JSON.stringify(summary, null, 2)}

Proporciona un informe conciso y táctico en español con:
1. "RECOMENDACIÓN": la ruta más rápida y por qué (tiempo estimado y ahorro frente a las alternativas).
2. "PUNTOS CRÍTICOS": cruces, rotondas o incidencias de la ruta a vigilar.
3. "CONSEJO DE CONDUCCIÓN": recomendación práctica para este trayecto.

Máximo 150 palabras, estilo centro de control.`;

  const ai = await client(apiKey);
  const { text } = await generateWithFallback(ai, prompt);
  return text || 'Análisis completado.';
}
