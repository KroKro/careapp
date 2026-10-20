import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TextToSpeechService {
  readonly speaking = signal(false);

  get isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  speak(text: string) {
    if (!this.isSupported || !text.trim()) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'de-DE';
    utterance.onend = () => this.speaking.set(false);
    utterance.onerror = () => this.speaking.set(false);
    this.speaking.set(true);
    window.speechSynthesis.speak(utterance);
  }

  stop() {
    if (!this.isSupported) return;
    window.speechSynthesis.cancel();
    this.speaking.set(false);
  }
}
