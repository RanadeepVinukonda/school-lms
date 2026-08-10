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

const FALLBACK_SCHOOL = 'Genesis';
const SCHOOL_TAGLINE = 'Learn · Lead · Achieve';

const ROLE_LABELS: Record<string, string> = {
  parent: 'Parent',
  teacher: 'Teacher',
  student: 'Student',
  admin: 'Administrator',
  super_admin: 'Super Administrator',
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
      {/* School crest banner */}
      <div className="flex items-center gap-3 px-6 py-5 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-border/60">
        <img src="/genesis_icon.png" alt={_('School Crest')} className="h-12 w-12 object-contain shrink-0" />
        <div className="min-w-0">
          <h2 className="text-title-md font-bold leading-snug break-words">{schoolName}</h2>
          <p className="text-warning uppercase text-[10px] tracking-wider font-semibold mt-0.5">{_(SCHOOL_TAGLINE)}</p>
        </div>
      </div>

      {/* User identity */}
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16 shrink-0">
            <AvatarImage src={user.avatar ?? user.photoURL ?? ''} alt={user.displayName ?? ''} />
            <AvatarFallback className="text-lg font-bold bg-primary-container text-primary">{getInitials(user.displayName ?? 'U')}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 pt-0.5">
            <h2 className="text-title-md font-bold break-words leading-snug">{user.displayName}</h2>
            <p className="text-body-sm text-muted-foreground break-all mt-0.5">{user.email}</p>
            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
              <Badge variant="info" className="text-label-xs gap-1 whitespace-nowrap">
                <Icon name="badge" size={11} />{role}
              </Badge>
              {subtitle && <Badge variant="outline" className="text-label-xs whitespace-nowrap">{subtitle}</Badge>}
              {badges}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-between gap-3 flex-wrap">
          {editHref && (
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => navigate(editHref)}>
              <Icon name="edit" size={14} />{_('Edit Profile')}
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-1.5 text-error" onClick={handleLogout}>
            <Icon name="logout" size={14} />{_('Logout')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}