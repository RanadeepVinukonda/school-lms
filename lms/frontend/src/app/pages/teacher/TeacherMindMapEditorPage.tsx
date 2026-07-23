import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@/hooks/useTranslation';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MindMapBuilder } from '@/components/mindmap/MindMapBuilder';
import { mindmapService } from '@/services/mindmapService';
import { ROUTES } from '@/lib/constants';
import type { MindMapNode, MindMapEdge } from '@/types/mindmap';

export default function TeacherMindMapEditorPage() {
  const { _ } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [nodes, setNodes] = useState<MindMapNode[]>([]);
  const [edges, setEdges] = useState<MindMapEdge[]>([]);
  const [dirty, setDirty] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareInput, setShareInput] = useState('');
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pinNodeId, setPinNodeId] = useState('');
  const [pinResourceId, setPinResourceId] = useState('');
  const [pinResourceType, setPinResourceType] = useState<'lesson' | 'concept' | 'video'>('concept');

  const { data: mindMap, isLoading, error, refetch } = useQuery({
    queryKey: ['teacher-mindmap', id],
    enabled: !!id,
    queryFn: () => mindmapService.getById(id!),
  });

  useEffect(() => {
    if (mindMap) {
      setTitle(mindMap.title);
      setNodes(mindMap.nodes || []);
      setEdges(mindMap.edges || []);
    }
  }, [mindMap]);

  const saveMutation = useMutation({
    mutationFn: () => mindmapService.update(id!, { title, nodes, edges }),
    onSuccess: () => {
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ['teacher-mindmap', id] });
      queryClient.invalidateQueries({ queryKey: ['teacher-mindmaps'] });
    },
  });

  const shareMutation = useMutation({
    mutationFn: (shareWithIds: string[]) => mindmapService.share(id!, shareWithIds),
    onSuccess: () => {
      setShareDialogOpen(false);
      setShareInput('');
    },
  });

  const pinMutation = useMutation({
    mutationFn: () => mindmapService.pinResource(id!, pinNodeId, pinResourceId, pinResourceType),
    onSuccess: () => {
      setPinDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['teacher-mindmap', id] });
    },
  });

  const handleChange = (newNodes: MindMapNode[], newEdges: MindMapEdge[]) => {
    setNodes(newNodes);
    setEdges(newEdges);
    setDirty(true);
  };

  const handleSave = () => {
    saveMutation.mutate();
  };

  const handleShare = () => {
    const ids = shareInput.split(',').map((s) => s.trim()).filter(Boolean);
    if (ids.length > 0) {
      shareMutation.mutate(ids);
    }
  };

  const handlePin = () => {
    pinMutation.mutate();
  };

  return (
    <>
      <SEOHead title={title || _('Mind Map Editor')} description={_('Edit your mind map')} />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="sm:p-6 p-4 max-w-6xl mx-auto pb-32 space-y-4"
      >
        <DataFetchWrapper data={mindMap} isLoading={isLoading} error={error as Error | null} onRetry={() => refetch()}>
          {() => (
            <>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Button variant="ghost" size="icon-sm" onClick={() => navigate(ROUTES.TEACHER_MIND_MAPS)}>
                    <Icon name="arrow_back" size={20} />
                  </Button>
                  <input
                    className="text-headline-sm font-bold text-foreground bg-transparent border-none outline-none flex-1 min-w-0"
                    value={title}
                    onChange={(e) => { setTitle(e.target.value); setDirty(true); }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1">
                        <Icon name="push_pin" size={16} />
                          {_('Pin Resource')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{_('Pin Resource to Node')}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div>
                          <label className="text-sm font-medium mb-1 block">{_('Node ID')}</label>
                          <select
                            className="w-full px-3 py-2 border rounded-lg text-sm bg-background text-foreground"
                            value={pinNodeId}
                            onChange={(e) => setPinNodeId(e.target.value)}
                          >
                            <option value="">{_('Select a node')}</option>
                            {nodes.map((n) => (
                              <option key={n.id} value={n.id}>{n.label} ({n.id.slice(0, 8)})</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">{_('Resource ID')}</label>
                          <input
                            className="w-full px-3 py-2 border rounded-lg text-sm bg-background text-foreground"
                            placeholder={_('Enter resource ID...')}
                            value={pinResourceId}
                            onChange={(e) => setPinResourceId(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">{_('Resource Type')}</label>
                          <select
                            className="w-full px-3 py-2 border rounded-lg text-sm bg-background text-foreground"
                            value={pinResourceType}
                            onChange={(e) => setPinResourceType(e.target.value as any)}
                          >
                            <option value="concept">{_('Concept')}</option>
                            <option value="lesson">{_('Lesson')}</option>
                            <option value="video">{_('Video')}</option>
                          </select>
                        </div>
                        <Button
                          className="w-full"
                          onClick={handlePin}
                          disabled={!pinNodeId || !pinResourceId || pinMutation.isPending}
                          loading={pinMutation.isPending}
                        >
                        {_('Pin Resource')}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1">
                        <Icon name="share" size={16} />
                        {_('Share')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{_('Share Mind Map')}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div>
                          <label className="text-sm font-medium mb-1 block">{_('Share with (user IDs)')}</label>
                          <input
                            className="w-full px-3 py-2 border rounded-lg text-sm bg-background text-foreground"
                            placeholder={_('Enter IDs, comma separated')}
                            value={shareInput}
                            onChange={(e) => setShareInput(e.target.value)}
                          />
                        </div>
                        <Button
                          className="w-full"
                          onClick={handleShare}
                          disabled={!shareInput.trim() || shareMutation.isPending}
                          loading={shareMutation.isPending}
                        >
                          {_('Share')}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button
                    size="sm"
                    className="gap-1"
                    onClick={handleSave}
                    disabled={!dirty || saveMutation.isPending}
                    loading={saveMutation.isPending}
                  >
                    <Icon name="save" size={16} />
                    {_('Save')}
                  </Button>
                </div>
              </div>
              <MindMapBuilder
                nodes={nodes}
                edges={edges}
                onChange={handleChange}
              />
            </>
          )}
        </DataFetchWrapper>
      </motion.div>
    </>
  );
}
