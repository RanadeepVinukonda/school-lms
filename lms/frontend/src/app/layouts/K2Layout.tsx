import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { ROUTES } from '@/lib/constants';
import { useTranslation } from '@/hooks/useTranslation';
import { Icon } from '@/components/ui/Icon';

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
  const { t } = useTranslation();
  const getLabel = (label: string) => {
    const key = `nav.${label.toLowerCase().replace(/ /g, '')}`;
    const val = t(key as any);
    return val === key ? label : val;
  };

  const handleLogout = async () => {
    const { useAuthStore: auth } = await import('@/store/authStore');
    auth.getState().logout();
    navigate(ROUTES.LOGIN);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 via-pink-50 to-yellow-50 dark:from-blue-950 dark:via-pink-950 dark:to-yellow-950">
      <header className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 p-4 shadow-lg relative">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <span className="text-4xl">🦁</span>
            <div>
              <h1 className="text-2xl font-bold text-white drop-shadow-md">Genesis Kids</h1>
              <p className="text-sm text-white/80">Hi, {user?.displayName || 'Little Learner'}!</p>
            </div>
          </div>
          <button onClick={() => setShowMenu(!showMenu)} className="text-white text-3xl hover:scale-110 transition-transform">
            <Icon name="menu" size={36} className="text-white" />
          </button>
        </div>
        {showMenu && (
          <div className="absolute right-4 top-20 bg-surface rounded-2xl shadow-2xl p-4 z-50 min-w-[200px] border border-outline-variant">
            <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-xl text-lg font-medium transition-colors">
              <Icon name="logout" size={24} />
              Logout
            </button>
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto p-4 pb-4">
        <Outlet />
      </main>
    </div>
  );
}
