import { Map as MapIcon, Home, Building, Store, Users, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';

export function Navbar() {
  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/map', icon: MapIcon, label: 'Map' },
    { to: '/buildings', icon: Building, label: 'Buildings' },
    { to: '/stalls', icon: Store, label: 'Stalls' },
    { to: '/obsync', icon: Users, label: 'OBSync' },
    { to: '/admin', icon: Settings, label: 'Admin' },
  ];

  return (
    <nav className="glass mx-3 mb-3 rounded-2xl shadow-xl px-1 pb-safe" id="mobile-navbar">
      <div className="flex items-center justify-around h-[60px]">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center w-full h-full transition-all duration-200 ${
                isActive
                  ? 'text-[#7B1113] dark:text-[#C8A951]'
                  : 'text-[#8a7a6a] dark:text-[#6a5a4a]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-7 h-[3px] bg-[#7B1113] dark:bg-[#C8A951] rounded-full" />
                )}

                <div className={`p-1.5 rounded-lg transition-all duration-200 ${
                  isActive ? 'bg-[#7B1113]/[0.08] dark:bg-[#C8A951]/10' : 'active:scale-90'
                }`}>
                  <item.icon size={19} className={isActive ? 'stroke-[2.5px]' : 'stroke-[1.5px]'} />
                </div>

                <span className={`text-[9px] mt-0.5 ${isActive ? 'font-bold' : 'font-medium'}`}>
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
