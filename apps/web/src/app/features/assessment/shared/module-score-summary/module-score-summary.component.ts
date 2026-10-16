import { Component, Input } from '@angular/core';
import { StepTableEntry } from '../../scoring-preview';

export interface ScoreBreakdownItem {
  label: string;
  value: number;
}

@Component({
  selector: 'app-module-score-summary',
  standalone: true,
  host: { class: 'block' },
  imports: [],
  templateUrl: './module-score-summary.component.html',
})
export class ModuleScoreSummaryComponent {
  @Input({ required: true }) rawScore = 0;
  @Input({ required: true }) weightedScore = 0;
  @Input({ required: true }) stepTable: StepTableEntry[] = [];
  @Input() breakdown: ScoreBreakdownItem[] = [];

  get sortedTable(): StepTableEntry[] {
    return [...this.stepTable].sort((a, b) => a.max - b.max);
  }

  isActiveRow(entry: StepTableEntry): boolean {
    const sorted = this.sortedTable;
    const firstMatch = sorted.find((e) => this.rawScore <= e.max) ?? sorted[sorted.length - 1];
    return firstMatch === entry;
  }
}
