import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, Clock, Package, CheckCircle2, Store } from 'lucide-react';

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

export default function DonationMapView({
  donations = [],
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

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      }).setView(center, zoom);

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

    // Clear existing markers
    markersGroup.clearLayers();

    const validDonations = donations.filter(
      (d) => d.latitude && d.longitude && !isNaN(d.latitude) && !isNaN(d.longitude)
    );

    if (validDonations.length === 0) {
      map.setView(center, zoom);
      return;
    }

    validDonations.forEach((d) => {
      const lat = parseFloat(d.latitude);
      const lng = parseFloat(d.longitude);

      // Custom HTML Marker Icon
      const customIcon = L.divIcon({
        className: 'custom-donation-marker',
        html: `
          <div style="
            background: #ffffff;
            color: #000000;
            border: 2px solid #232328;
            border-radius: 9999px;
            padding: 6px 10px;
            font-size: 11px;
            font-weight: 700;
            box-shadow: 0 4px 14px rgba(0,0,0,0.35);
            display: flex;
            align-items: center;
            gap: 5px;
            white-space: nowrap;
            cursor: pointer;
            transform: translate(-50%, -50%);
          ">
            <span style="width: 7px; height: 7px; border-radius: 9999px; background: #22c55e;"></span>
            ${d.quantity ? `${d.quantity} ${d.unit || 'servings'}` : 'Surplus'}
          </div>
        `,
        iconSize: [80, 30],
        iconAnchor: [40, 15],
      });

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(markersGroup);

      // Popup content
      const popupContent = document.createElement('div');
      popupContent.className = 'donation-map-popup p-1 text-black font-sans';
      popupContent.innerHTML = `
        <div style="min-width: 220px; font-family: inherit;">
          <div style="font-size: 13px; font-weight: 800; margin-bottom: 4px; color: #09090b; line-height: 1.3;">
            ${d.title || 'Surplus Food Donation'}
          </div>
          <div style="font-size: 11px; color: #52525b; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">
            <span>🏢</span> <strong>${d.provider_name || 'Food Donor'}</strong>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 11px; background: #f4f4f5; padding: 6px 8px; border-radius: 8px; margin-bottom: 8px;">
            <div><span style="color: #71717a;">Category:</span> <br><strong>${d.category?.replace('_', ' ') || 'Food'}</strong></div>
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
            <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" target="_blank" rel="noopener noreferrer" style="
              background: #e4e4e7;
              color: #09090b;
              padding: 6px 8px;
              border-radius: 6px;
              font-size: 11px;
              font-weight: 700;
              text-decoration: none;
              display: inline-block;
            ">Directions</a>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on('click', () => {
        if (onSelectDonation) onSelectDonation(d);
      });
    });

    // Auto-fit bounds to show all markers
    try {
      const bounds = markersGroup.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      }
    } catch {
      // ignore
    }
  }, [donations, center, zoom, onSelectDonation]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden border border-[#232328] ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full min-h-[380px] z-0" />
    </div>
  );
}
