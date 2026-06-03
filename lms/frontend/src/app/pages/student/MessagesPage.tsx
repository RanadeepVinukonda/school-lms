import { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  MessageCircle, Send, Search, ArrowLeft, Paperclip,
  Loader2, AlertCircle, Users, ChevronRight
} from 'lucide-react';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { cn, formatDate, getInitials } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

const messageSchema = z.object({ content: z.string().min(1, 'Message cannot be empty') });

interface Conversation {
  id: string;
  name: string;
  avatar?: string;
  lastMessage: string;
  timestamp: Date;
  unread: number;
  online: boolean;
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  timestamp: Date;
  read: boolean;
}

const conversations: Conversation[] = [
  { id: 'c1', name: 'Mrs. Johnson', lastMessage: 'Great work on the assignment!', timestamp: new Date(Date.now() - 3600000), unread: 2, online: true },
  { id: 'c2', name: 'Mr. Chen', lastMessage: 'Don\'t forget the history essay due Friday.', timestamp: new Date(Date.now() - 86400000), unread: 0, online: false },
  { id: 'c3', name: 'Dr. Patel', lastMessage: 'Lab report feedback is posted.', timestamp: new Date(Date.now() - 172800000), unread: 0, online: true },
  { id: 'c4', name: 'Sarah (Study Group)', lastMessage: 'Can we meet tomorrow at 3?', timestamp: new Date(Date.now() - 259200000), unread: 0, online: false },
];

const sampleMessages: Message[] = [
  { id: 'm1', content: 'Hi Mrs. Johnson, I had a question about the homework.', senderId: 'me', timestamp: new Date(Date.now() - 7200000), read: true },
  { id: 'm2', content: 'Sure, what do you need help with?', senderId: 'them', timestamp: new Date(Date.now() - 5400000), read: true },
  { id: 'm3', content: 'I\'m stuck on problem 5 from Chapter 3.', senderId: 'me', timestamp: new Date(Date.now() - 3600000), read: true },
  { id: 'm4', content: 'Great work on the assignment!', senderId: 'them', timestamp: new Date(Date.now() - 3600000), read: false },
];

function MessagesSkeleton() {
  return (
    <div className="p-4 space-y-3">
      <Skeleton className="h-8 w-40" />
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
    </div>
  );
}

export default function MessagesPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(messageSchema),
  });

  const { isLoading, isError, refetch } = useQuery({
    queryKey: ['messages'],
    queryFn: async () => { await new Promise(r => setTimeout(r, 500)); return null; },
  });

  const filtered = conversations.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  const onSubmit = () => {
    toast.success('Message sent');
    reset();
  };

  if (isLoading) return <MessagesSkeleton />;

  if (isError) {
    return (
      <div className="p-4">
        <Card><CardContent className="flex flex-col items-center gap-4 py-12">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="font-medium">Failed to load messages</p>
          <Button variant="outline" onClick={() => refetch()}>Try Again</Button>
        </CardContent></Card>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-4">
        <Card><CardContent className="flex flex-col items-center gap-4 py-12">
          <MessageCircle className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium">No messages yet</p>
          <p className="text-sm text-muted-foreground">Start a conversation with your teachers or classmates.</p>
        </CardContent></Card>
      </div>
    );
  }

  if (selected) {
    const conv = conversations.find(c => c.id === selected);
    return (
      <div className="flex flex-col h-[calc(100vh-3.5rem)]">
        <div className="flex items-center gap-2 p-3 border-b">
          <Button variant="ghost" size="icon" onClick={() => setSelected(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Avatar className="h-8 w-8"><AvatarFallback>{conv ? getInitials(conv.name) : '?'}</AvatarFallback></Avatar>
          <div>
            <p className="text-sm font-medium">{conv?.name}</p>
            <p className="text-xs text-muted-foreground">{conv?.online ? 'Online' : 'Offline'}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {sampleMessages.map(m => (
            <div key={m.id} className={cn('flex', m.senderId === 'me' ? 'justify-end' : 'justify-start')}>
              <div className={cn(
                'max-w-[80%] rounded-2xl px-4 py-2 text-sm',
                m.senderId === 'me' ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm',
              )}>
                <p>{m.content}</p>
                <p className={cn('text-xs mt-1', m.senderId === 'me' ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                  {formatDate(m.timestamp)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-3 border-t flex gap-2">
          <Textarea placeholder="Type a message..." className="min-h-[40px] max-h-[120px] flex-1" rows={1} {...register('content')} />
          <Button type="submit" size="icon" className="flex-shrink-0 self-end">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    );
  }

  return (
    <>
      <SEOHead title="Messages" description="Your messages and conversations" canonical="/messages" />
      <div className="p-4 max-w-4xl mx-auto pb-20">
      <h1 className="text-2xl font-bold mb-4">Messages</h1>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search conversations..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="space-y-1">
        {filtered.map(c => (
          <button key={c.id} onClick={() => setSelected(c.id)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-colors text-left">
            <div className="relative">
              <Avatar className="h-11 w-11"><AvatarFallback>{getInitials(c.name)}</AvatarFallback></Avatar>
              {c.online && <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium truncate">{c.name}</p>
                <span className="text-xs text-muted-foreground flex-shrink-0">{formatDate(c.timestamp)}</span>
              </div>
              <p className="text-xs text-muted-foreground truncate">{c.lastMessage}</p>
            </div>
            {c.unread > 0 && (
              <Badge className="h-5 min-w-[20px] flex items-center justify-center text-xs">{c.unread}</Badge>
            )}
          </button>
        ))}
      </div>
    </div>
    </>
  );
}
