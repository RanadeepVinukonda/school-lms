import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/hooks/useTranslation';

interface ReleaseRepublishModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'release' | 'republish';
  assessmentType: 'exam' | 'quiz' | 'assignment';
  title: string;
  onConfirm: (showResults: boolean) => void;
  loading?: boolean;
}

export function ReleaseRepublishModal({
  open,
  onOpenChange,
  type,
  assessmentType,
  title,
  onConfirm,
  loading = false,
}: ReleaseRepublishModalProps) {
  const { _ } = useTranslation();

  const actionLabel = type === 'republish' ? _('Republish') : _('Release');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const formData = new FormData(form);
            const showResults = formData.get('gradesVisibility') === 'true';
            onConfirm(showResults);
          }}
        >
          <DialogHeader>
            <DialogTitle>{actionLabel} {_('Assessment')}</DialogTitle>
            <DialogDescription>
              {type === 'republish'
                ? _('Do you want students to see grades/results during this republished attempt?')
                : _('Do you want students to see grades/results after submission?')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm font-medium mb-3">{title}</p>
            <RadioGroup defaultValue="false" name="gradesVisibility">
              <div className="flex items-center space-x-2 mb-2">
                <RadioGroupItem value="true" id="grades-enable" />
                <Label htmlFor="grades-enable">{_('Enable Grades Visibility')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false" id="grades-disable" />
                <Label htmlFor="grades-disable">{_('Disable Grades Visibility')}</Label>
              </div>
            </RadioGroup>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading} type="button">
              {_('Cancel')}
            </Button>
            <Button loading={loading} type="submit">
              {actionLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
