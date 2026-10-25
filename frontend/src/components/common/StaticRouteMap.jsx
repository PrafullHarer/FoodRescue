import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, ExternalLink, MapPin } from 'lucide-react';

// Fix Leaflet marker icons in Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export default function StaticRouteMap({
  pickupLat,
  pickupLng,
  pickupAddress,
  dropoffLat,
  dropoffLng,
  dropoffAddress,
  title = 'Pickup & Route Location',
  className = '',
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const validPickup = pickupLat && pickupLng && !isNaN(pickupLat) && !isNaN(pickupLng);
  const validDropoff = dropoffLat && dropoffLng && !isNaN(dropoffLat) && !isNaN(dropoffLng);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (!validPickup && !validDropoff) return;

    const defaultLat = validPickup ? parseFloat(pickupLat) : parseFloat(dropoffLat);
    const defaultLng = validPickup ? parseFloat(pickupLng) : parseFloat(dropoffLng);

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        scrollWheelZoom: false,
      }).setView([defaultLat, defaultLng], 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const markers = [];

    // Pickup Marker
    if (validPickup) {
      const pMarker = L.marker([parseFloat(pickupLat), parseFloat(pickupLng)]).addTo(map);
      pMarker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; color: #000;">
          <strong>🏢 Pickup Location</strong><br>
          ${pickupAddress || 'Food Donor Kitchen'}
        </div>
      `);
      markers.push(pMarker);
    }

    // Dropoff Marker
    if (validDropoff) {
      const dMarker = L.marker([parseFloat(dropoffLat), parseFloat(dropoffLng)]).addTo(map);
      dMarker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; color: #000;">
          <strong>🤝 Dropoff Shelter</strong><br>
          ${dropoffAddress || 'Community Shelter'}
        </div>
      `);
      markers.push(dMarker);
    }

    // Connect line if both exist
    if (validPickup && validDropoff) {
      const latlngs = [
        [parseFloat(pickupLat), parseFloat(pickupLng)],
        [parseFloat(dropoffLat), parseFloat(dropoffLng)],
      ];
      const polyline = L.polyline(latlngs, { color: '#3b82f6', weight: 4, dashArray: '6, 8' }).addTo(map);
      map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
    } else if (markers.length > 0) {
      map.setView([defaultLat, defaultLng], 14);
    }
  }, [pickupLat, pickupLng, pickupAddress, dropoffLat, dropoffLng, dropoffAddress, validPickup, validDropoff]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  if (!validPickup && !validDropoff) return null;

  const gmapsUrl = validPickup
    ? `https://www.google.com/maps/dir/?api=1&destination=${pickupLat},${pickupLng}`
    : `https://www.google.com/maps/dir/?api=1&destination=${dropoffLat},${dropoffLng}`;

  return (
    <div className={`bg-[#0c0c0e] rounded-2xl border border-[#232328] overflow-hidden ${className}`}>
      <div className="p-3.5 sm:p-4 border-b border-[#232328] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-white" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-white">{title}</h4>
        </div>
        <a
          href={gmapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 hover:bg-white text-neutral-300 hover:text-black font-semibold text-xs transition-all"
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Open GPS Directions</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="h-56 sm:h-64 w-full relative z-0">
        <div ref={mapContainerRef} className="w-full h-full z-0" />
      </div>

      <div className="p-3 bg-[#121214] border-t border-[#232328] text-xs text-neutral-400 flex items-center justify-between flex-wrap gap-2">
        <span className="truncate max-w-md">📍 {pickupAddress || dropoffAddress}</span>
        {validPickup && (
          <span className="font-mono text-[11px] text-neutral-500 bg-[#18181b] px-2 py-0.5 rounded border border-[#232328]">
            {Number(pickupLat).toFixed(4)}, {Number(pickupLng).toFixed(4)}
          </span>
        )}
      </div>
    </div>
  );
}
