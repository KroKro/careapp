import { Component, inject, OnInit, signal } from '@angular/core';
import { AuthService } from '../../../core/auth.service';
import { AccountService, DELETION_GRACE_PERIOD_DAYS, ProfileRow } from '../data-access/account.service';

@Component({
  selector: 'app-account-page',
  standalone: true,
  host: { class: 'block' },
  imports: [],
  templateUrl: './account-page.component.html',
})
export class AccountPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly accountService = inject(AccountService);

  readonly profile = signal<ProfileRow | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly info = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  async ngOnInit() {
    this.profile.set(await this.accountService.getProfile());
    this.loading.set(false);
  }

  deletionDueDate(): string | null {
    const requestedAt = this.profile()?.deletion_requested_at;
    if (!requestedAt) return null;
    const due = new Date(requestedAt);
    due.setDate(due.getDate() + DELETION_GRACE_PERIOD_DAYS);
    return due.toLocaleDateString('de-DE');
  }

  async exportData() {
    this.busy.set(true);
    this.errorMessage.set(null);
    try {
      const blob = await this.accountService.exportData();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'meine-daten.zip';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Export fehlgeschlagen.');
    } finally {
      this.busy.set(false);
    }
  }

  async requestDeletion() {
    if (!confirm(`Dein Konto und alle Daten werden in ${DELETION_GRACE_PERIOD_DAYS} Tagen endgültig gelöscht, sofern du nicht vorher widersprichst. Fortfahren?`)) {
      return;
    }
    this.busy.set(true);
    this.errorMessage.set(null);
    try {
      await this.accountService.requestDeletion();
      this.profile.set(await this.accountService.getProfile());
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Löschung konnte nicht beantragt werden.');
    } finally {
      this.busy.set(false);
    }
  }

  async cancelDeletion() {
    this.busy.set(true);
    this.errorMessage.set(null);
    try {
      await this.accountService.cancelDeletion();
      this.profile.set(await this.accountService.getProfile());
      this.info.set('Löschung abgebrochen.');
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Abbrechen fehlgeschlagen.');
    } finally {
      this.busy.set(false);
    }
  }
}
