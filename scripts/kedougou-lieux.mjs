// Extrait les lieux nommés de Kédougou depuis un export Overpass.
// Usage : node scripts/kedougou-lieux.mjs kedougou-osm.json data-kedougou/places.geojson
// Données © contributeurs OpenStreetMap, licence ODbL 1.0.
import fs from "node:fs";
import path from "node:path";

const [entree, sortie] = process.argv.slice(2);
if (!entree || !sortie) {
  throw new Error("Usage : node scripts/kedougou-lieux.mjs <export-overpass.json> <sortie.geojson>");
}
const raw = JSON.parse(fs.readFileSync(entree, "utf8"));

// Valeur OSM (amenity ou shop) -> [catégorie SanarMap, libellé]
const TYPES = {
  hospital: ["sante", "Hôpital"],
  clinic: ["sante", "Centre de santé"],
  pharmacy: ["sante", "Pharmacie"],
  doctors: ["sante", "Cabinet médical"],
  townhall: ["demarches", "Administration"],
  bank: ["demarches", "Banque"],
  post_office: ["demarches", "Bureau de poste"],
  police: ["demarches", "Police"],
  school: ["etudier", "École"],
  college: ["etudier", "Collège"],
  university: ["etudier", "Université"],
  restaurant: ["manger", "Restaurant"],
  cafe: ["manger", "Café"],
  fast_food: ["manger", "Restauration rapide"],
  bakery: ["manger", "Boulangerie"],
  supermarket: ["pratique", "Supermarché"],
  convenience: ["pratique", "Épicerie"],
  marketplace: ["pratique", "Marché"],
  fuel: ["pratique", "Station-service"],
  bus_station: ["pratique", "Gare routière"],
};

const noeuds = new Map();
for (const e of raw.elements) if (e.type === "node") noeuds.set(e.id, [e.lon, e.lat]);

function centre(e) {
  if (e.type === "node") return [e.lon, e.lat];
  const pts = (e.nodes ?? []).map((id) => noeuds.get(id)).filter(Boolean);
  if (!pts.length) return null;
  const moy = (i) => pts.reduce((s, p) => s + p[i], 0) / pts.length;
  return [moy(0), moy(1)];
}

const slug = (t) =>
  t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const fiches = [];
const ids = new Set();
let doublons = 0;
for (const e of raw.elements) {
  const t = e.tags;
  if (!t || !t.name) continue;
  const type = [t.amenity, t.shop].find((v) => v && TYPES[v]);
  if (!type) continue;
  const c = centre(e);
  if (!c) continue;
  const [categorie, libelle] = TYPES[type];
  const proche = fiches.some(
    (f) => f.properties.name === t.name &&
      Math.abs(f.geometry.coordinates[0] - c[0]) < 0.002 &&
      Math.abs(f.geometry.coordinates[1] - c[1]) < 0.002,
  );
  if (proche) { doublons++; continue; }
  let id = slug(t.name) || String(e.id);
  if (ids.has(id)) id = `${id}-${e.id}`;
  ids.add(id);
  fiches.push({
    type: "Feature",
    id,
    properties: {
      name: t.name,
      category: categorie,
      summary: `${libelle}.`,
      objects: e.type === "way" ? [`way/${e.id}`] : [],
      keywords: [libelle.toLowerCase()],
    },
    // GeoJSON : [longitude, latitude]
    geometry: { type: "Point", coordinates: [+c[0].toFixed(6), +c[1].toFixed(6)] },
  });
}

fiches.sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true }));
const source = `Extrait d'OpenStreetMap du ${raw.osm3s?.timestamp_osm_base ?? "?"} (© contributeurs OpenStreetMap, ODbL)`;
fs.mkdirSync(path.dirname(sortie), { recursive: true });
fs.writeFileSync(
  sortie,
  `{"type":"FeatureCollection","name":"Kédougou · lieux","source":${JSON.stringify(source)},"features":[\n` +
    fiches.map((f) => JSON.stringify(f)).join(",\n") + "\n]}\n",
);

const parCat = {};
for (const f of fiches) parCat[f.properties.category] = (parCat[f.properties.category] || 0) + 1;
console.log(fiches.length, "lieux écrits dans", sortie, "| doublons retirés :", doublons);
console.log("par catégorie :", parCat);
