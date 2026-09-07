import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'

type EventMeta = Record<string, unknown>

interface LogUserEventInput {
  userId: string | null
  eventType: string
  meta?: EventMeta
}

export async function logUserEvent({ userId, eventType, meta }: LogUserEventInput): Promise<void> {
  if (!isSupabaseAdminConfigured) return

  try {
    const { error } = await supabaseAdmin
      .from('user_events')
      .insert({
        user_id:    userId,
        event_type: eventType,
        meta:       meta ?? {},
      })

    if (error) {
      console.error('[eventLog] user_events insert error:', error)
    }
  } catch (error) {
    console.error('[eventLog] user_events insert exception:', error)
  }
}
