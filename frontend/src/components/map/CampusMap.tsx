import { useEffect, useState, useRef, useMemo } from 'react';
import { apiClient } from '../../api/axios';
import Map, { Source, Layer, Marker } from 'react-map-gl/maplibre';
import type { MapRef } from 'react-map-gl/maplibre';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { NavigationAPI } from '../../api';
import { RoutePlanner } from './RoutePlanner';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useNavigationDirections, calculateBearing } from '../../hooks/useNavigationDirections';
import { LiveNavigationPanel } from './LiveNavigationPanel';
import { RouteDirectionsList } from './RouteDirectionsList';
import { WalkingBoyAvatar } from './WalkingBoyAvatar';
import { DetailModal } from '../common/DetailModal';
import { useLiveWeather } from '../../hooks/useLiveWeather';
import { WeatherOverlay } from './WeatherOverlay';
import { useTelemetry } from '../../hooks/useTelemetry';
import { Activity } from 'lucide-react';
export function CampusMap() {
  const mapRef = useRef<MapRef>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const destination = searchParams.get('destination');
  const destinationNodeIdParam = searchParams.get('destination_node_id') || searchParams.get('node_id');
  const destLat = searchParams.get('destination_lat');
  const destLng = searchParams.get('destination_lng');
  const sourceNodeId = searchParams.get('source_node_id');

  // Center is [lng, lat] in MapLibre
  const initialCenter: [number, number] = [80.179666, 13.031836];

  const gps = useGeolocation();
  const [followMe, setFollowMe] = useState(sourceNodeId === 'gps');
  const [routeData, setRouteData] = useState<any>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]); // [lng, lat]
  const [buildingsGeoJSON, setBuildingsGeoJSON] = useState<any>(null);
  const [resolvedDestinationNodeId, setResolvedDestinationNodeId] = useState<string | null>(destinationNodeIdParam);

  // Modal State
  const [selectedLocation, setSelectedLocation] = useState<any>(null);

  const { currentInstruction, cameraBearing } = useNavigationDirections(gps.latitude, gps.longitude, routeData);
  const weather = useLiveWeather(initialCenter[1], initialCenter[0]);
  
  // Telemetry & Heatmap
  const { isBroadcasting } = useTelemetry(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapData, setHeatmapData] = useState<any>(null);

  useEffect(() => {
    if (!showHeatmap) return;
    
    const fetchHeatmap = async () => {
      try {
        const res = await apiClient.get('/telemetry/heatmap');
        setHeatmapData(res.data);
      } catch (e) {
        console.warn("Failed to fetch heatmap data", e);
      }
    };

    fetchHeatmap();
    const interval = setInterval(fetchHeatmap, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, [showHeatmap]);

  useEffect(() => {
    if (sourceNodeId === 'gps') {
      setFollowMe(true);
    }
  }, [sourceNodeId]);

  // Resolve lat/lng to Node ID if necessary
  useEffect(() => {
    async function resolveDest() {
      if (destinationNodeIdParam) {
        setResolvedDestinationNodeId(destinationNodeIdParam);
      } else if (destLat && destLng) {
        try {
          const res = await NavigationAPI.getNearestNode(parseFloat(destLat), parseFloat(destLng));
          if (res && res.node_id) {
            setResolvedDestinationNodeId(res.node_id.toString());
          }
        } catch (e) {
          console.error("Failed to resolve nearest node", e);
        }
      } else {
        setResolvedDestinationNodeId(null);
      }
    }
    resolveDest();
  }, [destinationNodeIdParam, destLat, destLng]);

  // Camera Follow Me Mode (3D View)
  useEffect(() => {
    if (followMe && gps.latitude && gps.longitude && mapRef.current) {
      const map = mapRef.current.getMap();
      if (map && map.easeTo) {
        map.easeTo({
          center: [gps.longitude, gps.latitude],
          zoom: 26,
          pitch: 65,
          bearing: cameraBearing,
          duration: 1000,
          easing: (t) => t
        });
      }
    }
  }, [followMe, gps.latitude, gps.longitude, cameraBearing]);

  // Route Fetch
  useEffect(() => {
    async function fetchRoute() {
      if (!resolvedDestinationNodeId) return;
      try {
        let res;
        try {
          const dst = parseInt(resolvedDestinationNodeId, 10);
          if (sourceNodeId === 'gps') {
            if (gps.latitude && gps.longitude) {
              res = await NavigationAPI.getRouteFromGPS(gps.latitude, gps.longitude, dst);
            } else {
              return; // wait for GPS
            }
          } else {
            const src = sourceNodeId ? parseInt(sourceNodeId, 10) : 1;
            res = await NavigationAPI.getRoute(src, dst);
          }
        } catch (e) {
          console.warn("Routing failed. Showing demonstration route.");
          res = await NavigationAPI.getRoute(1, 5);
        }

        if (res?.coordinates) {
          setRouteData(res);
          // Convert to [lng, lat]
          const coords: [number, number][] = res.coordinates.map((c: any) => [c.longitude, c.latitude]);
          setRouteCoords(coords);

          if (coords.length > 0 && sourceNodeId !== 'gps' && mapRef.current) {
            const map = mapRef.current.getMap();

            const startCoord = coords[0];
            const endCoord = coords[coords.length - 1];
            const targetBearing = calculateBearing(startCoord[1], startCoord[0], endCoord[1], endCoord[0]);

            // 1. Jump to start, pitch up, look at destination
            map.jumpTo({
              center: startCoord,
              zoom: 17.5,
              pitch: 75,
              bearing: targetBearing
            });

            // 2. Drone flight to destination
            map.easeTo({
              center: endCoord,
              duration: 4500,
              easing: (t) => t * (2 - t), // easeOutQuart-like
              essential: true
            });

            // 3. After flight, fit bounds to show the whole route
            setTimeout(() => {
              if (!mapRef.current) return;
              const currentMap = mapRef.current.getMap();
              const bounds = coords.reduce((acc, coord) => [
                [Math.min(acc[0][0], coord[0]), Math.min(acc[0][1], coord[1])],
                [Math.max(acc[1][0], coord[0]), Math.max(acc[1][1], coord[1])]
              ], [[Infinity, Infinity], [-Infinity, -Infinity]]);

              currentMap.fitBounds(bounds as [[number, number], [number, number]], {
                padding: 80,
                duration: 2000,
                pitch: 45, // Relax the pitch for overview
                bearing: 0
              });
            }, 5000); // Wait for the drone flight to finish + 500ms pause
          }
        }
      } catch (err) {
        console.error("Routing error:", err);
      }
    }
    fetchRoute();
  }, [resolvedDestinationNodeId, sourceNodeId, gps.latitude, gps.longitude]);

  // Fetch Buildings GeoJSON
  useEffect(() => {
    async function fetchBuildings() {
      try {
        const res = await apiClient.get('/buildings/geojson');
        setBuildingsGeoJSON(res.data);
      } catch (err) {
        console.error("Failed to load buildings 3D data", err);
      }
    }
    fetchBuildings();
  }, []);

  const routeGeoJSON = useMemo(() => ({
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: routeCoords },
      properties: {}
    }]
  }), [routeCoords]);

  const handleMapClick = (event: any) => {
    const feature = event.features && event.features[0];
    if (feature && feature.layer.id === '3d-buildings') {
      setSelectedLocation({
        ...feature.properties,
        _clickedLat: event.lngLat.lat,
        _clickedLng: event.lngLat.lng,
      });
    } else {
      setSelectedLocation(null);
    }
  };

  return (
    <div className="w-full h-full flex flex-col relative flex-1">

      {/* Detail Modal */}
      <DetailModal
        isOpen={!!selectedLocation}
        onClose={() => setSelectedLocation(null)}
        title={selectedLocation?.Name || 'Building'}
        description={selectedLocation?.description}
        coverPhoto={selectedLocation?.cover_photo}
        destinationNodeId={selectedLocation?.node_id}
        destinationLat={selectedLocation?._clickedLat}
        destinationLng={selectedLocation?._clickedLng}
      />

      {sourceNodeId === 'gps' && routeData ? (
        <LiveNavigationPanel routeData={routeData} destination={destination} instruction={currentInstruction} />
      ) : (
        <>
          <RoutePlanner
            initialDestinationNodeId={resolvedDestinationNodeId}
            initialDestinationName={destination}
          />
          {routeData && routeData.coordinates && routeData.coordinates.length > 0 && (
            <RouteDirectionsList routeData={routeData} />
          )}
        </>
      )}

      <div className="w-full flex-1 z-0 bg-slate-900 relative">
        <WeatherOverlay weather={weather} />
        <Map
          ref={mapRef}
          onClick={handleMapClick}
          interactiveLayerIds={['3d-buildings']}
          initialViewState={{
            longitude: initialCenter[0],
            latitude: initialCenter[1],
            zoom: 17,
            pitch: 60, // True 3D tilt
            bearing: -20
          }}
          mapStyle={{
            version: 8,
            light: {
              anchor: 'map',
              color: weather && !weather.isDay ? '#60a5fa' : '#ffffff', // Blue moonlight vs bright daylight
              intensity: weather && !weather.isDay ? 0.4 : 0.8,
              position: [1.5, weather && !weather.isDay ? 210 : 90, 40] // Different sun azimuth for day vs night
            },
            sources: {
              osm: {
                type: 'raster',
                tiles: [
                  weather && !weather.isDay
                    ? 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'
                    : 'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png'
                ],
                tileSize: 256,
                attribution: '&copy; <a href="https://carto.com/">CARTO</a>'
              }
            },
            layers: [
              {
                id: 'osm-tiles',
                type: 'raster',
                source: 'osm',
                minzoom: 0,
                maxzoom: 22
              }
            ]
          }}
          style={{ width: '100%', height: '100%' }}
          maxPitch={85}
          maxZoom={26}
        >
          {/* Heatmap Layer */}
          {showHeatmap && heatmapData && (
            <Source id="heatmap-source" type="geojson" data={heatmapData}>
              <Layer
                id="heatmap-layer"
                type="heatmap"
                paint={{
                  'heatmap-weight': ['get', 'weight'],
                  'heatmap-intensity': 1,
                  'heatmap-color': [
                    'interpolate',
                    ['linear'],
                    ['heatmap-density'],
                    0, 'rgba(0,0,0,0)',
                    0.2, 'rgba(33,102,172,0.5)',
                    0.4, 'rgba(103,169,207,0.7)',
                    0.6, 'rgba(209,229,240,0.8)',
                    0.8, 'rgba(253,219,199,0.9)',
                    1, 'rgba(239,138,98,1)'
                  ],
                  'heatmap-radius': 30,
                  'heatmap-opacity': 0.8
                }}
              />
            </Source>
          )}
          {/* 3D Buildings Layer pulled from Python API via Axios */}
          {buildingsGeoJSON && (
            <Source id="buildings" type="geojson" data={buildingsGeoJSON}>
              <Layer
                id="3d-buildings"
                type="fill-extrusion"
                paint={{
                  'fill-extrusion-color': weather && !weather.isDay
                    ? ['case', ['==', ['get', 'height'], 0], '#064e3b', '#1e3a8a'] // Neon dark blue for buildings at night
                    : ['get', 'color'],
                  'fill-extrusion-height': ['get', 'height'],
                  'fill-extrusion-base': ['get', 'base_height'],
                  'fill-extrusion-opacity': weather && !weather.isDay ? 0.7 : 0.9
                }}
              />
              {/* Building Labels Layer */}
              <Layer
                id="building-labels"
                type="symbol"
                layout={{
                  'text-field': ['get', 'Name'],
                  'text-size': 12,
                  'text-anchor': 'center'
                }}
                paint={{
                  'text-color': weather && !weather.isDay ? '#ffffff' : '#1e293b',
                  'text-halo-color': weather && !weather.isDay ? '#1e293b' : '#ffffff',
                  'text-halo-width': 2
                }}
              />
            </Source>
          )}

          {/* Route Polyline Layer */}
          {routeCoords.length > 0 && (
            <Source id="route" type="geojson" data={routeGeoJSON as any}>
              <Layer
                id="route-line"
                type="line"
                paint={{
                  'line-color': '#ef4444',
                  'line-width': 8,
                  'line-opacity': 0.8
                }}
              />
            </Source>
          )}

          {/* Start Marker */}
          {routeCoords.length > 0 && sourceNodeId !== 'gps' && (
            <Marker longitude={routeCoords[0][0]} latitude={routeCoords[0][1]} anchor="bottom">
              <div className="text-3xl filter drop-shadow-md cursor-pointer hover:scale-110 transition-transform">📍</div>
            </Marker>
          )}

          {/* Destination Marker */}
          {routeCoords.length > 0 && (
            <Marker longitude={routeCoords[routeCoords.length - 1][0]} latitude={routeCoords[routeCoords.length - 1][1]} anchor="bottom">
              <div className="text-3xl filter drop-shadow-md cursor-pointer hover:scale-110 transition-transform">🎯</div>
            </Marker>
          )}

          {/* Live GPS Marker */}
          {gps.latitude && gps.longitude && (
            <Marker
              longitude={gps.longitude}
              latitude={gps.latitude}
              anchor="center"
              rotationAlignment="map"
              rotation={cameraBearing - 90}
            >
              <div style={{ transition: 'transform 0.3s' }}>
                <WalkingBoyAvatar opacity={1} size={40} />
              </div>
            </Marker>
          )}
        </Map>
      </div>

      {gps.latitude && (
        <button
          onClick={() => {
            setFollowMe(!followMe);
            const map = mapRef.current?.getMap();
            if (!followMe && map) {
              map.easeTo({
                center: [gps.longitude!, gps.latitude!],
                zoom: 26,
                pitch: 65,
                bearing: cameraBearing,
                duration: 1000
              });
            } else if (followMe && map) {
              // Return to 2D view when stopping follow
              map.easeTo({
                pitch: 0,
                bearing: 0,
                zoom: 17,
                duration: 1000
              });
            }
          }}
          className={`absolute bottom-6 right-6 z-[1000] p-4 rounded-full shadow-lg transition-all ${followMe ? 'bg-blue-600 text-white shadow-blue-500/50' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
          title="Follow my location"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="M2 12h2" /><path d="M20 12h2" /><circle cx="12" cy="12" r="4" /></svg>
        </button>
      )}

      {/* AR Mode Button */}
      <button
        onClick={() => navigate('/ar')}
        className="absolute top-24 right-4 z-[1000] bg-white text-slate-700 p-3 rounded-full shadow-lg hover:bg-slate-50 transition-all"
        title="Enter AR Mode"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12C22 12 19 19 12 19C5 19 2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>
      </button>

      {/* Live Heatmap Toggle Button */}
      <button
        onClick={() => setShowHeatmap(!showHeatmap)}
        className={`absolute top-36 right-4 z-[1000] p-3 rounded-full shadow-lg transition-all flex items-center justify-center ${
          showHeatmap ? 'bg-red-500 text-white shadow-red-500/50 hover:bg-red-600' : 'bg-white text-slate-700 hover:bg-slate-50'
        }`}
        title="Toggle Live Activity Heatmap"
      >
        <Activity size={24} />
      </button>
    </div>
  );
}
