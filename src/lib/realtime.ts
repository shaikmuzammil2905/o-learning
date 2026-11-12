import { supabase } from './supabase';

const CHANNEL_NAME = 'olearning_realtime';
let channelSeq = 0;

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
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      bc = new BroadcastChannel(CHANNEL_NAME);
      bc.onmessage = () => onUpdate();
    }
  } catch {
    bc = null;
  }

  const handleWindowEvt = () => onUpdate();
  window.addEventListener('olearning:update', handleWindowEvt);

  // Unique channel name per subscriber avoids Supabase 'cannot add postgres_changes callbacks after subscribe()' error
  let supaChannel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;
  if (supabase) {
    try {
      supaChannel = supabase
        .channel(`public-db-changes-${++channelSeq}`)
        .on('postgres_changes', { event: '*', schema: 'public' }, () => onUpdate())
        .subscribe();
    } catch {
      supaChannel = null;
    }
  }

  return () => {
    try {
      bc?.close();
    } catch {
      // ignore
    }
    window.removeEventListener('olearning:update', handleWindowEvt);
    if (supabase && supaChannel) {
      try {
        supabase.removeChannel(supaChannel);
      } catch {
        // ignore
      }
    }
  };
}
