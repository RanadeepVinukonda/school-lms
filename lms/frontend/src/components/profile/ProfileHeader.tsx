import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { settingsService } from '@/services/settingsService';
import { useTranslation } from '@/hooks/useTranslation';

const FALLBACK_SCHOOL = 'Genesis International Montessori & STEM School';
const SCHOOL_TAGLINE = 'Learn · Lead · Achieve';

const ROLE_LABELS: Record<string, string> = {
  parent: 'Parent',
  teacher: 'Teacher',
  student: 'Student',
  admin: 'Administrator',
  super_admin: 'Administrator',
};

interface ProfileHeaderProps {
  user: { displayName?: string | null; email?: string | null; role?: string; avatar?: string | null };
  roleLabel: string;
  editHref?: string;
  subtitle?: string;
  badges?: React.ReactNode;
}

export default function ProfileHeader({ user, roleLabel, editHref, subtitle, badges }: ProfileHeaderProps) {
  const { _ } = useTranslation();
  const [showEdit, setShowEdit] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ['profile-school'],
    queryFn: () => settingsService.getSettings(),
    staleTime: 5 * 60 * 1000,
  });

  const schoolName = (settings as any)?.schoolName || FALLBACK_SCHOOL;
  const role = (user.role && ROLE_LABELS[user.role]) || roleLabel;

  return (
    <Card className="border-border/60 rounded-2xl overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-center gap-4 p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
          <img src="/genesis_icon.png" alt={_('School Crest')} className="h-14 w-auto object-contain shrink-0" />
          <div className="min-w-0">
            <h2 className="text-title-md font-bold truncate">{schoolName}</h2>
            <p className="text-warning uppercase text-[10px] tracking-wider font-semibold">{_(SCHOOL_TAGLINE)}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 p-6 border-t border-border/60 flex-wrap">
          <Avatar className="h-16 w-16 shrink-0">
            <AvatarImage src={user.avatar ?? ''} alt={user.displayName ?? ''} />
            <AvatarFallback className="text-lg font-bold bg-primary-container text-primary">{getInitials(user.displayName ?? 'U')}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className="text-title-md font-bold truncate">{user.displayName}</h2>
            <p className="text-body-sm text-muted-foreground truncate">{user.email}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="info" className="text-label-xs">
                <Icon name="badge" size={11} className="mr-1" />{role}
              </Badge>
              {subtitle && <Badge variant="secondary" className="text-label-xs">{subtitle}</Badge>}
              {badges}
            </div>
          </div>
          {editHref && (
            <div className="flex flex-col items-end gap-2">
              <Button variant="ghost" size="icon-sm" onClick={() => setShowEdit((s) => !s)} title={_('Edit Profile')} aria-label={_('Edit Profile')}>
                <Icon name="edit" size={16} />
              </Button>
              {showEdit && (
                <Button variant="outline" size="sm" className="gap-1.5" asChild>
                  <Link to={editHref}><Icon name="edit" size={13} />{_('Edit Profile')}</Link>
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
