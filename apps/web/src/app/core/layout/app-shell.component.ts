import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { ThemeService } from '../theme.service';

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app-shell.component.html',
})
export class AppShellComponent {
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  private readonly router = inject(Router);

  readonly sidebarOpen = signal(false);

  readonly navItems: NavItem[] = [
    {
      label: 'Übersicht',
      path: '/assessment',
      icon: 'M11.47 3.84a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 1-1.06 1.06l-.97-.97V20.4a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1-.75-.75v-4.5h-3v4.5a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1-.75-.75v-7.78l-.97.97a.75.75 0 1 1-1.06-1.06z',
    },
    {
      label: 'Dokumente',
      path: '/documents',
      icon: 'M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375h-1.5m0 12.75h7.5m-7.5 3h7.5m-9-6h.008v.008H6.75v-.008ZM6 20.25h12a2.25 2.25 0 0 0 2.25-2.25V6.621a1.125 1.125 0 0 0-.329-.796L16.12 1.92A1.125 1.125 0 0 0 15.321 1.5H6a2.25 2.25 0 0 0-2.25 2.25v14.25A2.25 2.25 0 0 0 6 20.25Z',
    },
    {
      label: 'Konto',
      path: '/account',
      icon: 'M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z',
    },
  ];

  readonly adminNavItem: NavItem = {
    label: 'Admin',
    path: '/admin',
    icon: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 0 1 0 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  };

  async signOut() {
    await this.auth.signOut();
    this.router.navigateByUrl('/auth/login');
  }
}
