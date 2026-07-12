import { Map as MapIcon, Home, Settings, Building, Store } from 'lucide-react';
import { NavLink } from 'react-router-dom';

export function Navbar() {
  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/map', icon: MapIcon, label: 'Map' },
    { to: '/buildings', icon: Building, label: 'Buildings' },
    { to: '/stalls', icon: Store, label: 'Stalls' },
    { to: '/admin', icon: Settings, label: 'Admin' },
  ];

  return (
    <nav className="h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex items-center justify-around px-2 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
              isActive
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className={`p-1.5 rounded-full transition-all duration-300 ${isActive ? 'bg-blue-100 dark:bg-blue-900/30' : ''}`}>
                <item.icon size={22} className={isActive ? 'stroke-[2.5px]' : 'stroke-2'} />
              </div>
              <span className={`text-[10px] font-medium transition-all ${isActive ? 'font-bold' : ''}`}>
                {item.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
