import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../../core/supabase.service';

async function toFriendlyError(error: unknown): Promise<Error> {
  const context = (error as { context?: Response })?.context;
  if (context && typeof context.json === 'function') {
    try {
      const body = await context.json();
      if (body?.error) return new Error(body.error);
    } catch {
      // Body nicht als JSON lesbar -- auf die urspruengliche Fehlermeldung zurueckfallen.
    }
  }
  return error instanceof Error ? error : new Error('Unbekannter Fehler.');
}

export type Antragsart = 'einstufung' | 'hoeherstufung' | 'hilfsmittel';

export interface CareLevelApplication {
  id: string;
  antragsart: Antragsart;
  vorname: string;
  nachname: string;
  geburtsdatum: string | null;
  adresse: string;
  email: string;
  pflegekasse: string;
  hilfsmittel_bezeichnung: string;
  pdf_storage_path: string | null;
  created_at: string;
  updated_at: string;
}

export type CareLevelApplicationInput = Pick<
  CareLevelApplication,
  'antragsart' | 'vorname' | 'nachname' | 'geburtsdatum' | 'adresse' | 'email' | 'pflegekasse' | 'hilfsmittel_bezeichnung'
>;

const SELECT_FIELDS =
  'id, antragsart, vorname, nachname, geburtsdatum, adresse, email, pflegekasse, hilfsmittel_bezeichnung, pdf_storage_path, created_at, updated_at';

@Injectable({ providedIn: 'root' })
export class AntragService {
  private readonly supabase = inject(SupabaseService);

  async listApplications(): Promise<CareLevelApplication[]> {
    const { data, error } = await this.supabase.client
      .from('care_level_applications')
      .select(SELECT_FIELDS)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as CareLevelApplication[];
  }

  async getApplication(id: string): Promise<CareLevelApplication | null> {
    const { data, error } = await this.supabase.client
      .from('care_level_applications')
      .select(SELECT_FIELDS)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data as CareLevelApplication) ?? null;
  }

  async createApplication(antragsart: Antragsart): Promise<string> {
    const { data: userData } = await this.supabase.client.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw new Error('Nicht angemeldet.');

    const { data, error } = await this.supabase.client
      .from('care_level_applications')
      .insert({ user_id: userId, antragsart, email: userData.user?.email ?? '' })
      .select('id')
      .single();
    if (error) throw error;
    return data.id as string;
  }

  async saveApplication(id: string, input: CareLevelApplicationInput): Promise<void> {
    const { error } = await this.supabase.client.from('care_level_applications').update(input).eq('id', id);
    if (error) throw error;
  }

  async generatePdf(applicationId: string): Promise<void> {
    const { error } = await this.supabase.client.functions.invoke('generate-antrag-pdf', {
      body: { applicationId },
    });
    if (error) throw await toFriendlyError(error);
  }

  async getPdfUrl(path: string): Promise<string> {
    const { data, error } = await this.supabase.client.storage.from('guides').createSignedUrl(path, 60);
    if (error || !data) throw error ?? new Error('Signed URL konnte nicht erstellt werden.');
    return data.signedUrl;
  }
}
