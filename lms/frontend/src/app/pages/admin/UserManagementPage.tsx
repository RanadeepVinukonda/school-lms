import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Users, Search, Plus, Edit, Trash2, AlertCircle,
  ChevronLeft, ChevronRight, Loader2, Shield, Ban
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { OptionsSelect } from '@/components/ui/select';
import { cn, getInitials } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  status: 'active' | 'disabled';
  lastActive: string;
}

const users: UserItem[] = [
  { id: 'u1', name: 'Alex M.', email: 'alex@school.edu', role: 'student', status: 'active', lastActive: '2h ago' },
  { id: 'u2', name: 'Mrs. Johnson', email: 'johnson@school.edu', role: 'teacher', status: 'active', lastActive: '1h ago' },
  { id: 'u3', name: 'Sarah K.', email: 'sarah@school.edu', role: 'student', status: 'active', lastActive: '5h ago' },
  { id: 'u4', name: 'James W.', email: 'james@school.edu', role: 'student', status: 'disabled', lastActive: '1w ago' },
  { id: 'u5', name: 'Admin User', email: 'admin@school.edu', role: 'admin', status: 'active', lastActive: '30m ago' },
];

const roleOptions = [
  { value: 'student', label: 'Student' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'admin', label: 'Admin' },
];

const roleColors = { student: 'bg-blue-500/15 text-blue-600 dark:text-blue-400', teacher: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400', admin: 'bg-violet-500/15 text-violet-600 dark:text-violet-400' };

export default function UserManagementPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const perPage = 5;

  const { isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => { await new Promise(r => setTimeout(r, 500)); return null; },
  });

  if (isLoading) return <div className="p-4 space-y-4">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;

  if (isError) {
    return (
      <div className="p-4">
        <Card><CardContent className="flex flex-col items-center gap-4 py-12">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="font-medium">Failed to load users</p>
          <Button variant="outline" onClick={() => refetch()}>Try Again</Button>
        </CardContent></Card>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="p-4">
        <Card><CardContent className="flex flex-col items-center gap-4 py-12">
          <Users className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium">No users found</p>
          <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" />Create User</Button>
        </CardContent></Card>
      </div>
    );
  }

  const filtered = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <>
      <SEOHead title="User Management" description="Manage system users" canonical="/admin/users" />
      <div className="p-4 max-w-5xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-sm text-muted-foreground">{users.length} total users</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" />Add User</Button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search users..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <OptionsSelect
          options={[{ value: 'all', label: 'All Roles' }, ...roleOptions]}
          value={roleFilter}
          onChange={(v: string) => { setRoleFilter(v); setPage(1); }}
          className="w-32"
        />
      </div>

      <Card>
        <CardContent className="p-0 divide-y">
          {paged.map(u => (
            <div key={u.id} className="flex items-center gap-3 p-3 hover:bg-accent transition-colors">
              <Avatar className="h-9 w-9"><AvatarFallback className="text-xs">{getInitials(u.name)}</AvatarFallback></Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{u.name}</p>
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', roleColors[u.role])}>{u.role}</span>
                  {u.status === 'disabled' && <Ban className="h-3.5 w-3.5 text-destructive" />}
                </div>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
              </div>
              <div className="text-right text-xs text-muted-foreground flex-shrink-0">
                <p>{u.lastActive}</p>
                <Badge variant={u.status === 'active' ? 'success' : 'secondary'} className="text-[10px]">{u.status}</Badge>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-3.5 w-3.5" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {Array.from({ length: totalPages }, (_, i) => (
            <Button key={i} variant={page === i + 1 ? 'default' : 'outline'} size="icon" onClick={() => setPage(i + 1)}>
              {i + 1}
            </Button>
          ))}
          <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>Add a new user to the system</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" placeholder="john@school.edu" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <OptionsSelect options={roleOptions} placeholder="Select role" />
            </div>
            <Button className="w-full" onClick={() => { toast.success('User created'); setShowCreate(false); }}>
              <Loader2 className="h-4 w-4 mr-2" />Create User
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </>
  );
}
