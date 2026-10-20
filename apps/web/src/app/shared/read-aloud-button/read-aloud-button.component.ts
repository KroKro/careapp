import { Component, inject, Input } from '@angular/core';
import { TextToSpeechService } from '../../core/text-to-speech.service';

@Component({
  selector: 'app-read-aloud-button',
  standalone: true,
  host: { class: 'inline-block' },
  templateUrl: './read-aloud-button.component.html',
})
export class ReadAloudButtonComponent {
  @Input({ required: true }) targetId!: string;
  @Input() label = 'Vorlesen';

  readonly tts = inject(TextToSpeechService);

  toggle() {
    if (this.tts.speaking()) {
      this.tts.stop();
      return;
    }
    const el = document.getElementById(this.targetId);
    this.tts.speak(el?.innerText ?? '');
  }
}
