import { Injectable } from '@angular/core';
import { createClient, Session, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client: SupabaseClient = createClient(
    environment.supabaseUrl,
    environment.supabaseAnonKey,
  );

  getSession(): Promise<Session | null> {
    return this.client.auth.getSession().then(({ data }) => data.session);
  }

  onAuthStateChange(callback: (session: Session | null) => void) {
    return this.client.auth.onAuthStateChange((_event, session) => callback(session));
  }
}
