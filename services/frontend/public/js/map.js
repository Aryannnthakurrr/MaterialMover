// Mapbox Map Component
class MapManager {
  constructor() {
    this.map = null;
    this.userLocation = null;
    this.markers = [];
    this.locationSearchRadius = 50; // Default 50km
    this.init();
  }

  async init() {
    if (typeof mapboxgl === 'undefined') {
      console.error('Mapbox GL JS not loaded');
      return;
    }

    // Get Mapbox token from meta tag or config
    const token = document.querySelector('meta[name="mapbox-token"]')?.content;
    if (!token) {
      console.warn('Mapbox token not found - location features disabled');
      return;
    }

    mapboxgl.accessToken = token;
    this.initMap();
    this.getUserLocation();
  }

  initMap() {
    // Create map centered on San Francisco Bay Area by default
    this.map = new mapboxgl.Map({
      container: 'map-container',
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [-122.4194, 37.7749], // San Francisco
      zoom: 10
    });

    this.map.on('load', () => {
      this.addLocationControls();
      this.setupClickHandler();
    });
  }

  addLocationControls() {
    // Add navigation controls
    this.map.addControl(new mapboxgl.NavigationControl());

    // Add geolocate control
    const geolocate = new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: true,
      showUserHeading: true
    });

    this.map.addControl(geolocate);

    // Listen for user location
    geolocate.on('geolocate', (e) => {
      this.userLocation = [e.coords.longitude, e.coords.latitude];
      this.onLocationUpdate(e.coords.latitude, e.coords.longitude);
    });
  }

  setupClickHandler() {
    this.map.on('click', (e) => {
      const { lng, lat } = e.lngLat;
      this.userLocation = [lng, lat];
      this.onLocationUpdate(lat, lng);
    });
  }

  onLocationUpdate(lat, lng) {
    // Update location display
    const locationDisplay = document.getElementById('current-location');
    if (locationDisplay) {
      locationDisplay.textContent = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }

    // Trigger search if enabled
    if (window.productSearch && window.productSearch.searchNearby) {
      window.productSearch.searchNearby(lat, lng, this.locationSearchRadius);
    }
  }

  getUserLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          this.userLocation = [longitude, latitude];
          this.map.flyTo({
            center: [longitude, latitude],
            zoom: 12
          });
          this.onLocationUpdate(latitude, longitude);
        },
        (error) => {
          console.warn('Geolocation error:', error.message);
        }
      );
    }
  }

  clearMarkers() {
    this.markers.forEach(marker => marker.remove());
    this.markers = [];
  }

  addProductMarkers(products) {
    this.clearMarkers();

    products.forEach(product => {
      if (product.location && product.location.coordinates) {
        const [lng, lat] = product.location.coordinates;
        
        // Create popup content
        const popupContent = `
          <div class="map-popup">
            <h4>${product.title}</h4>
            <p>${product.category} - $${product.price}</p>
            <p><small>${product.address}</small></p>
            <button onclick="viewProduct('${product._id}')" class="btn-primary">View Details</button>
          </div>
        `;

        const popup = new mapboxgl.Popup({ offset: 25 })
          .setHTML(popupContent);

        const marker = new mapboxgl.Marker()
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(this.map);

        this.markers.push(marker);
      }
    });

    // Fit map to show all markers plus user location
    if (this.markers.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      
      this.markers.forEach(marker => {
        bounds.extend(marker.getLngLat());
      });

      if (this.userLocation) {
        bounds.extend(this.userLocation);
      }

      this.map.fitBounds(bounds, { padding: 50 });
    }
  }

  setRadius(radiusKm) {
    this.locationSearchRadius = radiusKm;
    
    // Update radius circle if user location exists
    if (this.userLocation) {
      this.drawRadiusCircle(this.userLocation, radiusKm);
    }
  }

  drawRadiusCircle(center, radiusKm) {
    const source = this.map.getSource('radius-circle');
    const circleData = this.createCircleGeoJSON(center, radiusKm);

    if (source) {
      source.setData(circleData);
    } else {
      this.map.addSource('radius-circle', {
        type: 'geojson',
        data: circleData
      });

      this.map.addLayer({
        id: 'radius-circle',
        type: 'fill',
        source: 'radius-circle',
        paint: {
          'fill-color': '#007cbf',
          'fill-opacity': 0.1
        }
      });

      this.map.addLayer({
        id: 'radius-circle-border',
        type: 'line',
        source: 'radius-circle',
        paint: {
          'line-color': '#007cbf',
          'line-width': 2,
          'line-opacity': 0.8
        }
      });
    }
  }

  createCircleGeoJSON(center, radiusKm) {
    const points = 64;
    const coords = [];
    const distanceX = radiusKm / (111.320 * Math.cos(center[1] * Math.PI / 180));
    const distanceY = radiusKm / 110.574;

    for (let i = 0; i < points; i++) {
      const theta = (i / points) * (2 * Math.PI);
      const x = distanceX * Math.cos(theta);
      const y = distanceY * Math.sin(theta);
      coords.push([center[0] + x, center[1] + y]);
    }
    coords.push(coords[0]); // Close the circle

    return {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [coords]
      }
    };
  }
}

// Initialize map when DOM loads
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('map-container')) {
    window.mapManager = new MapManager();
  }
});