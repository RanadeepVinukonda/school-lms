import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '@/hooks/useTranslation';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/input';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';

export default function TeacherPreviousYearQPage() {
  const { _ } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['pyq', yearFilter, typeFilter],
    queryFn: () => api.get('/question-bank', { params: { isPreviousYear: true, year: yearFilter || undefined, type: typeFilter || undefined } }).then((r) => r.data.data),
  });

  const items: any[] = (data?.items || []).filter((q: any) => !search || q.text.toLowerCase().includes(search.toLowerCase()));
  const years = [...new Set((data?.items || []).map((q: any) => q.year).filter(Boolean))].sort() as string[];
  const typeColors: Record<string, string> = { multiple_choice: 'bg-blue-500', true_false: 'bg-purple-500', short_answer: 'bg-amber-500', fill_blank: 'bg-emerald-500', matching: 'bg-rose-500', essay: 'bg-sky-500' };
  const diffColors: Record<string, string> = { easy: 'bg-green-100 text-green-800', medium: 'bg-yellow-100 text-yellow-800', hard: 'bg-red-100 text-red-800' };

  return (
    <>
      <SEOHead title={_('Previous Year Questions')} description={_('Browse and use previous year question papers')} canonical="/teacher/pyq" />
      <div



        className="sm:p-6 p-4 max-w-6xl mx-auto pb-32 space-y-16"
      >
        <div>
          <h1 className="text-headline-sm">{_('Previous Year Questions')}</h1>
          <p className="text-body-md text-muted-foreground">{_('Browse archive of previous year exam questions')}</p>
        </div>

        <div>
          <div className="flex flex-wrap gap-2">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={_('Search PYQs...')} className="max-w-xs" />
            <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-background text-foreground">
              <option value="">{_('All Years')}</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-background text-foreground">
              <option value="">{_('All Types')}</option>
              <option value="multiple_choice">{_('Multiple Choice')}</option>
              <option value="true_false">{_('True/False')}</option>
              <option value="short_answer">{_('Short Answer')}</option>
              <option value="fill_blank">{_('Fill Blank')}</option>
              <option value="matching">{_('Matching')}</option>
              <option value="essay">{_('Essay')}</option>
            </select>
          </div>
        </div>

        <div>
          <DataFetchWrapper data={data} isLoading={isLoading} error={error} onRetry={() => refetch()} loadingType="list">
            {() => (
              <div className="space-y-2">
                {items.length === 0 ? (
                  <Card className="border-border/60">
                    <CardContent className="p-8 text-center text-muted-foreground">
                      <Icon name="archive" size={48} className="mx-auto mb-3 opacity-40" />
                      <p className="text-body-md">{_('No previous year questions found. Tag questions as PYQ in the Question Bank.')}</p>
                    </CardContent>
                  </Card>
                ) : (
                  items.map((q: any) => (
                    <Card key={q.id} className="border-border/60">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className={`text-label-xs ${typeColors[q.type] || 'bg-gray-500'} text-white`}>{q.type.replace('_', ' ')}</Badge>
                              <Badge variant="outline" className={`text-label-xs ${diffColors[q.difficulty] || ''}`}>{q.difficulty}</Badge>
                              {q.year && <Badge variant="secondary" className="text-label-xs">{q.year}</Badge>}
                            </div>
                            <p className="text-title-sm font-medium">{q.text}</p>
                            <p className="text-label-xs text-muted-foreground mt-1">{q.points} {_('pt')}{q.points !== 1 ? _('s') : ''}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </DataFetchWrapper>
        </div>
      </div>
    </>
  );
}
