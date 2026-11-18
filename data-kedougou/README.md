# Données de Kédougou

Lieux nommés extraits d'OpenStreetMap (© contributeurs OpenStreetMap, ODbL 1.0).

Pour régénérer `places.geojson` :

    curl -s -X POST https://overpass-api.de/api/interpreter \
      -A "lokal-kedougou/0.1 (contact: ton-email)" \
      --data-urlencode "data@data-kedougou/requete.overpassql" -o kedougou-osm.json
    node scripts/kedougou-lieux.mjs kedougou-osm.json data-kedougou/places.geojson

Remplace `ton-email` par une vraie adresse de contact.
