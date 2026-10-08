import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { DocumentRow, DocumentsService, DocumentType } from '../data-access/documents.service';

@Component({
  selector: 'app-documents-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './documents-page.component.html',
})
export class DocumentsPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly documentsService = inject(DocumentsService);

  readonly documents = signal<DocumentRow[]>([]);
  readonly loading = signal(true);
  readonly uploading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly selectedFile = signal<File | null>(null);

  readonly form = this.fb.group({
    documentType: this.fb.control<DocumentType>('sonstiges'),
  });

  async ngOnInit() {
    await this.reload();
  }

  private async reload() {
    this.loading.set(true);
    try {
      this.documents.set(await this.documentsService.listDocuments());
    } finally {
      this.loading.set(false);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] ?? null);
  }

  async upload() {
    const file = this.selectedFile();
    if (!file) return;
    this.uploading.set(true);
    this.errorMessage.set(null);
    try {
      await this.documentsService.upload(file, this.form.getRawValue().documentType!);
      this.selectedFile.set(null);
      await this.reload();
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Upload fehlgeschlagen.');
    } finally {
      this.uploading.set(false);
    }
  }

  async remove(doc: DocumentRow) {
    await this.documentsService.remove(doc);
    await this.reload();
  }

  async download(doc: DocumentRow) {
    const url = await this.documentsService.getSignedUrl(doc.storage_path);
    window.open(url, '_blank', 'noopener');
  }

  statusLabel(doc: DocumentRow): string {
    switch (doc.scan_status) {
      case 'pending':
        return 'Wird geprüft…';
      case 'clean':
        return 'Geprüft, unbedenklich';
      case 'infected':
        return 'Virenscan fehlgeschlagen – Datei wurde entfernt';
      case 'rejected':
        return 'Dateityp ungültig – Datei wurde entfernt';
    }
  }
}
