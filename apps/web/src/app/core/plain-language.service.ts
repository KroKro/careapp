import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'careapp-plain-language';

@Injectable({ providedIn: 'root' })
export class PlainLanguageService {
  readonly enabled = signal(this.readInitial());

  constructor() {
    this.apply(this.enabled());
  }

  toggle() {
    const next = !this.enabled();
    this.enabled.set(next);
    localStorage.setItem(STORAGE_KEY, String(next));
    this.apply(next);
  }

  private apply(enabled: boolean) {
    document.documentElement.classList.toggle('plain-language', enabled);
  }

  private readInitial(): boolean {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  }
}
