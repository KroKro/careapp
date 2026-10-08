import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-wizard-progress',
  standalone: true,
  templateUrl: './wizard-progress.component.html',
})
export class WizardProgressComponent {
  @Input({ required: true }) currentStep = 1;
  @Input({ required: true }) title = '';
  readonly totalSteps = 6;
}
