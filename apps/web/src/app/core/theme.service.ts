import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'careapp-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly isDark = signal(this.readInitial());

  constructor() {
    this.apply(this.isDark());
  }

  toggle() {
    const next = !this.isDark();
    this.isDark.set(next);
    localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
    this.apply(next);
  }

  private apply(dark: boolean) {
    document.documentElement.classList.toggle('dark', dark);
  }

  private readInitial(): boolean {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored === 'dark';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  }
}
