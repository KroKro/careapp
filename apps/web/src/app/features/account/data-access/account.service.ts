import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../../core/supabase.service';

export interface ProfileRow {
  id: string;
  display_name: string | null;
  deletion_requested_at: string | null;
  consent_health_data_at: string | null;
}

export const DELETION_GRACE_PERIOD_DAYS = 14;

@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly supabase = inject(SupabaseService);

  private async currentUserId(): Promise<string> {
    const { data } = await this.supabase.client.auth.getUser();
    const userId = data.user?.id;
    if (!userId) throw new Error('Nicht angemeldet.');
    return userId;
  }

  async getProfile(): Promise<ProfileRow | null> {
    const userId = await this.currentUserId();
    const { data } = await this.supabase.client
      .from('profiles')
      .select('id, display_name, deletion_requested_at, consent_health_data_at')
      .eq('id', userId)
      .single();
    return (data as ProfileRow) ?? null;
  }

  async requestDeletion(): Promise<void> {
    const userId = await this.currentUserId();
    const { error } = await this.supabase.client
      .from('profiles')
      .update({ deletion_requested_at: new Date().toISOString() })
      .eq('id', userId);
    if (error) throw error;
  }

  async cancelDeletion(): Promise<void> {
    const userId = await this.currentUserId();
    const { error } = await this.supabase.client
      .from('profiles')
      .update({ deletion_requested_at: null })
      .eq('id', userId);
    if (error) throw error;
  }

  async exportData(): Promise<Blob> {
    const { data, error } = await this.supabase.client.functions.invoke('export-data', {
      method: 'POST',
    });
    if (error) throw error;
    return data as Blob;
  }
}
