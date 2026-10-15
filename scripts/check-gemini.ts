// Weekly check that the Gemini model pinned in src/services/gemini.ts still exists.
// The app falls back on its own when Google retires it, but the pin should be updated:
// this run fails (and GitHub emails the owner) when the pinned model is gone.
//
// Needs the repository secret GEMINI_API_KEY; without it the check is skipped.
import { PREFERRED_MODELS, pickModelFromList } from '../src/services/gemini';

const API = 'https://generativelanguage.googleapis.com/v1beta';
const key = process.env.GEMINI_API_KEY;
const pinned = PREFERRED_MODELS[0];

async function main() {
  if (!key) {
    console.log('Sin secreto GEMINI_API_KEY: no se comprueba el modelo de Gemini.');
    return;
  }
  const headers = { 'x-goog-api-key': key, 'content-type': 'application/json' };

  const models: { name: string; supportedGenerationMethods?: string[] }[] = [];
  let pageToken = '';
  do {
    const res = await fetch(`${API}/models?pageSize=1000${pageToken ? `&pageToken=${pageToken}` : ''}`, { headers });
    if (!res.ok) throw new Error(`Lista de modelos: HTTP ${res.status} ${await res.text()}`);
    const data = await res.json();
    models.push(...(data.models || []));
    pageToken = data.nextPageToken || '';
  } while (pageToken);

  const fallback = pickModelFromList(models.map((m) => ({ name: m.name, supportedActions: m.supportedGenerationMethods })));
  console.log(`${models.length} modelos disponibles. Si el fijado desapareciera, la app usaría: ${fallback ?? 'ninguno'}`);

  const listed = models.find((m) => m.name === `models/${pinned}`);
  if (!listed || !listed.supportedGenerationMethods?.includes('generateContent')) {
    console.error(`El modelo fijado ${pinned} ya no está en la lista de Google. Actualiza PREFERRED_MODELS en src/services/gemini.ts (sugerencia: ${fallback}).`);
    process.exitCode = 1;
    return;
  }

  const res = await fetch(`${API}/models/${pinned}:generateContent`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ contents: [{ parts: [{ text: 'Responde exclusivamente con la palabra OK.' }] }] }),
  });
  if (res.status === 429) {
    console.log(`${pinned} existe; la cuota de la clave está agotada ahora mismo, no se prueba la respuesta.`);
    return;
  }
  if (!res.ok) {
    console.error(`${pinned} no responde: HTTP ${res.status} ${await res.text()}`);
    process.exitCode = 1;
    return;
  }
  console.log(`${pinned} responde correctamente.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
