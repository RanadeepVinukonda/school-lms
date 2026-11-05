import { useNavigate } from 'react-router-dom';
import { LogOut, Settings, User, Globe } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/store/authStore';
import { ROUTES } from '@/lib/constants';
import { hasRole, getPrimaryRole } from '@/lib/roleHelpers';
import { useTranslation } from '@/hooks/useTranslation';

function roleProfileRoute(role: string): string {
  const primaryRole = getPrimaryRole(role);
  switch (primaryRole) {
    case 'admin':
    case 'super_admin':
      return ROUTES.ADMIN_SETTINGS;
    case 'teacher':
      return ROUTES.TEACHER_PROFILE;
    case 'student':
    default:
      return ROUTES.STUDENT_PROFILE;
  }
}

export function UserAvatar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { lang, changeLanguage } = useTranslation();

  if (!user) return null;

  const initials = user.displayName
    ? user.displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email[0].toUpperCase();

  async function handleLogout() {
    await logout();
    navigate(ROUTES.LOGIN);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="cursor-pointer h-9 w-9">
          <AvatarImage src={user.avatar} alt={user.displayName} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span>{user.displayName}</span>
            <span className="text-xs text-muted-foreground font-normal capitalize">{getPrimaryRole(user.role).replace(/_/g, ' ')}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => navigate(roleProfileRoute(user.role))} className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </DropdownMenuItem>
          {(hasRole(user.role, 'admin') || hasRole(user.role, 'super_admin')) && (
            <DropdownMenuItem onClick={() => navigate(ROUTES.ADMIN_SETTINGS)} className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </DropdownMenuItem>
          )}
          {hasRole(user.role, 'teacher') && (
            <DropdownMenuItem onClick={() => navigate(ROUTES.TEACHER_PROFILE)} className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </DropdownMenuItem>
          )}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="gap-2">
              <Globe className="h-4 w-4" />
              <span>Language ({lang.toUpperCase()})</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => changeLanguage('en')}>English</DropdownMenuItem>
                <DropdownMenuItem onClick={() => changeLanguage('te')}>తెలుగు (Telugu)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => changeLanguage('hi')}>हिन्दी (Hindi)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => changeLanguage('ta')}>தமிழ் (Tamil)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => changeLanguage('kn')}>ಕನ್ನಡ (Kannada)</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="gap-2 text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
