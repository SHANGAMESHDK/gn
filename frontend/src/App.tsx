import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

import { Home } from './pages/Home';
import { Map } from './pages/Map';
import { Admin } from './pages/Admin';
import { CampusAR } from './pages/CampusAR';

import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';

function App() {
  return (
    <Router>
      <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-900 overflow-hidden text-slate-800 dark:text-slate-100">
        {/* Sidebar for Desktop */}
        <div className="hidden md:block">
          <Sidebar />
        </div>
        
        <div className="flex flex-col flex-1 w-full relative">
          
          <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/map" element={<Map />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/ar" element={<CampusAR />} />
            </Routes>
          </main>
          
          {/* Bottom Navigation for Mobile */}
          <div className="md:hidden absolute bottom-0 left-0 w-full z-50">
            <Navbar />
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;
