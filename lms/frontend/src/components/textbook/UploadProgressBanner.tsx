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

  if (tasks.length === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex flex-col gap-1 px-4 py-2 bg-background/95 backdrop-blur-sm border-b shadow-sm">
      <AnimatePresence mode="popLayout">
        {tasks.map((task) => {
          const isDone = task.stage === 'complete';
          const isError = task.stage === 'error';

          return (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, y: -12, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-3 text-sm"
            >
              <Icon
                name={stageIcons[task.stage] || 'hourglass_empty'}
                size={18}
                className={`${stageColor[task.stage] || 'text-muted-foreground'} flex-shrink-0`}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{task.file.name}</span>
                  {!isDone && !isError && (
                    <Badge variant="outline" className="text-[10px] h-5">
                      {task.progress}%
                    </Badge>
                  )}
                  {isDone && (
                    <Badge variant="outline" className="text-[10px] h-5 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
                      Ready
                    </Badge>
                  )}
                  {isError && (
                    <Badge variant="outline" className="text-[10px] h-5 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800">
                      Failed
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {isDone ? 'Finished processing' : isError ? task.error : stageLabel(task.stage)}
                  </span>
                  {!isDone && !isError && (
                    <div className="flex-1 max-w-[120px] h-1.5 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-primary rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${task.progress}%` }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                {isError && (
                  <Button
                    variant="ghost"
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
                  className="h-7 w-7 p-0"
                  onClick={() => useUploadStore.getState().removeTask(task.id)}
                >
                  <Icon name="close" size={14} />
                </Button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
