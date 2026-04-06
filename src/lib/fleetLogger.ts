import { supabase } from './supabase';

export async function logFleetActivity(params: {
  action: string;
  entityType?: string;
  entityId?: string;
  description: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('fleet_activity_logs').insert({
      owner_profile_id: user.id,
      action: params.action,
      entity_type: params.entityType || null,
      entity_id: params.entityId || null,
      description: params.description,
      metadata: params.metadata || {},
    });
  } catch (err) {
    console.error('Failed to log fleet activity:', err);
  }
}
