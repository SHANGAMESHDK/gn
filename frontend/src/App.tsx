import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

import { Home } from './pages/Home';
import { Map } from './pages/Map';
import { Search } from './pages/Search';
import { Navigation } from './pages/Navigation';
import { Buildings } from './pages/Buildings';
import { BuildingDetails } from './pages/BuildingDetails';
import { Stalls } from './pages/Stalls';
import { StallDetails } from './pages/StallDetails';
import { Events } from './pages/Events';
import { Admin } from './pages/Admin';
import { Settings } from './pages/Settings';
import { CampusAR } from './pages/CampusAR';

import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';

function App() {
  return (
    <Router>
      <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-900 overflow-hidden">
        {/* Sidebar for Desktop, hidden on mobile */}
        <div className="hidden md:block">
          <Sidebar />
        </div>
        
        <div className="flex flex-col flex-1 w-full">
          {/* Navbar for Mobile/Tablet */}
          <div className="md:hidden">
            <Navbar />
          </div>
          
          <main className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/map" element={<Map />} />
              <Route path="/search" element={<Search />} />
              <Route path="/navigation" element={<Navigation />} />
              <Route path="/buildings" element={<Buildings />} />
              <Route path="/buildings/:id" element={<BuildingDetails />} />
              <Route path="/stalls" element={<Stalls />} />
              <Route path="/stalls/:id" element={<StallDetails />} />
              <Route path="/events" element={<Events />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/ar" element={<CampusAR />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
