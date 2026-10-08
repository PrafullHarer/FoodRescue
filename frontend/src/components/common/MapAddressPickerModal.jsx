import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Search, Crosshair, X, Check, Navigation } from 'lucide-react';
import toast from 'react-hot-toast';

// Fix Leaflet's default icon path issues in Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export default function MapAddressPickerModal({
  isOpen,
  onClose,
  onSelectLocation,
  initialAddress = '',
  initialLat = 28.6139,
  initialLng = 77.2090,
  title = 'Select Location on Map',
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  const [coords, setCoords] = useState({ lat: initialLat, lng: initialLng });
  const [address, setAddress] = useState(initialAddress);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);

  // Reverse Geocoding with Nominatim (OpenStreetMap)
  const fetchReverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.display_name) {
          setAddress(data.display_name);
        }
      }
    } catch {
      // ignore network hiccups
    }
  };

  // Search Address with Nominatim
  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const first = data[0];
        const newLat = parseFloat(first.lat);
        const newLng = parseFloat(first.lon);
        setCoords({ lat: newLat, lng: newLng });
        setAddress(first.display_name);

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([newLat, newLng], 16);
          markerRef.current.setLatLng([newLat, newLng]);
        }
        toast.success('Location found!');
      } else {
        toast.error('Location not found. Try searching a different landmark or area.');
      }
    } catch {
      toast.error('Failed to search location.');
    } finally {
      setSearching(false);
    }
  };

  // GPS Current Location
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 16);
          markerRef.current.setLatLng([latitude, longitude]);
        }
        fetchReverseGeocode(latitude, longitude);
        toast.success('Centered on current location!');
        setLocating(false);
      },
      (err) => {
        toast.error(err.message || 'Unable to retrieve your location.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Initialize Map when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const startLat = coords.lat || initialLat || 28.6139;
    const startLng = coords.lng || initialLng || 77.2090;

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current).setView([startLat, startLng], 14);

        // Standard OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);

        const marker = L.marker([startLat, startLng], { draggable: true }).addTo(map);

        marker.on('dragend', (event) => {
          const position = event.target.getLatLng();
          setCoords({ lat: position.lat, lng: position.lng });
          fetchReverseGeocode(position.lat, position.lng);
        });

        map.on('click', (e) => {
          const { lat, lng } = e.latlng;
          setCoords({ lat, lng });
          marker.setLatLng([lat, lng]);
          fetchReverseGeocode(lat, lng);
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;
      } else {
        mapInstanceRef.current.invalidateSize();
        mapInstanceRef.current.setView([startLat, startLng], 14);
        markerRef.current.setLatLng([startLat, startLng]);
      }
    }, 150);

    return () => {
      clearTimeout(timer);
    };
  }, [isOpen]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const handleConfirm = () => {
    onSelectLocation({
      address: address.trim() || searchQuery.trim() || `Location (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`,
      latitude: Number(coords.lat.toFixed(6)),
      longitude: Number(coords.lng.toFixed(6)),
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-3xl bg-[#121214] border border-[#232328] rounded-[24px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#232328] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center font-bold shadow-sm">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base leading-tight">{title}</h3>
              <p className="text-xs text-neutral-400 mt-0.5">Click or drag pin to accurately set pickup/delivery coordinates</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-[#1f1f24] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Location Bar */}
        <div className="p-4 bg-[#0c0c0e] border-b border-[#232328] flex flex-col sm:flex-row items-center gap-2.5">
          <form onSubmit={handleSearch} className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search area, landmark, or street address..."
              className="input pl-10 pr-20 py-2.5 text-xs"
            />
            <button
              type="submit"
              disabled={searching}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 btn btn-primary text-xs py-1 px-3"
            >
              {searching ? 'Finding...' : 'Search'}
            </button>
          </form>

          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={locating}
            className="btn btn-secondary text-xs py-2.5 px-3.5 flex items-center gap-1.5 whitespace-nowrap w-full sm:w-auto justify-center"
          >
            <Crosshair className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
            <span>{locating ? 'Locating...' : 'My GPS Location'}</span>
          </button>
        </div>

        {/* Leaflet Map Canvas */}
        <div className="relative flex-1 min-h-[320px] sm:min-h-[380px] bg-[#1a1a1e]">
          <div ref={mapContainerRef} className="w-full h-full min-h-[320px] sm:min-h-[380px] z-0" />
        </div>

        {/* Selected Coordinates & Address Footer */}
        <div className="p-4 sm:p-5 bg-[#0c0c0e] border-t border-[#232328] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
                <Navigation className="w-3 h-3" /> Selected Point:
              </span>
              <span className="font-mono text-xs text-neutral-300 bg-[#18181c] px-2 py-0.5 rounded border border-[#232328]">
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </span>
            </div>
            <p className="text-xs text-neutral-300 truncate" title={address}>
              {address || 'Click anywhere on the map to set address'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-center">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary text-xs py-2.5 px-4"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="btn btn-primary text-xs py-2.5 px-5 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" /> Use This Location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
