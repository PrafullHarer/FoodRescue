/**
 * Universal Geolocation Engine for FoodRescue
 * Works seamlessly in:
 * 1. Mobile WebView (via Expo Location native hardware GPS bridge + last known cache)
 * 2. Mobile Chrome / Safari / Edge (via HTML5 Geolocation with high precision)
 * 3. Desktop Browsers
 * 4. Network IP fallback (ipwho.is) so location detection never hangs or crashes
 */

export const getLiveLocation = () => {
  return new Promise((resolve) => {
    let hasResolved = false;

    const safeResolve = (data) => {
      if (!hasResolved) {
        hasResolved = true;
        resolve(data);
      }
    };

    // 1. Mobile App Native Bridge (Expo Location via React Native WebView)
    if (typeof window !== 'undefined' && (window.isFoodRescueNativeApp || window.ReactNativeWebView)) {
      // Global callback for direct JS injection from React Native shell
      window.handleNativeLocationSuccess = (lat, lng, accuracy) => {
        const latitude = Number(lat);
        const longitude = Number(lng);
        if (!isNaN(latitude) && !isNaN(longitude)) {
          safeResolve({
            latitude,
            longitude,
            accuracy: accuracy || 10,
            source: 'native_gps',
          });

          // Also broadcast as window event for active map components
          try {
            window.dispatchEvent(new CustomEvent('foodrescue:location-update', {
              detail: { latitude, longitude, accuracy: accuracy || 10, source: 'native_gps' }
            }));
          } catch {
            // ignore
          }
        }
      };

      window.handleNativeLocationError = (errMsg) => {
        console.warn('[NativeLocation] Native bridge error, attempting browser/IP fallback:', errMsg);
        fallbackBrowserLocation(safeResolve);
      };

      const handleNativeMsg = (event) => {
        try {
          const raw = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          if (raw?.type === 'DEVICE_LOCATION_SUCCESS') {
            const latitude = Number(raw.latitude);
            const longitude = Number(raw.longitude);
            if (!isNaN(latitude) && !isNaN(longitude)) {
              safeResolve({
                latitude,
                longitude,
                accuracy: raw.accuracy || 10,
                source: 'native_gps',
              });

              try {
                window.dispatchEvent(new CustomEvent('foodrescue:location-update', {
                  detail: { latitude, longitude, accuracy: raw.accuracy || 10, source: 'native_gps' }
                }));
              } catch {
                // ignore
              }
            }
          } else if (raw?.type === 'DEVICE_LOCATION_ERROR') {
            fallbackBrowserLocation(safeResolve);
          }
        } catch {
          // ignore
        }
      };

      window.addEventListener('message', handleNativeMsg);
      document.addEventListener('message', handleNativeMsg);

      // Trigger native location request in React Native shell
      if (typeof window.requestNativeLocation === 'function') {
        window.requestNativeLocation();
      } else if (window.ReactNativeWebView?.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'REQUEST_DEVICE_LOCATION' }));
      }

      // Allow 12 seconds for OS permission prompt and satellite fix before falling back
      setTimeout(() => {
        if (!hasResolved) {
          console.warn('[NativeLocation] Native response slow, falling back to browser/IP location');
          fallbackBrowserLocation(safeResolve);
        }
      }, 12000);
      return;
    }

    // 2. Standard Browser Environment
    fallbackBrowserLocation(safeResolve);
  });
};

const fallbackBrowserLocation = (resolve) => {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    return resolveViaIp(resolve);
  }

  // Request browser geolocation with high accuracy and adequate timeout for permission prompt
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      resolve({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        source: 'browser_gps',
      });
    },
    (err) => {
      console.warn('[Geolocation] High accuracy attempt failed code:', err?.code, err?.message);

      // If user explicitly denied permission (code 1: PERMISSION_DENIED), fallback to IP directly
      if (err?.code === 1) {
        return resolveViaIp(resolve);
      }

      // Retry with enableHighAccuracy: false (cell / Wi-Fi triangulation, fast and reliable)
      navigator.geolocation.getCurrentPosition(
        (pos2) => {
          resolve({
            latitude: pos2.coords.latitude,
            longitude: pos2.coords.longitude,
            accuracy: pos2.coords.accuracy,
            source: 'browser_network',
          });
        },
        () => {
          resolveViaIp(resolve);
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
      );
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
  );
};

const resolveViaIp = async (resolve) => {
  try {
    const res = await fetch('https://ipwho.is/', {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success !== false && data.latitude && data.longitude) {
        resolve({
          latitude: Number(data.latitude),
          longitude: Number(data.longitude),
          source: 'ip_lookup',
          city: data.city,
        });
        return;
      }
    }
  } catch (e) {
    console.warn('[Geolocation] IP fallback error:', e?.message);
  }

  // Final fallback (central coordinates)
  resolve({
    latitude: 28.6139,
    longitude: 77.2090,
    source: 'default',
    isDefault: true,
  });
};

/**
 * Reverse Geocode coordinates to street address using OpenStreetMap Nominatim
 */
export const reverseGeocode = async (lat, lng) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'FoodRescue-Platform/1.0',
        },
        signal: AbortSignal.timeout(5000),
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.display_name) {
        const parts = data.display_name.split(',').map((p) => p.trim());
        const title = parts.slice(0, 2).join(', ');
        const subtitle = parts.slice(2, 5).join(', ');
        return {
          displayName: data.display_name,
          title: title || parts[0] || 'Selected Location',
          subtitle,
        };
      }
    }
  } catch (err) {
    console.warn('[Geolocation] Reverse geocoding error:', err?.message);
  }

  return {
    displayName: `Location (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
    title: 'Pinned Location',
    subtitle: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
  };
};
