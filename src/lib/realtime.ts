import { supabase } from './supabase';

const CHANNEL_NAME = 'olearning_realtime';

export function broadcastPlatformUpdate(type: string): void {
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const ch = new BroadcastChannel(CHANNEL_NAME);
      ch.postMessage({ type, ts: Date.now() });
      ch.close();
    }
    window.dispatchEvent(new CustomEvent('olearning:update', { detail: { type } }));
  } catch {
    // ignore in restricted environments
  }
}

export function subscribePlatformUpdates(onUpdate: () => void): () => void {
  let bc: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== 'undefined') {
    bc = new BroadcastChannel(CHANNEL_NAME);
    bc.onmessage = () => onUpdate();
  }

  const handleWindowEvt = () => onUpdate();
  window.addEventListener('olearning:update', handleWindowEvt);

  // Also subscribe to Supabase Realtime if configured via environment variables
  let supaChannel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;
  if (supabase) {
    supaChannel = supabase
      .channel('public-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => onUpdate())
      .subscribe();
  }

  return () => {
    bc?.close();
    window.removeEventListener('olearning:update', handleWindowEvt);
    if (supabase && supaChannel) {
      supabase.removeChannel(supaChannel);
    }
  };
}
