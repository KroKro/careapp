import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReadAloudButtonComponent } from '../../../shared/read-aloud-button/read-aloud-button.component';

@Component({
  selector: 'app-info-page',
  standalone: true,
  host: { class: 'block' },
  imports: [RouterLink, ReadAloudButtonComponent],
  templateUrl: './info-page.component.html',
})
export class InfoPageComponent {}
