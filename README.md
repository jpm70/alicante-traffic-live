# 🚦 Alicante Tráfico en Vivo · Rutas, Cámaras DGT y Suite Taxi

[![React](https://img.shields.io/badge/React-19.0-61dafb?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646cff?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38bdf8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9-199900?style=for-the-badge&logo=leaflet)](https://leafletjs.com/)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL-black?style=for-the-badge&logo=three.js)](https://threejs.org/)
[![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=for-the-badge&logo=pwa)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/License-MIT-green.style=for-the-badge)](LICENSE)

> **Plataforma web y móvil para moverse por Alicante.** Calcula rutas reales por el callejero (OSRM), las compara con las **incidencias oficiales de la DGT** en tiempo real y con una estimación de retenciones por franja horaria, muestra las **159 cámaras municipales de tráfico** en un solo muro, recorre la ruta en **3D sobre ortofoto real con edificios de OpenStreetMap**, guía con **GPS paso a paso** y ofrece una **suite para taxistas y transporte público** de Alicante.

Creado por [unfantasmaenelsistema.com](https://www.unfantasmaenelsistema.com/).

---

## 📸 Capturas de Pantalla

### 1. Mapa Interactivo y Planificador Inteligente de Rutas
Visualización del trazado con estimación de tiempo, incidencias DGT, cámaras de tráfico en ruta y atajos rápidos.

![Mapa y Planificador de Rutas de Alicante](docs/screenshots/overview.svg)

---

### 2. Tour Virtual Street View Panorámico Sincronizado
Simulación de trayecto real punto a punto a pie de calle, con cartel oficial de calles de Alicante, telemetría de ruta, minimapa con cono de visión y cámara DGT en Picture-in-Picture.

![Tour Virtual Street View](docs/screenshots/streetview.svg)

---

### 3. Modo Salpicadero / Taxi Dashboard (OLED Alto Contraste)
Interfaz pensada para soporte de parabrisas en smartphones, con velocímetro gigante, estimador oficial de taxímetro (Tarifa 1 y 2), radar de demanda en AVE y Aeropuerto, y avisos de fiestas/cortes.

![Modo Salpicadero Taxi Dashboard](docs/screenshots/taxidashboard.svg)

---

### 4. Muro de 159 Cámaras de Tráfico en Vivo
Monitorización simultánea de todas las cámaras de Alicante en una sola pantalla, con autorrefresco cada 15 segundos y filtrado instantáneo por calle.

![Muro de 159 Cámaras DGT](docs/screenshots/camerawall.svg)

---

## 🌟 Características Principales

### 🗺️ 1. Planificador de Rutas en Alicante
- **Rutas reales por calles**: trazado, distancia, tiempo base e indicaciones giro a giro con nombres de calle del motor [OSRM](https://project-osrm.org/) (servidor público y espejo FOSSGIS como respaldo). Si ningún servidor responde, la app lo dice y dibuja una línea punteada marcada como *trazado aproximado*, nunca una recta disfrazada de ruta.
- **Rutas alternativas**: alternativas del propio motor más corredores de Alicante (Litoral, Gran Vía, Vía Parque) cuando el desvío es razonable; se descartan las que repiten el mismo trazado.
- **Incidencias oficiales en la ruta**: accidentes, cortes, obras y retenciones del feed DATEX II de la DGT que caen sobre el trazado suman tiempo y cambian el estado de la ruta.
- **Retenciones estimadas**: no existe un feed público de velocidades en las calles urbanas de Alicante, así que la congestión en cada cámara se **estima** por franja horaria y puntos conflictivos (y la interfaz lo indica). Botón de *Hora Punta* para forzar el escenario de máxima carga.
- **Cámaras en ruta**: solo las que están sobre el trazado (cerca de la línea o en la misma calle), no las de calles paralelas.

### 📹 2. Red de 159 Cámaras DGT en Tiempo Real
- **Muro multicámara único**: Todas las cámaras de Alicante en una cuadrícula optimizada sin sobrecargar la memoria del navegador.
- **Ciclo de refresco continuo**: Actualización automática de instantáneas cada 15 segundos con indicador de cuenta atrás.
- **Modo Picture-in-Picture (PiP)**: Fija cualquier cámara en una ventana flotante para seguir vigilando un cruce mientras navegas por otras pestañas o calculas rutas.
- **Lightbox en alta resolución**: Amplía cualquier imagen a pantalla completa con controles de anterior/siguiente.

### 🧭 3. Tour Virtual 3D y Street View
- **Vuelo 3D y Conducción 3D**: motor Three.js que pinta la ciudad real: ortofoto de Esri como suelo (oscurecida y con rótulos de calles de noche), **edificios de OpenStreetMap extruidos** a lo largo de la ruta, la ruta exacta como cinta sobre la calzada, el coche orientado en el sentido de la marcha y las cámaras de tráfico. Vistas conductor, dron y aérea; la velocidad simulada depende del tramo (curvas, cámaras con retención) y el tiempo avanza en cámara rápida (×5 a ×40) indicada en pantalla.
- **Street View real**: con una clave propia de Google (Street View Static API) se muestran fotos reales en cada punto del trayecto; sin clave, la app lo explica y abre la conducción 3D en su lugar.
- **Cartel de calle real**: nombre de la vía e instrucción siguiente tomados de los pasos de la ruta.
- **Minimapa dinámico** con la posición y la dirección de la vista.

### 🛰️ 4. Navegador GPS Turn-by-Turn
- **Modo Real** (por defecto en móviles y pantallas de coche): la posición del GPS se proyecta sobre la ruta para saber qué maniobra viene, cuánto falta y la hora de llegada; si te sales más de 50 m durante varias lecturas, **recalcula la ruta** desde donde estás.
- **Modo Simulador**: recorre la ruta a su velocidad media en cámara rápida para revisar el paso a paso antes de salir.
- **Voz** (Text-to-Speech) para giros y avisos de cámara, pantalla siempre encendida (Wake Lock) y modo HUD espejado para el parabrisas.
- **En el coche**: Android Auto no ejecuta aplicaciones web; úsala en el móvil con soporte o en el navegador de coches con Android Automotive. El botón *Android Auto / Google Maps* pasa el destino a la navegación nativa.

---

## 🚖 Suite para Transporte Público y Taxistas de Alicante

Activando el modo **"Transporte público"** en la barra superior, la interfaz despliega herramientas exclusivas adaptadas a la normativa municipal de Alicante:

1. **🚖 Red Oficial de Paradas de Taxi y Navegación Rápida**
   - Capa en el mapa con las paradas oficiales de Alicante (Estación AVE Renfe, Estación de Autobuses, Aeropuerto El Altet, Luceros, Mercado Central, Hospital General, Gabriel Miró, Playa de San Juan, Explanada, etc.).
   - Visualización del número de plazas oficiales y navegación directa con un clic.

2. **💶 Estimador de Taxímetro Oficial (Tarifa 1 y Tarifa 2)**
   - Desglose automatizado según la ordenanza del Ayuntamiento de Alicante y la Generalitat Valenciana:
     - **Tarifa 1 (Diurna laborable)** vs. **Tarifa 2 (Nocturna y festivos)**.
     - Bajada de bandera y precio por kilómetro recorrido.
     - Suplementos oficiales aplicables: Aeropuerto Alicante-Elche Miguel Hernández, Estación de Tren AVE Alacant Terminal, nocturnidad (22:00 a 06:00) y domingos/festivos.
     - Ahorro económico y temporal obtenido por circular por carriles reservados.

3. **🚌 Algoritmo de Enrutamiento con «Carril Bus / Taxi»**
   - Acceso autorizado a los carriles reservados de Alicante (Av. Maisonnave, Alfonso X el Sabio, Rambla Méndez Núñez, Av. Aguilera).
   - El motor de enrutamiento reduce drásticamente la penalización por retención en tramos con carril BUS-TAXI, reflejando el tiempo estimado de llegada para vehículos autorizados (los carriles se detectan por el nombre real de las calles de la ruta).

4. **✈️ Monitor de Demanda en Puntos Críticos (AVE y Aeropuerto)**
   - Panel de control de afluencia de pasajeros:
     - Próximas llegadas de trenes de alta velocidad a **Alacant Terminal**.
     - Picos de afluencia de vuelos en el **Aeropuerto Alicante-Elche (ALC)**.
     - Atraque de cruceros turísticos en el Puerto de Alicante y eventos en el Auditorio ADDA o Recinto Ferial IFA.

5. **📱 Modo Salpicadero / Taxi Dashboard (OLED High Contrast)**
   - Vista especial diseñada para soportes de móvil en el parabrisas:
     - Fondo negro puro `#000000` para reducir fatiga visual y ahorrar batería en pantallas OLED.
     - Velocímetro gigante con la velocidad real del GPS (o simulación a lo largo de la ruta si no hay GPS) e instrucción de la próxima maniobra.
     - Taxímetro orientativo con km y tiempo de espera medidos por GPS (no sustituye al taxímetro homologado).
     - Botones táctiles de gran tamaño para interactuar de forma segura.

6. **⚠️ Avisos de Calles Cortadas y Fiestas Locales**
   - Información actualizada sobre afecciones al tráfico por celebraciones tradicionales de Alicante:
     - Mascletàs y monumentos en **Hogueras de San Juan** (corte de Luceros y Alfonso el Sabio).
     - Procesiones de **Semana Santa**, eventos deportivos en el frente marítimo y obras de reasfaltado.

---

## 📱 Soporte PWA (Progressive Web App)
- **Instalable directamente**: Puede agregarse a la pantalla de inicio en iPhone, iPad, Android, macOS y Windows como una aplicación nativa.
- **Funcionamiento Offline**: Service Worker con caché de activos estáticos, interfaz y estilos para arrancar sin conexión.
- **Iconos adaptativos**: Soporte completo para iconos maskable y pantallas retina.

---

## 🛠️ Tecnologías Utilizadas

- **Frontend Core**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
- **Empaquetador y Dev Server**: [Vite 8](https://vitejs.dev/)
- **Estilos y Diseño**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Mapas y Geometría**: [Leaflet](https://leafletjs.com/), OpenStreetMap cartography
- **Gráficos 3D y WebGL**: [Three.js](https://threejs.org/)
- **Iconografía**: [Lucide React](https://lucide.dev/)
- **Backend / Proxy API**: [Express](https://expressjs.com/) sobre Node.js con `tsx`
- **Inteligencia Artificial (Opcional)**: [@google/genai](https://github.com/google-gemini/generative-ai-js) para análisis semántico del tráfico con modelos Gemini de Google AI Studio.

---

## 🚀 Instalación y Puesta en Marcha

### Prerrequisitos
- **Node.js** v20 o superior instalado en el equipo.
- Gestor de paquetes `npm` (incluido con Node.js) o `bun`.

### Paso 1: Clonar el repositorio
```bash
git clone https://github.com/jpm70/alicante-traffic-live.git
cd alicante-traffic-live
```

### Paso 2: Instalar dependencias
```bash
npm install
```

### Paso 3: Configurar variables de entorno
Copia la plantilla de variables de entorno:
```bash
cp .env.example .env
```

*(Opcional)* Si deseas utilizar las funciones asistidas por IA de Gemini, añade tu clave API en el archivo `.env`:
```env
GEMINI_API_KEY="tu_clave_api_aqui"
```
> **Nota:** La aplicación funciona al 100% sin necesidad de configurar ninguna API key. Los usuarios también pueden introducir su clave de Gemini de forma privada en el modal de ajustes del navegador.

### Paso 4: Iniciar el servidor de desarrollo
```bash
npm run dev
```
La aplicación se iniciará en `http://localhost:3000`.

### Paso 5: Compilación para producción
```bash
npm run build
npm start
```
`npm run build` genera el frontend en `dist/` y empaqueta el servidor en `server.js`; `npm start` sirve ambos (por defecto en el puerto 3000, configurable con `PORT`).

> El servidor Express es necesario: además del frontend sirve las incidencias de la DGT (`/api/traffic-alerts`), los edificios de OpenStreetMap para el 3D (`/api/buildings`) y el asesor IA opcional. Un alojamiento solo estático (p. ej. GitHub Pages) no basta.

---

## 📁 Estructura del Proyecto

```text
├── docs/
│   └── screenshots/          # Capturas de pantalla vectoriales (SVG) para documentación
│       ├── overview.svg      # Vista principal del mapa y planificador
│       ├── streetview.svg    # Vista Street View panorámico sincronizado
│       ├── taxidashboard.svg # Modo Salpicadero OLED para taxistas
│       └── camerawall.svg    # Muro interactivo de 159 cámaras DGT
├── public/                   # Activos estáticos, iconos PWA y manifiesto
│   ├── manifest.json         # Configuración PWA
│   ├── sw.js                 # Service Worker (solo cachea recursos propios)
│   └── icono.png             # Icono de la aplicación
├── server/
│   ├── dgtIncidents.ts       # Lector del feed DATEX II de la DGT (incidencias en Alicante)
│   └── osmBuildings.ts       # Edificios de OpenStreetMap vía Overpass, con caché
├── src/
│   ├── components/           # Componentes modulares de interfaz de usuario
│   │   ├── InteractiveMap.tsx          # Mapa Leaflet con capas y marcadores
│   │   ├── RouteSelector.tsx           # Selección de puntos de origen y destino
│   │   ├── RouteComparisonPanel.tsx    # Comparativa de rutas y taxímetro
│   │   ├── RouteTourModal.tsx          # Modal contenedor del tour virtual
│   │   ├── StreetViewTourView.tsx      # Visor Street View con HUD y minimapa
│   │   ├── GpsNavigatorModal.tsx       # Navegador GPS turn-by-turn con voz
│   │   ├── CameraWall.tsx              # Cuadrícula de 159 cámaras en vivo
│   │   ├── CameraLightbox.tsx          # Visor en pantalla completa de cámaras
│   │   ├── FloatingCameraPip.tsx       # Ventana Picture-in-Picture persistente
│   │   ├── PublicTransportBar.tsx      # Barra de herramientas de transporte público
│   │   ├── TaxiFareModal.tsx           # Calculadora oficial de tarifas 1 y 2
│   │   ├── DemandRadarModal.tsx        # Radar de llegadas AVE y vuelos
│   │   ├── TaxiDashboardModal.tsx      # Salpicadero de alto contraste para coche
│   │   ├── LocalClosuresModal.tsx      # Avisos de fiestas y cortes de tráfico
│   │   └── Header.tsx                  # Cabecera principal con selector de modos
│   ├── data/
│   │   ├── cameras.ts         # Base de datos georreferenciada de cámaras DGT
│   │   └── publicTransport.ts # Paradas de taxi, tarifas, carriles y cortes
│   ├── services/
│   │   ├── routing.ts         # Rutas OSRM, cámaras en ruta, estimación de retenciones e incidencias
│   │   ├── geometry.ts        # Distancias, proyección sobre la ruta y simplificación
│   │   └── navigationManeuvers.ts # Maniobras en español a partir de los pasos de OSRM
│   ├── three/
│   │   └── RouteScene.ts      # Motor 3D compartido (ortofoto, edificios OSM, ruta, coche)
│   ├── App.tsx                # Componente raíz y orquestador de estado
│   └── main.tsx               # Entrada de la aplicación React
├── server.ts                  # Servidor Express: API (DGT, edificios, IA) y frontend
├── package.json               # Dependencias y scripts del proyecto
├── tsconfig.json              # Configuración de TypeScript
└── vite.config.ts             # Configuración de Vite con Tailwind CSS
```

---

## 🌐 Opciones de Despliegue en la Nube

El proyecto está preparado para exportarse y desplegarse en cualquier plataforma moderna:

| Plataforma | Tipo | Comando de Build | Comando de Inicio |
| :--- | :--- | :--- | :--- |
| **Render** | Web Service | `npm install && npm run build` | `npm start` |
| **Railway** | Web Service | `npm run build` | `npm start` |
| **Google Cloud Run** | Contenedor / Buildpacks | `npm run build` | `npm start` |

---

## 🏛️ Fuentes de Información y Créditos

- **Cámaras de Tráfico**: imágenes del Centro de Control de Tráfico del Ayuntamiento de Alicante (movilidad.alicante.es).
- **Incidencias**: DGT, Punto de Acceso Nacional de tráfico (nap.dgt.es), feed DATEX II de situaciones.
- **Rutas**: OSRM sobre datos de OpenStreetMap (router.project-osrm.org y routing.openstreetmap.de de FOSSGIS).
- **3D**: ortofoto y rótulos © Esri; edificios © colaboradores de OpenStreetMap vía Overpass API.
- **Tarifas Oficiales de Taxi**: Reguladas por el Ayuntamiento de Alicante y la Conselleria de Medio Ambiente, Agua, Infraestructuras y Territorio (Generalitat Valenciana).
- **Cartografía**: © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors.

Desarrollado con dedicación para la ciudad de Alicante por **[Un Fantasma en el Sistema](https://www.unfantasmaenelsistema.com/)**.

---

## 📄 Licencia

Este proyecto se distribuye bajo la licencia **MIT**. Consulta el archivo `LICENSE` para más información.
