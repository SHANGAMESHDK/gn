import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import './App.css';

import { Home } from './pages/Home';
import { Map } from './pages/Map';
import { Admin } from './pages/Admin';
import { CampusAR } from './pages/CampusAR';
import { CampusARHunt } from './pages/CampusARHunt';
import { Buildings } from './pages/Buildings';
import { Stalls } from './pages/Stalls';
import { OBSync } from './pages/OBSync';

import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { GlobalBroadcast } from './components/telemetry/GlobalBroadcast';
import { GeminiAssistant } from './components/ai/GeminiAssistant';

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.18 } }
};

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="flex-1 flex flex-col overflow-hidden"
      >
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/map" element={<Map />} />
          <Route path="/buildings" element={<Buildings />} />
          <Route path="/stalls" element={<Stalls />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/ar" element={<CampusAR />} />
          <Route path="/hunt" element={<CampusARHunt />} />
          <Route path="/obsync" element={<OBSync />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

function App() {
  return (
    <Router>
      <div className="flex h-screen w-full bg-[#faf8f4] dark:bg-[#110810] overflow-hidden text-[#2d2019] dark:text-[#f0e8dc] relative">
        {/* Warm ambient blurs */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute -top-[30%] -left-[15%] w-[700px] h-[700px] bg-[#7B1113]/[0.03] rounded-full blur-[140px] animate-float-slow" />
          <div className="absolute -bottom-[25%] -right-[15%] w-[600px] h-[600px] bg-[#C8A951]/[0.04] rounded-full blur-[120px] animate-float-slow delay-300" />
        </div>

        {/* Sidebar — Desktop */}
        <div className="hidden md:block relative z-10">
          <Sidebar />
        </div>

        <div className="flex flex-col flex-1 w-full relative z-10">
          <GlobalBroadcast />

          <main className="flex-1 flex flex-col overflow-hidden pb-20 md:pb-0">
            <AnimatedRoutes />
          </main>

          {/* Bottom Nav — Mobile */}
          <div className="md:hidden absolute bottom-0 left-0 w-full z-50">
            <Navbar />
          </div>
          
          <GeminiAssistant />
        </div>
      </div>
    </Router>
  );
}

export default App;
