import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../../core/supabase.service';

export const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;
export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB, siehe Storage-Bucket-Limit

export type DocumentType = 'arztbericht' | 'gutachten' | 'attest' | 'sonstiges';

export interface DocumentRow {
  id: string;
  storage_path: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  document_type: DocumentType;
  scan_status: 'pending' | 'clean' | 'infected' | 'rejected';
  created_at: string;
}

const BUCKET = 'documents';

@Injectable({ providedIn: 'root' })
export class DocumentsService {
  private readonly supabase = inject(SupabaseService);

  validateFile(file: File): string | null {
    if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
      return 'Nur PDF, JPEG oder PNG sind erlaubt.';
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return 'Die Datei darf maximal 15 MB groß sein.';
    }
    return null;
  }

  async listDocuments(): Promise<DocumentRow[]> {
    const { data, error } = await this.supabase.client
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as DocumentRow[];
  }

  async upload(file: File, documentType: DocumentType): Promise<void> {
    const validationError = this.validateFile(file);
    if (validationError) throw new Error(validationError);

    const { data: userData } = await this.supabase.client.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw new Error('Nicht angemeldet.');

    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const storagePath = `${userId}/${crypto.randomUUID()}-${safeName}`;

    const { error: uploadError } = await this.supabase.client.storage
      .from(BUCKET)
      .upload(storagePath, file, { contentType: file.type });
    if (uploadError) throw uploadError;

    const { data: inserted, error: insertError } = await this.supabase.client
      .from('documents')
      .insert({
        user_id: userId,
        storage_path: storagePath,
        original_filename: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        document_type: documentType,
      })
      .select('id')
      .single();

    if (insertError) {
      // Verwaiste Datei nicht im Bucket liegen lassen, wenn der Metadaten-Insert fehlschlägt.
      await this.supabase.client.storage.from(BUCKET).remove([storagePath]);
      throw insertError;
    }

    const { error: scanError } = await this.supabase.client.functions.invoke('scan-document', {
      body: { documentId: inserted.id },
    });
    if (scanError) throw scanError;
  }

  async remove(doc: DocumentRow): Promise<void> {
    await this.supabase.client.storage.from(BUCKET).remove([doc.storage_path]);
    const { error } = await this.supabase.client.from('documents').delete().eq('id', doc.id);
    if (error) throw error;
  }

  async getSignedUrl(storagePath: string): Promise<string> {
    const { data, error } = await this.supabase.client.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, 60);
    if (error || !data) throw error ?? new Error('Signed URL konnte nicht erstellt werden.');
    return data.signedUrl;
  }
}
