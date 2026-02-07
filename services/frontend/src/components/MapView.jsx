import React, { useEffect, useRef, useState, useCallback } from 'react';

const MAPBOX_TOKEN = 'pk.eyJ1IjoiYW5pc2htYW5jaGFuZGEiLCJhIjoiY21sYjZrNHZxMGs1MjNjczI3NnhjZXIydiJ9.xxMx_j2EyIKuotbCl2adwA';

export default function MapView({ products = [], onLocationSearch, radius = 50, onRadiusChange }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [mapboxgl, setMapboxgl] = useState(null);

  // Dynamically load mapbox-gl from CDN (avoids npm install issues with the GL binary)
  useEffect(() => {
    if (window.mapboxgl) {
      setMapboxgl(window.mapboxgl);
      return;
    }

    // Load CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css';
    document.head.appendChild(link);

    // Load JS
    const script = document.createElement('script');
    script.src = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js';
    script.onload = () => setMapboxgl(window.mapboxgl);
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(link);
      document.head.removeChild(script);
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapboxgl || !mapContainerRef.current || mapRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [78.9629, 20.5937], // Center of India
      zoom: 4
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    const geolocate = new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true
    });
    map.addControl(geolocate, 'top-right');

    geolocate.on('geolocate', (e) => {
      const loc = { lat: e.coords.latitude, lng: e.coords.longitude };
      setUserLocation(loc);
      if (onLocationSearch) onLocationSearch(loc.lat, loc.lng, radius);
    });

    map.on('click', (e) => {
      const { lng, lat } = e.lngLat;
      setUserLocation({ lat, lng });
      if (onLocationSearch) onLocationSearch(lat, lng, radius);
    });

    map.on('load', () => setMapLoaded(true));

    mapRef.current = map;

    // Try to get user location
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        map.flyTo({ center: [loc.lng, loc.lat], zoom: 10 });
        if (onLocationSearch) onLocationSearch(loc.lat, loc.lng, radius);
      },
      () => {} // Silently ignore geolocation errors
    );

    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
      setMapLoaded(false);
    };
  }, [mapboxgl]);

  // Update markers when products change
  useEffect(() => {
    if (!mapRef.current || !mapboxgl || !mapLoaded) return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const bounds = new mapboxgl.LngLatBounds();
    let hasMarkers = false;

    products.forEach(product => {
      if (product.location?.coordinates) {
        const [lng, lat] = product.location.coordinates;

        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="max-width:200px">
            <h4 style="margin:0 0 4px">${product.title}</h4>
            <p style="margin:0;font-size:13px">${product.category} — ₹${product.price}</p>
            ${product.address ? `<p style="margin:4px 0 0;font-size:12px;color:#666">${product.address}</p>` : ''}
          </div>
        `);

        const marker = new mapboxgl.Marker()
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(mapRef.current);

        markersRef.current.push(marker);
        bounds.extend([lng, lat]);
        hasMarkers = true;
      }
    });

    if (userLocation) {
      bounds.extend([userLocation.lng, userLocation.lat]);
    }

    if (hasMarkers) {
      mapRef.current.fitBounds(bounds, { padding: 50, maxZoom: 14 });
    }
  }, [products, mapLoaded, mapboxgl]);

  // Draw radius circle when location or radius changes
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !userLocation) return;
    drawRadiusCircle(userLocation, radius);
  }, [userLocation, radius, mapLoaded]);

  function drawRadiusCircle(center, radiusKm) {
    const map = mapRef.current;
    if (!map) return;

    const points = 64;
    const coords = [];
    const distanceX = radiusKm / (111.320 * Math.cos(center.lat * Math.PI / 180));
    const distanceY = radiusKm / 110.574;

    for (let i = 0; i < points; i++) {
      const theta = (i / points) * (2 * Math.PI);
      const x = distanceX * Math.cos(theta);
      const y = distanceY * Math.sin(theta);
      coords.push([center.lng + x, center.lat + y]);
    }
    coords.push(coords[0]);

    const circleData = {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [coords] }
    };

    const source = map.getSource('radius-circle');
    if (source) {
      source.setData(circleData);
    } else {
      map.addSource('radius-circle', { type: 'geojson', data: circleData });
      map.addLayer({
        id: 'radius-circle-fill',
        type: 'fill',
        source: 'radius-circle',
        paint: { 'fill-color': '#6366f1', 'fill-opacity': 0.08 }
      });
      map.addLayer({
        id: 'radius-circle-border',
        type: 'line',
        source: 'radius-circle',
        paint: { 'line-color': '#6366f1', 'line-width': 2, 'line-opacity': 0.6 }
      });
    }
  }

  return (
    <div className="map-section">
      <div className="map-controls">
        <span className="map-controls-label">
          {userLocation
            ? `📍 ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`
            : '📍 Click map or enable location'}
        </span>
        <select
          value={radius}
          onChange={(e) => {
            const r = parseInt(e.target.value);
            if (onRadiusChange) onRadiusChange(r);
            if (userLocation && onLocationSearch) {
              onLocationSearch(userLocation.lat, userLocation.lng, r);
            }
          }}
          className="map-radius-select"
        >
          <option value={10}>10 km</option>
          <option value={25}>25 km</option>
          <option value={50}>50 km</option>
          <option value={100}>100 km</option>
          <option value={200}>200 km</option>
        </select>
      </div>
      <div
        ref={mapContainerRef}
        className="map-container"
        style={{ width: '100%', height: '350px', borderRadius: '12px' }}
      />
      {products.length > 0 && userLocation && (
        <p className="map-results-summary">
          Found {products.length} product{products.length !== 1 ? 's' : ''} within {radius} km
        </p>
      )}
    </div>
  );
}
