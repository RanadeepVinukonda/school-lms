import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { scrollReveal, staggerContainer, cardStackReveal } from '@/lib/motion';
import { mindmapService } from '@/services/mindmapService';
import { ROUTES } from '@/lib/constants';

export default function StudentMindMapsPage() {
  const { _ } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const { data: myMaps, isLoading, error, refetch } = useQuery({
    queryKey: ['student-mindmaps'],
    queryFn: () => mindmapService.getUserMindMaps(),
  });

  const { data: sharedMaps } = useQuery({
    queryKey: ['shared-mindmaps'],
    queryFn: () => mindmapService.getSharedMindMaps(),
  });

  const createMutation = useMutation({
    mutationFn: (data: { title: string; description?: string }) => mindmapService.create(data.title, data.description),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['student-mindmaps'] });
      setShowCreate(false);
      setNewTitle('');
      setNewDesc('');
      navigate(ROUTES.STUDENT_MIND_MAP_EDITOR(data.id));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => mindmapService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-mindmaps'] });
    },
  });

  const filteredMaps = (myMaps || []).filter(
    (m) => m.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <SEOHead title={_('Mind Maps')} description={_('Create and manage your mind maps')} />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="sm:p-6 p-4 max-w-6xl mx-auto pb-32 space-y-8"
      >
        <motion.div variants={scrollReveal} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-headline-sm md:text-headline-md font-bold tracking-tight">{_('Mind Maps')}</h1>
              <p className="text-body-md text-muted-foreground">{_('Create revision maps and share them with classmates')}</p>
            </div>
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
              <DialogTrigger asChild>
                <Button className="gap-1">
                  <Icon name="add" size={16} />
                  {_('New Mind Map')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{_('Create New Mind Map')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">{_('Title')}</label>
                    <input
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder={_('Enter title...')}
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">{_('Description (optional)')}</label>
                    <textarea
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder={_('Enter description...')}
                      rows={3}
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => createMutation.mutate({ title: newTitle, description: newDesc })}
                    disabled={!newTitle.trim() || createMutation.isPending}
                    loading={createMutation.isPending}
                  >
                    {_('Create')}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

        <div className="relative max-w-md">
          <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
            placeholder={_('Search mind maps...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <DataFetchWrapper data={myMaps} isLoading={isLoading} error={error as Error | null} onRetry={() => refetch()} loadingType="card">
          {(data) => data && data.length > 0 ? (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredMaps.map((map, idx) => (
                <motion.div key={map.id} variants={cardStackReveal} custom={idx}>
                  <Link to={ROUTES.STUDENT_MIND_MAP_EDITOR(map.id)} className="block h-full">
                    <Card className="border-border/60 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 h-full flex flex-col justify-between group">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <Icon name="psychology" size={20} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-sm truncate group-hover:text-primary transition-colors">{map.title}</h3>
                            {map.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{map.description}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                      <div className="px-6 py-3 bg-muted/20 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{map.nodes?.length || 0} nodes</span>
                        <span>{new Date(map.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <Card className="border-border/60">
              <CardContent className="p-12 text-center space-y-4">
                <Icon name="psychology" size={48} className="text-muted-foreground mx-auto" />
                <div>
                  <p className="text-title-md font-bold">{_('No mind maps yet')}</p>
                  <p className="text-body-sm text-muted-foreground">{_('Create your first mind map to start organizing your revision')}</p>
                </div>
                <Button onClick={() => setShowCreate(true)} className="gap-1">
                  <Icon name="add" size={16} />
                  {_('Create Mind Map')}
                </Button>
              </CardContent>
            </Card>
          )}
        </DataFetchWrapper>

        {sharedMaps && sharedMaps.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-title-md font-bold tracking-tight">{_('Shared with Me')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {sharedMaps.map((map) => (
                <Link key={map.id} to={ROUTES.STUDENT_MIND_MAP_EDITOR(map.id)} className="block h-full">
                  <Card className="border-border/60 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 h-full flex flex-col justify-between group border-dashed">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary shrink-0">
                          <Icon name="share" size={20} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-sm truncate group-hover:text-primary transition-colors">{map.title}</h3>
                          {map.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{map.description}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                    <div className="px-6 py-3 bg-muted/20 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{map.nodes?.length || 0} nodes</span>
                      <span>{new Date(map.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </>
  );
}
