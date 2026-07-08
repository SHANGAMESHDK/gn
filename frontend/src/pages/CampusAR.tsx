// @ts-nocheck
import { useEffect, useState } from 'react';
import { useGeolocation } from '../hooks/useGeolocation';
import { apiClient } from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';

interface ARPoi {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: string;
  distance: number;
}

export function CampusAR() {
  const { latitude, longitude, error } = useGeolocation();
  const [pois, setPois] = useState<ARPoi[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Only fetch once we have a location
    if (latitude && longitude) {
      fetchNearbyPOIs(latitude, longitude);
    }
  }, [latitude, longitude]);

  const fetchNearbyPOIs = async (lat: number, lng: number) => {
    try {
      setLoading(true);
      const response = await apiClient.get('/ar/nearby', {
        params: { lat, lng, radius: 200 } // Within 200 meters
      });
      setPois(response.data);
    } catch (err) {
      console.error('Failed to fetch nearby POIs for AR', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ margin: 0, overflow: 'hidden', height: '100vh', width: '100vw' }}>
      <Navbar />

      {/* Back button */}
      <div className="absolute top-20 left-4 z-50">
        <button
          onClick={() => navigate(-1)}
          className="bg-white p-2 rounded-full shadow-lg"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
      </div>

      {error && (
        <div className="absolute top-24 left-4 right-4 bg-red-500 text-white p-4 rounded-lg z-50">
          Location Error: {error}
        </div>
      )}

      {loading && !pois.length && (
        <div className="absolute top-24 left-4 right-4 bg-blue-500 text-white p-4 rounded-lg z-50">
          Searching for nearby places...
        </div>
      )}

      {/* A-Frame Scene for AR.js */}
      <a-scene
        vr-mode-ui="enabled: false"
        embedded
        arjs="sourceType: webcam; debugUIEnabled: false;"
      >
        {/* Render POIs as text entities in AR space */}
        {pois.map((poi) => (
          <a-entity
            key={poi.id}
            look-at="[gps-camera]"
            gps-entity-place={`latitude: ${poi.lat}; longitude: ${poi.lng};`}
          >
            <a-box color={poi.type === 'building' ? 'red' : 'blue'} scale="5 5 5" position="0 5 0"></a-box>
            <a-text
              value={`${poi.name}\n(${Math.round(poi.distance)}m)`}
              align="center"
              color="black"
              scale="15 15 15"
              position="0 15 0"
            ></a-text>
          </a-entity>
        ))}

        {/* GPS Camera for Location-Based AR */}
        <a-camera gps-camera rotation-reader></a-camera>
      </a-scene>
    </div>
  );
}
