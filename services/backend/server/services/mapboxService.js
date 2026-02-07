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
      if (!this.accessToken) {
        console.warn('MAPBOX_ACCESS_TOKEN not set — skipping geocoding');
        return null;
      }

      const url = `${this.baseUrl}/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json`;
      
      const response = await axios.get(url, {
        params: {
          access_token: this.accessToken,
          limit: 1,
          country: 'IN'
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
      
      return null;
    } catch (error) {
      console.error('Geocoding error:', error.message);
      return null;
    }
  }

  /**
   * Autocomplete address suggestions
   */
  async getAddressSuggestions(query) {
    try {
      if (!this.accessToken || !query || query.length < 3) {
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
