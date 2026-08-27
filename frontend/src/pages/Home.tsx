import { useNavigate } from 'react-router-dom';
import { Map, Glasses, Navigation, Building, Store, Users, Trophy, Zap, Globe, GraduationCap, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } }
};

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.1, 0.25, 1] as const } }
};

const scaleUp = {
  hidden: { opacity: 0, scale: 0.92 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const } }
};

const quickActions = [
  { to: '/map', icon: Map, label: 'Campus Map', desc: '3D interactive map' },
  { to: '/ar', icon: Glasses, label: 'AR Navigation', desc: 'Augmented reality' },
  { to: '/buildings', icon: Building, label: 'Buildings', desc: 'All campus blocks' },
  { to: '/stalls', icon: Store, label: 'Food & Shops', desc: 'Canteens & stores' },
  { to: '/obsync', icon: Users, label: 'OB Sync', desc: 'Walkie-talkie & track' },
  { to: '/hunt', icon: Trophy, label: 'AR Hunt', desc: 'Campus scavenger hunt' },
];

const features = [
  { icon: Globe, title: '3D Terrain Map', desc: 'Full 3D campus with buildings, paths, and real terrain elevation data.' },
  { icon: Navigation, title: 'Walk Navigation', desc: 'Turn-by-turn walking directions with live GPS tracking and ETA.' },
  { icon: Glasses, title: 'AR Wayfinding', desc: 'Point your camera and see directions overlaid on the real world.' },
  { icon: Zap, title: 'Live Comms', desc: 'Push-to-talk radio and real-time OB location sharing.' },
];

export function Home() {
  const navigate = useNavigate();

  return (
    <div className="relative w-full min-h-full overflow-y-auto overflow-x-hidden">
      
      {/* Subtle background */}
      <div className="absolute inset-0 dot-grid pointer-events-none opacity-60" />
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-[#7B1113]/[0.03] to-transparent pointer-events-none" />

      {/* Hero */}
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 flex flex-col items-center text-center px-6 pt-14 pb-8 md:pt-20 md:pb-12 max-w-4xl mx-auto"
      >
        {/* College Badge */}
        <motion.div variants={fadeUp} className="mb-5">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#7B1113]/[0.07] dark:bg-[#C8A951]/[0.08] text-[13px] font-semibold text-[#7B1113] dark:text-[#C8A951] border border-[#7B1113]/10 dark:border-[#C8A951]/15">
            <GraduationCap size={15} />
            SRM Easwari Engineering College
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1 
          variants={fadeUp}
          className="text-4xl md:text-6xl font-black tracking-tight leading-[1.1] mb-4 text-[#2d2019] dark:text-[#f0e8dc]"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Campus{' '}
          <span className="gradient-text">Navigator</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p 
          variants={fadeUp}
          className="text-base md:text-lg text-[#6a5a4a] dark:text-[#a09080] max-w-md leading-relaxed mb-8"
        >
          Find your way around campus with interactive maps, AR navigation, and real-time communication tools.
        </motion.p>

        {/* Primary CTAs */}
        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 w-full max-w-sm mb-4">
          <button
            onClick={() => navigate('/map')}
            className="flex-1 group bg-[#7B1113] hover:bg-[#9B1B30] text-white px-6 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2.5 active:scale-[0.97] transition-all shadow-md shadow-[#7B1113]/15"
          >
            <Map size={20} />
            Open Map
            <ArrowRight size={16} className="opacity-60 group-hover:translate-x-0.5 transition-transform" />
          </button>
          
          <button
            onClick={() => navigate('/ar')}
            className="flex-1 group glass text-[#2d2019] dark:text-[#f0e8dc] px-6 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2.5 active:scale-[0.97] transition-all hover:shadow-lg"
          >
            <Glasses size={20} className="text-[#7B1113] dark:text-[#C8A951]" />
            AR Mode
          </button>
        </motion.div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 px-6 pb-8 max-w-4xl mx-auto"
      >
        <motion.p variants={fadeUp} className="text-[11px] font-bold text-[#8a7a6a] dark:text-[#6a5a4a] uppercase tracking-[0.2em] mb-4 text-center">
          Quick Access
        </motion.p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
          {quickActions.map((action) => (
            <motion.button
              key={action.to}
              variants={scaleUp}
              onClick={() => navigate(action.to)}
              className="group glass rounded-xl p-4 text-left active:scale-[0.97] transition-all duration-200 hover:shadow-lg hover:border-[#7B1113]/15"
            >
              <div className="w-9 h-9 bg-[#7B1113]/[0.08] dark:bg-[#C8A951]/10 rounded-lg flex items-center justify-center mb-3 text-[#7B1113] dark:text-[#C8A951] group-hover:bg-[#7B1113] group-hover:text-white dark:group-hover:bg-[#C8A951] dark:group-hover:text-[#2d2019] transition-all duration-200">
                <action.icon size={18} />
              </div>
              <h3 className="font-bold text-[#2d2019] dark:text-[#f0e8dc] text-[13.5px] mb-0.5">{action.label}</h3>
              <p className="text-[11px] text-[#8a7a6a] dark:text-[#6a5a4a] font-medium">{action.desc}</p>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Features */}
      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.15 }}
        className="relative z-10 px-6 pb-12 max-w-4xl mx-auto"
      >
        <motion.div variants={fadeUp} className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-[#2d2019] dark:text-[#f0e8dc] tracking-tight mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            What's Inside
          </h2>
          <p className="text-[#8a7a6a] dark:text-[#6a5a4a] text-sm">
            Technology built for Easwari campus navigation.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={fadeUp}
              className="glass rounded-xl p-5 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 bg-[#7B1113]/[0.07] dark:bg-[#C8A951]/10 rounded-lg flex items-center justify-center text-[#7B1113] dark:text-[#C8A951] shrink-0">
                  <feature.icon size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-[#2d2019] dark:text-[#f0e8dc] text-[14px] mb-0.5">{feature.title}</h3>
                  <p className="text-[12.5px] text-[#6a5a4a] dark:text-[#8a7a6a] leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Footer */}
      <div className="relative z-10 pb-6 text-center">
        <p className="text-[11px] text-[#a09080] dark:text-[#5a4a3a]">
          Easwari Engineering College · SRM Group of Institutions
        </p>
      </div>
    </div>
  );
}
