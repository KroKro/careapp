import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly submitted = signal(false);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    healthDataConsent: [false, Validators.requiredTrue],
  });

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set(null);
    const { email, password, healthDataConsent } = this.form.getRawValue();
    try {
      await this.auth.signUp({ email: email!, password: password!, healthDataConsent: !!healthDataConsent });
      this.submitted.set(true);
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Registrierung fehlgeschlagen.');
    } finally {
      this.submitting.set(false);
    }
  }
}
