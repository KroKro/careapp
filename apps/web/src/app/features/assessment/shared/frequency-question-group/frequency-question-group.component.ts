import { Component, Input, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FrequencyQuestionConfig } from '../../module-configs';
import { QuestionExplanation } from '../../question-explanations';

@Component({
  selector: 'app-frequency-question-group',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './frequency-question-group.component.html',
})
export class FrequencyQuestionGroupComponent {
  @Input({ required: true }) questions: FrequencyQuestionConfig[] = [];
  @Input({ required: true }) form!: FormGroup;
  @Input() explanations?: Record<string, QuestionExplanation>;

  readonly expandedIds = signal(new Set<string>());

  toggleExplanation(questionId: string) {
    const next = new Set(this.expandedIds());
    if (next.has(questionId)) next.delete(questionId);
    else next.add(questionId);
    this.expandedIds.set(next);
  }
}
