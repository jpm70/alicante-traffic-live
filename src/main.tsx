import {createRoot} from 'react-dom/client';
import App from './App.tsx';
// Leaflet's styles ship with the app (they used to come from unpkg.com): one request
// less, and the map keeps its layout offline. Before index.css, which overrides parts.
import 'leaflet/dist/leaflet.css';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);
