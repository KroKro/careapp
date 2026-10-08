import { Component, Input, OnDestroy, OnInit, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { LevelQuestionConfig } from '../../module-configs';
import { QuestionExplanation } from '../../question-explanations';

@Component({
  selector: 'app-level-question-group',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './level-question-group.component.html',
})
export class LevelQuestionGroupComponent implements OnInit, OnDestroy {
  @Input({ required: true }) questions: LevelQuestionConfig[] = [];
  @Input({ required: true }) scaleLabels: string[] = [];
  @Input({ required: true }) form!: FormGroup;
  @Input() explanations?: Record<string, QuestionExplanation>;

  readonly levels = [0, 1, 2, 3];
  // Reaktive Forms loesen in Angulars Zoneless-Modus keine Change Detection
  // aus (form.get(id).value in Templates bleibt sonst "eingefroren") -- der
  // offizielle Zoneless-Pattern ist, Formwerte ueber ein Signal zu spiegeln.
  readonly values = signal<Record<string, number>>({});
  // Erläuterung wird pro Antwortoption einzeln ein-/ausgeblendet (nicht alle
  // 4 Stufen auf einmal), damit Nutzer:innen nicht mit Text ueberladen werden.
  readonly openExplanation = signal<string | null>(null);

  private subscription?: Subscription;

  ngOnInit() {
    this.values.set(this.form.getRawValue());
    this.subscription = this.form.valueChanges.subscribe(() => {
      this.values.set(this.form.getRawValue());
    });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  private key(questionId: string, level: number): string {
    return `${questionId}:${level}`;
  }

  isExplanationOpen(questionId: string, level: number): boolean {
    return this.openExplanation() === this.key(questionId, level);
  }

  toggleLevelExplanation(questionId: string, level: number) {
    const key = this.key(questionId, level);
    this.openExplanation.set(this.openExplanation() === key ? null : key);
  }
}
