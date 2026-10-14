import { CalculatedRoute, RoutePoint } from './routing';

/**
 * Generates standard GPX 1.1 XML string containing the route polyline and traffic camera waypoints
 */
export function generateRouteGpx(
  route: CalculatedRoute,
  origin: RoutePoint & { name: string },
  destination: RoutePoint & { name: string }
): string {
  const timestamp = new Date().toISOString();

  let waypointsXml = '';

  // 1. Origin & Destination Waypoints
  waypointsXml += `  <wpt lat="${origin.lat}" lon="${origin.lng}">
    <name>Origen: ${escapeXml(origin.name)}</name>
    <sym>Flag, Green</sym>
    <type>Origin</type>
  </wpt>\n`;

  waypointsXml += `  <wpt lat="${destination.lat}" lon="${destination.lng}">
    <name>Destino: ${escapeXml(destination.name)}</name>
    <sym>Flag, Red</sym>
    <type>Destination</type>
  </wpt>\n`;

  // 2. Traffic Camera Waypoints along the route
  route.cameras.forEach((cam) => {
    waypointsXml += `  <wpt lat="${cam.lat}" lon="${cam.lng}">
    <name>Cámara ${cam.id}: ${escapeXml(cam.name)}</name>
    <desc>Cámara de Tráfico Alicante (${cam.zona}) - Estado habitual: ${cam.status}</desc>
    <sym>Camera</sym>
    <type>TrafficCamera</type>
  </wpt>\n`;
  });

  // 3. Track polyline
  let trackpointsXml = '';
  route.coordinates.forEach(([lat, lng]) => {
    trackpointsXml += `      <trkpt lat="${lat}" lon="${lng}" />\n`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Alicante Trafico - Un Fantasma en el Sistema"
     xmlns="http://www.topografix.com/GPX/1/1"
     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
     xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${escapeXml(route.name)}</name>
    <desc>Ruta optimizada en Alicante (${route.distanceKm} km, ~${route.totalMinutes} min) con ${route.cameras.length} cámaras de tráfico</desc>
    <author>
      <name>Alicante Tráfico en Vivo</name>
      <link href="https://www.unfantasmaenelsistema.com/" />
    </author>
    <time>${timestamp}</time>
  </metadata>
${waypointsXml}
  <trk>
    <name>${escapeXml(route.name)}</name>
    <desc>Distancia: ${route.distanceKm} km | Tiempo estimado: ${route.totalMinutes} min</desc>
    <trkseg>
${trackpointsXml}    </trkseg>
  </trk>
</gpx>`;
}

/**
 * Generates KML for Google Earth and vehicle navigation systems
 */
export function generateRouteKml(
  route: CalculatedRoute,
  origin: RoutePoint & { name: string },
  destination: RoutePoint & { name: string }
): string {
  const coordString = route.coordinates.map(([lat, lng]) => `${lng},${lat},0`).join(' ');

  let cameraPlacemarks = '';
  route.cameras.forEach((cam) => {
    cameraPlacemarks += `    <Placemark>
      <name>Cámara ${cam.id}: ${escapeXml(cam.name)}</name>
      <description>Cámara de Tráfico Alicante - ${cam.zona} (Tráfico: ${cam.status})</description>
      <Point>
        <coordinates>${cam.lng},${cam.lat},0</coordinates>
      </Point>
    </Placemark>\n`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(route.name)}</name>
    <description>Ruta en Alicante (${route.distanceKm} km, ${route.totalMinutes} min)</description>
    <Style id="routeLine">
      <LineStyle>
        <color>ff00ffff</color>
        <width>5</width>
      </LineStyle>
    </Style>
    <Placemark>
      <name>Origen: ${escapeXml(origin.name)}</name>
      <Point><coordinates>${origin.lng},${origin.lat},0</coordinates></Point>
    </Placemark>
    <Placemark>
      <name>Destino: ${escapeXml(destination.name)}</name>
      <Point><coordinates>${destination.lng},${destination.lat},0</coordinates></Point>
    </Placemark>
${cameraPlacemarks}
    <Placemark>
      <name>Trayecto: ${escapeXml(route.name)}</name>
      <styleUrl>#routeLine</styleUrl>
      <LineString>
        <tessellate>1</tessellate>
        <coordinates>${coordString}</coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`;
}

/**
 * Triggers a browser file download
 */
export function downloadRouteFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
