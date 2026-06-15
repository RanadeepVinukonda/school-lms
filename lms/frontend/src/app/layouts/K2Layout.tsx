import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { ROUTES } from '@/lib/constants';

const navItems = [
  { label: 'Home', href: ROUTES.K2_DASHBOARD, icon: 'home' },
  { label: 'Letters', href: ROUTES.K2_TRACING, icon: 'draw' },
  { label: 'Phonics', href: ROUTES.K2_PHONICS, icon: 'music_note' },
  { label: 'Stories', href: ROUTES.K2_STORIES, icon: 'book' },
  { label: 'Flashcards', href: ROUTES.K2_FLASHCARDS, icon: 'credit_card' },
];

export default function K2Layout() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = async () => {
    const { useAuthStore: auth } = await import('@/store/authStore');
    auth.getState().logout();
    navigate(ROUTES.LOGIN);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 via-pink-50 to-yellow-50">
      <header className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 p-4 shadow-lg">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <span className="text-4xl">🦁</span>
            <div>
              <h1 className="text-2xl font-bold text-white drop-shadow-md">Genesis Kids</h1>
              <p className="text-sm text-white/80">Hi, {user?.displayName || 'Little Learner'}!</p>
            </div>
          </div>
          <button onClick={() => setShowMenu(!showMenu)} className="text-white text-3xl hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-4xl">menu</span>
          </button>
        </div>
        {showMenu && (
          <div className="absolute right-4 top-20 bg-white rounded-2xl shadow-2xl p-4 z-50 min-w-[200px] border-2 border-purple-200">
            <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl text-lg font-medium transition-colors">
              <span className="material-symbols-outlined">logout</span>
              Logout
            </button>
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto p-4 pb-28">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t-4 border-purple-300 shadow-2xl rounded-t-3xl">
        <div className="flex items-center justify-around h-20 px-2 max-w-6xl mx-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-xs font-bold transition-all rounded-2xl min-w-0 flex-1 h-full ${
                  isActive ? 'text-purple-600 scale-110' : 'text-gray-400 hover:text-purple-400'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className="material-symbols-outlined text-3xl">{item.icon}</span>
                  <span className="text-sm">{item.label}</span>
                  {isActive && <span className="w-6 h-1 bg-purple-500 rounded-full mt-0.5" />}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
