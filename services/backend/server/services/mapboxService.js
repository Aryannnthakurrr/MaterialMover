const axios = require('axios');

class MapboxService {
  constructor() {
    this.accessToken = process.env.MAPBOX_ACCESS_TOKEN;
    this.baseUrl = 'https://api.mapbox.com';
  }

  /**
   * Geocode address to coordinates
   */
  async geocodeAddress(address) {
    try {
      const url = `${this.baseUrl}/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json`;
      
      const response = await axios.get(url, {
        params: {
          access_token: this.accessToken,
          limit: 1,
          country: 'IN' // Restrict to India
        }
      });

      if (response.data.features && response.data.features.length > 0) {
        const feature = response.data.features[0];
        
        return {
          lat: feature.center[1],
          lng: feature.center[0],
          coordinates: [feature.center[0], feature.center[1]], // [lng, lat] for MongoDB
          formattedAddress: feature.place_name,
          placeId: feature.id
        };
      }
      
      return null; // Address not found
    } catch (error) {
      console.error('Geocoding error:', error.message);
      return null;
    }
  }

  /**
   * Calculate distance between two points using Mapbox Matrix API
   */
  async calculateDistance(origin, destination) {
    try {
      const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
      const url = `${this.baseUrl}/directions-matrix/v1/mapbox/driving/${coordinates}`;
      
      const response = await axios.get(url, {
        params: {
          access_token: this.accessToken,
          sources: '0',
          destinations: '1'
        }
      });

      if (response.data.distances && response.data.distances[0]) {
        const distanceInMeters = response.data.distances[0][0];
        const durationInSeconds = response.data.durations[0][0];
        
        return {
          distance: distanceInMeters,
          distanceKm: (distanceInMeters / 1000).toFixed(1),
          duration: durationInSeconds,
          durationText: this.formatDuration(durationInSeconds)
        };
      }
      
      return null;
    } catch (error) {
      console.error('Distance calculation error:', error.message);
      return null;
    }
  }

  /**
   * Format duration in seconds to readable string
   */
  formatDuration(seconds) {
    if (!seconds) return 'N/A';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} min`;
  }

  /**
   * Autocomplete address suggestions
   */
  async getAddressSuggestions(query) {
    try {
      if (!query || query.length < 3) {
        return [];
      }

      const url = `${this.baseUrl}/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`;
      
      const response = await axios.get(url, {
        params: {
          access_token: this.accessToken,
          country: 'IN',
          limit: 5,
          types: 'place,address,poi'
        }
      });

      return response.data.features.map(feature => ({
        id: feature.id,
        text: feature.place_name,
        coordinates: {
          lat: feature.center[1],
          lng: feature.center[0]
        }
      }));

    } catch (error) {
      console.error('Address autocomplete error:', error.message);
      return [];
    }
  }
}

module.exports = new MapboxService();