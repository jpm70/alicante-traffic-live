/**
 * Alicante Traffic Cameras Dataset
 * Source: Ayuntamiento de Alicante (movilidad.alicante.es)
 * Original repo: github.com/jpm70/TraficoAlicante
 */

export interface TrafficCamera {
  id: string;
  name: string;
  zona: string;
  url: string;
  lat: number;
  lng: number;
  index: number;
}

export interface AlicanteZone {
  name: string;
  count: number;
  color: string;
}

export const CAMERAS: TrafficCamera[] = [
  {
    "id": "C29M6",
    "name": "Cardenal Francisco Álvarez",
    "zona": "Gran Vía",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C29M6.jpg?itok=FOrqa30Q",
    "lat": 38.3535,
    "lng": -0.505,
    "index": 0
  },
  {
    "id": "C29M4",
    "name": "Dr. Jiménez Díaz",
    "zona": "Gran Vía",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C29M4.jpg?itok=Y8CQk6-U",
    "lat": 38.351,
    "lng": -0.503,
    "index": 1
  },
  {
    "id": "C11M5",
    "name": "C/ Orión",
    "zona": "Gran Vía",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C11M5.jpg?itok=0cgKRmwy",
    "lat": 38.3495,
    "lng": -0.5045,
    "index": 2
  },
  {
    "id": "C52M3",
    "name": "C/ Bellea del foc",
    "zona": "Gran Vía",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C52M3.jpg?itok=ktqVY-XN",
    "lat": 38.3668,
    "lng": -0.4705,
    "index": 3
  },
  {
    "id": "C52M2",
    "name": "Plaza del Milenio",
    "zona": "Gran Vía",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C52M2.jpg?itok=GmfyLoGq",
    "lat": 38.366,
    "lng": -0.468,
    "index": 4
  },
  {
    "id": "C39F3",
    "name": "Avda. Novelda",
    "zona": "Gran Vía",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C39F3.jpg?itok=bSrCE-tR",
    "lat": 38.3615,
    "lng": -0.4935,
    "index": 5
  },
  {
    "id": "C19M4",
    "name": "C/ México",
    "zona": "Gran Vía",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C19M4.jpg?itok=BvOYg6rO",
    "lat": 38.334,
    "lng": -0.503,
    "index": 6
  },
  {
    "id": "C19M2",
    "name": "A 31",
    "zona": "Gran Vía",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C19M2.jpg?itok=oBHrBvX5",
    "lat": 38.331,
    "lng": -0.51,
    "index": 7
  },
  {
    "id": "C29M3",
    "name": "Dr. Jiménez Díaz",
    "zona": "Gran Vía",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C29M3.jpg?itok=PnF9s481",
    "lat": 38.349,
    "lng": -0.502,
    "index": 8
  },
  {
    "id": "C11M4",
    "name": "Av. Orihuela",
    "zona": "Gran Vía",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C11M4.jpg?itok=r3cXc6qD",
    "lat": 38.3465,
    "lng": -0.508,
    "index": 9
  },
  {
    "id": "C52M4",
    "name": "C/ Pintor Xavier Soler",
    "zona": "Gran Vía",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C52M4.jpg?itok=qDfjrER2",
    "lat": 38.3665,
    "lng": -0.473,
    "index": 10
  },
  {
    "id": "C54M1",
    "name": "C/ Dr. Rico - Campo de Mirra",
    "zona": "Gran Vía",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C54M1.jpg?itok=UxQdl1KP",
    "lat": 38.354,
    "lng": -0.498,
    "index": 11
  },
  {
    "id": "C29M1",
    "name": "Dr. Jiménez Díaz",
    "zona": "Gran Vía",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C29M1.jpg?itok=lrmp0MYg",
    "lat": 38.347,
    "lng": -0.5015,
    "index": 12
  },
  {
    "id": "C22M4",
    "name": "C/ México",
    "zona": "Gran Vía",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C22M4.jpg?itok=bu2at0Wb",
    "lat": 38.334,
    "lng": -0.503,
    "index": 13
  },
  {
    "id": "C22M2",
    "name": "Alcalde Lorenzo Carbonell",
    "zona": "Gran Vía",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C22M2.jpg?itok=mNmDMC7L",
    "lat": 38.337,
    "lng": -0.501,
    "index": 14
  },
  {
    "id": "C22M3",
    "name": "A. L. Carbonell - Cat. Soler",
    "zona": "Gran Vía",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C22M3.jpg?itok=3xHATAXl",
    "lat": 38.337,
    "lng": -0.501,
    "index": 15
  },
  {
    "id": "C24M3",
    "name": "Avda. Vnte. Blasco Ibáñez",
    "zona": "Gran Vía",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C24M3.jpg?itok=nW0YZ5il",
    "lat": 38.352,
    "lng": -0.491,
    "index": 16
  },
  {
    "id": "C24F2",
    "name": "Gran Vía - Puente Rojo",
    "zona": "Gran Vía",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C24F2.jpg?itok=CQhlqGoZ",
    "lat": 38.344,
    "lng": -0.5035,
    "index": 17
  },
  {
    "id": "C29M2",
    "name": "Gran vía - C/ Isla de Corfú",
    "zona": "Gran Vía",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C29M2.jpg?itok=rNXu0qpY",
    "lat": 38.355,
    "lng": -0.506,
    "index": 18
  },
  {
    "id": "C29M5",
    "name": "Marcelino Champagnat",
    "zona": "Gran Vía",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C29M5.jpg?itok=hMd73UGO",
    "lat": 38.3525,
    "lng": -0.508,
    "index": 19
  },
  {
    "id": "C11M1",
    "name": "Gran Vía -Av. Orihuela",
    "zona": "Gran Vía",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C11M1.jpg?itok=NHSoIkHa",
    "lat": 38.3465,
    "lng": -0.508,
    "index": 20
  },
  {
    "id": "C13M5",
    "name": "Bulevar de Teulada",
    "zona": "Gran Vía",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C13M5.jpg?itok=hk1gjG33",
    "lat": 38.359,
    "lng": -0.497,
    "index": 21
  },
  {
    "id": "C13M4",
    "name": "Avda. Santa Pola",
    "zona": "Gran Vía",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C13M4.jpg?itok=tsmYWBkw",
    "lat": 38.351,
    "lng": -0.499,
    "index": 22
  },
  {
    "id": "C13M2",
    "name": "Avda. Dr. Jiménez Díaz",
    "zona": "Gran Vía",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C13M2.jpg?itok=4hNnhXYj",
    "lat": 38.3485,
    "lng": -0.5025,
    "index": 23
  },
  {
    "id": "C19F3",
    "name": "Gran vía",
    "zona": "Gran Vía",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C19F3.jpg?itok=GspY1yr6",
    "lat": 38.361,
    "lng": -0.489,
    "index": 24
  },
  {
    "id": "C11M3",
    "name": "Avda. Dr. Jiménez Díaz",
    "zona": "Gran Vía",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C11M3.jpg?itok=zVcVbGOL",
    "lat": 38.3485,
    "lng": -0.5025,
    "index": 25
  },
  {
    "id": "C11M2",
    "name": "Gran Vía -Av. Orihuela",
    "zona": "Gran Vía",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C11M2.jpg?itok=M8PpBN9D",
    "lat": 38.3465,
    "lng": -0.508,
    "index": 26
  },
  {
    "id": "C13M3",
    "name": "C/ Teulada - E.F .Rico Pérez",
    "zona": "Gran Vía",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C13M3.jpg?itok=e6w7cyiN",
    "lat": 38.357,
    "lng": -0.493,
    "index": 27
  },
  {
    "id": "C08F2",
    "name": "Gran Vía",
    "zona": "Gran Vía",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C08F2.jpg?itok=B9dYkwP8",
    "lat": 38.361,
    "lng": -0.489,
    "index": 28
  },
  {
    "id": "C08F6",
    "name": "C/ del Maestro Alonso",
    "zona": "Gran Vía",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C08F6.jpg?itok=dHunh88y",
    "lat": 38.3645,
    "lng": -0.482,
    "index": 29
  },
  {
    "id": "C08F3",
    "name": "C/ del Maestro Alonso",
    "zona": "Gran Vía",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C08F3.jpg?itok=EVIbz5Sa",
    "lat": 38.3645,
    "lng": -0.482,
    "index": 30
  },
  {
    "id": "C08F5",
    "name": "Gran Vía - Maestro Alonso",
    "zona": "Gran Vía",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C08F5.jpg?itok=tkKXCaB5",
    "lat": 38.3645,
    "lng": -0.482,
    "index": 31
  },
  {
    "id": "C08F4",
    "name": "Gran Vía",
    "zona": "Gran Vía",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C08F4.jpg?itok=5gdVK_ZH",
    "lat": 38.361,
    "lng": -0.489,
    "index": 32
  },
  {
    "id": "C39F5",
    "name": "Gran Vía - Avda. Novelda",
    "zona": "Gran Vía",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C39F5.jpg?itok=xR3aVmc9",
    "lat": 38.3615,
    "lng": -0.4935,
    "index": 33
  },
  {
    "id": "C39F4",
    "name": "Gran Vía - Av. Buenos Aires",
    "zona": "Gran Vía",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C39F4.jpg?itok=__O20mKa",
    "lat": 38.363,
    "lng": -0.486,
    "index": 34
  },
  {
    "id": "C39F2",
    "name": "Gran Vía - Avda. Colombia",
    "zona": "Gran Vía",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C39F2.jpg?itok=VuSTAP8-",
    "lat": 38.3655,
    "lng": -0.479,
    "index": 35
  },
  {
    "id": "C01F4",
    "name": "Avda Aguilera",
    "zona": "Centro Ciudad",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C01F4.jpg?itok=5bER9ZLG",
    "lat": 38.3425,
    "lng": -0.4965,
    "index": 36
  },
  {
    "id": "C01M5",
    "name": "Oscar Esplá",
    "zona": "Centro Ciudad",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C01M5.jpg?itok=N2QI7Hpq",
    "lat": 38.34,
    "lng": -0.491,
    "index": 37
  },
  {
    "id": "C02F5",
    "name": "Oscar Esplá",
    "zona": "Centro Ciudad",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C02F5.jpg?itok=ic65iwAY",
    "lat": 38.34,
    "lng": -0.491,
    "index": 38
  },
  {
    "id": "C09M4",
    "name": "Avda. Jijona",
    "zona": "Centro Ciudad",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C09M4.jpg?itok=BkuxrdGk",
    "lat": 38.3515,
    "lng": -0.486,
    "index": 39
  },
  {
    "id": "C35F4",
    "name": "Salamanca - Estación",
    "zona": "Centro Ciudad",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C35F4.jpg?itok=MpgZFZVp",
    "lat": 38.3445,
    "lng": -0.494,
    "index": 40
  },
  {
    "id": "C16F3",
    "name": "C/ San Fernando",
    "zona": "Centro Ciudad",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C16F3.jpg?itok=bBIv8nxx",
    "lat": 38.344,
    "lng": -0.485,
    "index": 41
  },
  {
    "id": "C02F3",
    "name": "L. Casanova - Oscar Esplá",
    "zona": "Centro Ciudad",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C02F3.jpg?itok=Z7CiHG1T",
    "lat": 38.341,
    "lng": -0.492,
    "index": 42
  },
  {
    "id": "C02F2",
    "name": "E. Sempere - Oscar Esplá",
    "zona": "Centro Ciudad",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C02F2.jpg?itok=MWD4LuJz",
    "lat": 38.3395,
    "lng": -0.49,
    "index": 43
  },
  {
    "id": "C02F4",
    "name": "Cat. Soler - Oscar Esplá",
    "zona": "Centro Ciudad",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C02F4.jpg?itok=8eNFAGNc",
    "lat": 38.337,
    "lng": -0.501,
    "index": 44
  },
  {
    "id": "C35F2",
    "name": "Salamanca -  Estación",
    "zona": "Centro Ciudad",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C35F2.jpg?itok=SclSf87b",
    "lat": 38.3445,
    "lng": -0.494,
    "index": 45
  },
  {
    "id": "C10F2",
    "name": "Avda. de la Estación",
    "zona": "Centro Ciudad",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C10F2.jpg?itok=DrT9DIfQ",
    "lat": 38.3445,
    "lng": -0.494,
    "index": 46
  },
  {
    "id": "C55M1",
    "name": "C/ Vázquez de Mella",
    "zona": "Centro Ciudad",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C55M1.jpg?itok=lgpQYfEj",
    "lat": 38.349,
    "lng": -0.479,
    "index": 47
  },
  {
    "id": "C01F3",
    "name": "Oscar Esplá",
    "zona": "Centro Ciudad",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C01F3.jpg?itok=4SKlaoaT",
    "lat": 38.34,
    "lng": -0.491,
    "index": 48
  },
  {
    "id": "C02F6",
    "name": "Óscar Esplá - Cat. Soler",
    "zona": "Centro Ciudad",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C02F6.jpg?itok=xuTcIBfe",
    "lat": 38.337,
    "lng": -0.501,
    "index": 49
  },
  {
    "id": "C36F4",
    "name": "B. P. Galdós - Gral. Marvá",
    "zona": "Centro Ciudad",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C36F4.jpg?itok=5H7SXW0F",
    "lat": 38.3475,
    "lng": -0.49,
    "index": 50
  },
  {
    "id": "C12F2",
    "name": "Avda. Salamanca",
    "zona": "Centro Ciudad",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C12F2.jpg?itok=UX31HMxD",
    "lat": 38.3445,
    "lng": -0.494,
    "index": 51
  },
  {
    "id": "C17F2",
    "name": "Avda. Dr. Gadea",
    "zona": "Centro Ciudad",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C17F2.jpg?itok=FOPbckH4",
    "lat": 38.3428,
    "lng": -0.4875,
    "index": 52
  },
  {
    "id": "C16F2",
    "name": "Rambla de Méndez Núñez",
    "zona": "Centro Ciudad",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C16F2.jpg?itok=VdNERR6t",
    "lat": 38.345,
    "lng": -0.4815,
    "index": 53
  },
  {
    "id": "C36F3",
    "name": "B. P. Galdós - Gral. Marvá",
    "zona": "Centro Ciudad",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C36F3.jpg?itok=xw80e0lo",
    "lat": 38.3475,
    "lng": -0.49,
    "index": 54
  },
  {
    "id": "C36F2",
    "name": "B. P. Galdós - Pza. España",
    "zona": "Centro Ciudad",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C36F2.jpg?itok=UClZaiKh",
    "lat": 38.349,
    "lng": -0.486,
    "index": 55
  },
  {
    "id": "C07M1",
    "name": "Avda. Novelda",
    "zona": "Centro Ciudad",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C07M1.jpg?itok=rU946dn_",
    "lat": 38.356,
    "lng": -0.491,
    "index": 56
  },
  {
    "id": "C09F2",
    "name": "C/ Pintor Murillo",
    "zona": "Centro Ciudad",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C09F2.jpg?itok=CYXu76Ex",
    "lat": 38.35,
    "lng": -0.484,
    "index": 57
  },
  {
    "id": "C15F3",
    "name": "C/ Calderón de la Barca",
    "zona": "Centro Ciudad",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C15F3.jpg?itok=F8nuVFKx",
    "lat": 38.3485,
    "lng": -0.4835,
    "index": 58
  },
  {
    "id": "C17F3",
    "name": "C/ Reyes Católicos",
    "zona": "Centro Ciudad",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C17F3.jpg?itok=SQcRlgBo",
    "lat": 38.3435,
    "lng": -0.489,
    "index": 59
  },
  {
    "id": "C36F1",
    "name": "B. P. Galdós - Salamanca",
    "zona": "Centro Ciudad",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C36F1.jpg?itok=rHjJLmav",
    "lat": 38.3445,
    "lng": -0.494,
    "index": 60
  },
  {
    "id": "C12F3",
    "name": "C/ Benito Pérez Galdós",
    "zona": "Centro Ciudad",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C12F3.jpg?itok=EG41BYp0",
    "lat": 38.347,
    "lng": -0.489,
    "index": 61
  },
  {
    "id": "C07F2",
    "name": "Conde Lumiares - Av. Alcoy",
    "zona": "Centro Ciudad",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C07F2.jpg?itok=WU4T8amJ",
    "lat": 38.353,
    "lng": -0.487,
    "index": 62
  },
  {
    "id": "C15F2",
    "name": "Avda. Alfonso X El Sabio",
    "zona": "Centro Ciudad",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C15F2.jpg?itok=dMvADY21",
    "lat": 38.3472,
    "lng": -0.485,
    "index": 63
  },
  {
    "id": "C15F5",
    "name": "Rambla de Méndez Núñez",
    "zona": "Centro Ciudad",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C15F5.jpg?itok=qL4AM8tw",
    "lat": 38.345,
    "lng": -0.4815,
    "index": 64
  },
  {
    "id": "C15F4",
    "name": "A. El Sabio - San Vicente",
    "zona": "Centro Ciudad",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C15F4.jpg?itok=ezPCaGrh",
    "lat": 38.3472,
    "lng": -0.485,
    "index": 65
  },
  {
    "id": "C01F2",
    "name": "Avda. Maisonnave",
    "zona": "Centro Ciudad",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C01F2.jpg?itok=DEuQ1vIh",
    "lat": 38.343,
    "lng": -0.4895,
    "index": 66
  },
  {
    "id": "C09M3",
    "name": "Avda. de Alcoy",
    "zona": "Centro Ciudad",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C09M3.jpg?itok=ENwJ4U2h",
    "lat": 38.353,
    "lng": -0.487,
    "index": 67
  },
  {
    "id": "C37F6",
    "name": "Avda. Bulevar de Teulada",
    "zona": "Vía Parque · Norte",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C37F6.jpg?itok=Mm4gjdt0",
    "lat": 38.359,
    "lng": -0.497,
    "index": 68
  },
  {
    "id": "C25M4",
    "name": "Avda. Novelda",
    "zona": "Vía Parque · Norte",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C25M4.jpg?itok=vPOv8212",
    "lat": 38.369,
    "lng": -0.501,
    "index": 69
  },
  {
    "id": "C32M5",
    "name": "Avda. Gastón Castelló",
    "zona": "Vía Parque · Norte",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C32M5.jpg?itok=t8hr4Q3u",
    "lat": 38.374,
    "lng": -0.486,
    "index": 70
  },
  {
    "id": "C51M2",
    "name": "Avda. A. Ramos Carratalá",
    "zona": "Vía Parque · Norte",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C51M2.jpg?itok=VbamDPG2",
    "lat": 38.365,
    "lng": -0.461,
    "index": 71
  },
  {
    "id": "C51M3",
    "name": "C/ Montesinos - Pl. Castalla",
    "zona": "Vía Parque · Norte",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C51M3.jpg?itok=ds3Rhwmi",
    "lat": 38.37,
    "lng": -0.495,
    "index": 72
  },
  {
    "id": "C27M5",
    "name": "Av. Universidad - Fortuny",
    "zona": "Vía Parque · Norte",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C27M5.jpg?itok=wIG1a07O",
    "lat": 38.381,
    "lng": -0.508,
    "index": 73
  },
  {
    "id": "C25M2",
    "name": "Avda. Jaime I",
    "zona": "Vía Parque · Norte",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C25M2.jpg?itok=njNRZPS9",
    "lat": 38.367,
    "lng": -0.502,
    "index": 74
  },
  {
    "id": "C32M3",
    "name": "C/ José Luis Barceló",
    "zona": "Vía Parque · Norte",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C32M3.jpg?itok=okWXWcHg",
    "lat": 38.37,
    "lng": -0.495,
    "index": 75
  },
  {
    "id": "C32M6",
    "name": "Avda. UNICEF",
    "zona": "Vía Parque · Norte",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C32M6.jpg?itok=fF1_a-Fb",
    "lat": 38.372,
    "lng": -0.497,
    "index": 76
  },
  {
    "id": "C27M2",
    "name": "C/ Fortuny",
    "zona": "Vía Parque · Norte",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C27M2.jpg?itok=IrurkCg7",
    "lat": 38.377,
    "lng": -0.502,
    "index": 77
  },
  {
    "id": "C34F4",
    "name": "Avda. Novelda",
    "zona": "Vía Parque · Norte",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C34F4.jpg?itok=1kUMND07",
    "lat": 38.369,
    "lng": -0.501,
    "index": 78
  },
  {
    "id": "C33M1",
    "name": "C/ del Cuarzo",
    "zona": "Vía Parque · Norte",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C33M1.jpg?itok=ByfluLv0",
    "lat": 38.371,
    "lng": -0.484,
    "index": 79
  },
  {
    "id": "C37F2",
    "name": "Avda. Teulada",
    "zona": "Vía Parque · Norte",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C37F2.jpg?itok=1QJObaEo",
    "lat": 38.359,
    "lng": -0.497,
    "index": 80
  },
  {
    "id": "C32M2",
    "name": "C/ Poeta Pedro Salinas",
    "zona": "Vía Parque · Norte",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C32M2.jpg?itok=1TkNygEg",
    "lat": 38.373,
    "lng": -0.488,
    "index": 81
  },
  {
    "id": "C27M4",
    "name": "Avda. Universidad",
    "zona": "Vía Parque · Norte",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C27M4.jpg?itok=NDanDYu7",
    "lat": 38.381,
    "lng": -0.508,
    "index": 82
  },
  {
    "id": "C34F5",
    "name": "C/ Fortuny",
    "zona": "Vía Parque · Norte",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C34F5.jpg?itok=s6Fla1zP",
    "lat": 38.377,
    "lng": -0.502,
    "index": 83
  },
  {
    "id": "C33M4",
    "name": "Avda. Baronía de Polop",
    "zona": "Vía Parque · Norte",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C33M4.jpg?itok=EXtTx1mN",
    "lat": 38.376,
    "lng": -0.489,
    "index": 84
  },
  {
    "id": "C33M3",
    "name": "C/ Pintor Gastón Castelló",
    "zona": "Vía Parque · Norte",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C33M3.jpg?itok=rADvCIES",
    "lat": 38.374,
    "lng": -0.486,
    "index": 85
  },
  {
    "id": "C06M5",
    "name": "C/ del Padre Arrupe",
    "zona": "Vía Parque · Norte",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C06M5.jpg?itok=pZZ8Du6h",
    "lat": 38.368,
    "lng": -0.463,
    "index": 86
  },
  {
    "id": "C06M2",
    "name": "Avda. Denia",
    "zona": "Vía Parque · Norte",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C06M2.jpg?itok=sxOLYKQn",
    "lat": 38.37,
    "lng": -0.495,
    "index": 87
  },
  {
    "id": "C37F3",
    "name": "Vía Parque - Jaime I",
    "zona": "Vía Parque · Norte",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C37F3.jpg?itok=_PnWFp8X",
    "lat": 38.367,
    "lng": -0.502,
    "index": 88
  },
  {
    "id": "C32M4",
    "name": "C/ Maestro Alonso",
    "zona": "Vía Parque · Norte",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C32M4.jpg?itok=4Hn3wIOp",
    "lat": 38.3645,
    "lng": -0.482,
    "index": 89
  },
  {
    "id": "C34F3",
    "name": "Avda. Baronía de Polop",
    "zona": "Vía Parque · Norte",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C34F3.jpg?itok=GYZMaap9",
    "lat": 38.376,
    "lng": -0.489,
    "index": 90
  },
  {
    "id": "C33M2",
    "name": "Villafranqueza",
    "zona": "Vía Parque · Norte",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C33M2.jpg?itok=rtOwODFs",
    "lat": 38.384,
    "lng": -0.488,
    "index": 91
  },
  {
    "id": "C43F4",
    "name": "Jaime I-Judoka JA Valverde",
    "zona": "Vía Parque · Norte",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C43F4.jpg?itok=JScG-CDL",
    "lat": 38.367,
    "lng": -0.502,
    "index": 92
  },
  {
    "id": "C43F3",
    "name": "Jaime I - Ftas. Tradicionales",
    "zona": "Vía Parque · Norte",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C43F3.jpg?itok=PQQ-1ki5",
    "lat": 38.367,
    "lng": -0.502,
    "index": 93
  },
  {
    "id": "C37F5",
    "name": "Avda. Jaime I",
    "zona": "Vía Parque · Norte",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C37F5.jpg?itok=CuBgLp89",
    "lat": 38.367,
    "lng": -0.502,
    "index": 94
  },
  {
    "id": "C25M3",
    "name": "Av. Novelda - Av. UNICEF",
    "zona": "Vía Parque · Norte",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C25M3.jpg?itok=yptLjCHS",
    "lat": 38.369,
    "lng": -0.501,
    "index": 95
  },
  {
    "id": "C25M5",
    "name": "Avda. UNICEF",
    "zona": "Vía Parque · Norte",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C25M5.jpg?itok=Sv1ZBOqY",
    "lat": 38.372,
    "lng": -0.497,
    "index": 96
  },
  {
    "id": "C34F2",
    "name": "Av. Novelda - San Vicente",
    "zona": "Vía Parque · Norte",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C34F2.jpg?itok=jZ1qau6n",
    "lat": 38.369,
    "lng": -0.501,
    "index": 97
  },
  {
    "id": "C21F4",
    "name": "Cámara - C21F4",
    "zona": "Vía Parque · Norte",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C21F4.jpg?itok=78XDZAv1",
    "lat": 38.37,
    "lng": -0.495,
    "index": 98
  },
  {
    "id": "C21F2",
    "name": "Cámara - C21F2",
    "zona": "Vía Parque · Norte",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C21F2.jpg?itok=ZJ3uqx7d",
    "lat": 38.37,
    "lng": -0.495,
    "index": 99
  },
  {
    "id": "C21F5",
    "name": "C/ Río Muni",
    "zona": "Vía Parque · Norte",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C21F5.jpg?itok=gr2_Ghkb",
    "lat": 38.369,
    "lng": -0.506,
    "index": 100
  },
  {
    "id": "C41F3",
    "name": "Fiestas P. y Tradicionales",
    "zona": "Vía Parque · Norte",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C41F3.jpg?itok=IWs33oCB",
    "lat": 38.364,
    "lng": -0.503,
    "index": 101
  },
  {
    "id": "C41F4",
    "name": "C/ Isla de Corfú",
    "zona": "Vía Parque · Norte",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C41F4.jpg?itok=GzmvHNvC",
    "lat": 38.355,
    "lng": -0.506,
    "index": 102
  },
  {
    "id": "C43F2",
    "name": "Avd. Jaime I - Teulada",
    "zona": "Vía Parque · Norte",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C43F2.jpg?itok=e6iCNADI",
    "lat": 38.359,
    "lng": -0.497,
    "index": 103
  },
  {
    "id": "C21F3",
    "name": "N 330",
    "zona": "Vía Parque · Norte",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C21F3.jpg?itok=fznqM6SA",
    "lat": 38.37,
    "lng": -0.495,
    "index": 104
  },
  {
    "id": "C41F5",
    "name": "Dpta. Isabel Fernández",
    "zona": "Vía Parque · Norte",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C41F5.jpg?itok=B3c-sw6U",
    "lat": 38.363,
    "lng": -0.504,
    "index": 105
  },
  {
    "id": "C41F2",
    "name": "Fiestas P. y Tradicionales",
    "zona": "Vía Parque · Norte",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C41F2.jpg?itok=NBgsgESu",
    "lat": 38.364,
    "lng": -0.503,
    "index": 106
  },
  {
    "id": "C03M2",
    "name": "Av. Martires de la libertad",
    "zona": "Litoral",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C03M2.jpg?itok=K8SAt93P",
    "lat": 38.3425,
    "lng": -0.48,
    "index": 107
  },
  {
    "id": "C03M4",
    "name": "Salida Puerto",
    "zona": "Litoral",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C03M4.jpg?itok=oS2tpsEr",
    "lat": 38.3395,
    "lng": -0.483,
    "index": 108
  },
  {
    "id": "C03M3",
    "name": "Av. Juan Bautista Lafora",
    "zona": "Litoral",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C03M3.jpg?itok=zUlMYPpA",
    "lat": 38.344,
    "lng": -0.476,
    "index": 109
  },
  {
    "id": "C04F5",
    "name": "Avda. de Denia",
    "zona": "Avda. Denia",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C04F5.jpg?itok=PcYuQWfJ",
    "lat": 38.361,
    "lng": -0.464,
    "index": 110
  },
  {
    "id": "C04F3",
    "name": "Av. A. Ramos Carratalá",
    "zona": "Avda. Denia",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C04F3.jpg?itok=kfZg2JBp",
    "lat": 38.365,
    "lng": -0.461,
    "index": 111
  },
  {
    "id": "C04F4",
    "name": "c/ Dep. Alejandra Quereda",
    "zona": "Avda. Denia",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C04F4.jpg?itok=cntVZ8Bz",
    "lat": 38.369,
    "lng": -0.457,
    "index": 112
  },
  {
    "id": "C56F1",
    "name": "Avda. Albufereta",
    "zona": "Avda. Denia",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C56F1.jpg?itok=Onw-QxIq",
    "lat": 38.363,
    "lng": -0.458,
    "index": 113
  },
  {
    "id": "C49M3",
    "name": "Avda. Denia - Acceso A-70",
    "zona": "Avda. Denia",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C49M3.jpg?itok=JMBk5Gjl",
    "lat": 38.379,
    "lng": -0.448,
    "index": 114
  },
  {
    "id": "C14M4",
    "name": "Avda. Denia",
    "zona": "Avda. Denia",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C14M4.jpg?itok=vVPQ5iM8",
    "lat": 38.361,
    "lng": -0.464,
    "index": 115
  },
  {
    "id": "C49M2",
    "name": "Av. Denia - Torres de la huerta",
    "zona": "Avda. Denia",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C49M2.jpg?itok=x3Bm8RRQ",
    "lat": 38.373,
    "lng": -0.453,
    "index": 116
  },
  {
    "id": "C30M4",
    "name": "Avda. Denia",
    "zona": "Avda. Denia",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C30M4.jpg?itok=owqHBUSg",
    "lat": 38.361,
    "lng": -0.464,
    "index": 117
  },
  {
    "id": "C40F3",
    "name": "Avda. Elche - N 332",
    "zona": "Avda. Elche",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C40F3.jpg?itok=fbOmRP-N",
    "lat": 38.322,
    "lng": -0.516,
    "index": 118
  },
  {
    "id": "C18M4",
    "name": "C/ México",
    "zona": "Avda. Elche",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C18M4.jpg?itok=TV_pZJ3-",
    "lat": 38.334,
    "lng": -0.503,
    "index": 119
  },
  {
    "id": "C18M2",
    "name": "Avda. Elche",
    "zona": "Avda. Elche",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C18M2.jpg?itok=LzbrlAfs",
    "lat": 38.33,
    "lng": -0.505,
    "index": 120
  },
  {
    "id": "C50M1",
    "name": "Avda. de Elche - C/ Federico Mayo",
    "zona": "Avda. Elche",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C50M1.jpg?itok=6suge2Ah",
    "lat": 38.327,
    "lng": -0.51,
    "index": 121
  },
  {
    "id": "C40F4",
    "name": "Av. Elche - J. C. Combaldieu",
    "zona": "Avda. Elche",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C40F4.jpg?itok=X9JSZh-n",
    "lat": 38.319,
    "lng": -0.521,
    "index": 122
  },
  {
    "id": "C40F2",
    "name": "Avda. Elche",
    "zona": "Avda. Elche",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C40F2.jpg?itok=K9R-cwuA",
    "lat": 38.33,
    "lng": -0.505,
    "index": 123
  },
  {
    "id": "C31F3",
    "name": "Casa del Mediterráneo",
    "zona": "Avda. Elche",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C31F3.jpg?itok=HSDqzrqH",
    "lat": 38.337,
    "lng": -0.493,
    "index": 124
  },
  {
    "id": "C31F4",
    "name": "Avda. Loring",
    "zona": "Avda. Elche",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C31F4.jpg?itok=uwAoD7fo",
    "lat": 38.3395,
    "lng": -0.489,
    "index": 125
  },
  {
    "id": "C28F3",
    "name": "Ctra. del Saladar",
    "zona": "Avda. Elche",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C28F3.jpg?itok=FetFQ1oc",
    "lat": 38.314,
    "lng": -0.528,
    "index": 126
  },
  {
    "id": "C28F2",
    "name": "N 332",
    "zona": "Avda. Elche",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C28F2.jpg?itok=MyGA31yz",
    "lat": 38.322,
    "lng": -0.516,
    "index": 127
  },
  {
    "id": "C20F2",
    "name": "Mártires de la Libertad",
    "zona": "Puerto · Postiguet",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C20F2.jpg?itok=fcEJrssh",
    "lat": 38.3425,
    "lng": -0.48,
    "index": 128
  },
  {
    "id": "C20F3",
    "name": "C/ Portugal",
    "zona": "Puerto · Postiguet",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C20F3.jpg?itok=3OrRBIvZ",
    "lat": 38.3415,
    "lng": -0.486,
    "index": 129
  },
  {
    "id": "C30F2",
    "name": "Av. Denia - Av. Villajoyosa",
    "zona": "Puerto · Postiguet",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C30F2.jpg?itok=7cuPqaGB",
    "lat": 38.359,
    "lng": -0.456,
    "index": 130
  },
  {
    "id": "C30F3",
    "name": "Avda. Juan Bautista Lafora",
    "zona": "Puerto · Postiguet",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C30F3.jpg?itok=Zw9owqJS",
    "lat": 38.344,
    "lng": -0.476,
    "index": 131
  },
  {
    "id": "C26F1",
    "name": "Entrada Ciudad",
    "zona": "Puerto · Postiguet",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C26F1.jpg?itok=cTd9qFxW",
    "lat": 38.3385,
    "lng": -0.488,
    "index": 132
  },
  {
    "id": "C26F4",
    "name": "Salida Ciudad",
    "zona": "Puerto · Postiguet",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C26F4.jpg?itok=ADbf32qa",
    "lat": 38.3375,
    "lng": -0.4895,
    "index": 133
  },
  {
    "id": "C46M1",
    "name": "Villajoyosa - Sol Naciente",
    "zona": "Albufereta · Playa San Juan",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C46M1.jpg?itok=YQoeb2Du",
    "lat": 38.3635,
    "lng": -0.448,
    "index": 134
  },
  {
    "id": "C44M2",
    "name": "Avda. Costablanca",
    "zona": "Albufereta · Playa San Juan",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C44M2.jpg?itok=W9g50DjL",
    "lat": 38.369,
    "lng": -0.426,
    "index": 135
  },
  {
    "id": "C38F2",
    "name": "Avda. de las Naciones",
    "zona": "Albufereta · Playa San Juan",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C38F2.jpg?itok=U9YORs9e",
    "lat": 38.374,
    "lng": -0.432,
    "index": 136
  },
  {
    "id": "C38F3",
    "name": "Avda. De Oviedo",
    "zona": "Albufereta · Playa San Juan",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C38F3.jpg?itok=gOUn6Lo4",
    "lat": 38.379,
    "lng": -0.428,
    "index": 137
  },
  {
    "id": "C38F5",
    "name": "Avda. Vicente Hipólito",
    "zona": "Albufereta · Playa San Juan",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C38F5.jpg?itok=YI7t6VKF",
    "lat": 38.384,
    "lng": -0.429,
    "index": 138
  },
  {
    "id": "C42F1",
    "name": "Caja de Ahorros - Av. Denia",
    "zona": "Albufereta · Playa San Juan",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C42F1.jpg?itok=oeMlifAA",
    "lat": 38.368,
    "lng": -0.445,
    "index": 139
  },
  {
    "id": "C46M2",
    "name": "Villajoyosa - Pl. Isleta",
    "zona": "Albufereta · Playa San Juan",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C46M2.jpg?itok=N8ld6sCH",
    "lat": 38.3635,
    "lng": -0.448,
    "index": 140
  },
  {
    "id": "C05M1",
    "name": "Avda. Costablanca",
    "zona": "Albufereta · Playa San Juan",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C05M1.jpg?itok=dCzcU4gm",
    "lat": 38.369,
    "lng": -0.426,
    "index": 141
  },
  {
    "id": "C23M1",
    "name": "C/ Caja de Ahorros",
    "zona": "Albufereta · Playa San Juan",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C23M1.jpg?itok=rrjwrwai",
    "lat": 38.368,
    "lng": -0.445,
    "index": 142
  },
  {
    "id": "C44M1",
    "name": "Avda. Naciones",
    "zona": "Albufereta · Playa San Juan",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C44M1.jpg?itok=vGm55tNu",
    "lat": 38.374,
    "lng": -0.432,
    "index": 143
  },
  {
    "id": "C38F4",
    "name": "Avda. Pintor Pérez Gil",
    "zona": "Albufereta · Playa San Juan",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C38F4.jpg?itok=vYzqV4tR",
    "lat": 38.378,
    "lng": -0.439,
    "index": 144
  },
  {
    "id": "C42F2",
    "name": "Caja de Ahorros - Playas",
    "zona": "Albufereta · Playa San Juan",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C42F2.jpg?itok=XfTmE5Hz",
    "lat": 38.368,
    "lng": -0.445,
    "index": 145
  },
  {
    "id": "C05F2",
    "name": "Avda. Condomina",
    "zona": "Albufereta · Playa San Juan",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C05F2.jpg?itok=CR2iiMAu",
    "lat": 38.365,
    "lng": -0.441,
    "index": 146
  },
  {
    "id": "C23F2",
    "name": "Avda. Vicente Hipólito",
    "zona": "Albufereta · Playa San Juan",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C23F2.jpg?itok=nepIAtOg",
    "lat": 38.384,
    "lng": -0.429,
    "index": 147
  },
  {
    "id": "C62M2",
    "name": "A. Amarga - Anta. Moreno",
    "zona": "Polígonos Industriales",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C62M2.jpg?itok=EPxZf0dx",
    "lat": 38.311,
    "lng": -0.531,
    "index": 148
  },
  {
    "id": "C62M1",
    "name": "Agua Amarga - N 332",
    "zona": "Polígonos Industriales",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C62M1.jpg?itok=v1GfnRa8",
    "lat": 38.311,
    "lng": -0.531,
    "index": 149
  },
  {
    "id": "C67M3",
    "name": "Arco iris - G. Stewart Howie",
    "zona": "Polígonos Industriales",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C67M3.jpg?itok=TxjK7AKD",
    "lat": 38.347,
    "lng": -0.538,
    "index": 150
  },
  {
    "id": "C67M2",
    "name": "C/ Arco iris - Salida A 31",
    "zona": "Polígonos Industriales",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C67M2.jpg?itok=OVqGTH8j",
    "lat": 38.331,
    "lng": -0.51,
    "index": 151
  },
  {
    "id": "C68M1",
    "name": "C/ Mistral (68- C/ MISTRAL (PV2))",
    "zona": "Polígonos Industriales",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C68M1.jpg?itok=qdPCcibk",
    "lat": 38.349,
    "lng": -0.541,
    "index": 152
  },
  {
    "id": "C69M1",
    "name": "C/ G. Stewart Howie - C/ Mistral",
    "zona": "Polígonos Industriales",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C69M1.jpg?itok=6x1GNiU7",
    "lat": 38.347,
    "lng": -0.538,
    "index": 153
  },
  {
    "id": "C70M1",
    "name": "Ant. Peseta - C/ del Franco",
    "zona": "Polígonos Industriales",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C70M1.jpg?itok=w_fFrzf3",
    "lat": 38.341,
    "lng": -0.548,
    "index": 154
  },
  {
    "id": "C70M2",
    "name": "Rot. Ant. Peseta - A 31",
    "zona": "Polígonos Industriales",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C70M2.jpg?itok=zFrmlMg_",
    "lat": 38.331,
    "lng": -0.51,
    "index": 155
  },
  {
    "id": "C71M1",
    "name": "C/ Ant. Peseta - Cno. Viejo",
    "zona": "Polígonos Industriales",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C71M1.jpg?itok=hXb-lhSQ",
    "lat": 38.341,
    "lng": -0.548,
    "index": 156
  },
  {
    "id": "C72M1",
    "name": "Avda. del Euro - C/ del Marco",
    "zona": "Polígonos Industriales",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C72M1.jpg?itok=4ko8e1yF",
    "lat": 38.338,
    "lng": -0.552,
    "index": 157
  },
  {
    "id": "C73M1",
    "name": "Avda. del Euro - C/ de la Libra",
    "zona": "Polígonos Industriales",
    "url": "https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma_big/public/camara/C73M1.jpg?itok=pGvrNvA7",
    "lat": 38.338,
    "lng": -0.552,
    "index": 158
  }
];

export const ZONES: AlicanteZone[] = [
  { name: "Gran Vía", count: 36, color: "#38bdf8" },
  { name: "Centro Ciudad", count: 32, color: "#f59e0b" },
  { name: "Vía Parque · Norte", count: 39, color: "#a855f7" },
  { name: "Litoral", count: 3, color: "#06b6d4" },
  { name: "Avda. Denia", count: 8, color: "#ec4899" },
  { name: "Avda. Elche", count: 10, color: "#eab308" },
  { name: "Puerto · Postiguet", count: 6, color: "#14b8a6" },
  { name: "Albufereta · Playa San Juan", count: 14, color: "#10b981" },
  { name: "Polígonos Industriales", count: 11, color: "#f97316" }
];

export const PRESET_ROUTES: Record<string, { label: string; icon: string; cameraIds: string[] }> = {
  playa: {
    label: "Playa San Juan · Albufereta",
    icon: "Umbrella",
    cameraIds: ["C44M2", "C46M1", "C30F2", "C30F3", "C38F2", "C38F3", "C38F5", "C44M1"]
  },
  universidad: {
    label: "Universidad de Alicante (UA)",
    icon: "GraduationCap",
    cameraIds: ["C15F2", "C36F4", "C37F3", "C37F4", "C27M4", "C25M4", "C27M5", "C34F2"]
  },
  denia: {
    label: "Eje Avda. de Denia (N-332)",
    icon: "Compass",
    cameraIds: ["C48M1", "C49M2", "C49M3", "C04F5", "C56F1", "C30M4", "C04F3", "C04F4"]
  },
  centro: {
    label: "Centro · Alfonso El Sabio / Luceros",
    icon: "Building2",
    cameraIds: ["C01F4", "C01F2", "C15F2", "C16F2", "C09M4", "C17F2", "C35F4", "C36F4"]
  },
  puerto: {
    label: "Puerto · Explanada · Postiguet",
    icon: "Anchor",
    cameraIds: ["C03M4", "C03M2", "C03M3", "C20F2", "C26F1", "C26F4", "C30F2", "C30F3"]
  },
  granvia: {
    label: "Gran Vía (Ronda Interior)",
    icon: "RotateCw",
    cameraIds: ["C08F2", "C08F5", "C39F5", "C39F4", "C29M2", "C11M1", "C52M4", "C52M2"]
  },
  elche: {
    label: "Acceso Sur · Avda. Elche",
    icon: "Car",
    cameraIds: ["C18M2", "C40F2", "C40F3", "C31F3", "C28F2", "C50M1", "C31F4", "C40F4"]
  },
  poligonos: {
    label: "Polígonos (Las Atalayas / Vallonga)",
    icon: "Factory",
    cameraIds: ["C62M1", "C62M2", "C67M3", "C67M2", "C69M1", "C70M1", "C70M2", "C72M1"]
  }
};

export interface Landmark {
  name: string;
  zone: string;
  lat: number;
  lng: number;
}

export const ALICANTE_LANDMARKS: Landmark[] = [
  { name: "Plaza de los Luceros", zone: "Centro", lat: 38.3453, lng: -0.4891 },
  { name: "Estación de Tren (Renfe - Alicante Terminal)", zone: "Centro / Salamanca", lat: 38.3444, lng: -0.4950 },
  { name: "Mercado Central / Alfonso El Sabio", zone: "Centro", lat: 38.3475, lng: -0.4851 },
  { name: "Puerto de Alicante / Muelle de Levante", zone: "Puerto", lat: 38.3410, lng: -0.4800 },
  { name: "Playa del Postiguet", zone: "Litoral", lat: 38.3445, lng: -0.4760 },
  { name: "Playa de San Juan (Av. Costa Blanca)", zone: "Playa San Juan", lat: 38.3750, lng: -0.4220 },
  { name: "Albufereta / Miriam Blasco", zone: "Albufereta", lat: 38.3650, lng: -0.4440 },
  { name: "Cabo de las Huertas", zone: "Playas", lat: 38.3580, lng: -0.4180 },
  { name: "Universidad de Alicante (Campus San Vicente)", zone: "Universidad", lat: 38.3845, lng: -0.5130 },
  { name: "Centro Comercial Gran Vía (Pintor Xavier Soler)", zone: "Gran Vía", lat: 38.3665, lng: -0.4735 },
  { name: "Centro Comercial Plaza Mar 2 (Avda. Denia)", zone: "Avda. Denia", lat: 38.3565, lng: -0.4690 },
  { name: "Estadio Rico Pérez (C/ Teulada)", zone: "Campoamor", lat: 38.3575, lng: -0.4925 },
  { name: "Polígono Industrial Las Atalayas", zone: "Polígonos", lat: 38.3380, lng: -0.5510 },
  { name: "Polígono Pla de la Vallonga", zone: "Polígonos", lat: 38.3480, lng: -0.5400 },
  { name: "San Gabriel / Oficina EUIPO", zone: "Acceso Sur", lat: 38.3190, lng: -0.5210 },
  { name: "Hospital General de Alicante (Pintor Baeza)", zone: "Norte", lat: 38.3630, lng: -0.4830 },
  { name: "Hospital Universitario San Juan", zone: "San Juan", lat: 38.3910, lng: -0.4370 },
  { name: "Rotonda de la Paz (Avda. de Denia)", zone: "Avda. Denia", lat: 38.3710, lng: -0.4560 }
];
