// Optional AI traffic advisor with the user's own Gemini key, called directly from the
// browser (Google's API allows it). The key never leaves the device except to Google.
import type { CalculatedRoute } from './routing';

export const GEMINI_API_KEY_STORAGE_KEY = 'alicante_gemini_api_key';
const MODEL = 'gemini-3.8-flash';

export function getStoredGeminiKey(): string {
  try {
    return localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

// Loaded on demand: the SDK is only needed by people who configured a key
async function client(apiKey: string) {
  const { GoogleGenAI } = await import('@google/genai');
  return new GoogleGenAI({ apiKey });
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

export async function testGeminiKey(apiKey: string): Promise<void> {
  const ai = await client(apiKey);
  const response = await ai.models.generateContent({ model: MODEL, contents: 'Responde exclusivamente con la palabra OK.' });
  if (!response.text) throw new Error('No se recibió respuesta válida del modelo Gemini.');
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
  const response = await ai.models.generateContent({ model: MODEL, contents: prompt });
  return response.text || 'Análisis completado.';
}
