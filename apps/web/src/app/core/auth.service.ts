import { inject, Injectable, signal } from '@angular/core';
import { Session } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

export interface SignUpParams {
  email: string;
  password: string;
  healthDataConsent: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService);

  readonly session = signal<Session | null>(null);
  readonly role = signal<'user' | 'admin' | 'gutachter' | null>(null);

  // loadRole() ist ein zweiter, unabhaengiger Request nach dem Session-Load --
  // Components, die role() direkt beim Init lesen (z.B. DashboardPageComponent),
  // koennen sonst race-bedingt noch null sehen. ensureRole() unten wartet auf
  // genau diesen In-Flight-Request statt auf dem Signal-Rohwert zu raten.
  private rolePromise: Promise<void> | null = null;

  constructor() {
    this.supabase.getSession().then((session) => {
      this.session.set(session);
      if (session) this.rolePromise = this.loadRole(session.user.id);
    });
    this.supabase.onAuthStateChange((session) => {
      this.session.set(session);
      if (session) this.rolePromise = this.loadRole(session.user.id);
      else this.role.set(null);
    });
  }

  /** Garantiert, dass role() geladen ist, bevor der Wert gelesen wird. */
  async ensureRole(): Promise<'user' | 'admin' | 'gutachter' | null> {
    if (this.rolePromise) await this.rolePromise;
    return this.role();
  }

  private async loadRole(userId: string) {
    const { data } = await this.supabase.client
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    this.role.set((data?.['role'] as 'user' | 'admin' | 'gutachter') ?? 'user');
  }

  async signUp({ email, password, healthDataConsent }: SignUpParams) {
    if (!healthDataConsent) {
      throw new Error(
        'Die Einwilligung zur Verarbeitung gesundheitsbezogener Daten ist erforderlich.',
      );
    }
    const { data, error } = await this.supabase.client.auth.signUp({ email, password });
    if (error) throw error;

    if (data.user) {
      await this.supabase.client
        .from('profiles')
        .update({ consent_health_data_at: new Date().toISOString() })
        .eq('id', data.user.id);
    }
    return data;
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.client.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }

  async signOut() {
    await this.supabase.client.auth.signOut();
  }

  async requestPasswordReset(email: string) {
    const { error } = await this.supabase.client.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) throw error;
  }

  async updatePassword(newPassword: string) {
    const { error } = await this.supabase.client.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }
}
