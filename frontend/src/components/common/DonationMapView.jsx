import { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin, Navigation, Clock, Package, CheckCircle2,
  Building2, Crosshair, Maximize2, ShieldCheck, Eye, EyeOff
} from 'lucide-react';

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

/**
 * Calculates straight-line distance in kilometers between two geo-coordinates.
 */
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const p1 = parseFloat(lat1);
  const p2 = parseFloat(lon1);
  const p3 = parseFloat(lat2);
  const p4 = parseFloat(lon2);
  if (isNaN(p1) || isNaN(p2) || isNaN(p3) || isNaN(p4)) return null;

  const R = 6371; // Earth radius in km
  const dLat = ((p3 - p1) * Math.PI) / 180;
  const dLon = ((p4 - p2) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1 * Math.PI) / 180) *
      Math.cos((p3 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function DonationMapView({
  donations = [],
  ngoLocation = null, // { latitude, longitude, name, address }
  onSelectDonation,
  onClaimDonation,
  selectedId = null,
  center = [28.6139, 77.2090],
  zoom = 13,
  className = '',
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersGroupRef = useRef(null);
  const radiusLayerRef = useRef(null);
  const ngoMarkerRef = useRef(null);

  const [showRadius, setShowRadius] = useState(true);

  // Validate NGO coordinates
  const validNgo = useMemo(() => {
    if (!ngoLocation) return null;
    const lat = parseFloat(ngoLocation.latitude);
    const lng = parseFloat(ngoLocation.longitude);
    if (isNaN(lat) || isNaN(lng)) return null;
    return {
      lat,
      lng,
      name: ngoLocation.name || ngoLocation.organization_name || 'Your Shelter Base',
      address: ngoLocation.address || 'Registered Base',
    };
  }, [ngoLocation]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initialCenter = validNgo
      ? [validNgo.lat, validNgo.lng]
      : center;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      }).setView(initialCenter, zoom);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      const markersGroup = L.featureGroup().addTo(map);
      markersGroupRef.current = markersGroup;
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;

    // Clear existing layers
    markersGroup.clearLayers();
    if (radiusLayerRef.current) {
      radiusLayerRef.current.remove();
      radiusLayerRef.current = null;
    }
    ngoMarkerRef.current = null;

    const validDonations = donations.filter(
      (d) => d.latitude && d.longitude && !isNaN(d.latitude) && !isNaN(d.longitude)
    );

    // 1. Render NGO Location Marker if available
    if (validNgo) {
      // 20 km Rescue Radius Circle
      if (showRadius) {
        const radiusCircle = L.circle([validNgo.lat, validNgo.lng], {
          radius: 20000, // 20 km
          color: '#a855f7',
          weight: 2,
          dashArray: '6, 8',
          fillColor: '#a855f7',
          fillOpacity: 0.05,
        }).addTo(map);
        radiusLayerRef.current = radiusCircle;
      }

      // Custom animated beacon pin for the NGO
      const ngoIcon = L.divIcon({
        className: 'ngo-shelter-marker-container',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; transform: translate(-50%, -100%);">
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 36px;
              height: 36px;
              background: rgba(168, 85, 247, 0.3);
              border: 2px solid #a855f7;
              border-radius: 9999px;
              animation: ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite;
              pointer-events: none;
            "></div>
            <div style="
              background: linear-gradient(135deg, #6b21a8 0%, #9333ea 50%, #a855f7 100%);
              color: #ffffff;
              border: 2px solid #ffffff;
              border-radius: 9999px;
              padding: 5px 11px;
              font-size: 11px;
              font-weight: 800;
              box-shadow: 0 4px 16px rgba(107, 33, 168, 0.6), 0 2px 4px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              gap: 6px;
              white-space: nowrap;
              z-index: 20;
            ">
              <span style="font-size: 13px;">🏢</span>
              <span style="max-width: 130px; overflow: hidden; text-overflow: ellipsis;">${validNgo.name}</span>
              <span style="background: rgba(255,255,255,0.25); color: #ffffff; padding: 1px 5px; border-radius: 9999px; font-size: 9px; font-weight: 900; letter-spacing: 0.4px;">SHELTER</span>
            </div>
            <div style="
              width: 0;
              height: 0;
              border-left: 6px solid transparent;
              border-right: 6px solid transparent;
              border-top: 7px solid #9333ea;
              margin-top: -1px;
            "></div>
            <div style="
              width: 8px;
              height: 8px;
              background: #c084fc;
              border: 2px solid #ffffff;
              border-radius: 9999px;
              margin-top: 1px;
              box-shadow: 0 0 8px rgba(192, 132, 252, 0.9);
            "></div>
          </div>
        `,
        iconSize: [160, 52],
        iconAnchor: [80, 52],
        popupAnchor: [0, -48],
      });

      const ngoMarker = L.marker([validNgo.lat, validNgo.lng], {
        icon: ngoIcon,
        zIndexOffset: 1000,
      }).addTo(markersGroup);

      const ngoPopup = document.createElement('div');
      ngoPopup.className = 'ngo-map-popup p-1 text-black font-sans';
      ngoPopup.innerHTML = `
        <div style="min-width: 230px; font-family: inherit; line-height: 1.35;">
          <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 5px;">
            <span style="background: #9333ea; color: #ffffff; padding: 2px 7px; border-radius: 9999px; font-size: 10px; font-weight: 800; letter-spacing: 0.4px; text-transform: uppercase;">
              🏢 YOUR SHELTER BASE
            </span>
          </div>
          <div style="font-size: 14px; font-weight: 800; color: #09090b; margin-bottom: 3px;">
            ${validNgo.name}
          </div>
          <div style="font-size: 11px; color: #52525b; margin-bottom: 8px;">
            📍 ${validNgo.address}
          </div>
          <div style="display: grid; grid-template-columns: auto 1fr; gap: 4px; font-size: 10px; background: #f4f4f5; padding: 6px 8px; border-radius: 6px; font-family: monospace;">
            <span style="color: #71717a;">Coordinates:</span>
            <strong style="text-align: right;">${validNgo.lat.toFixed(5)}, ${validNgo.lng.toFixed(5)}</strong>
          </div>
          <div style="margin-top: 8px; font-size: 10px; color: #7c3aed; font-weight: 700; display: flex; align-items: center; gap: 4px;">
            <span>🟣 Dashed ring marks your 20 km priority rescue zone</span>
          </div>
        </div>
      `;
      ngoMarker.bindPopup(ngoPopup);
      ngoMarkerRef.current = ngoMarker;
    }

    // 2. Render Donation Listings Markers
    validDonations.forEach((d) => {
      const lat = parseFloat(d.latitude);
      const lng = parseFloat(d.longitude);

      const distKm = validNgo
        ? calculateDistanceKm(validNgo.lat, validNgo.lng, lat, lng)
        : null;

      const isWithin20km = distKm !== null && distKm <= 20;

      // Custom HTML Marker Icon
      const customIcon = L.divIcon({
        className: 'custom-donation-marker',
        html: `
          <div style="
            background: #ffffff;
            color: #000000;
            border: 2px solid ${isWithin20km ? '#22c55e' : '#232328'};
            border-radius: 9999px;
            padding: 5px 9px;
            font-size: 11px;
            font-weight: 700;
            box-shadow: 0 4px 14px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            gap: 5px;
            white-space: nowrap;
            cursor: pointer;
            transform: translate(-50%, -50%);
          ">
            <span style="width: 7px; height: 7px; border-radius: 9999px; background: ${isWithin20km ? '#22c55e' : '#eab308'};"></span>
            <span>${d.quantity ? `${d.quantity} ${d.unit || 'servings'}` : 'Surplus'}</span>
            ${
              distKm !== null
                ? `<span style="font-size: 9px; font-weight: 800; color: ${isWithin20km ? '#16a34a' : '#64748b'}; margin-left: 2px;">
                    ${distKm < 1 ? '<1 km' : `${distKm.toFixed(1)} km`}
                   </span>`
                : ''
            }
          </div>
        `,
        iconSize: [110, 32],
        iconAnchor: [55, 16],
      });

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(markersGroup);

      // Directions URL: origin is NGO shelter if known
      const directionsUrl = validNgo
        ? `https://www.google.com/maps/dir/?api=1&origin=${validNgo.lat},${validNgo.lng}&destination=${lat},${lng}`
        : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

      // Popup content
      const popupContent = document.createElement('div');
      popupContent.className = 'donation-map-popup p-1 text-black font-sans';
      popupContent.innerHTML = `
        <div style="min-width: 230px; font-family: inherit;">
          <div style="font-size: 13px; font-weight: 800; margin-bottom: 4px; color: #09090b; line-height: 1.3;">
            ${d.title || 'Surplus Food Donation'}
          </div>
          <div style="font-size: 11px; color: #52525b; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">
            <span>🏢</span> <strong>${d.provider_name || 'Food Donor'}</strong>
          </div>

          ${
            distKm !== null
              ? `
            <div style="display: flex; align-items: center; justify-content: space-between; background: ${
              isWithin20km ? '#f0fdf4' : '#fffbeb'
            }; border: 1px solid ${
              isWithin20km ? '#bbf7d0' : '#fef3c7'
            }; color: ${
              isWithin20km ? '#166534' : '#92400e'
            }; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; margin-bottom: 6px;">
              <span>📍 ${distKm.toFixed(1)} km from your shelter</span>
              <span style="font-size: 9px; padding: 1px 5px; border-radius: 4px; font-weight: 800; background: ${
                isWithin20km ? '#22c55e' : '#f59e0b'
              }; color: #ffffff;">
                ${isWithin20km ? 'WITHIN 20KM' : 'EXTENDED'}
              </span>
            </div>
            `
              : ''
          }

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 11px; background: #f4f4f5; padding: 6px 8px; border-radius: 8px; margin-bottom: 8px;">
            <div><span style="color: #71717a;">Category:</span> <br><strong>${d.category?.replace(/_/g, ' ') || 'Food'}</strong></div>
            <div><span style="color: #71717a;">Quantity:</span> <br><strong>${d.quantity} ${d.unit || ''}</strong></div>
          </div>
          <div style="font-size: 11px; color: #71717a; margin-bottom: 8px; line-height: 1.3;">
            📍 ${d.pickup_address || 'Pickup address provided'}
          </div>
          <div style="display: flex; gap: 6px;">
            <a href="/donations/${d.id}" style="
              flex: 1;
              background: #09090b;
              color: #ffffff;
              text-align: center;
              padding: 6px 10px;
              border-radius: 6px;
              font-size: 11px;
              font-weight: 700;
              text-decoration: none;
              display: inline-block;
            ">View Details</a>
            <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" style="
              background: #e4e4e7;
              color: #09090b;
              padding: 6px 8px;
              border-radius: 6px;
              font-size: 11px;
              font-weight: 700;
              text-decoration: none;
              display: inline-block;
            ">Route</a>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on('click', () => {
        if (onSelectDonation) onSelectDonation(d);
      });
    });

    // Auto-fit bounds to show both NGO marker and donations
    try {
      const bounds = markersGroup.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      } else if (validNgo) {
        map.setView([validNgo.lat, validNgo.lng], 13);
      }
    } catch {
      // ignore
    }
  }, [donations, validNgo, center, zoom, showRadius, onSelectDonation]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const handleRecenterToNgo = () => {
    if (!mapInstanceRef.current || !validNgo) return;
    mapInstanceRef.current.flyTo([validNgo.lat, validNgo.lng], 14, { duration: 1 });
    if (ngoMarkerRef.current) {
      ngoMarkerRef.current.openPopup();
    }
  };

  const handleFitAll = () => {
    if (!mapInstanceRef.current || !markersGroupRef.current) return;
    try {
      const bounds = markersGroupRef.current.getBounds();
      if (bounds.isValid()) {
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden border border-[#232328] ${className}`}>
      {/* Map Interactive Overlay Header Controls */}
      <div className="absolute top-3 right-3 z-[400] flex items-center gap-1.5 flex-wrap bg-neutral-900/90 dark:bg-[#121214]/90 backdrop-blur-md p-1.5 rounded-xl border border-neutral-700 dark:border-[#2e2e38] shadow-lg">
        {validNgo && (
          <button
            type="button"
            onClick={handleRecenterToNgo}
            title="Recenter on your shelter base"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-xs transition-colors cursor-pointer"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>My Shelter</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleFitAll}
          title="Zoom to fit all markers and shelter"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors cursor-pointer"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>Fit All</span>
        </button>

        {validNgo && (
          <button
            type="button"
            onClick={() => setShowRadius((prev) => !prev)}
            title="Toggle 20km priority rescue radius display"
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
              showRadius
                ? 'bg-purple-950/60 text-purple-300 border-purple-500/50'
                : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white'
            }`}
          >
            {showRadius ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>20km Zone</span>
          </button>
        )}
      </div>

      {/* Map Legend Overlay (Bottom Left) */}
      <div className="absolute bottom-3 left-3 z-[400] bg-neutral-950/90 dark:bg-[#0c0c0e]/90 backdrop-blur-md px-3 py-2 rounded-xl border border-neutral-800 dark:border-[#26262e] shadow-lg text-[11px] text-neutral-300 flex items-center gap-3.5 flex-wrap">
        {validNgo && (
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 ring-2 ring-purple-300/40 inline-block"></span>
            <span className="font-semibold text-white">Your Shelter Base</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
          <span>Surplus Listing</span>
        </div>
        {validNgo && showRadius && (
          <div className="flex items-center gap-1.5">
            <span className="w-4 border-t-2 border-dashed border-purple-400 inline-block"></span>
            <span className="text-[10px] text-purple-300">20 km Zone</span>
          </div>
        )}
      </div>

      {/* Leaflet Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[450px] z-0" />
    </div>
  );
}
