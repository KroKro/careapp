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

export type Widerspruchsart = 'pflegegrad' | 'hilfsmittel';

export interface ObjectionLetter {
  id: string;
  widerspruchsart: Widerspruchsart;
  vorname: string;
  nachname: string;
  geburtsdatum: string | null;
  adresse: string;
  email: string;
  pflegekasse: string;
  bescheiddatum: string | null;
  aktenzeichen: string;
  begruendung: string;
  pdf_storage_path: string | null;
  created_at: string;
  updated_at: string;
}

export type ObjectionLetterInput = Pick<
  ObjectionLetter,
  | 'widerspruchsart'
  | 'vorname'
  | 'nachname'
  | 'geburtsdatum'
  | 'adresse'
  | 'email'
  | 'pflegekasse'
  | 'bescheiddatum'
  | 'aktenzeichen'
  | 'begruendung'
>;

const SELECT_FIELDS =
  'id, widerspruchsart, vorname, nachname, geburtsdatum, adresse, email, pflegekasse, bescheiddatum, aktenzeichen, begruendung, pdf_storage_path, created_at, updated_at';

@Injectable({ providedIn: 'root' })
export class WiderspruchService {
  private readonly supabase = inject(SupabaseService);

  async listLetters(): Promise<ObjectionLetter[]> {
    const { data, error } = await this.supabase.client
      .from('objection_letters')
      .select(SELECT_FIELDS)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as ObjectionLetter[];
  }

  async getLetter(id: string): Promise<ObjectionLetter | null> {
    const { data, error } = await this.supabase.client
      .from('objection_letters')
      .select(SELECT_FIELDS)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data as ObjectionLetter) ?? null;
  }

  async createLetter(widerspruchsart: Widerspruchsart): Promise<string> {
    const { data: userData } = await this.supabase.client.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw new Error('Nicht angemeldet.');

    const { data, error } = await this.supabase.client
      .from('objection_letters')
      .insert({ user_id: userId, widerspruchsart, email: userData.user?.email ?? '' })
      .select('id')
      .single();
    if (error) throw error;
    return data.id as string;
  }

  async saveLetter(id: string, input: ObjectionLetterInput): Promise<void> {
    const { error } = await this.supabase.client.from('objection_letters').update(input).eq('id', id);
    if (error) throw error;
  }

  async generatePdf(letterId: string): Promise<void> {
    const { error } = await this.supabase.client.functions.invoke('generate-widerspruch-pdf', {
      body: { letterId },
    });
    if (error) throw await toFriendlyError(error);
  }

  async getPdfUrl(path: string): Promise<string> {
    const { data, error } = await this.supabase.client.storage.from('guides').createSignedUrl(path, 60);
    if (error || !data) throw error ?? new Error('Signed URL konnte nicht erstellt werden.');
    return data.signedUrl;
  }
}
