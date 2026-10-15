import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { getDgtAlerts } from './server/dgtIncidents';
import { getBuildingsAlongLine, validateBuildingsRequest, BuildingsRequestError } from './server/osmBuildings';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// `npm start` runs the bundled server.js next to dist/; `npm run dev` runs server.ts through tsx
const isProduction = process.env.NODE_ENV === 'production' || path.basename(__filename) === 'server.js';

app.use(express.json({ limit: '1mb' }));

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Alicante Traffic Server' });
});

// Official traffic incidents around Alicante (DGT DATEX II feed, cached 3 min)
app.get('/api/traffic-alerts', async (req, res) => {
  try {
    const { alerts, publishedAt } = await getDgtAlerts();
    res.json({
      success: true,
      count: alerts.length,
      alerts,
      source: 'DGT · Punto de Acceso Nacional (DATEX II)',
      updatedAt: publishedAt,
    });
  } catch (err: any) {
    console.error('Error fetching DGT incidents:', err?.message || err);
    res.status(502).json({
      success: false,
      count: 0,
      alerts: [],
      source: 'DGT · Punto de Acceso Nacional (DATEX II)',
      updatedAt: new Date().toISOString(),
      error: 'No se pudo consultar el servicio de incidencias de la DGT',
    });
  }
});

// OpenStreetMap building footprints along a route (for the 3D tours)
app.post('/api/buildings', async (req, res) => {
  try {
    const { line, radius, limit } = validateBuildingsRequest(req.body);
    const buildings = await getBuildingsAlongLine(line, radius, limit);
    res.set('Cache-Control', 'public, max-age=86400');
    res.json({ success: true, count: buildings.length, buildings, attribution: '© OpenStreetMap contributors' });
  } catch (err: any) {
    if (err instanceof BuildingsRequestError) {
      return res.status(400).json({ success: false, error: err.message, buildings: [] });
    }
    console.error('Error fetching OSM buildings:', err?.message || err);
    res.status(502).json({ success: false, error: 'Servicio de edificios OSM no disponible', buildings: [] });
  }
});

// AI Traffic Advisor Endpoint
app.post('/api/ai-traffic-advisor', async (req, res) => {
  try {
    const { origin, destination, routes, rushHourActive } = req.body;

    // Check user-provided custom key from browser localStorage or server env
    const customApiKey = (req.headers['x-gemini-api-key'] as string) || req.body?.customApiKey;
    const apiKey = (customApiKey && typeof customApiKey === 'string' && customApiKey.trim().length > 0)
      ? customApiKey.trim()
      : process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(200).json({
        analysis: "Clave de API de Gemini no configurada en el servidor ni en el navegador. Mostrando análisis heurístico basado en cámaras de tráfico en vivo.",
        fastestRouteId: routes?.[0]?.id || "r1",
        isFallback: true
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Actúa como el Ingeniero Jefe del Centro de Control de Tráfico de Alicante (SITP / Sala de Control de Movilidad).
Analiza las opciones de ruta solicitadas por el conductor entre:
- Origen: ${origin?.name || 'Origen seleccionado'}
- Destino: ${destination?.name || 'Destino seleccionado'}
- Hora actual / Contexto: ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}, ${rushHourActive ? 'HORA PUNTA ACTIVA' : 'Tráfico estándar'}.

Rutas calculadas:
${JSON.stringify(routes.map((r: any) => ({
  id: r.id,
  name: r.name,
  distanceKm: r.distanceKm,
  baseMinutes: r.baseMinutes,
  trafficDelayMinutes: r.trafficDelayMinutes,
  totalMinutes: r.totalMinutes,
  status: r.status,
  camerasCount: r.cameras?.length,
  congestedCameras: r.cameras?.filter((c: any) => c.status !== 'fluido').map((c: any) => `${c.id} (${c.name}: ${c.status})`)
})), null, 2)}

Por favor proporciona un informe conciso, directo y táctico en español con:
1. "RECOMENDACIÓN": Cuál es la ruta claramente más rápida hoy y por qué (menciona el tiempo exacto estimado y el ahorro frente a las alternativas).
2. "PUNTOS CRÍTICOS": Alertas específicas de cruces o rotondas de Alicante donde hay retención o riesgo (p.ej. Rotonda Jesuitas, acceso A-70, Avda. Novelda, Maisonnave, etc.).
3. "CONSEJO DE CONDUCCIÓN": Recomendación práctica para este trayecto (carril a elegir, semáforos, o momento idóneo).

Sé conciso (máximo 150 palabras), muy profesional y de estilo centro de control.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    const analysisText = response.text || 'Análisis completado.';

    res.json({
      success: true,
      analysis: analysisText
    });
  } catch (err: any) {
    console.error('Error in /api/ai-traffic-advisor:', err);
    res.status(500).json({
      error: 'Error al contactar con el Asesor de Tráfico IA',
      details: err.message
    });
  }
});

// Endpoint to validate and test Gemini API Key provided by user
app.post('/api/test-gemini-key', async (req, res) => {
  try {
    const customApiKey = (req.headers['x-gemini-api-key'] as string) || req.body?.apiKey;
    const apiKey = (customApiKey && typeof customApiKey === 'string' && customApiKey.trim().length > 0)
      ? customApiKey.trim()
      : process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'No se ha proporcionado ninguna clave API de Gemini.'
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: 'Responde exclusivamente con la palabra OK.',
    });

    if (response.text) {
      return res.json({
        success: true,
        message: '¡Conexión verificada con Gemini! Tu clave es válida y está lista para usarse.'
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'No se recibió respuesta válida del modelo Gemini.'
      });
    }
  } catch (err: any) {
    console.error('Error testing Gemini key:', err);
    let errorMsg = 'Error validando la clave API de Gemini.';
    if (typeof err.message === 'string') {
      if (err.message.includes('API key not valid') || err.message.includes('API_KEY_INVALID')) {
        errorMsg = 'La clave API introducida no es válida según Google. Revisa haberla copiado correctamente de Google AI Studio.';
      } else if (err.message.includes('quota') || err.message.includes('RESOURCE_EXHAUSTED')) {
        errorMsg = 'La clave ha alcanzado el límite de cuota temporal de Google. Inténtalo más tarde.';
      } else {
        errorMsg = err.message;
      }
    }
    return res.status(400).json({
      success: false,
      error: errorMsg
    });
  }
});

// Mount Vite middleware in development
async function startServer() {
  if (!isProduction) {
    app.use(express.static(path.resolve(__dirname, 'public')));
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get(/^(?!\/api\/).*/, (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`Alicante Traffic App server listening on port ${port}`);
  });
}

startServer();
