import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { prePrimaryService } from '@/services/prePrimaryService';
import { ROUTES } from '@/lib/constants';
import type { K2DashboardData } from '@/types/prePrimary';

const mascotMessages = [
  'Ready to learn something fun today?',
  'Let\'s trace some letters!',
  'Time for a story!',
  'Can you say the sounds?',
  'You are doing great!',
];

const quickActions = [
  { label: 'Learn Letters', icon: 'abc', href: ROUTES.K2_TRACING, color: 'from-red-400 to-red-500', emoji: '✏️' },
  { label: 'Phonics', icon: 'music_note', href: ROUTES.K2_PHONICS, color: 'from-green-400 to-green-500', emoji: '🔊' },
  { label: 'Stories', icon: 'book', href: ROUTES.K2_STORIES, color: 'from-blue-400 to-blue-500', emoji: '📖' },
  { label: 'Flashcards', icon: 'credit_card', href: ROUTES.K2_FLASHCARDS, color: 'from-yellow-400 to-yellow-500', emoji: '🃏' },
  { label: 'Tracing', icon: 'draw', href: ROUTES.K2_TRACING, color: 'from-purple-400 to-purple-500', emoji: '🎨' },
];

export default function K2DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [data, setData] = useState<K2DashboardData | null>(null);
  const [greeting] = useState(() => mascotMessages[Math.floor(Math.random() * mascotMessages.length)]);

  useEffect(() => {
    if (!user) return;
    prePrimaryService.getDashboard(user.id).then(setData).catch(() => {});
  }, [user]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white rounded-3xl p-6 shadow-lg border-2 border-yellow-200 flex items-center gap-4">
        <span className="text-6xl animate-bounce">🦁</span>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Hi, {data?.profile.displayName || 'Little Learner'}!</h2>
          <p className="text-lg text-purple-600 font-medium">{greeting}</p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-yellow-200 to-orange-200 rounded-3xl p-6 shadow-lg border-2 border-yellow-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-4xl">⭐</span>
            <span className="text-3xl font-bold text-yellow-700">{data?.totalStars || 0}</span>
            <span className="text-xl text-yellow-600 font-medium">Stars</span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className={`text-2xl ${i < ((data?.totalStars || 0) % 6) ? '' : 'opacity-30'}`}>⭐</span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {quickActions.map((action) => (
          <button
            key={action.href}
            onClick={() => navigate(action.href)}
            className={`bg-gradient-to-br ${action.color} rounded-3xl p-6 shadow-lg hover:scale-105 transition-transform active:scale-95 text-white flex flex-col items-center gap-3 min-h-[140px]`}
          >
            <span className="text-5xl">{action.emoji}</span>
            <span className="text-xl font-bold drop-shadow-sm">{action.label}</span>
          </button>
        ))}
      </div>

      {data?.progress && Object.keys(data.progress).length > 0 && (
        <div className="bg-white rounded-3xl p-6 shadow-lg border-2 border-purple-200">
          <h3 className="text-xl font-bold text-purple-700 mb-4">Your Progress</h3>
          <div className="space-y-3">
            {Object.entries(data.progress).map(([subject, completed]) => (
              <div key={subject} className="flex items-center gap-3">
                <span className="text-lg capitalize font-medium text-gray-700 w-24">{subject}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(completed, 100)}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-green-600">{completed}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
