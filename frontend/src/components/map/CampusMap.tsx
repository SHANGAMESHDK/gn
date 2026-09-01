import { useEffect, useState, useRef, useMemo } from 'react';
import { collection, addDoc, onSnapshot, query } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { apiClient } from '../../api/axios';
import Map, { Source, Layer, Marker } from 'react-map-gl/maplibre';
import type { MapRef } from 'react-map-gl/maplibre';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { NavigationAPI, AdminAPI, StallsAPI } from '../../api';
import { RoutePlanner } from './RoutePlanner';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useNavigationDirections, calculateBearing, calculateDistance } from '../../hooks/useNavigationDirections';
import { LiveNavigationPanel } from './LiveNavigationPanel';
import { RouteDirectionsList } from './RouteDirectionsList';
import { WalkingBoyAvatar } from './WalkingBoyAvatar';
import { BuildingSidebar } from './BuildingSidebar';
import { useLiveWeather } from '../../hooks/useLiveWeather';
import { WeatherOverlay } from './WeatherOverlay';
import { useTelemetry } from '../../hooks/useTelemetry';
import { Activity, Thermometer, MapPin, Store } from 'lucide-react';
import { FloorSelector } from './FloorSelector';
import { FloorPlanViewer } from './FloorPlanViewer';
export function CampusMap() {
  const mapRef = useRef<MapRef>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const destination = searchParams.get('destination');
  const destinationNodeIdParam = searchParams.get('destination_node_id') || searchParams.get('node_id');
  const destLat = searchParams.get('destination_lat');
  const destLng = searchParams.get('destination_lng');
  const trackCode = searchParams.get('track');
  const sourceNodeId = searchParams.get('source_node_id');

  // Center is [lng, lat] in MapLibre
  const initialCenter: [number, number] = [80.179666, 13.031836];

  const gps = useGeolocation();
  const [followMe, setFollowMe] = useState(sourceNodeId === 'gps');
  const [routeData, setRouteData] = useState<any>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]); // [lng, lat]
  const [buildingsGeoJSON, setBuildingsGeoJSON] = useState<any>(null);
  const [resolvedDestinationNodeId, setResolvedDestinationNodeId] = useState<string | null>(destinationNodeIdParam);

  // Occupancy mode
  const [showOccupancy, setShowOccupancy] = useState(false);

  const { currentInstruction, cameraBearing } = useNavigationDirections(gps.latitude, gps.longitude, routeData);
  const weather = useLiveWeather(initialCenter[1], initialCenter[0]);

  useTelemetry(false); // GlobalBroadcast handles this now
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapData, setHeatmapData] = useState<any>(null);

  // OBSync states
  const [showFriends, setShowFriends] = useState(false);
  const [activeFriends, setActiveFriends] = useState<any[]>([]);
  const [trackedFriend, setTrackedFriend] = useState<any>(null);

  const [currentFloor, setCurrentFloor] = useState<string>('All');
  
  const [proximityThreshold, setProximityThreshold] = useState(25);
  const [currentBlockName, setCurrentBlockName] = useState<string | null>(null);

  // Spatial Journal States
  const [showMemories, setShowMemories] = useState(true);
  const [memories, setMemories] = useState<any[]>([]);
  const [newMemoryLocation, setNewMemoryLocation] = useState<{lat: number, lng: number} | null>(null);
  const [newMemoryText, setNewMemoryText] = useState('');
  const [tagging, setTagging] = useState(false);

  // Stalls on Map
  const [showStalls, setShowStalls] = useState(false);
  const [stallsData, setStallsData] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'memories'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMemories(mems);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Stalls data
  useEffect(() => {
    async function fetchStalls() {
      try {
        const res = await StallsAPI.getAllStalls();
        setStallsData(res.stalls || []);
      } catch (e) {
        console.warn('Failed to fetch stalls', e);
      }
    }
    fetchStalls();
  }, []);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await AdminAPI.getSettings();
        if (res?.building_proximity_threshold) {
          setProximityThreshold(res.building_proximity_threshold);
        }
      } catch (e) {
        console.warn("Failed to fetch settings for proximity threshold");
      }
    }
    fetchSettings();
  }, []);

  // Poll for Active Friends if toggle is ON
  useEffect(() => {
    if (!showFriends) {
      setActiveFriends([]);
      return;
    }
    const fetchFriends = async () => {
      try {
        const res = await apiClient.get('/telemetry/active_friends');
        setActiveFriends(res.data.friends || []);
      } catch (e) {
        console.warn("Failed to fetch active friends", e);
      }
    };
    fetchFriends();
    const interval = setInterval(fetchFriends, 5000);
    return () => clearInterval(interval);
  }, [showFriends]);

  // Poll for specific Tracked friend if trackCode is set
  useEffect(() => {
    if (!trackCode) return;

    // Automatically stop following GPS and start following friend
    setFollowMe(false);

    const fetchTracked = async () => {
      try {
        const res = await apiClient.get(`/telemetry/friend/${trackCode}`);
        setTrackedFriend((prev: any) => {
          let bearing = prev ? prev.bearing : 0;
          if (prev && (Math.abs(res.data.lat - prev.lat) > 0.000001 || Math.abs(res.data.lng - prev.lng) > 0.000001)) {
            bearing = Math.atan2(res.data.lng - prev.lng, res.data.lat - prev.lat) * (180 / Math.PI);
          }
          return { ...res.data, code: trackCode, bearing };
        });
      } catch (e) {
        console.warn("Failed to fetch tracked friend", e);
      }
    };
    fetchTracked();
    const interval = setInterval(fetchTracked, 5000);
    return () => clearInterval(interval);
  }, [trackCode]);

  // Follow tracked friend camera
  useEffect(() => {
    if (trackedFriend && mapRef.current) {
      const map = mapRef.current.getMap();
      map.easeTo({
        center: [trackedFriend.lng, trackedFriend.lat],
        zoom: 19,
        pitch: 60,
        bearing: trackedFriend.bearing || 0,
        duration: 1500,
        easing: (t) => t
      });
    }
  }, [trackedFriend]);

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

  const [selectedBuilding, setSelectedBuilding] = useState<any>(null);
  const [buildingListData, setBuildingListData] = useState<any[]>([]);

  // Fetch building list data (includes live_occupancy from the list endpoint)
  useEffect(() => {
    async function fetchBuildingList() {
      try {
        const res = await apiClient.get('/buildings/');
        setBuildingListData(res.data.buildings || []);
      } catch (e) {
        console.warn('Failed to fetch building list', e);
      }
    }
    fetchBuildingList();
  }, []);

  // Proximity Calculation
  useEffect(() => {
    if (!gps.latitude || !gps.longitude || buildingListData.length === 0) return;

    let nearestBlock = null;
    let minDistance = Infinity;

    for (const building of buildingListData) {
      if (building.latitude && building.longitude) {
        const dist = calculateDistance(gps.latitude, gps.longitude, building.latitude, building.longitude);
        if (dist < minDistance) {
          minDistance = dist;
          nearestBlock = building.name || building.Name;
        }
      } else if (building.lat && building.lng) {
        const dist = calculateDistance(gps.latitude, gps.longitude, building.lat, building.lng);
        if (dist < minDistance) {
          minDistance = dist;
          nearestBlock = building.name || building.Name;
        }
      }
    }

    if (minDistance <= proximityThreshold) {
      setCurrentBlockName(nearestBlock);
    } else {
      setCurrentBlockName(null);
    }
  }, [gps.latitude, gps.longitude, buildingListData, proximityThreshold]);

  const handleMapClick = (event: any) => {
    const feature = event.features && event.features[0];
    if (feature && feature.layer.id === '3d-buildings') {
      const props = { ...feature.properties };
      // Enrich with occupancy from building list data
      const match = buildingListData.find(
        (b: any) => (b.name || '').toLowerCase() === (props.Name || '').toLowerCase()
      );
      if (match) {
        if (!props.live_occupancy) props.live_occupancy = match.live_occupancy;
        if (!props.description && match.description) props.description = match.description;
        if (!props.cover_photo && match.cover_photo) props.cover_photo = match.cover_photo;
        if (!props.node_id && match.node_id) props.node_id = match.node_id;
      }
      setSelectedBuilding(props);
    } else {
      setSelectedBuilding(null);
    }
  };

  const handleMapContextMenu = (event: any) => {
    event.preventDefault();
    if (!auth.currentUser) {
      alert("Please sign in using the sidebar to drop a memory!");
      return;
    }
    setNewMemoryLocation({ lng: event.lngLat.lng, lat: event.lngLat.lat });
  };

  const submitMemory = async () => {
    if (!newMemoryText.trim() || !newMemoryLocation || !auth.currentUser) return;
    setTagging(true);
    try {
      // Get AI Tag
      const res = await apiClient.post('/ai/tag-memory', { memory_text: newMemoryText });
      const tag = res.data.tag;

      // Save to Firestore
      await addDoc(collection(db, 'memories'), {
        text: newMemoryText,
        lat: newMemoryLocation.lat,
        lng: newMemoryLocation.lng,
        tag: tag,
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'Anonymous Student',
        createdAt: new Date().toISOString()
      });
      setNewMemoryLocation(null);
      setNewMemoryText('');
    } catch (e) {
      console.error("Failed to add memory", e);
    } finally {
      setTagging(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col relative flex-1">

      {/* Smart Building Sidebar */}
      <BuildingSidebar
        isOpen={!!selectedBuilding}
        onClose={() => setSelectedBuilding(null)}
        buildingData={selectedBuilding}
      />

      {currentBlockName && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
          <div className="bg-[#7B1113]/90 text-white px-6 py-2.5 rounded-full shadow-lg font-bold flex items-center gap-2 backdrop-blur-sm border border-white/20 animate-fade-in-down">
            <MapPin size={18} className="text-[#C8A951]" />
            You are in {currentBlockName} Block
          </div>
        </div>
      )}

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
          onContextMenu={handleMapContextMenu}
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
                {...(currentFloor !== 'All' && selectedBuilding
                  ? {
                    filter: [
                      'any',
                      ['!=', ['get', 'Name'], selectedBuilding.Name || ''],
                      ['==', ['get', 'level'], currentFloor]
                    ]
                  }
                  : {})}
                paint={{
                  'fill-extrusion-color': showOccupancy
                    ? [
                        'interpolate', ['linear'], ['get', 'live_occupancy'],
                        0, '#10b981',
                        40, '#f59e0b',
                        75, '#ef4444',
                        100, '#991b1b'
                      ]
                    : weather && !weather.isDay
                      ? [
                          'case',
                          ['==', ['get', 'height'], 0], '#1a2332',
                          ['has', 'building_type'],
                          [
                            'match', ['get', 'building_type'],
                            'academic', '#2d1f3d',
                            'lab', '#1a2744',
                            'hostel', '#2d2a1a',
                            'admin', '#1f2937',
                            '#1e2d4a'
                          ],
                          '#1e2d4a'
                        ]
                      : [
                          'case',
                          ['has', 'building_type'],
                          [
                            'match', ['get', 'building_type'],
                            'academic', '#b85c38',
                            'lab', '#2563eb',
                            'hostel', '#d97706',
                            'admin', '#475569',
                            ['get', 'color']
                          ],
                          ['get', 'color']
                        ],
                  'fill-extrusion-height': ['get', 'height'],
                  'fill-extrusion-base': ['get', 'base_height'],
                  'fill-extrusion-opacity': showOccupancy ? 0.85 : (
                    weather && !weather.isDay
                      ? [
                          'case',
                          ['==', ['get', 'height'], 0], 0.3,
                          0.65
                        ] as any
                      : [
                          'case',
                          selectedBuilding
                            ? ['==', ['get', 'Name'], selectedBuilding.Name || '']
                            : false,
                          0.9,
                          0.6
                        ] as any
                  )
                }}
              />
              {/* Building Labels Layer */}
              <Layer
                id="building-labels"
                type="symbol"
                layout={{
                  'text-field': ['get', 'Name'],
                  'text-size': 13,
                  'text-anchor': 'center',
                  'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold']
                }}
                paint={{
                  'text-color': weather && !weather.isDay ? '#C8A951' : '#2d2019',
                  'text-halo-color': weather && !weather.isDay ? '#110810' : '#ffffff',
                  'text-halo-width': 2.5
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
                  'line-color': '#7B1113',
                  'line-width': 6,
                  'line-opacity': 0.9
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

          {/* Tracked Friend Marker */}
          {trackedFriend && (
            <Marker
              longitude={trackedFriend.lng}
              latitude={trackedFriend.lat}
              anchor="center"
              rotationAlignment="map"
              rotation={trackedFriend.bearing || 0}
            >
              <div className="relative group">
                <div className="w-16 h-16 rounded-full border-4 border-white shadow-[0_0_20px_rgba(59,130,246,0.6)] overflow-hidden transition-transform transform hover:scale-110">
                  <img src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt={trackedFriend.name} className="w-full h-full object-cover" />
                </div>
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white px-3 py-1 rounded-lg text-sm font-bold whitespace-nowrap shadow-lg border border-slate-700/50"
                  style={{ transform: `translateX(-50%) rotate(${-(trackedFriend.bearing || 0)}deg)` }}
                >
                  {trackedFriend.name}
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-blue-500/20 border-2 border-blue-500/30 rounded-full scale-y-50 -z-10 blur-[2px]"></div>
              </div>
            </Marker>
          )}

          {/* Active Friends Markers */}
          {showFriends && activeFriends.map(friend => (
            <Marker
              key={friend.code}
              longitude={friend.lng}
              latitude={friend.lat}
              anchor="center"
              rotationAlignment="map"
            >
              <div
                className="relative group hover:z-50 cursor-pointer"
                onClick={() => navigate(`/map?track=${friend.code}`)}
              >
                <div className="w-12 h-12 rounded-full border-2 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)] overflow-hidden bg-slate-800 flex items-center justify-center transition-transform transform group-hover:scale-110">
                  <span className="text-emerald-400 font-bold text-lg">{friend.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white px-2 py-1 rounded-md text-xs font-bold whitespace-nowrap shadow-lg border border-slate-700/50">
                  {friend.name}
                </div>
              </div>
            </Marker>
          ))}

          {/* Spatial Journal Memory Markers */}
          {showMemories && memories.map(mem => (
            <Marker key={mem.id} longitude={mem.lng} latitude={mem.lat} anchor="bottom">
              <div className="relative group cursor-pointer hover:z-50">
                <div className="text-3xl filter drop-shadow-md transition-transform hover:scale-110">💭</div>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 bg-white dark:bg-slate-800 p-3 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 pointer-events-none">
                  <div className="text-xs font-bold text-indigo-600 mb-1 flex items-center justify-between">
                    <span className="truncate mr-2">{mem.userName}</span>
                    <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 rounded-full text-[10px] shrink-0">{mem.tag}</span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{mem.text}</p>
                </div>
              </div>
            </Marker>
          ))}

          {/* Stall Markers */}
          {showStalls && stallsData.map(stall => {
            const stallLat = stall.latitude || stall.lat;
            const stallLng = stall.longitude || stall.lng;
            if (!stallLat || !stallLng) return null;
            return (
              <Marker key={`stall-${stall.id}`} longitude={stallLng} latitude={stallLat} anchor="bottom">
                <div
                  className="relative group cursor-pointer hover:z-50"
                  onClick={() => {
                    if (stall.node_id) {
                      navigate(`/map?destination=${encodeURIComponent(stall.name)}&destination_node_id=${stall.node_id}&source_node_id=gps`);
                    }
                  }}
                >
                  <div className="w-8 h-8 bg-[#C8A951] rounded-full flex items-center justify-center shadow-lg shadow-[#C8A951]/30 border-2 border-white transition-transform hover:scale-110">
                    <Store size={14} className="text-[#2d2019]" />
                  </div>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-44 bg-white dark:bg-[#2d2019] p-3 rounded-xl shadow-2xl border border-[#C8A951]/20 pointer-events-none">
                    <div className="text-xs font-bold text-[#7B1113] dark:text-[#C8A951] mb-0.5">{stall.name}</div>
                    <div className="text-[10px] text-[#8a7a6a] uppercase tracking-wider font-bold">{stall.category || 'General'}</div>
                    {stall.status === 'active' && (
                      <div className="flex items-center gap-1 mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Open Now</span>
                      </div>
                    )}
                  </div>
                </div>
              </Marker>
            );
          })}

        </Map>
      </div>

      {newMemoryLocation && (
        <>
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-[1999]" onClick={() => setNewMemoryLocation(null)} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-2xl z-[2000] w-80 animate-fade-in-up border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-white">Drop a Memory 💭</h3>
            <textarea 
              value={newMemoryText}
              onChange={e => setNewMemoryText(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4 dark:text-white border border-slate-200 dark:border-slate-700 resize-none"
              placeholder="What's on your mind about this spot?"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setNewMemoryLocation(null)} className="px-4 py-2 text-slate-500 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancel</button>
              <button onClick={submitMemory} disabled={tagging || !newMemoryText.trim()} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl disabled:opacity-50 flex items-center gap-2 transition-colors">
                {tagging ? 'Tagging...' : 'Drop Pin'}
              </button>
            </div>
          </div>
        </>
      )}

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
          className={`absolute bottom-28 right-4 md:bottom-8 md:right-4 z-[1000] p-4 rounded-full shadow-lg transition-all ${followMe ? 'bg-[#7B1113] text-white shadow-[#7B1113]/50' : 'bg-white/90 backdrop-blur text-slate-700 hover:bg-white border border-white/20'}`}
          title="Follow my location"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="M2 12h2" /><path d="M20 12h2" /><circle cx="12" cy="12" r="4" /></svg>
        </button>
      )}

      {/* Map Floating Actions */}
      <div className="absolute top-1/2 -translate-y-1/2 right-4 z-[1000] flex flex-col gap-2.5">
        {/* AR Mode Button */}
        <button
          onClick={() => navigate('/ar')}
          className="bg-white/90 backdrop-blur text-slate-700 p-3 rounded-full shadow-lg hover:bg-white transition-all flex items-center justify-center border border-white/20"
          title="Enter AR Mode"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12C22 12 19 19 12 19C5 19 2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>
        </button>

        {/* Occupancy Mode Toggle */}
        <button
          onClick={() => setShowOccupancy(!showOccupancy)}
          className={`p-3 rounded-full shadow-lg transition-all flex items-center justify-center ${
            showOccupancy ? 'bg-[#7B1113] text-white shadow-[#7B1113]/50' : 'bg-white/90 backdrop-blur text-slate-700 hover:bg-white border border-white/20'
          }`}
          title="Toggle Building Occupancy View"
        >
          <Thermometer size={22} />
        </button>

        {/* Live Heatmap Toggle Button */}
        <button
          onClick={() => setShowHeatmap(!showHeatmap)}
          className={`p-3 rounded-full shadow-lg transition-all flex items-center justify-center ${
            showHeatmap ? 'bg-[#C8A951] text-[#2d2019] shadow-[#C8A951]/40' : 'bg-white/90 backdrop-blur text-slate-700 hover:bg-white border border-white/20'
          }`}
          title="Toggle People Heatmap"
        >
          <Activity size={22} />
        </button>

        {/* OBSync Toggle Button */}
        <button
          onClick={() => setShowFriends(!showFriends)}
          className={`p-3 rounded-full shadow-lg transition-all flex items-center justify-center ${
            showFriends ? 'bg-emerald-500 text-white shadow-emerald-500/50' : 'bg-white/90 backdrop-blur text-slate-700 hover:bg-white border border-white/20'
          }`}
          title="Show Active Office Bearers"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
        </button>

        {/* Spatial Journal Toggle */}
        <button
          onClick={() => setShowMemories(!showMemories)}
          className={`p-3 rounded-full shadow-lg transition-all flex items-center justify-center ${
            showMemories ? 'bg-indigo-600 text-white shadow-indigo-600/50' : 'bg-white/90 backdrop-blur text-slate-700 hover:bg-white border border-white/20'
          }`}
          title="Toggle Spatial Journal Memories"
        >
          <span className="text-xl leading-none">💭</span>
        </button>

        {/* Stalls Toggle */}
        <button
          onClick={() => setShowStalls(!showStalls)}
          className={`p-3 rounded-full shadow-lg transition-all flex items-center justify-center ${
            showStalls ? 'bg-[#C8A951] text-[#2d2019] shadow-[#C8A951]/40' : 'bg-white/90 backdrop-blur text-slate-700 hover:bg-white border border-white/20'
          }`}
          title="Toggle Campus Stalls"
        >
          <Store size={22} />
        </button>
      </div>

      {selectedBuilding && (
        <>
          <FloorSelector
            currentFloor={currentFloor}
            buildingName={selectedBuilding.Name || ''}
            onChange={setCurrentFloor}
          />
          {currentFloor !== 'All' && (
            <FloorPlanViewer
              buildingName={selectedBuilding.Name || 'Building'}
              floor={currentFloor}
              onClose={() => setCurrentFloor('All')}
            />
          )}
        </>
      )}
    </div>
  );
}
