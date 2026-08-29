import { NavLink } from 'react-router-dom';
import { Home, Map, Glasses, Building, Store, Users, GraduationCap, Settings } from 'lucide-react';

export function Sidebar() {
  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/map', icon: Map, label: 'Campus Map' },
    { to: '/buildings', icon: Building, label: 'Buildings' },
    { to: '/stalls', icon: Store, label: 'Stalls' },
    { to: '/ar', icon: Glasses, label: 'AR Mode' },
    { to: '/obsync', icon: Users, label: 'OB Sync' },
    { to: '/admin', icon: Settings, label: 'Admin' },
  ];

  return (
    <aside className="w-[270px] h-full glass flex flex-col border-r border-[#C8A951]/10">
      {/* Brand Header */}
      <div className="p-6 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-[#7B1113] rounded-xl flex items-center justify-center shadow-md shadow-[#7B1113]/20">
            <GraduationCap size={22} className="text-[#C8A951]" />
          </div>
          <div>
            <h2 className="text-[15px] font-extrabold text-[#2d2019] dark:text-white tracking-tight leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
              Easwari Navigator
            </h2>
            <p className="text-[10px] font-bold text-[#C8A951] tracking-[0.15em] uppercase mt-0.5">SRM Group</p>
          </div>
        </div>
      </div>

      {/* Separator */}
      <div className="mx-5 h-px bg-gradient-to-r from-transparent via-[#C8A951]/20 to-transparent" />
      
      {/* Navigation */}
      <nav className="flex-1 px-3.5 py-4 space-y-0.5 overflow-y-auto hide-scrollbar">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-3.5 py-2.5 rounded-lg font-semibold text-[13.5px] transition-all duration-200 ${
                isActive
                  ? 'bg-[#7B1113] text-white shadow-md shadow-[#7B1113]/20'
                  : 'text-[#5a4a3a] dark:text-[#b0a090] hover:bg-[#7B1113]/[0.06] dark:hover:bg-[#7B1113]/10 hover:text-[#7B1113] dark:hover:text-[#C8A951]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={18} className={`transition-colors ${isActive ? 'text-[#C8A951]' : ''}`} />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="h-4" />
      {/* Footer */}
      <div className="px-5 pb-4">
        <div className="flex items-center gap-2 text-[10px] text-[#8a7a6a] dark:text-[#5a4a3a]">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="font-medium">v2.0</span>
          <span className="px-1.5 py-0.5 bg-[#7B1113]/10 text-[#7B1113] dark:text-[#C8A951] rounded text-[9px] font-bold uppercase tracking-wider">Beta</span>
        </div>
      </div>
    </aside>
  );
}
