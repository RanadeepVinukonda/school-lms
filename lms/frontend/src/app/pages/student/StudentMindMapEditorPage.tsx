import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MindMapBuilder } from '@/components/mindmap/MindMapBuilder';
import { mindmapService } from '@/services/mindmapService';
import { ROUTES } from '@/lib/constants';
import type { MindMapNode, MindMapEdge } from '@/types/mindmap';

export default function StudentMindMapEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [nodes, setNodes] = useState<MindMapNode[]>([]);
  const [edges, setEdges] = useState<MindMapEdge[]>([]);
  const [dirty, setDirty] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareInput, setShareInput] = useState('');

  const { data: mindMap, isLoading, error, refetch } = useQuery({
    queryKey: ['mindmap', id],
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
      queryClient.invalidateQueries({ queryKey: ['mindmap', id] });
      queryClient.invalidateQueries({ queryKey: ['student-mindmaps'] });
    },
  });

  const shareMutation = useMutation({
    mutationFn: (shareWithIds: string[]) => mindmapService.share(id!, shareWithIds),
    onSuccess: () => {
      setShareDialogOpen(false);
      setShareInput('');
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

  return (
    <>
      <SEOHead title={title || 'Mind Map Editor'} description="Edit your mind map" />
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
                  <Button variant="ghost" size="icon-sm" onClick={() => navigate(ROUTES.STUDENT_MIND_MAPS)}>
                    <Icon name="arrow_back" size={20} />
                  </Button>
                  <input
                    className="text-headline-sm font-bold bg-transparent border-none outline-none flex-1 min-w-0"
                    value={title}
                    onChange={(e) => { setTitle(e.target.value); setDirty(true); }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1">
                        <Icon name="share" size={16} />
                        Share
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Share Mind Map</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div>
                          <label className="text-sm font-medium mb-1 block">Share with (user IDs or email)</label>
                          <input
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                            placeholder="Enter IDs or emails, comma separated"
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
                          Share
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
                    Save
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
