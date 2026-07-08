import { Link } from 'react-router-dom';
import { Home, Map, Building, Tent, Calendar, Settings } from 'lucide-react';

export function Sidebar() {
  return (
    <aside className="w-64 h-full bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Map className="text-blue-500" />
          Campus Nav
        </h2>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        <Link to="/" className="flex items-center gap-3 px-4 py-3 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
          <Home size={20} /> Home
        </Link>
        <Link to="/map" className="flex items-center gap-3 px-4 py-3 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
          <Map size={20} /> Navigation
        </Link>
        <Link to="/buildings" className="flex items-center gap-3 px-4 py-3 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
          <Building size={20} /> Buildings
        </Link>
        <Link to="/stalls" className="flex items-center gap-3 px-4 py-3 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
          <Tent size={20} /> Stalls
        </Link>
        <Link to="/events" className="flex items-center gap-3 px-4 py-3 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
          <Calendar size={20} /> Events
        </Link>
        <Link to="/settings" className="flex items-center gap-3 px-4 py-3 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
          <Settings size={20} /> Settings
        </Link>
      </nav>
    </aside>
  );
}
