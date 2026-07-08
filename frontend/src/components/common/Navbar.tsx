import { Map as MapIcon, Menu } from 'lucide-react';

export function Navbar() {
  return (
    <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <MapIcon className="text-blue-500" />
        <h1 className="text-xl font-bold text-slate-800 dark:text-white">Campus Nav</h1>
      </div>
      <button className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300">
        <Menu size={24} />
      </button>
    </header>
  );
}
