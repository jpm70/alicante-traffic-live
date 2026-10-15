// Shown when a municipal traffic camera does not return an image. A neutral
// placeholder instead of a stock photo, so nobody mistakes it for the real street.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
<rect width="640" height="480" fill="#0f172a"/>
<g fill="none" stroke="#475569" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" transform="translate(250 150)">
<rect x="0" y="30" width="110" height="80" rx="12"/><path d="M110 55l30-18v66l-30-18"/><path d="M-10 0l160 150"/>
</g>
<text x="320" y="340" fill="#94a3b8" font-family="sans-serif" font-size="26" text-anchor="middle">Imagen de cámara no disponible</text>
<text x="320" y="376" fill="#64748b" font-family="sans-serif" font-size="18" text-anchor="middle">Se reintentará en el próximo refresco</text>
</svg>`;

export const CAMERA_UNAVAILABLE_IMG = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
