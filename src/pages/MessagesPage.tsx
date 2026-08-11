import { useEffect, useState } from 'react';
import { useApp } from '@/store';
import { PageHeader } from '@/components/AppShell';
import { Card, Avatar, EmptyState, Badge } from '@/components/ui';
import { ArrowLeft, MessageSquare, Send, Users, ListChecks, Gavel, FileText, ClipboardList, Circle } from 'lucide-react';

export function MessagesPage() {
  const { conversations, currentUserId, sendMessage, navigate, spaces, profiles } = useApp();
  const [activeId, setActiveId] = useState<string>(conversations[0]?.id ?? '');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);

  const active = conversations.find((c) => c.id === activeId);
  const activeSpace = active?.spaceId ? spaces.find((s) => s.id === active.spaceId) : undefined;

  useEffect(() => {
    if (!activeId && conversations[0]) setActiveId(conversations[0].id);
  }, [activeId, conversations]);

  return (
    <div>
      <PageHeader title="Messages" subtitle="Conversations tied to projects, tasks, and decisions — not generic chat." />
      <div className="grid lg:grid-cols-3 gap-4" style={{ minHeight: 500 }}>
        {/* List */}
        <Card className={`${mobileThreadOpen ? 'hidden lg:block' : ''} p-2 lg:col-span-1`}>
          {conversations.length === 0 ? <EmptyState icon={<MessageSquare className="w-5 h-5" />} title="No conversations" description="Start a conversation from a profile or space." /> : (
            <div className="space-y-0.5">
              {conversations.map((c) => {
                const last = c.messages[c.messages.length - 1];
                const others = c.participantIds.filter((id) => id !== currentUserId).map((id) => profiles.find((profile) => profile.id === id)).filter(Boolean);
                const isSpace = c.type === 'space';
                return (
                  <button key={c.id} onClick={() => { setActiveId(c.id); setMobileThreadOpen(true); }} className={`min-h-11 w-full text-left p-2.5 rounded-lg flex items-center gap-2.5 ${activeId === c.id ? 'bg-brand-50' : 'hover:bg-ink-50'}`}>
                    {isSpace ? <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center"><Users className="w-4 h-4" /></div> : others[0] && <Avatar src={others[0].photoUrl} name={others[0].name} size={36} />}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink-900 truncate">{c.title}</p>
                      <p className="text-xs text-ink-500 truncate">{last ? last.text : 'No messages yet'}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        {/* Thread + context */}
        <Card className={`${mobileThreadOpen ? 'flex' : 'hidden lg:flex'} lg:col-span-2 flex-col`} style={{ minHeight: 450 }}>
          {!active ? (
            <EmptyState icon={<MessageSquare className="w-5 h-5" />} title="Select a conversation" description="Choose a conversation from the list." />
          ) : (
            <>
              <div className="px-4 py-3 border-b border-ink-100 flex items-center gap-2">
                <button aria-label="Back to conversations" onClick={() => setMobileThreadOpen(false)} className="lg:hidden min-w-11 min-h-11 -ml-3 flex items-center justify-center text-ink-600">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                {active.type === 'space' && <button onClick={() => active.spaceId && navigate({ name: 'space', spaceId: active.spaceId })} className="text-xs text-brand-600 hover:underline">Open Space</button>}
                <span className="text-sm font-medium text-ink-900">{active.title}</span>
                {activeSpace && <Badge tone="brand">{activeSpace.tasks.length} tasks</Badge>}
              </div>

              {/* Collaboration context bar */}
              {activeSpace && (
                <div className="px-4 py-2 bg-ink-50 border-b border-ink-100">
                  <CollaborationContextBar space={activeSpace} currentUserId={currentUserId} navigate={navigate} />
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: 400 }}>
                {active.messages.length === 0 && <p className="text-sm text-ink-500 text-center py-8">No messages yet.</p>}
                {active.messages.map((m) => {
                  const author = profiles.find((profile) => profile.id === m.authorId);
                  const isMe = m.authorId === currentUserId;
                  return (
                    <div key={m.id} className={`flex items-start gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                      {author && <Avatar src={author.photoUrl} name={author.name} size={28} />}
                      <div className={`max-w-[70%] ${isMe ? 'text-right' : ''}`}>
                        <p className="text-xs text-ink-400 mb-0.5">{author?.name?.split(' ')[0]} · {new Date(m.at).toLocaleDateString()}</p>
                        <div className={`inline-block rounded-lg px-3 py-2 text-sm ${isMe ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-800'}`}>{m.text}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action items summary */}
              {activeSpace && <ActionItemsBar space={activeSpace} currentUserId={currentUserId} />}

              <div className="p-3 border-t border-ink-100 flex gap-2">
                <input className="input flex-1" placeholder="Type a message..." value={text} disabled={sending} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && text.trim() && !sending) void submitMessage(active.id, text, sendMessage, setText, setSending, setSendError); }} />
                <button aria-label="Send message" disabled={sending || !text.trim()} onClick={() => void submitMessage(active.id, text, sendMessage, setText, setSending, setSendError)} className="btn-primary disabled:opacity-50"><Send className="w-4 h-4" /></button>
              </div>
              {sendError && <p role="alert" className="px-3 pb-3 text-sm text-red-600">{sendError}</p>}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

async function submitMessage(
  conversationId: string,
  text: string,
  sendMessage: (conversationId: string, text: string) => Promise<void>,
  setText: (value: string) => void,
  setSending: (value: boolean) => void,
  setError: (value: string | null) => void,
) {
  setSending(true);
  setError(null);
  try {
    await sendMessage(conversationId, text);
    setText('');
  } catch (error) {
    setError(error instanceof Error ? error.message : 'Could not send the message.');
  } finally {
    setSending(false);
  }
}

function CollaborationContextBar({ space, currentUserId, navigate }: { space: import('@/types').CollaborationSpace; currentUserId: string; navigate: (r: { name: 'space'; spaceId: string }) => void }) {
  const myTasks = space.tasks.filter((t) => t.ownerId === currentUserId);
  const pendingTasks = myTasks.filter((t) => t.status !== 'Completed' && t.status !== 'Approved');
  const recentDecisions = space.decisions.slice(-2);
  const recentFiles = space.files.slice(-2);

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs">
      {pendingTasks.length > 0 && (
        <button onClick={() => navigate({ name: 'space', spaceId: space.id })} className="flex items-center gap-1.5 text-brand-600 hover:underline">
          <ListChecks className="w-3.5 h-3.5" /> {pendingTasks.length} tasks assigned to you
        </button>
      )}
      {recentDecisions.length > 0 && (
        <span className="flex items-center gap-1.5 text-ink-500">
          <Gavel className="w-3.5 h-3.5" /> {recentDecisions.length} recent decision{recentDecisions.length > 1 ? 's' : ''}
        </span>
      )}
      {recentFiles.length > 0 && (
        <span className="flex items-center gap-1.5 text-ink-500">
          <FileText className="w-3.5 h-3.5" /> {recentFiles.length} file{recentFiles.length > 1 ? 's' : ''}
        </span>
      )}
      {pendingTasks.length === 0 && recentDecisions.length === 0 && recentFiles.length === 0 && (
        <span className="text-ink-400">No active collaboration context</span>
      )}
    </div>
  );
}

function ActionItemsBar({ space, currentUserId }: { space: import('@/types').CollaborationSpace; currentUserId: string }) {
  const myTasks = space.tasks.filter((t) => t.ownerId === currentUserId && t.status !== 'Completed' && t.status !== 'Approved');
  if (myTasks.length === 0) return null;
  return (
    <div className="px-4 py-2 border-t border-ink-100 bg-amber-50/50">
      <div className="flex items-center gap-2 mb-1">
        <ClipboardList className="w-3.5 h-3.5 text-amber-600" />
        <span className="text-xs font-semibold text-amber-700">Your action items in this space</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {myTasks.slice(0, 4).map((t) => (
          <span key={t.id} className="text-xs bg-white border border-amber-200 rounded-full px-2 py-0.5 text-ink-700 flex items-center gap-1">
            <Circle className="w-3 h-3 text-amber-400" /> {t.title}
          </span>
        ))}
      </div>
    </div>
  );
}
