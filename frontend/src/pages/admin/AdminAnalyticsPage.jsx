import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, Minus, Filter, RotateCcw, Download,
  MapPin, AlertTriangle, ShieldCheck, Clock, CheckCircle2,
  XCircle, Truck, Package, Building2, Users, ArrowUpRight,
  Flame, Scale, ChevronRight, HelpCircle, RefreshCw, BarChart2,
  Layers, Compass
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../../api/client';
import toast from 'react-hot-toast';

// Privacy-preserving interactive Leaflet Hotspot Map with custom cluster markers & tile switcher
function HotspotLeafletMap({ hotspots, focusedHotspot, onSelectHotspot, onFitAllRef }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersGroupRef = useRef(null);
  const markerMapRef = useRef({});
  const tileLayerRef = useRef(null);
  const [mapStyle, setMapStyle] = useState('dark'); // 'dark' | 'street'

  const defaultCenter = [20.5937, 78.9629]; // India center

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const container = mapContainerRef.current;

    // Remove any previous map instance on remount
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove();
      } catch {
        // ignore
      }
      mapInstanceRef.current = null;
    }

    if (container._leaflet_id) {
      delete container._leaflet_id;
    }

    const map = L.map(container, {
      zoomControl: true,
      scrollWheelZoom: true,
      attributionControl: true,
    }).setView(defaultCenter, 5);

    const tileUrl =
      mapStyle === 'dark'
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const tileLayer = L.tileLayer(tileUrl, {
      maxZoom: 19,
      subdomains: mapStyle === 'dark' ? 'abcd' : 'abc',
      attribution: mapStyle === 'dark' ? '&copy; CARTO &copy; OpenStreetMap' : '&copy; OpenStreetMap contributors',
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    const markersGroup = L.featureGroup().addTo(map);
    markersGroupRef.current = markersGroup;
    mapInstanceRef.current = map;

    // ResizeObserver ensures map tiles immediately render after container resize or tab change
    const resizeObserver = new ResizeObserver(() => {
      try {
        map.invalidateSize();
      } catch {
        // ignore
      }
    });
    resizeObserver.observe(container);

    const t1 = setTimeout(() => { try { map.invalidateSize(); } catch {} }, 100);
    const t2 = setTimeout(() => { try { map.invalidateSize(); } catch {} }, 350);
    const t3 = setTimeout(() => { try { map.invalidateSize(); } catch {} }, 700);

    return () => {
      resizeObserver.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      try {
        map.remove();
      } catch {
        // ignore
      }
      mapInstanceRef.current = null;
      markersGroupRef.current = null;
      markerMapRef.current = {};
    };
  }, [mapStyle]);

  // Sync Hotspots onto Custom Visual Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();
    markerMapRef.current = {};

    const validSpots = (hotspots || []).filter(
      (s) => s.lat != null && s.lng != null && !isNaN(Number(s.lat)) && !isNaN(Number(s.lng))
    );

    if (validSpots.length === 0) {
      map.setView(defaultCenter, 5);
      return;
    }

    validSpots.forEach((spot) => {
      const lat = parseFloat(spot.lat);
      const lng = parseFloat(spot.lng);

      const color =
        spot.demand_gap_status === 'unmet_supply'
          ? '#f43f5e'
          : spot.demand_gap_status === 'high_fulfillment'
          ? '#10b981'
          : '#f59e0b';

      const isUnmet = spot.demand_gap_status === 'unmet_supply';

      // Custom HTML Marker showing total donations count inside
      const iconHtml = `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 38px; height: 38px; cursor: pointer;">
          ${isUnmet ? `<span style="position: absolute; inset: -4px; border-radius: 9999px; background: rgba(244, 63, 94, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>` : ''}
          <div style="width: 32px; height: 32px; border-radius: 9999px; background: ${color}; border: 2.5px solid #ffffff; box-shadow: 0 4px 14px rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 800; font-size: 12px; font-family: ui-sans-serif, system-ui, sans-serif;">
            ${spot.total_donations || 1}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-hotspot-pin',
        iconSize: [38, 38],
        iconAnchor: [19, 19],
        popupAnchor: [0, -19],
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      const badgeBg =
        spot.demand_gap_status === 'unmet_supply'
          ? 'rgba(244, 63, 94, 0.25)'
          : spot.demand_gap_status === 'high_fulfillment'
          ? 'rgba(16, 185, 129, 0.25)'
          : 'rgba(245, 158, 11, 0.25)';

      const badgeColor =
        spot.demand_gap_status === 'unmet_supply'
          ? '#fb7185'
          : spot.demand_gap_status === 'high_fulfillment'
          ? '#34d399'
          : '#fbbf24';

      const statusLabel = (spot.demand_gap_status || 'balanced').replace(/_/g, ' ');

      const popupHtml = `
        <div style="font-family: inherit; min-width: 220px; color: #f4f4f5; padding: 6px 4px; background: #121214; border-radius: 12px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; border-bottom: 1px solid #27272e; padding-bottom: 6px;">
            <h4 style="margin: 0; font-weight: 700; font-size: 13px; color: #fff;">${spot.area_name || 'Regional Cluster'}</h4>
            <span style="font-size: 9px; font-weight: 700; text-transform: uppercase; padding: 2px 7px; border-radius: 9999px; background: ${badgeBg}; color: ${badgeColor}; white-space: nowrap;">
              ${statusLabel}
            </span>
          </div>
          <div style="font-size: 11px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
            <div>Donations: <strong style="color: #fff;">${spot.total_donations || 0}</strong></div>
            <div>Delivered: <strong style="color: #39FF14;">${spot.completed_deliveries || 0}</strong></div>
            <div>In-Transit: <strong style="color: #38bdf8;">${spot.available_count || 0}</strong></div>
            <div>Fulfillment: <strong style="color: #fff;">${spot.fulfillment_rate ?? Math.round(((spot.completed_deliveries || 0) / Math.max(spot.total_donations || 1, 1)) * 100)}%</strong></div>
            <div>Servings: <strong style="color: #fff;">${(spot.total_quantity || 0).toLocaleString()}</strong></div>
            <div>Providers: <strong style="color: #fff;">${spot.distinct_providers || 1}</strong></div>
          </div>
          ${spot.sample_addresses && spot.sample_addresses.length > 0 ? `
            <div style="margin-top: 8px; border-top: 1px solid #232328; padding-top: 6px; font-size: 10px; color: #a1a1aa; line-height: 1.3;">
              📍 <span style="color: #d4d4d8;">${spot.sample_addresses[0]}</span>
            </div>
          ` : ''}
          <div style="margin-top: 8px; font-size: 10px; color: #39FF14; text-align: center; font-weight: 600;">
            Click card to open cluster inspector ↓
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 290 });
      marker.on('click', () => {
        if (onSelectHotspot) onSelectHotspot(spot);
      });

      markersGroup.addLayer(marker);
      markerMapRef.current[spot.id] = marker;
    });

    try {
      if (validSpots.length === 1) {
        map.setView([validSpots[0].lat, validSpots[0].lng], 12);
      } else {
        const bounds = markersGroup.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [45, 45], maxZoom: 12 });
        }
      }
    } catch {
      // fitBounds fallback
    }
  }, [hotspots, onSelectHotspot]);

  // Focus and flyTo selected hotspot
  useEffect(() => {
    if (focusedHotspot && mapInstanceRef.current && focusedHotspot.lat && focusedHotspot.lng) {
      const lat = parseFloat(focusedHotspot.lat);
      const lng = parseFloat(focusedHotspot.lng);
      mapInstanceRef.current.flyTo([lat, lng], 13, { duration: 1.2 });

      const marker = markerMapRef.current[focusedHotspot.id];
      if (marker) {
        setTimeout(() => {
          try {
            marker.openPopup();
          } catch {
            // ignore
          }
        }, 600);
      }
    }
  }, [focusedHotspot]);

  // Expose fitBounds helper via ref
  useEffect(() => {
    if (onFitAllRef) {
      onFitAllRef.current = () => {
        const map = mapInstanceRef.current;
        const markersGroup = markersGroupRef.current;
        if (!map || !markersGroup) return;
        try {
          const bounds = markersGroup.getBounds();
          if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [45, 45], maxZoom: 12, animate: true });
          }
        } catch {
          // ignore
        }
      };
    }
  }, [onFitAllRef]);

  return (
    <div className="relative h-full w-full">
      {/* Tile Switcher Control */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center bg-black/80 backdrop-blur-md rounded-xl p-1 border border-white/10 shadow-lg text-[11px]">
        <button
          type="button"
          onClick={() => setMapStyle('dark')}
          className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
            mapStyle === 'dark' ? 'bg-white text-black shadow-xs' : 'text-neutral-400 hover:text-white'
          }`}
        >
          Dark Tile
        </button>
        <button
          type="button"
          onClick={() => setMapStyle('street')}
          className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
            mapStyle === 'street' ? 'bg-white text-black shadow-xs' : 'text-neutral-400 hover:text-white'
          }`}
        >
          Street Tile
        </button>
      </div>
      <div ref={mapContainerRef} className="h-full w-full z-10" />
    </div>
  );
}

export default function AdminAnalyticsPage({ defaultTab }) {
  const [searchParams] = useSearchParams();
  const queryTab = searchParams.get('tab');
  const initialTab = queryTab || defaultTab || 'overview';

  // Active Tab
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (queryTab) {
      setActiveTab(queryTab);
    }
  }, [queryTab]);

  // Global Filters
  const [dateRange, setDateRange] = useState('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [region, setRegion] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedOrgType, setSelectedOrgType] = useState('all');
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [inactivityDays, setInactivityDays] = useState('30');

  // Filter dropdown options
  const [filterOptions, setFilterOptions] = useState({ providers: [], ngos: [], categories: [] });

  // Data states
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [kpiData, setKpiData] = useState(null);
  const [hotspots, setHotspots] = useState([]);
  const [wastedCategories, setWastedCategories] = useState([]);
  const [demandData, setDemandData] = useState(null);
  const [reliabilityData, setReliabilityData] = useState(null);
  const [inactiveProviders, setInactiveProviders] = useState(null);

  // Selected hotspot for map focus
  const [focusedHotspot, setFocusedHotspot] = useState(null);
  const fitAllHotspotsRef = useRef(null);
  const [hotspotStatusFilter, setHotspotStatusFilter] = useState('all');
  const [hotspotSearch, setHotspotSearch] = useState('');

  // Filtered hotspots for sidebar list
  const filteredHotspots = useMemo(() => {
    return (hotspots || []).filter((h) => {
      if (hotspotStatusFilter !== 'all' && h.demand_gap_status !== hotspotStatusFilter) {
        return false;
      }
      if (hotspotSearch.trim()) {
        const query = hotspotSearch.toLowerCase();
        const inName = (h.area_name || '').toLowerCase().includes(query);
        const inAddr = (h.sample_addresses || []).some((a) => a.toLowerCase().includes(query));
        return inName || inAddr;
      }
      return true;
    });
  }, [hotspots, hotspotStatusFilter, hotspotSearch]);

  // Load filter options on mount
  useEffect(() => {
    api.get('/analytics/admin/filter-options')
      .then(res => setFilterOptions(res.data.data))
      .catch(() => {});
  }, []);

  // Compute query params
  const queryParams = useMemo(() => {
    const params = { dateRange };
    if (dateRange === 'custom' && customStart && customEnd) {
      params.startDate = new Date(customStart).toISOString();
      params.endDate = new Date(customEnd).toISOString();
    }
    if (region.trim()) params.region = region.trim();
    if (selectedCategory !== 'all') params.category = selectedCategory;
    if (selectedStatus !== 'all') params.deliveryStatus = selectedStatus;
    if (selectedOrgId) {
      params.organizationType = selectedOrgType;
      params.organizationId = selectedOrgId;
    }
    return params;
  }, [dateRange, customStart, customEnd, region, selectedCategory, selectedStatus, selectedOrgType, selectedOrgId]);

  // Fetch all analytics data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [kpiRes, hotspotsRes, wastedRes, demandRes, reliabilityRes, inactiveRes] = await Promise.allSettled([
        api.get('/analytics/admin/kpis', { params: queryParams }),
        api.get('/analytics/admin/hotspots', { params: queryParams }),
        api.get('/analytics/admin/wasted-categories', { params: queryParams }),
        api.get('/analytics/admin/demand-gaps', { params: queryParams }),
        api.get('/analytics/admin/delivery-reliability', { params: queryParams }),
        api.get('/analytics/admin/inactive-providers', { params: { days: inactivityDays } })
      ]);

      if (kpiRes.status === 'fulfilled') setKpiData(kpiRes.value.data.data);
      if (hotspotsRes.status === 'fulfilled') setHotspots(hotspotsRes.value.data.data.hotspots || []);
      if (wastedRes.status === 'fulfilled') setWastedCategories(wastedRes.value.data.data.categories || []);
      if (demandRes.status === 'fulfilled') setDemandData(demandRes.value.data.data);
      if (reliabilityRes.status === 'fulfilled') setReliabilityData(reliabilityRes.value.data.data);
      if (inactiveRes.status === 'fulfilled') setInactiveProviders(inactiveRes.value.data.data);
    } catch {
      toast.error('Failed to load analytics data.');
    } finally {
      setLoading(false);
    }
  }, [queryParams, inactivityDays]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset filters
  const handleResetFilters = () => {
    setDateRange('30d');
    setCustomStart('');
    setCustomEnd('');
    setRegion('');
    setSelectedCategory('all');
    setSelectedStatus('all');
    setSelectedOrgType('all');
    setSelectedOrgId('');
  };

  // CSV Export
  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const response = await api.get('/analytics/admin/export', {
        params: queryParams,
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `foodrescue-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success('Filtered data exported to CSV');
    } catch {
      toast.error('Failed to export CSV data');
    } finally {
      setExporting(false);
    }
  };

  // Helper for KPI trend rendering
  const renderTrend = (change) => {
    if (change === null || change === undefined) {
      return (
        <span className="text-[11px] text-neutral-500 flex items-center gap-0.5">
          <Minus className="w-3 h-3" /> No prior data
        </span>
      );
    }
    if (change > 0) {
      return (
        <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-0.5 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
          <TrendingUp className="w-3 h-3" /> +{change}%
        </span>
      );
    }
    if (change < 0) {
      return (
        <span className="text-[11px] font-semibold text-rose-400 flex items-center gap-0.5 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
          <TrendingDown className="w-3 h-3" /> {change}%
        </span>
      );
    }
    return (
      <span className="text-[11px] text-neutral-400 flex items-center gap-0.5 bg-neutral-500/10 px-1.5 py-0.5 rounded">
        <Minus className="w-3 h-3" /> 0%
      </span>
    );
  };

  // Default map center (San Francisco / fallback or first hotspot)
  const defaultCenter = useMemo(() => {
    if (hotspots.length > 0 && hotspots[0].lat && hotspots[0].lng) {
      return [hotspots[0].lat, hotspots[0].lng];
    }
    return [37.7749, -122.4194];
  }, [hotspots]);

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#232328] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/10 text-white border border-white/20">
              Admin Analytics
            </span>
            <span className="text-xs text-neutral-500">Live Database Metrics</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1">Platform Operations & Impact Analytics</h1>
          <p className="text-neutral-400 text-xs sm:text-sm mt-0.5">
            Real-time donation trends, regional hotspots, NGO demand gaps, and courier reliability.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchData}
            disabled={loading}
            className="btn btn-secondary text-xs flex items-center gap-1.5 py-2 px-3"
            title="Refresh metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={handleExportCSV}
            disabled={exporting || loading}
            className="btn btn-primary text-xs flex items-center gap-1.5 py-2 px-3.5 bg-white text-black hover:bg-neutral-200"
          >
            <Download className="w-3.5 h-3.5" />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* Global Filter Bar */}
      <div className="bg-[#121214] border border-[#232328] rounded-2xl p-4 sm:p-5 shadow-xl space-y-3.5">
        <div className="flex items-center justify-between border-b border-[#1f1f24] pb-2.5">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-neutral-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">Global Dashboard Filters</span>
          </div>
          <button
            onClick={handleResetFilters}
            className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3 h-3" /> Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Date Range */}
          <div>
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
              Date Range
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="input text-xs py-1.5 w-full bg-[#18181b]"
            >
              <option value="today">Today</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="all">All Time</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Region Search */}
          <div>
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
              Region / City
            </label>
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="e.g. Market, Downtown"
              className="input text-xs py-1.5 w-full bg-[#18181b]"
            />
          </div>

          {/* Food Category */}
          <div>
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
              Food Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="input text-xs py-1.5 w-full bg-[#18181b]"
            >
              <option value="all">All Categories</option>
              {filterOptions.categories.map((c) => (
                <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          {/* Delivery Status */}
          <div>
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
              Delivery Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="input text-xs py-1.5 w-full bg-[#18181b]"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending Claim</option>
              <option value="accepted">Accepted / Assigned</option>
              <option value="in_transit">In Transit</option>
              <option value="delivered">Delivered</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {/* Organization Type */}
          <div>
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
              Organization Type
            </label>
            <select
              value={selectedOrgType}
              onChange={(e) => {
                setSelectedOrgType(e.target.value);
                setSelectedOrgId('');
              }}
              className="input text-xs py-1.5 w-full bg-[#18181b]"
            >
              <option value="all">All Organizations</option>
              <option value="provider">Food Providers</option>
              <option value="ngo">NGO Shelters</option>
            </select>
          </div>

          {/* Organization Selection */}
          <div>
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
              Select Specific Org
            </label>
            <select
              value={selectedOrgId}
              disabled={selectedOrgType === 'all'}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="input text-xs py-1.5 w-full bg-[#18181b] disabled:opacity-40"
            >
              <option value="">All {selectedOrgType === 'provider' ? 'Providers' : selectedOrgType === 'ngo' ? 'NGOs' : ''}</option>
              {selectedOrgType === 'provider' && filterOptions.providers.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
              {selectedOrgType === 'ngo' && filterOptions.ngos.map((n) => (
                <option key={n.id} value={n.id}>{n.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom Range Picker */}
        {dateRange === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#1c1c22]">
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400">From:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="input text-xs py-1 bg-[#18181b]"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400">To:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="input text-xs py-1 bg-[#18181b]"
              />
            </div>
          </div>
        )}
      </div>

      {/* KPI Summary Cards Grid */}
      {loading && !kpiData ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 bg-[#141416] rounded-2xl animate-pulse border border-[#232328]" />
          ))}
        </div>
      ) : kpiData ? (
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Total Posted */}
            <div className="bg-[#121214] border border-[#232328] rounded-2xl p-4 shadow-md space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Donations Posted</span>
                <Package className="w-3.5 h-3.5 text-neutral-500" />
              </div>
              <div className="text-xl font-bold text-white tracking-tight">
                {kpiData.metrics.total_donations.value.toLocaleString()}
              </div>
              <div>{renderTrend(kpiData.metrics.total_donations.change)}</div>
            </div>

            {/* Total Delivered */}
            <div className="bg-[#121214] border border-[#232328] rounded-2xl p-4 shadow-md space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Rescued & Delivered</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-xl font-bold text-emerald-400 tracking-tight">
                {kpiData.metrics.delivered_donations.value.toLocaleString()}
              </div>
              <div>{renderTrend(kpiData.metrics.delivered_donations.change)}</div>
            </div>

            {/* Servings Rescued */}
            <div className="bg-[#121214] border border-[#232328] rounded-2xl p-4 shadow-md space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Servings Rescued</span>
                <Flame className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-xl font-bold text-white tracking-tight">
                {kpiData.metrics.rescued_servings.value.toLocaleString()}
              </div>
              <div>{renderTrend(kpiData.metrics.rescued_servings.change)}</div>
            </div>

            {/* Weight Rescued */}
            <div className="bg-[#121214] border border-[#232328] rounded-2xl p-4 shadow-md space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Food Weight (KG)</span>
                <Scale className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div className="text-xl font-bold text-white tracking-tight">
                {kpiData.metrics.rescued_weight_kg.value.toLocaleString()} kg
              </div>
              <div>{renderTrend(kpiData.metrics.rescued_weight_kg.change)}</div>
            </div>

            {/* Delivery Completion Rate */}
            <div className="bg-[#121214] border border-[#232328] rounded-2xl p-4 shadow-md space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Completion Rate</span>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-xl font-bold text-white tracking-tight">
                {kpiData.metrics.delivery_completion_rate.value}%
              </div>
              <div>{renderTrend(kpiData.metrics.delivery_completion_rate.change)}</div>
            </div>

            {/* Inactive Providers */}
            <div className="bg-[#121214] border border-[#232328] rounded-2xl p-4 shadow-md space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Inactive Providers</span>
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-xl font-bold text-amber-400 tracking-tight">
                {kpiData.metrics.inactive_providers.value}
              </div>
              <span className="text-[11px] text-neutral-500">Need Outreach</span>
            </div>
          </div>

          {/* Secondary KPI Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-[#0c0c0e] border border-[#232328] p-3 rounded-2xl">
            <div className="flex items-center gap-2.5 px-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <div>
                <span className="text-neutral-500 block text-[10px]">Active Available</span>
                <strong className="text-white text-sm">{kpiData.metrics.available_donations.value}</strong>
              </div>
            </div>

            <div className="flex items-center gap-2.5 px-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
              <div>
                <span className="text-neutral-500 block text-[10px]">In Progress / Transit</span>
                <strong className="text-white text-sm">{kpiData.metrics.in_progress_donations.value}</strong>
              </div>
            </div>

            <div className="flex items-center gap-2.5 px-2">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              <div>
                <span className="text-neutral-500 block text-[10px]">Expired Listings</span>
                <strong className="text-white text-sm">{kpiData.metrics.expired_donations.value}</strong>
              </div>
            </div>

            <div className="flex items-center gap-2.5 px-2">
              <div className="w-2.5 h-2.5 rounded-full bg-neutral-400" />
              <div>
                <span className="text-neutral-500 block text-[10px]">Active Stakeholders</span>
                <strong className="text-white text-sm">
                  {kpiData.metrics.active_providers.value} Donors · {kpiData.metrics.active_ngos.value} NGOs · {kpiData.metrics.active_volunteers.value} Couriers
                </strong>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Dashboard Sub-Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-neutral-200 dark:border-[#232328] pb-1 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-neutral-900 text-white dark:bg-[#25252b] dark:text-white dark:border dark:border-[#383842] shadow-md'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white bg-neutral-100 dark:bg-[#141416] border border-neutral-200 dark:border-[#232328]'
          }`}
        >
          <MapPin className="w-4 h-4" />
          Hotspots & Demand Map
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'categories'
              ? 'bg-neutral-900 text-white dark:bg-[#25252b] dark:text-white dark:border dark:border-[#383842] shadow-md'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white bg-neutral-100 dark:bg-[#141416] border border-neutral-200 dark:border-[#232328]'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          Wasted Categories Analysis
        </button>

        <button
          onClick={() => setActiveTab('demand')}
          className={`px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'demand'
              ? 'bg-neutral-900 text-white dark:bg-[#25252b] dark:text-white dark:border dark:border-[#383842] shadow-md'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white bg-neutral-100 dark:bg-[#141416] border border-neutral-200 dark:border-[#232328]'
          }`}
        >
          <Building2 className="w-4 h-4" />
          NGO Demand & Fulfillment
        </button>

        <button
          onClick={() => setActiveTab('reliability')}
          className={`px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'reliability'
              ? 'bg-neutral-900 text-white dark:bg-[#25252b] dark:text-white dark:border dark:border-[#383842] shadow-md'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white bg-neutral-100 dark:bg-[#141416] border border-neutral-200 dark:border-[#232328]'
          }`}
        >
          <Truck className="w-4 h-4" />
          Delivery Reliability & QR
        </button>

        <button
          onClick={() => setActiveTab('providers')}
          className={`px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'providers'
              ? 'bg-neutral-900 text-white dark:bg-[#25252b] dark:text-white dark:border dark:border-[#383842] shadow-md'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white bg-neutral-100 dark:bg-[#141416] border border-neutral-200 dark:border-[#232328]'
          }`}
        >
          <Users className="w-4 h-4" />
          Inactive Providers ({kpiData?.metrics?.inactive_providers?.value || 0})
        </button>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 1: DONATION HOTSPOTS MAP & DEMAND GAPS                */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-slide-up">
          {/* Regional Quick Jump Chips */}
          {filteredHotspots.length > 0 && (
            <div className="bg-[#121214] border border-[#232328] rounded-2xl p-3 shadow-md flex items-center gap-2 overflow-x-auto text-xs">
              <span className="text-[11px] font-bold text-neutral-400 shrink-0 uppercase tracking-wider flex items-center gap-1.5 pl-1">
                <Compass className="w-3.5 h-3.5 text-[#39FF14]" /> Quick Jump:
              </span>
              <button
                type="button"
                onClick={() => {
                  setFocusedHotspot(null);
                  fitAllHotspotsRef.current?.();
                }}
                className={`px-3 py-1.5 rounded-xl font-bold shrink-0 transition-all cursor-pointer ${
                  !focusedHotspot
                    ? 'bg-white text-black shadow-sm'
                    : 'bg-[#18181b] text-neutral-300 hover:text-white border border-[#27272e]'
                }`}
              >
                🌍 Fit All ({filteredHotspots.length})
              </button>
              {filteredHotspots.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setFocusedHotspot(h)}
                  className={`px-3 py-1.5 rounded-xl font-semibold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                    focusedHotspot?.id === h.id
                      ? 'bg-[#39FF14] text-black font-bold shadow-md shadow-[#39FF14]/20'
                      : 'bg-[#18181b] text-neutral-300 hover:text-white border border-[#27272e]'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${
                    h.demand_gap_status === 'unmet_supply'
                      ? 'bg-rose-400'
                      : h.demand_gap_status === 'high_fulfillment'
                      ? 'bg-emerald-400'
                      : 'bg-amber-400'
                  }`} />
                  📍 {h.area_name} ({h.total_donations})
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Interactive Leaflet Map */}
            <div className="lg:col-span-2 bg-[#121214] border border-[#232328] rounded-[24px] overflow-hidden shadow-2xl p-4 flex flex-col space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-2 pt-1">
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#39FF14]" />
                    Geographical Donation Hotspots
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Interactive clustered pickup locations with demand gap indicators & privacy-preserving coordinate aggregation
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> High Fulfillment
                    </span>
                    <span className="flex items-center gap-1 text-amber-400">
                      <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Balanced
                    </span>
                    <span className="flex items-center gap-1 text-rose-400">
                      <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" /> Unmet Supply
                    </span>
                  </div>
                  {filteredHotspots.length > 0 && (
                    <button
                      type="button"
                      onClick={() => fitAllHotspotsRef.current?.()}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-[#1e1e24] border border-[#2a2a32] text-neutral-200 hover:text-white hover:border-[#39FF14] transition-all flex items-center gap-1 cursor-pointer"
                      title="Fit all clusters on map"
                    >
                      <RotateCcw className="w-3 h-3 text-[#39FF14]" /> Fit View
                    </button>
                  )}
                </div>
              </div>

              <div className="h-[440px] rounded-2xl overflow-hidden border border-[#232328] relative">
                {filteredHotspots.length === 0 ? (
                  <div className="h-full flex items-center justify-center bg-[#0c0c0e] text-neutral-500 text-xs">
                    No location data found matching current filters.
                  </div>
                ) : (
                  <HotspotLeafletMap
                    hotspots={filteredHotspots}
                    focusedHotspot={focusedHotspot}
                    onSelectHotspot={setFocusedHotspot}
                    onFitAllRef={fitAllHotspotsRef}
                  />
                )}
              </div>
            </div>

            {/* Hotspots Breakdown List */}
            <div className="bg-[#121214] border border-[#232328] rounded-[24px] p-5 shadow-2xl flex flex-col space-y-3">
              <div className="border-b border-[#232328] pb-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white tracking-tight">Regional Distribution</h3>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#1e1e24] text-neutral-300 border border-[#2a2a32]">
                    {filteredHotspots.length} Clusters
                  </span>
                </div>
                <p className="text-xs text-neutral-400">Click any cluster card to fly to coordinates & view details</p>

                {/* Quick Search */}
                <input
                  type="text"
                  value={hotspotSearch}
                  onChange={(e) => setHotspotSearch(e.target.value)}
                  placeholder="Filter by city or address..."
                  className="input text-xs py-1.5 w-full bg-[#0c0c0e] border-[#232328]"
                />

                {/* Status Filter Pills */}
                <div className="flex items-center gap-1 pt-1 overflow-x-auto text-[10px]">
                  {['all', 'unmet_supply', 'high_fulfillment', 'balanced'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setHotspotStatusFilter(st)}
                      className={`px-2 py-0.5 rounded-md font-semibold capitalize whitespace-nowrap transition-colors cursor-pointer ${
                        hotspotStatusFilter === st
                          ? 'bg-white text-black font-bold'
                          : 'bg-[#18181b] text-neutral-400 hover:text-white border border-[#232328]'
                      }`}
                    >
                      {st === 'all' ? 'All' : st.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5 overflow-y-auto max-h-[380px] pr-1">
                {filteredHotspots.length === 0 ? (
                  <div className="py-8 text-center text-xs text-neutral-500">
                    No hotspot clusters match current filter.
                  </div>
                ) : (
                  filteredHotspots.map((h) => (
                    <div
                      key={h.id}
                      onClick={() => setFocusedHotspot(h)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        focusedHotspot?.id === h.id
                          ? 'bg-[#1e1e24] border-[#39FF14]/70 shadow-lg shadow-[#39FF14]/5 ring-1 ring-[#39FF14]/50'
                          : 'bg-[#0c0c0e] border-[#232328] hover:border-[#383842]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm text-white truncate">{h.area_name}</span>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                          h.demand_gap_status === 'unmet_supply'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : h.demand_gap_status === 'high_fulfillment'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {h.demand_gap_status.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-[#1a1a20] text-[11px] text-neutral-400">
                        <div>Donations: <strong className="text-white">{h.total_donations}</strong></div>
                        <div>Delivered: <strong className="text-[#39FF14]">{h.completed_deliveries}</strong></div>
                        <div>Servings: <strong className="text-white">{(h.total_quantity || 0).toLocaleString()}</strong></div>
                        <div>Providers: <strong className="text-white">{h.distinct_providers || 1}</strong></div>
                      </div>

                      {h.sample_addresses && h.sample_addresses.length > 0 && (
                        <div className="mt-2 text-[10px] text-neutral-400 border-t border-[#1a1a20] pt-1.5 truncate">
                          📍 {h.sample_addresses[0]}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Selected Hotspot Cluster Inspector */}
          {focusedHotspot && (
            <div className="bg-[#141417] border border-[#39FF14]/40 rounded-2xl p-5 shadow-2xl animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#232328]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#39FF14]/10 border border-[#39FF14]/30 flex items-center justify-center text-[#39FF14]">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-white tracking-tight">{focusedHotspot.area_name}</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-neutral-300 border border-white/15">
                        Lat: {focusedHotspot.lat.toFixed(4)}, Lng: {focusedHotspot.lng.toFixed(4)}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-0.5">Privacy-preserving 1.1km grid spatial aggregation</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full border ${
                    focusedHotspot.demand_gap_status === 'unmet_supply'
                      ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                      : focusedHotspot.demand_gap_status === 'high_fulfillment'
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  }`}>
                    {focusedHotspot.demand_gap_status.replace(/_/g, ' ')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFocusedHotspot(null)}
                    className="p-1.5 rounded-lg bg-[#232328] text-neutral-400 hover:text-white transition-colors cursor-pointer"
                    title="Clear focus"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Metric Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mt-4">
                <div className="bg-[#0c0c0e] p-3 rounded-xl border border-[#232328]">
                  <div className="text-[10px] uppercase font-bold text-neutral-400">Total Posted</div>
                  <div className="text-lg font-bold text-white mt-1">{focusedHotspot.total_donations}</div>
                </div>
                <div className="bg-[#0c0c0e] p-3 rounded-xl border border-[#232328]">
                  <div className="text-[10px] uppercase font-bold text-neutral-400">Delivered</div>
                  <div className="text-lg font-bold text-[#39FF14] mt-1">{focusedHotspot.completed_deliveries}</div>
                </div>
                <div className="bg-[#0c0c0e] p-3 rounded-xl border border-[#232328]">
                  <div className="text-[10px] uppercase font-bold text-neutral-400">In-Progress</div>
                  <div className="text-lg font-bold text-sky-400 mt-1">{focusedHotspot.available_count}</div>
                </div>
                <div className="bg-[#0c0c0e] p-3 rounded-xl border border-[#232328]">
                  <div className="text-[10px] uppercase font-bold text-neutral-400">Expired</div>
                  <div className="text-lg font-bold text-rose-400 mt-1">{focusedHotspot.expired_count}</div>
                </div>
                <div className="bg-[#0c0c0e] p-3 rounded-xl border border-[#232328]">
                  <div className="text-[10px] uppercase font-bold text-neutral-400">Servings</div>
                  <div className="text-lg font-bold text-white mt-1">{(focusedHotspot.total_quantity || 0).toLocaleString()}</div>
                </div>
                <div className="bg-[#0c0c0e] p-3 rounded-xl border border-[#232328]">
                  <div className="text-[10px] uppercase font-bold text-neutral-400">Providers</div>
                  <div className="text-lg font-bold text-white mt-1">{focusedHotspot.distinct_providers || 1}</div>
                </div>
                <div className="bg-[#0c0c0e] p-3 rounded-xl border border-[#232328]">
                  <div className="text-[10px] uppercase font-bold text-neutral-400">Partner NGOs</div>
                  <div className="text-lg font-bold text-white mt-1">{focusedHotspot.distinct_ngos || 1}</div>
                </div>
              </div>

              {/* Fulfillment progress bar */}
              <div className="mt-4 pt-3 border-t border-[#232328]">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-neutral-400 font-medium">Cluster Rescue Fulfillment Rate</span>
                  <span className="font-bold text-white">
                    {focusedHotspot.fulfillment_rate ?? Math.round(((focusedHotspot.completed_deliveries || 0) / Math.max(focusedHotspot.total_donations || 1, 1)) * 100)}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-[#1f1f24] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-[#39FF14] rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(focusedHotspot.fulfillment_rate ?? Math.round(((focusedHotspot.completed_deliveries || 0) / Math.max(focusedHotspot.total_donations || 1, 1)) * 100), 100)}%` }}
                  />
                </div>
              </div>

              {/* Sample addresses in cluster */}
              {focusedHotspot.sample_addresses && focusedHotspot.sample_addresses.length > 0 && (
                <div className="mt-4 pt-3 border-t border-[#232328]">
                  <div className="text-xs font-semibold text-neutral-300 mb-2">Sample Registered Locations in this Cluster:</div>
                  <div className="flex flex-wrap gap-2">
                    {focusedHotspot.sample_addresses.map((addr, idx) => (
                      <span key={idx} className="text-[11px] bg-[#0c0c0e] text-neutral-300 px-3 py-1.5 rounded-lg border border-[#232328] flex items-center gap-1.5">
                        📍 {addr}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 2: WASTED FOOD CATEGORIES ANALYSIS                    */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'categories' && (
        <div className="space-y-6 animate-slide-up">
          <div className="bg-[#121214] border border-[#232328] rounded-[24px] p-6 shadow-2xl space-y-4">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Donation Volume vs Expired Listings by Category</h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Identifies categories with highest expiry rates. Distinguishes uncollected listings from confirmed food rescues.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#232328] text-neutral-400 text-[10px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Food Category</th>
                    <th className="py-3 px-4">Total Posted</th>
                    <th className="py-3 px-4">Delivered Rescues</th>
                    <th className="py-3 px-4">Expired Listings</th>
                    <th className="py-3 px-4">Expiry Rate</th>
                    <th className="py-3 px-4">Period Trend</th>
                    <th className="py-3 px-4">Quantity Rescued / Expired</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1c1c22]">
                  {wastedCategories.map((c) => (
                    <tr key={c.category} className="hover:bg-[#18181b]/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-white capitalize">
                        {c.category.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-white">{c.total_donations}</td>
                      <td className="py-3.5 px-4 text-emerald-400 font-bold">{c.delivered_count}</td>
                      <td className="py-3.5 px-4 text-rose-400 font-bold">{c.expired_count}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-[#1c1c22] rounded-full overflow-hidden">
                            <div
                              className={`h-full ${c.expiry_rate > 30 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min(c.expiry_rate, 100)}%` }}
                            />
                          </div>
                          <span className="font-bold text-white">{c.expiry_rate}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {renderTrend(c.rate_change)}
                      </td>
                      <td className="py-3.5 px-4 text-neutral-300">
                        {c.total_quantity} total ({c.expired_quantity} expired)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 3: NGO DEMAND GAPS & APPROX EXPIRY                     */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'demand' && demandData && (
        <div className="space-y-6 animate-slide-up">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top NGOs Claim Activity */}
            <div className="lg:col-span-2 bg-[#121214] border border-[#232328] rounded-[24px] p-6 shadow-2xl space-y-4">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">NGO Claim Fulfillment & Capacity</h3>
                <p className="text-xs text-neutral-400">Claims made vs successfully received food deliveries</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#232328] text-neutral-400 text-[10px] font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-3">Shelter NGO</th>
                      <th className="py-2.5 px-3">Total Claims</th>
                      <th className="py-2.5 px-3">Delivered</th>
                      <th className="py-2.5 px-3">Fulfillment Rate</th>
                      <th className="py-2.5 px-3">Servings Received</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1c1c22]">
                    {demandData.ngo_activity.map((n) => (
                      <tr key={n.ngo_id} className="hover:bg-[#18181b]/50">
                        <td className="py-3 px-3">
                          <span className="font-bold text-white block">{n.organization_name}</span>
                          <span className="text-[10px] text-neutral-500">{n.address}</span>
                        </td>
                        <td className="py-3 px-3 font-medium text-white">{n.total_claims}</td>
                        <td className="py-3 px-3 font-bold text-emerald-400">{n.delivered_count}</td>
                        <td className="py-3 px-3 font-bold text-white">{n.fulfillment_rate}%</td>
                        <td className="py-3 px-3 font-medium text-neutral-300">{n.received_servings}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Approaching Expiry Urgency List */}
            <div className="bg-[#121214] border border-[#232328] rounded-[24px] p-5 shadow-2xl space-y-4">
              <div className="border-b border-[#232328] pb-3">
                <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold uppercase">
                  <Clock className="w-4 h-4" /> Unclaimed Near Expiry (&lt;24h)
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">Donations needing immediate shelter match</p>
              </div>

              {demandData.approaching_expiry.length === 0 ? (
                <div className="p-6 text-center text-xs text-neutral-500 bg-[#0c0c0e] rounded-2xl">
                  No unclaimed donations nearing immediate expiry.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {demandData.approaching_expiry.map((item) => (
                    <div key={item.id} className="p-3 bg-[#0c0c0e] rounded-xl border border-[#232328] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs">{item.title}</span>
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          {item.hours_remaining}h left
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400">{item.provider_name}</p>
                      <div className="text-[10px] text-neutral-500 pt-1">
                        {item.quantity} {item.unit} · {item.pickup_address}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 4: DELIVERY RELIABILITY & QR FAILURES                 */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'reliability' && reliabilityData && (
        <div className="space-y-6 animate-slide-up">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[#121214] border border-[#232328] rounded-2xl p-5 space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">On-Time Delivery Rate</span>
              <div className="text-2xl font-bold text-emerald-400">{reliabilityData.totals.on_time_rate}%</div>
              <p className="text-[11px] text-neutral-500">Delivered before food expiry time</p>
            </div>

            <div className="bg-[#121214] border border-[#232328] rounded-2xl p-5 space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Avg Claim-to-Pickup</span>
              <div className="text-2xl font-bold text-white">{reliabilityData.totals.avg_hours_claim_to_pickup} hrs</div>
              <p className="text-[11px] text-neutral-500">From volunteer claim to donor scan</p>
            </div>

            <div className="bg-[#121214] border border-[#232328] rounded-2xl p-5 space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Avg Transit Duration</span>
              <div className="text-2xl font-bold text-white">{reliabilityData.totals.avg_minutes_pickup_to_delivery} mins</div>
              <p className="text-[11px] text-neutral-500">From donor pickup to shelter dropoff</p>
            </div>

            <div className="bg-[#121214] border border-[#232328] rounded-2xl p-5 space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">QR Verification Failures</span>
              <div className="text-2xl font-bold text-amber-400">{reliabilityData.totals.qr_scan_failures}</div>
              <p className="text-[11px] text-neutral-500">Safely logged failure attempts</p>
            </div>
          </div>

          {/* Volunteer Leaderboard */}
          <div className="bg-[#121214] border border-[#232328] rounded-[24px] p-6 shadow-2xl space-y-4">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Courier Volunteer Reliability</h3>
              <p className="text-xs text-neutral-400">Assigned missions vs completed dropoffs</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#232328] text-neutral-400 text-[10px] font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-4">Volunteer Name</th>
                    <th className="py-2.5 px-4">Vehicle Type</th>
                    <th className="py-2.5 px-4">Trust Rating</th>
                    <th className="py-2.5 px-4">Assigned</th>
                    <th className="py-2.5 px-4">Completed</th>
                    <th className="py-2.5 px-4">Reliability</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1c1c22]">
                  {reliabilityData.top_volunteers.map((v, i) => (
                    <tr key={i} className="hover:bg-[#18181b]/50">
                      <td className="py-3 px-4 font-bold text-white">{v.name}</td>
                      <td className="py-3 px-4 capitalize text-neutral-400">{v.vehicle_type || 'Vehicle'}</td>
                      <td className="py-3 px-4 font-bold text-amber-400">★ {v.rating || '5.0'}</td>
                      <td className="py-3 px-4 text-white">{v.assigned}</td>
                      <td className="py-3 px-4 text-emerald-400 font-bold">{v.completed}</td>
                      <td className="py-3 px-4 font-bold text-white">{v.rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 5: INACTIVE FOOD PROVIDER MONITORING                  */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'providers' && inactiveProviders && (
        <div className="space-y-6 animate-slide-up">
          <div className="bg-[#121214] border border-[#232328] rounded-[24px] p-6 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#232328] pb-4">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Inactive Food Provider Directory</h3>
                <p className="text-xs text-neutral-400">
                  Providers without donations within threshold time. Use for administrative re-engagement outreach.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-400">Inactivity Threshold:</span>
                <select
                  value={inactivityDays}
                  onChange={(e) => setInactivityDays(e.target.value)}
                  className="input text-xs py-1 px-2.5 bg-[#18181b]"
                >
                  <option value="7">7 Days</option>
                  <option value="30">30 Days</option>
                  <option value="60">60 Days</option>
                  <option value="90">90 Days</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#232328] text-neutral-400 text-[10px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Provider / Business</th>
                    <th className="py-3 px-4">Contact Info</th>
                    <th className="py-3 px-4">Verification</th>
                    <th className="py-3 px-4">Days Inactive</th>
                    <th className="py-3 px-4">Last Donation</th>
                    <th className="py-3 px-4">Historical Donations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1c1c22]">
                  {inactiveProviders.providers.map((p) => (
                    <tr key={p.provider_id} className="hover:bg-[#18181b]/50">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-white block">{p.business_name}</span>
                        <span className="text-[11px] text-neutral-400">{p.address}</span>
                      </td>
                      <td className="py-3.5 px-4 text-neutral-300">
                        <div>{p.contact_name}</div>
                        <div className="text-[10px] text-neutral-500">{p.email}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.is_verified
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {p.is_verified ? 'Verified' : 'Pending'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-amber-400">
                        {p.days_inactive} {typeof p.days_inactive === 'number' ? 'days' : ''}
                      </td>
                      <td className="py-3.5 px-4 text-neutral-400">
                        {p.last_donation_date ? new Date(p.last_donation_date).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="py-3.5 px-4 text-neutral-300">
                        {p.total_donations} total ({p.completed_donations} completed)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
