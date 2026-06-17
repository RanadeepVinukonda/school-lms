import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { virtualLabsService } from '@/services/virtualLabsService';
import { useAuthStore } from '@/store/authStore';
import type { VirtualLab } from '@/types/virtualLab';
import { ROUTES } from '@/lib/constants';
import { Icon } from '@/components/ui/Icon';

const SUBJECT_ICONS: Record<string, string> = {
  physics: 'bolt',
  chemistry: 'science',
  biology: 'biotech',
};

const SUBJECT_COLORS: Record<string, string> = {
  physics: 'bg-blue-50 border-blue-200 text-blue-700',
  chemistry: 'bg-green-50 border-green-200 text-green-700',
  biology: 'bg-purple-50 border-purple-200 text-purple-700',
};

const DIFFICULTY_BADGES: Record<string, string> = {
  beginner: 'bg-green-100 text-green-700',
  intermediate: 'bg-amber-100 text-amber-700',
  advanced: 'bg-red-100 text-red-700',
};

export default function StudentVirtualLabsPage() {
  const [labs, setLabs] = useState<VirtualLab[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    setLoading(true);
    virtualLabsService.getAll()
      .then(setLabs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const grouped = labs.reduce<Record<string, VirtualLab[]>>((acc, lab) => {
    const key = lab.subject || 'other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(lab);
    return acc;
  }, {});

  const filteredLabs = filter === 'all' ? labs : labs.filter((l) => l.subject === filter);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Virtual Labs</h1>
          <p className="text-on-surface-variant mt-1">Interactive science simulations</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', 'physics', 'chemistry', 'biology'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
              filter === s
                ? 'bg-primary text-primary-foreground'
                : 'bg-surface border border-outline-variant text-on-surface-variant hover:bg-surface-variant'
            }`}
          >
            {s === 'all' ? 'All' : s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-xl bg-surface-variant animate-pulse" />
          ))}
        </div>
      ) : filteredLabs.length === 0 ? (
        <div className="text-center py-16">
          <Icon name="science" size={48} className="text-on-surface-variant/40 mx-auto" />
          <p className="text-on-surface-variant mt-4">No labs available yet</p>
        </div>
      ) : (
        <div className="space-y-8">
          {filter === 'all'
            ? Object.entries(grouped).map(([subject, subjectLabs]) => (
                <section key={subject}>
                  <h2 className="text-lg font-semibold capitalize mb-3 flex items-center gap-2 text-on-surface">
                    <Icon name={SUBJECT_ICONS[subject] || 'science'} size={20} />
                    {subject}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {subjectLabs.map((lab) => (
                      <LabCard key={lab.id} lab={lab} />
                    ))}
                  </div>
                </section>
              ))
            : <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredLabs.map((lab) => <LabCard key={lab.id} lab={lab} />)}
              </div>
          }
        </div>
      )}
    </div>
  );
}

function LabCard({ lab }: { lab: VirtualLab }) {
  return (
    <Link
      to={ROUTES.STUDENT_LAB_DETAIL(lab.id)}
      className="block p-5 rounded-xl border border-outline-variant bg-surface hover:shadow-md hover:border-primary/30 transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`px-3 py-1 rounded-lg text-xs font-medium capitalize border ${SUBJECT_COLORS[lab.subject] || ''}`}>
          <Icon name={SUBJECT_ICONS[lab.subject] || 'science'} size={14} className="inline mr-1" />
          {lab.subject}
        </div>
        <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${DIFFICULTY_BADGES[lab.difficulty] || ''}`}>
          {lab.difficulty}
        </span>
      </div>
      <h3 className="font-semibold text-on-surface group-hover:text-primary transition-colors">{lab.title}</h3>
      <p className="text-label-sm text-on-surface-variant mt-1 line-clamp-2">{lab.description}</p>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-outline-variant/50">
        <span className="text-label-xs text-on-surface-variant capitalize">{lab.type}</span>
        {lab.completed !== undefined && (
          <span className={`text-label-xs font-medium ${lab.completed ? 'text-green-600' : 'text-amber-600'}`}>
            {lab.completed ? 'Completed' : 'Not started'}
          </span>
        )}
      </div>
    </Link>
  );
}
