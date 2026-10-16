import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-home',
  standalone: true,
  host: { class: 'block' },
  imports: [RouterLink],
  templateUrl: './admin-home.component.html',
})
export class AdminHomeComponent {}
