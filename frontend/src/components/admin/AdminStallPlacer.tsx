import { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix leaflet default icon issue in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

function LocationMarker({ position, setPosition }: { position: L.LatLng | null, setPosition: (p: L.LatLng) => void }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

export function AdminStallPlacer({ onSave, onCancel }: { onSave: (lat: number, lng: number, name: string, category: string) => void, onCancel: () => void }) {
  const [position, setPosition] = useState<L.LatLng | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Misc');
  
  const center: [number, number] = [13.031836, 80.179666]; // Main Gate

  return (
    <div className="fixed inset-0 bg-black/60 z-[2000] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Place New Stall</h2>
          <button onClick={onCancel} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">Close</button>
        </div>
        
        <div className="flex-1 relative">
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 px-4 py-2 rounded-lg shadow font-medium text-slate-800 pointer-events-none">
            Click on the map to place the stall
          </div>
          <MapContainer center={center} zoom={18} className="w-full h-full z-0">
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationMarker position={position} setPosition={setPosition} />
          </MapContainer>
        </div>
        
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-slate-500 mb-1">Stall Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="e.g. Robotics Exhibition"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
            />
          </div>
          <div className="w-full sm:w-48">
            <label className="block text-xs font-bold text-slate-500 mb-1">Category</label>
            <select 
              value={category} 
              onChange={e => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
            >
              <option value="Technical">Technical</option>
              <option value="Food">Food</option>
              <option value="Club">Club</option>
              <option value="Misc">Misc</option>
            </select>
          </div>
          <button 
            onClick={() => {
              if (position && name) onSave(position.lat, position.lng, name, category);
              else alert("Please set a location and name");
            }}
            disabled={!position || !name}
            className="w-full sm:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg disabled:opacity-50"
          >
            Save Stall
          </button>
        </div>
      </div>
    </div>
  );
}
