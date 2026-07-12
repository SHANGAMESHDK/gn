import { useEffect, useState, useRef, useMemo } from 'react';
import { apiClient } from '../../api/axios';
import Map, { Source, Layer, Marker } from 'react-map-gl/maplibre';
import type { MapRef } from 'react-map-gl/maplibre';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { NavigationAPI } from '../../api';
import { RoutePlanner } from './RoutePlanner';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useNavigationDirections } from '../../hooks/useNavigationDirections';
import { LiveNavigationPanel } from './LiveNavigationPanel';
import { RouteDirectionsList } from './RouteDirectionsList';
import { WalkingBoyAvatar } from './WalkingBoyAvatar';
import { DetailModal } from '../common/DetailModal';

export function CampusMap() {
  const mapRef = useRef<MapRef>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const destination = searchParams.get('destination');
  const destinationNodeId = searchParams.get('destination_node_id') || searchParams.get('node_id');
  const sourceNodeId = searchParams.get('source_node_id');

  // Center is [lng, lat] in MapLibre
  const initialCenter: [number, number] = [80.179666, 13.031836];

  const gps = useGeolocation();
  const [followMe, setFollowMe] = useState(sourceNodeId === 'gps');
  const [routeData, setRouteData] = useState<any>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]); // [lng, lat]
  const [buildingsGeoJSON, setBuildingsGeoJSON] = useState<any>(null);
  
  // Modal State
  const [selectedLocation, setSelectedLocation] = useState<any>(null);

  const { currentInstruction, cameraBearing } = useNavigationDirections(gps.latitude, gps.longitude, routeData);

  useEffect(() => {
    if (sourceNodeId === 'gps') {
      setFollowMe(true);
    }
  }, [sourceNodeId]);

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
      if (!destinationNodeId) return;
      try {
        let res;
        try {
          const dst = parseInt(destinationNodeId, 10);
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
            const bounds = coords.reduce((acc, coord) => [
              [Math.min(acc[0][0], coord[0]), Math.min(acc[0][1], coord[1])],
              [Math.max(acc[1][0], coord[0]), Math.max(acc[1][1], coord[1])]
            ], [[Infinity, Infinity], [-Infinity, -Infinity]]);

            mapRef.current.fitBounds(bounds as [[number, number], [number, number]], { padding: 80, duration: 1000 });
          }
        }
      } catch (err) {
        console.error("Routing error:", err);
      }
    }
    fetchRoute();
  }, [destinationNodeId, sourceNodeId, gps.latitude, gps.longitude]);

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
      setSelectedLocation(feature.properties);
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
      />

      {sourceNodeId === 'gps' && routeData ? (
        <LiveNavigationPanel routeData={routeData} destination={destination} instruction={currentInstruction} />
      ) : (
        <>
          <RoutePlanner
            initialDestinationNodeId={destinationNodeId}
            initialDestinationName={destination}
          />
          {routeData && routeData.coordinates && routeData.coordinates.length > 0 && (
            <RouteDirectionsList routeData={routeData} />
          )}
        </>
      )}

      <div className="w-full flex-1 z-0 bg-slate-900 relative">
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
            sources: {
              osm: {
                type: 'raster',
                tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
                tileSize: 256
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
          {/* 3D Buildings Layer pulled from Python API via Axios */}
          {buildingsGeoJSON && (
            <Source id="buildings" type="geojson" data={buildingsGeoJSON}>
              <Layer
              id="3d-buildings"
              type="fill-extrusion"
              paint={{
                'fill-extrusion-color': ['get', 'color'],
                'fill-extrusion-height': ['get', 'height'],
                'fill-extrusion-base': ['get', 'base_height'],
                'fill-extrusion-opacity': 0.9
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
                'text-color': '#1e293b',
                'text-halo-color': '#ffffff',
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
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12C22 12 19 19 12 19C5 19 2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>
      </button>
    </div>
  );
}
