import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminService, AdminUserRow } from '../data-access/admin.service';

@Component({
  selector: 'app-admin-users-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './admin-users-page.component.html',
})
export class AdminUsersPageComponent implements OnInit {
  private readonly adminService = inject(AdminService);

  readonly users = signal<AdminUserRow[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  async ngOnInit() {
    try {
      this.users.set(await this.adminService.listUsers());
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Nutzerliste konnte nicht geladen werden.');
    } finally {
      this.loading.set(false);
    }
  }

  formatDate(value: string | null): string {
    if (!value) return '–';
    return new Date(value).toLocaleDateString('de-DE', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }
}
