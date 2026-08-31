import { useState, useEffect } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged, type User } from 'firebase/auth';
import { auth, googleProvider } from '../../services/firebase';
import { LogOut, User as UserIcon } from 'lucide-react';

export function LoginButton() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error signing in with Google", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-end hidden md:flex">
          <span className="text-sm font-bold text-slate-800 dark:text-white">{user.displayName}</span>
          <span className="text-[10px] text-slate-500">{user.email}</span>
        </div>
        {user.photoURL ? (
          <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full border-2 border-[#7B1113]" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-[#7B1113]/10 flex items-center justify-center text-[#7B1113]">
            <UserIcon size={16} />
          </div>
        )}
        <button 
          onClick={handleLogout}
          className="ml-2 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
          title="Sign out"
        >
          <LogOut size={18} />
        </button>
      </div>
    );
  }

  return (
    <button 
      onClick={handleLogin}
      className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold rounded-xl transition-all shadow-md border border-slate-200 dark:border-slate-600 hover:shadow-lg w-full justify-center"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
      Sign in with Google
    </button>
  );
}
