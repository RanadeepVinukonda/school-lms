import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUploadStore, stageLabel } from '@/store/uploadStore';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const stageIcons: Record<string, string> = {
  uploading: 'cloud_upload',
  extracting: 'description',
  analyzing: 'psychology',
  generating: 'auto_awesome',
  videos: 'subscriptions',
  questions: 'quiz',
  saving: 'save',
  complete: 'check_circle',
  error: 'error',
};

const stageColor: Record<string, string> = {
  uploading: 'text-blue-500',
  extracting: 'text-violet-500',
  analyzing: 'text-purple-500',
  generating: 'text-pink-500',
  videos: 'text-rose-500',
  questions: 'text-orange-500',
  saving: 'text-amber-500',
  complete: 'text-green-500',
  error: 'text-red-500',
};

export default function UploadProgressBanner() {
  const tasks = useUploadStore((s) => s.tasks);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (tasks.length === 0) return null;

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-0 left-0 right-0 z-50"
      >
        <div className="max-h-[80vh] overflow-y-auto mx-auto max-w-2xl px-4 pt-2">
          {tasks.map((task) => {
            const isDone = task.stage === 'complete';
            const isError = task.stage === 'error';
            const isExpanded = expandedId === task.id;

            return (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className={[
                  'rounded-lg border shadow-lg mb-2 overflow-hidden',
                  isError ? 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/60' : 'bg-background border-border',
                ].join(' ')}
              >
                <button
                  type="button"
                  onClick={() => toggleExpand(task.id)}
                  className="w-full flex items-center gap-3 p-3 text-sm hover:bg-accent/50 transition-colors"
                >
                  <Icon
                    name={stageIcons[task.stage] || 'hourglass_empty'}
                    size={20}
                    className={`${stageColor[task.stage] || 'text-muted-foreground'} flex-shrink-0`}
                  />

                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{task.file.name}</span>
                      {isDone && (
                        <Badge variant="outline" className="text-[10px] h-5 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 shrink-0">
                          Ready
                        </Badge>
                      )}
                      {isError && (
                        <Badge variant="outline" className="text-[10px] h-5 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 shrink-0">
                          Failed
                        </Badge>
                      )}
                      {!isDone && !isError && (
                        <Badge variant="outline" className="text-[10px] h-5 shrink-0">
                          {task.progress}%
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {isDone ? 'Finished processing' : isError ? task.error : stageLabel(task.stage)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!isDone && !isError && task.progress > 0 && (
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-primary rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${task.progress}%` }}
                          transition={{ duration: 0.4, ease: 'easeOut' }}
                        />
                      </div>
                    )}
                    <Icon name={isExpanded ? 'expand_less' : 'expand_more'} size={18} className="text-muted-foreground" />
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-border px-3 py-2"
                    >
                      {/* Error detail */}
                      {isError && task.error && (
                        <div className="mb-2 p-2 rounded bg-red-100/50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-200 font-mono whitespace-pre-wrap break-all">
                          {task.error}
                        </div>
                      )}

                      {/* Log entries */}
                      {task.log.length > 0 && (
                        <div className="max-h-40 overflow-y-auto space-y-0.5">
                          {task.log.map((entry, i) => (
                            <div key={i} className="text-xs text-muted-foreground font-mono leading-relaxed flex gap-2">
                              <span className="text-[10px] text-muted-foreground/50 shrink-0 mt-px">
                                {String(i + 1).padStart(2, '0')}
                              </span>
                              <span>{entry}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {task.log.length === 0 && !isError && (
                        <div className="text-xs text-muted-foreground italic">Waiting for progress updates...</div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-2 pt-1 border-t border-border/50">
                        {isError && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => useUploadStore.getState().retryTask(task.id)}
                          >
                            <Icon name="refresh" size={14} className="mr-1" />
                            Retry
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs ml-auto"
                          onClick={() => useUploadStore.getState().removeTask(task.id)}
                        >
                          <Icon name="close" size={14} className="mr-1" />
                          Dismiss
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
