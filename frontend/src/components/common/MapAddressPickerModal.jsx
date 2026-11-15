import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowLeft, Search, Crosshair, X, Check, MapPin, Navigation, RefreshCw, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import { getLiveLocation, reverseGeocode } from '../../utils/geolocation';
import { useTheme } from '../../contexts/ThemeContext';

// Fix Leaflet default icon paths in bundlers
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
 * Mobile-First Interactive Map Location Picker
 * Themed to match the FoodRescue Platform (Dark Carbon #121214, Neon Green #39FF14, #232328 border):
 * - Live GPS auto-detect & manual recenter via the floating FAB crosshair button
 * - Center Pin Marker with ground target indicator
 * - Edge-to-edge full mobile screen via React Portal (z-[9999])
 * - Pinned bottom "CONFIRM PICKUP LOCATION" action button
 */
export default function MapAddressPickerModal({
  isOpen,
  onClose,
  onSelectLocation,
  initialAddress = '',
  initialLat = 28.6139,
  initialLng = 77.2090,
  title = 'Location Picker',
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const userMarkerRef = useRef(null);
  const debounceTimerRef = useRef(null);

  const themeCtx = useTheme();
  const isWebsiteDark = themeCtx?.isDark ?? true;
  const [customMapStyle, setCustomMapStyle] = useState(null);
  const isDarkMap = customMapStyle ? customMapStyle === 'dark' : isWebsiteDark;

  const [coords, setCoords] = useState({ lat: initialLat, lng: initialLng });
  const [address, setAddress] = useState(initialAddress);
  const [addressDetails, setAddressDetails] = useState({ title: '', subtitle: '' });
  const [isMoving, setIsMoving] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  // Parse human-readable title and subtitle from Nominatim display_name
  const parseAddressComponents = (fullName) => {
    if (!fullName) return { title: 'Pinned Location', subtitle: '' };
    const parts = fullName.split(',').map((p) => p.trim());
    if (parts.length <= 1) return { title: parts[0] || 'Selected Location', subtitle: '' };
    const mainTitle = parts.slice(0, 2).join(', ');
    const subtitle = parts.slice(2, 5).join(', ');
    return { title: mainTitle, subtitle };
  };

  // Reverse Geocoding with Nominatim (OpenStreetMap)
  const fetchReverseGeocode = useCallback(async (lat, lng) => {
    setGeocoding(true);
    try {
      const res = await reverseGeocode(lat, lng);
      if (res && res.displayName) {
        setAddress(res.displayName);
        setAddressDetails({
          title: res.title || 'Selected Location',
          subtitle: res.subtitle || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        });
        return;
      }
      const fallback = `Point (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
      setAddress(fallback);
      setAddressDetails({ title: 'Selected Point', subtitle: `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
    } catch {
      const fallback = `Location (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
      setAddress(fallback);
      setAddressDetails({ title: 'Selected Location', subtitle: `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
    } finally {
      setGeocoding(false);
    }
  }, []);

  // Debounced reverse geocoding on map drag
  const triggerDebouncedGeocode = useCallback((lat, lng) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      fetchReverseGeocode(lat, lng);
    }, 350);
  }, [fetchReverseGeocode]);

  // Update or create pulsing user location marker on the Leaflet map
  const updateUserGpsMarker = useCallback((lat, lng) => {
    if (!mapInstanceRef.current) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([lat, lng]);
    } else {
      const pulseHtml = `
        <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; pointer-events: none;">
          <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: rgba(57, 255, 20, 0.35); animation: leaflet-gps-ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: absolute; width: 18px; height: 18px; border-radius: 50%; background: rgba(57, 255, 20, 0.45);"></div>
          <div style="width: 12px; height: 12px; border-radius: 50%; background: #39FF14; border: 2.5px solid #000000; box-shadow: 0 0 10px rgba(57, 255, 20, 0.9);"></div>
        </div>
      `;

      const gpsIcon = L.divIcon({
        className: 'user-gps-pulse-icon',
        html: pulseHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      userMarkerRef.current = L.marker([lat, lng], {
        icon: gpsIcon,
        zIndexOffset: 500,
        interactive: false,
      }).addTo(mapInstanceRef.current);
    }
  }, []);

  // Apply location: center map, align pointer, add GPS dot, and update address
  const applyLocation = useCallback((latitude, longitude, source = 'gps', silent = false) => {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;

    setCoords({ lat, lng });

    if (mapInstanceRef.current) {
      mapInstanceRef.current.invalidateSize();
      // Instantly animate map center to the exact coordinates at street level zoom
      mapInstanceRef.current.setView([lat, lng], 17, { animate: true });

      // Render pulsing GPS dot under the pointer
      updateUserGpsMarker(lat, lng);
    }

    fetchReverseGeocode(lat, lng);

    if (!silent) {
      if (source === 'native_gps' || source === 'native_last_known') {
        toast.success('Locked onto mobile GPS location!', { id: 'gps-lock' });
      } else if (source === 'browser_gps') {
        toast.success('Centered on your live location!', { id: 'gps-lock' });
      } else if (source === 'ip_lookup') {
        toast.success('Centered near your network location', { id: 'gps-lock' });
      } else {
        toast.success('Map centered on current location!', { id: 'gps-lock' });
      }
    }
  }, [fetchReverseGeocode, updateUserGpsMarker]);

  // Live Location Detector (Mobile Native GPS + Browser + Network Fallback)
  const handleUseCurrentLocation = async () => {
    setLocating(true);
    toast.loading('Detecting live location...', { id: 'gps-lock' });
    try {
      const loc = await getLiveLocation();
      const { latitude, longitude, source } = loc;
      applyLocation(latitude, longitude, source, false);
    } catch (err) {
      toast.error(err?.message || 'Unable to retrieve live location.', { id: 'gps-lock' });
    } finally {
      setLocating(false);
    }
  };

  // Listen for native bridge location broadcasts while modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handleLocationUpdate = (e) => {
      const detail = e.detail;
      if (detail && detail.latitude && detail.longitude) {
        applyLocation(detail.latitude, detail.longitude, detail.source || 'native_gps', true);
      }
    };

    window.addEventListener('foodrescue:location-update', handleLocationUpdate);
    return () => {
      window.removeEventListener('foodrescue:location-update', handleLocationUpdate);
    };
  }, [isOpen, applyLocation]);

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
        setAddressDetails(parseAddressComponents(first.display_name));

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([newLat, newLng], 17, { animate: true });
        }
        setSearchOpen(false);
        toast.success('Location found!');
      } else {
        toast.error('Location not found. Try searching another landmark or street.');
      }
    } catch {
      toast.error('Failed to search location.');
    } finally {
      setSearching(false);
    }
  };

  // Initialize and attach Leaflet Map
  useEffect(() => {
    if (!isOpen) return;

    setShowGuide(true);
    const guideTimer = setTimeout(() => {
      setShowGuide(false);
    }, 3500);

    const startLat = coords.lat || initialLat || 28.6139;
    const startLng = coords.lng || initialLng || 77.2090;

    // Initial address details if provided
    if (initialAddress) {
      setAddress(initialAddress);
      setAddressDetails(parseAddressComponents(initialAddress));
    } else {
      fetchReverseGeocode(startLat, startLng);
    }

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      // Clean up any stale map instance attached to previous DOM nodes
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {
          // ignore
        }
        mapInstanceRef.current = null;
        userMarkerRef.current = null;
      }

      if (mapContainerRef.current._leaflet_id) {
        delete mapContainerRef.current._leaflet_id;
      }

      try {
        const map = L.map(mapContainerRef.current, {
          center: [startLat, startLng],
          zoom: 16,
          zoomControl: false, // Clean full-screen look
        });

        // Fast, reliable OpenStreetMap tiles with dark CSS filter (zero API key watermark, 100% free)
        const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          subdomains: ['a', 'b', 'c'],
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          className: isDarkMap ? 'foodrescue-dark-tiles' : '',
        });

        tileLayer.addTo(map);
        tileLayerRef.current = tileLayer;

        // Center-Pin Panning Listeners
        map.on('movestart', () => {
          setIsMoving(true);
        });

        map.on('move', () => {
          setIsMoving(true);
        });

        map.on('moveend', () => {
          setIsMoving(false);
          const center = map.getCenter();
          setCoords({ lat: center.lat, lng: center.lng });
          triggerDebouncedGeocode(center.lat, center.lng);
        });

        // Allow tapping anywhere on map to pan and position pointer there
        map.on('click', (e) => {
          const { lat, lng } = e.latlng;
          map.panTo([lat, lng], { animate: true });
        });

        mapInstanceRef.current = map;

        // Invalidate size in multiple intervals to ensure zero blank areas
        setTimeout(() => map.invalidateSize(), 60);
        setTimeout(() => map.invalidateSize(), 200);
        setTimeout(() => map.invalidateSize(), 450);

        // If starting at default coordinates and no initial address, auto-detect location
        if (!initialAddress && Math.abs(startLat - 28.6139) < 0.001 && Math.abs(startLng - 77.2090) < 0.001) {
          getLiveLocation()
            .then((loc) => {
              if (loc && loc.latitude && loc.longitude) {
                applyLocation(loc.latitude, loc.longitude, loc.source, true);
              }
            })
            .catch(() => {
              // ignore background auto-detect failure
            });
        }
      } catch (err) {
        console.error('[MapPicker] Map creation error:', err);
      }
    }, 120);

    return () => {
      clearTimeout(timer);
      clearTimeout(guideTimer);
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {
          // ignore
        }
        mapInstanceRef.current = null;
        userMarkerRef.current = null;
      }
    };
  }, [isOpen]);

  // Dynamically update map tile styling when theme changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (tileLayerRef.current) {
      try {
        mapInstanceRef.current.removeLayer(tileLayerRef.current);
      } catch {
        // ignore
      }
    }

    const newLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c'],
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      className: isDarkMap ? 'foodrescue-dark-tiles' : '',
    }).addTo(mapInstanceRef.current);

    tileLayerRef.current = newLayer;
  }, [isDarkMap]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        userMarkerRef.current = null;
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleConfirm = () => {
    const finalAddress =
      address.trim() ||
      searchQuery.trim() ||
      `Pickup Location (${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)})`;

    onSelectLocation({
      address: finalAddress,
      latitude: Number(coords.lat.toFixed(6)),
      longitude: Number(coords.lng.toFixed(6)),
    });
    toast.success('Pickup location confirmed!');
    onClose();
  };

  if (!isOpen || typeof document === 'undefined') return null;

  // Render via React Portal into document.body to ensure 100% full-screen overlay above all layouts and headers
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 md:p-6 bg-black/85 backdrop-blur-xs animate-fade-in select-none">
      <style>{`
        @keyframes leaflet-gps-ping {
          0% { transform: scale(0.6); opacity: 0.9; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        .foodrescue-dark-tiles {
          filter: invert(100%) hue-rotate(180deg) brightness(88%) contrast(92%) saturate(75%);
        }
      `}</style>
      <div className="w-full h-full md:max-w-2xl md:h-[86vh] md:max-h-[760px] md:rounded-3xl overflow-hidden flex flex-col bg-white dark:bg-[#0c0c0e] shadow-2xl relative border-0 md:border md:border-neutral-200 dark:md:border-[#232328]">
        
        {/* 
          ─── 1. TOP APP BAR (Themed to Website: Dark Carbon #121214 + Neon Green #39FF14 Indicator) ───
        */}
        <header className="bg-white dark:bg-[#121214] border-b border-neutral-200 dark:border-[#232328] text-neutral-900 dark:text-white px-3 sm:px-4 py-3 sm:py-3.5 flex items-center justify-between shadow-md z-30 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              aria-label="Back"
              className="p-2 -ml-1 rounded-full hover:bg-neutral-100 dark:hover:bg-[#18181c] active:bg-neutral-200 dark:active:bg-[#232328] transition-colors cursor-pointer text-neutral-700 dark:text-neutral-200"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
            </button>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#39FF14] shadow-sm shadow-[#39FF14]/50 animate-pulse"></span>
              <h2 className="text-base sm:text-lg font-bold tracking-tight select-none">
                {title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {/* Map Theme Style Toggle (Dark Matter vs Street Map) */}
            <button
              type="button"
              onClick={() => setCustomMapStyle(isDarkMap ? 'street' : 'dark')}
              className={`p-2 rounded-full transition-colors cursor-pointer ${
                customMapStyle
                  ? 'bg-neutral-200 dark:bg-[#232328] text-[#39FF14]'
                  : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-[#18181c]'
              }`}
              title={isDarkMap ? 'Switch to Street Map' : 'Switch to Dark Map'}
            >
              <Layers className="w-5 h-5" />
            </button>

            {/* Search Toggle Button */}
            <button
              type="button"
              onClick={() => setSearchOpen(!searchOpen)}
              className={`p-2 rounded-full transition-colors cursor-pointer ${
                searchOpen
                  ? 'bg-[#39FF14] text-black font-bold shadow-md shadow-[#39FF14]/25'
                  : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-[#18181c]'
              }`}
              title="Search Address"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* GPS Quick Button in Header */}
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={locating}
              className="p-2 rounded-full text-[#39FF14] hover:bg-[#39FF14]/15 active:bg-[#39FF14]/25 transition-colors cursor-pointer"
              title="Center Map on My Current Location"
            >
              <Crosshair className={`w-5 h-5 ${locating ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        {/* ─── 2. FLOATING SEARCH BAR (Collapsible) ─── */}
        {searchOpen && (
          <div className="absolute top-[56px] left-0 right-0 z-30 p-3 bg-white/95 dark:bg-[#121214]/95 backdrop-blur-md border-b border-neutral-200 dark:border-[#232328] shadow-lg animate-slide-down">
            <form onSubmit={handleSearch} className="flex items-center gap-2 max-w-xl mx-auto">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search street, landmark, area, or city..."
                  className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-neutral-100 dark:bg-[#18181c] border border-neutral-200 dark:border-[#2e2e38] text-xs sm:text-sm text-neutral-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#39FF14] focus:border-[#39FF14]"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={searching}
                className="px-4 py-2.5 rounded-xl bg-[#39FF14] hover:bg-[#32e612] active:bg-[#28cc0c] text-black font-extrabold text-xs transition-all shadow-md shadow-[#39FF14]/20 shrink-0 cursor-pointer"
              >
                {searching ? 'Finding...' : 'Search'}
              </button>
            </form>
          </div>
        )}

        {/* ─── 3. FULL-HEIGHT INTERACTIVE MAP CONTAINER ─── */}
        <div className="relative flex-1 w-full h-full overflow-hidden bg-[#e5e7eb] dark:bg-[#18181c]">
          {/* Leaflet Canvas (Absolute Inset-0 to guarantee 100% full height) */}
          <div
            ref={mapContainerRef}
            className="absolute inset-0 w-full h-full z-0"
            style={{ width: '100%', height: '100%' }}
          />

          {/* 
            ─── CENTER PIN MARKER (Themed to FoodRescue Platform) ───
            Matches Website Theme: Carbon Pin Body with Neon Green #39FF14 Rim & Inner Core
            Lifts up slightly when the map is moving, settles down when resting
          */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-20 flex flex-col items-center">
            {/* Animated Themed Pin */}
            <div
              className={`transition-transform duration-200 ease-out origin-bottom ${
                isMoving ? '-translate-y-3 scale-110' : 'translate-y-0 scale-100'
              }`}
            >
              <svg width="42" height="52" viewBox="0 0 42 52" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_4px_12px_rgba(0,0,0,0.85)]">
                {/* Outer Pin Body (Dark Carbon with Electric Green Rim) */}
                <path
                  d="M21 2C10.5 2 2 10.5 2 21C2 34 21 50 21 50C21 50 40 34 40 21C40 10.5 31.5 2 21 2Z"
                  fill="#121214"
                  stroke="#39FF14"
                  strokeWidth="2.5"
                />
                {/* Outer Accent Ring (#39FF14 Neon Green) */}
                <circle cx="21" cy="20" r="10" fill="#39FF14" fillOpacity="0.2" stroke="#39FF14" strokeWidth="1.5" />
                {/* Inner Glowing Center Dot (#39FF14 Neon Green) */}
                <circle cx="21" cy="20" r="5.5" fill="#39FF14" />
                <circle cx="21" cy="20" r="2" fill="#FFFFFF" />
              </svg>
            </div>

            {/* Soft Ground Shadow & Contact Target Ring */}
            <div
              className={`w-4 h-2 bg-[#39FF14]/40 rounded-full blur-[1px] transition-all duration-200 -mt-1 ${
                isMoving ? 'scale-75 opacity-25' : 'scale-100 opacity-80 shadow-[0_0_8px_#39FF14]'
              }`}
            />
          </div>

          {/* Floating Instructions Pill (Auto fades after 3.5s or appears during moving) */}
          <div
            className={`absolute top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none transition-all duration-300 ${
              showGuide || isMoving ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
            }`}
          >
            <span className="px-3.5 py-1.5 rounded-full bg-neutral-900/85 dark:bg-black/90 backdrop-blur-md text-[11px] font-semibold text-white shadow-lg flex items-center gap-1.5 border border-white/10">
              <MapPin className="w-3.5 h-3.5 text-[#39FF14]" />
              <span>Drag map to adjust pickup point</span>
            </span>
          </div>

          {/* 
            ─── Floating GPS Recenter FAB Button (Bottom Right) ───
            Matches user's circled button from screenshot:
            Dark circular button with neon crosshairs icon
            On click -> takes the map pointer directly to current GPS location
          */}
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={locating}
            aria-label="Center Map on My Current Location"
            title="My Current Location"
            className="absolute bottom-4 right-4 z-[1500] w-12 h-12 rounded-full bg-[#18181c] border border-[#2e2e38] shadow-2xl shadow-black/80 flex items-center justify-center text-[#39FF14] hover:bg-[#232328] hover:border-[#39FF14]/60 active:scale-90 transition-all cursor-pointer pointer-events-auto group"
          >
            <Crosshair className={`w-5 h-5 transition-transform group-hover:scale-110 ${locating ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* ─── 4. BOTTOM ACTION SHEET & "CONFIRM PICKUP LOCATION" ─── */}
        <div className="z-30 bg-white dark:bg-[#121214] border-t border-neutral-200 dark:border-[#232328] p-3.5 sm:p-4 pb-6 sm:pb-4 shadow-2xl shrink-0 flex flex-col gap-3">
          
          {/* Resolved Address Box */}
          <div className="flex items-start gap-3 bg-neutral-50 dark:bg-[#18181c] p-3 sm:p-3.5 rounded-2xl border border-neutral-200/80 dark:border-[#282830]">
            <div className="w-8 h-8 rounded-xl bg-[#39FF14]/15 text-[#39FF14] flex items-center justify-center shrink-0 mt-0.5 font-bold border border-[#39FF14]/20">
              <Navigation className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white truncate">
                  {geocoding ? 'Detecting address...' : addressDetails.title || 'Selected Location'}
                </p>
                <span className="font-mono text-[10px] sm:text-[11px] font-semibold text-[#39FF14] bg-neutral-200/70 dark:bg-[#232328] border border-[#39FF14]/20 px-2 py-0.5 rounded-md shrink-0">
                  {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 line-clamp-1 mt-0.5">
                {geocoding ? 'Resolving street & area name...' : address || 'Move the map to choose an exact location'}
              </p>
            </div>
            {geocoding && <RefreshCw className="w-3.5 h-3.5 text-[#39FF14] animate-spin shrink-0 mt-1" />}
          </div>

          {/* 
            Pinned Full-Width "SELECT LOCATION!" Button
            Matches the website's .btn-primary: #39FF14 neon green, bold black text, glowing shadow
          */}
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full py-3.5 sm:py-4 px-4 rounded-xl sm:rounded-2xl bg-[#39FF14] hover:bg-[#32e612] active:bg-[#28cc0c] text-black font-extrabold text-sm sm:text-base tracking-wider uppercase transition-all shadow-lg shadow-[#39FF14]/30 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check className="w-5 h-5 stroke-[3]" />
            SELECT LOCATION!
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
