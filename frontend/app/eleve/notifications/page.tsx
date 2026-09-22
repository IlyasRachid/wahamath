'use client';

import { apiUrl } from '@/lib/api-url';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BellOff, CheckCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { cachedApiGet, invalidateCacheTags } from '@/lib/api-cache';
import type { Notification } from '@/lib/types';
import { PageHeader } from '@/components/shared/page-header';
import { NotificationItem } from '@/components/shared/notification-item';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';


export default function StudentNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const request = async (path: string, method: 'GET' | 'POST' | 'DELETE' = 'GET') => { const { data: { session } } = await supabase.auth.getSession(); if (!session) throw new Error('Veuillez vous reconnecter.'); const response = await fetch(`${apiUrl}${path}`, { method, headers: { Authorization: `Bearer ${session.access_token}` } }); const payload = await response.json(); if (!response.ok) throw new Error(payload.detail ?? 'Impossible de mettre à jour les notifications.'); return payload; };
  const loadNotifications = async () => { try { const payload = await cachedApiGet<{ items: any[] }>('/api/notifications', 30_000, ['notifications']); setNotifications(payload.items.map((item: any) => ({ id: item.id, type: item.type, title: item.title, body: item.body, href: item.href, exercise: item.exercise, createdAt: item.created_at, read: Boolean(item.read_at) }))); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Impossible de charger les notifications.'); } finally { setLoading(false); } };
  useEffect(() => { void loadNotifications(); }, []);
  useEffect(() => { const refresh = () => { void loadNotifications(); }; window.addEventListener('wahamath-notifications-updated', refresh); return () => window.removeEventListener('wahamath-notifications-updated', refresh); }, []);
  const unreadCount = notifications.filter((item) => !item.read).length;
  const openNotification = async (id: string) => { const current = notifications.find((item) => item.id === id); if (!current) return; try { if (!current.read) { await request(`/api/notifications/${id}/read`, 'POST'); invalidateCacheTags('notifications'); setNotifications((items) => items.map((item) => item.id === id ? { ...item, read: true } : item)); window.dispatchEvent(new Event('wahamath-notifications-updated')); } if (current.href) router.push(current.href); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Impossible de mettre à jour la notification.'); } };
  const markAllRead = async () => { try { await request('/api/notifications/read', 'POST'); invalidateCacheTags('notifications'); setNotifications((items) => items.map((item) => ({ ...item, read: true }))); window.dispatchEvent(new Event('wahamath-notifications-updated')); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Impossible de mettre à jour les notifications.'); } };
  const deleteNotification = async (id: string) => { setDeletingId(id); setError(null); try { await request(`/api/notifications/${id}`, 'DELETE'); invalidateCacheTags('notifications'); setNotifications((items) => items.filter((item) => item.id !== id)); window.dispatchEvent(new Event('wahamath-notifications-updated')); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Impossible de supprimer la notification.'); } finally { setDeletingId(null); } };
  return <div className="space-y-6"><PageHeader title="Notifications" subtitle={unreadCount ? `${unreadCount} notification${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}` : 'Toutes vos notifications sont lues'}>{unreadCount > 0 && <Button variant="outline" size="sm" onClick={markAllRead}><CheckCheck className="h-4 w-4" />Tout marquer comme lu</Button>}</PageHeader>{loading ? <p className="py-12 text-center text-sm text-muted-foreground">Chargement des notifications…</p> : error ? <p className="py-12 text-center text-sm text-destructive">{error}</p> : notifications.length === 0 ? <EmptyState icon={BellOff} title="Aucune notification" description="Vous serez notifié ici lorsqu’un professeur répond à vos questions ou qu’un nouvel exercice est publié." /> : <div className="space-y-2">{notifications.map((item) => <NotificationItem key={item.id} notification={item} onToggleRead={openNotification} onDelete={deleteNotification} deleting={deletingId === item.id} />)}</div>}</div>;
}
