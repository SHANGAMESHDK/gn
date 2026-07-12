import { NavLink } from 'react-router-dom';
import { Home, Map, Glasses, Settings, Compass, Building, Store } from 'lucide-react';

export function Sidebar() {
  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/map', icon: Map, label: 'Interactive Map' },
    { to: '/buildings', icon: Building, label: 'Buildings' },
    { to: '/stalls', icon: Store, label: 'Stalls' },
    { to: '/ar', icon: Glasses, label: 'AR Mode' },
  ];

  return (
    <aside className="w-64 h-full bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border-r border-slate-200/50 dark:border-slate-800/50 flex flex-col shadow-xl">
      <div className="p-8">
        <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/30 text-white">
            <Compass size={24} />
          </div>
          Campus Nav
        </h2>
      </div>
      
      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-4 px-4 py-3.5 rounded-xl font-medium transition-all duration-300 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`
            }
          >
            <item.icon size={22} className="opacity-90" /> 
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-200/50 dark:border-slate-800/50">
        <NavLink
          to="/admin"
          className={({ isActive }) =>
            `flex items-center gap-4 px-4 py-3.5 rounded-xl font-medium transition-all duration-300 ${
              isActive
                ? 'bg-slate-800 text-white shadow-lg dark:bg-slate-700'
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`
          }
        >
          <Settings size={22} /> Admin Dashboard
        </NavLink>
      </div>
    </aside>
  );
}
