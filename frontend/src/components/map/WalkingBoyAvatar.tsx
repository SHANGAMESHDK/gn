

export const WalkingBoyAvatar = ({ opacity = 1, size = 40 }: { opacity?: number, size?: number }) => (
  <div 
    style={{ opacity, width: size, height: size }}
    className="relative flex items-center justify-center"
  >
    <div className="absolute inset-0 bg-blue-500 rounded-full shadow-lg flex items-center justify-center border-2 border-white" style={{ animation: opacity < 1 ? 'none' : 'bounce 1s infinite' }}>
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="5" r="2" />
        <path d="m9 10 2 2 4-4" />
        <path d="M10 22v-5l-2-2 2-6" />
        <path d="M14 22v-4l-2-3-2 6" />
        <path d="M16 10l-2-2" />
      </svg>
    </div>
  </div>
);
