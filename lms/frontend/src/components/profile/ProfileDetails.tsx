import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';

interface ProfileDetailsProps {
  user: {
    email?: string | null;
    role?: string;
    phone?: string;
    address?: string;
    bio?: string;
    dateOfBirth?: string;
  };
  includeDob?: boolean;
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value?: string | null }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <Icon name={icon} size={16} className="text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-label-xs text-muted-foreground">{label}</p>
        <p className="text-title-sm font-medium break-words">{value || '—'}</p>
      </div>
    </div>
  );
}

export default function ProfileDetails({ user, includeDob }: ProfileDetailsProps) {
  const { _ } = useTranslation();
  const role = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1).replace('_', ' ') : '—';

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-title-sm flex items-center gap-2">
          <Icon name="info" size={18} className="text-muted-foreground" />
          {_('Account Information')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DetailRow icon="mail" label={_('Email')} value={user.email} />
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Icon name="badge" size={16} className="text-muted-foreground" />
            </div>
            <div>
              <p className="text-label-xs text-muted-foreground">{_('Role')}</p>
              <Badge variant="secondary" className="text-label-xs mt-0.5">{role}</Badge>
            </div>
          </div>
          <DetailRow icon="phone" label={_('Phone')} value={user.phone} />
          {includeDob && <DetailRow icon="cake" label={_('Date of Birth')} value={user.dateOfBirth ? user.dateOfBirth.slice(0, 10) : undefined} />}
          <DetailRow icon="home" label={_('Address')} value={user.address} />
          <div className="sm:col-span-2">
            <DetailRow icon="description" label={_('Bio')} value={user.bio} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
