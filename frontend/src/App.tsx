import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

import { Home } from './pages/Home';
import { Map } from './pages/Map';
import { Admin } from './pages/Admin';
import { CampusAR } from './pages/CampusAR';
import { CampusARHunt } from './pages/CampusARHunt';
import { Buildings } from './pages/Buildings';
import { Stalls } from './pages/Stalls';
import { FriendSync } from './pages/FriendSync';

import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { GlobalBroadcast } from './components/telemetry/GlobalBroadcast';

function App() {
  return (
    <Router>
      <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-900 overflow-hidden text-slate-800 dark:text-slate-100">
        {/* Sidebar for Desktop */}
        <div className="hidden md:block">
          <Sidebar />
        </div>

        <div className="flex flex-col flex-1 w-full relative">
          <GlobalBroadcast />

          <main className="flex-1 flex flex-col overflow-hidden pb-20 md:pb-0">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/map" element={<Map />} />
              <Route path="/buildings" element={<Buildings />} />
              <Route path="/stalls" element={<Stalls />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/ar" element={<CampusAR />} />
              <Route path="/hunt" element={<CampusARHunt />} />
              <Route path="/friendsync" element={<FriendSync />} />
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
