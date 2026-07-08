import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BuildingsAPI } from '../api';
import { Building, MapPin, Users, Beaker, Navigation2, ArrowLeft } from 'lucide-react';

export function BuildingDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [building, setBuilding] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBuilding() {
      if (!id) return;
      try {
        const data = await BuildingsAPI.getBuildingByName(id);
        setBuilding(data);
      } catch (err: any) {
        console.error("Failed to fetch building details", err);
        setError("Could not find this building.");
      } finally {
        setLoading(false);
      }
    }
    fetchBuilding();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !building) {
    return (
      <div className="p-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6">
          <ArrowLeft size={20} /> Back
        </button>
        <div className="p-4 bg-red-100 text-red-700 rounded-lg">
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }

  // Placeholder data since backend doesn't provide these fields yet
  const departments = building.departments || ["Civil Engineering", "Computer Science", "Mechanical Engineering"];
  const faculty = building.faculty || ["Dr. Smith", "Prof. Johnson", "Dr. Emily"];
  const labs = building.labs || ["Main Computer Lab", "Physics Lab"];

  return (
    <div className="h-full overflow-auto bg-slate-50 dark:bg-slate-900 pb-12">
      {/* Header Image Placeholder */}
      <div className="w-full h-64 bg-slate-300 dark:bg-slate-700 relative flex items-center justify-center shadow-inner">
        <Building size={80} className="text-slate-400 dark:text-slate-600" />
        <button 
          onClick={() => navigate(-1)} 
          className="absolute top-4 left-4 p-2 bg-white/80 dark:bg-black/50 backdrop-blur rounded-full hover:bg-white transition"
        >
          <ArrowLeft size={20} className="text-slate-800 dark:text-white" />
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-10">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 sm:p-8 border border-slate-100 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                {building.name}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-2">
                <MapPin size={16} /> Campus Main Area
              </p>
            </div>
            <button 
              onClick={() => navigate(`/map?destination=${encodeURIComponent(building.name)}&node_id=${building.node_id}`)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-colors font-medium text-lg">
              <Navigation2 size={20} />
              Navigate
            </button>
          </div>

          <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 mb-8">
            <p>
              The {building.name} is a key facility within the campus, housing various departments and state-of-the-art laboratories for students and faculty.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-4 text-blue-600 dark:text-blue-400">
                <Building size={20} />
                <h3 className="font-bold text-lg text-slate-800 dark:text-white">Departments</h3>
              </div>
              <ul className="space-y-2 text-slate-600 dark:text-slate-300">
                {departments.map((d: string, i: number) => <li key={i}>• {d}</li>)}
              </ul>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-4 text-purple-600 dark:text-purple-400">
                <Users size={20} />
                <h3 className="font-bold text-lg text-slate-800 dark:text-white">Faculty Offices</h3>
              </div>
              <ul className="space-y-2 text-slate-600 dark:text-slate-300">
                {faculty.map((f: string, i: number) => <li key={i}>• {f}</li>)}
              </ul>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-4 text-emerald-600 dark:text-emerald-400">
                <Beaker size={20} />
                <h3 className="font-bold text-lg text-slate-800 dark:text-white">Labs</h3>
              </div>
              <ul className="space-y-2 text-slate-600 dark:text-slate-300">
                {labs.map((l: string, i: number) => <li key={i}>• {l}</li>)}
              </ul>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
