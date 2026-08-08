import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { settingsService } from '@/services/settingsService';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore } from '@/store/authStore';
import { ROUTES } from '@/lib/constants';

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
  user: { displayName?: string | null; email?: string | null; role?: string; avatar?: string | null; photoURL?: string | null };
  roleLabel: string;
  editHref?: string;
  subtitle?: string;
  badges?: React.ReactNode;
}

export default function ProfileHeader({ user, roleLabel, editHref, subtitle, badges }: ProfileHeaderProps) {
  const { _ } = useTranslation();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  const { data: settings } = useQuery({
    queryKey: ['profile-school'],
    queryFn: () => settingsService.getSettings(),
    staleTime: 5 * 60 * 1000,
  });

  const schoolName = (settings as any)?.schoolName || FALLBACK_SCHOOL;
  const role = (user.role && ROLE_LABELS[user.role]) || roleLabel;

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.LOGIN);
  };

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
            <AvatarImage src={user.avatar ?? user.photoURL ?? ''} alt={user.displayName ?? ''} />
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
              <Button variant="ghost" size="icon-sm" onClick={() => navigate(editHref)} title={_('Edit Profile')} aria-label={_('Edit Profile')}>
                <Icon name="edit" size={16} />
              </Button>
            </div>
          )}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleLogout} title={_('Logout')}>
            <Icon name="logout" size={13} />{_('Logout')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
