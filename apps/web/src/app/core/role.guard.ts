import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from './supabase.service';

export const adminGuard: CanActivateFn = async () => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);
  const session = await supabase.getSession();
  if (!session) return router.createUrlTree(['/auth/login']);

  const { data } = await supabase.client
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (data?.['role'] === 'admin') return true;
  return router.createUrlTree(['/']);
};

export const gutachterGuard: CanActivateFn = async () => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);
  const session = await supabase.getSession();
  if (!session) return router.createUrlTree(['/auth/login']);

  const { data } = await supabase.client
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (data?.['role'] === 'gutachter' || data?.['role'] === 'admin') return true;
  return router.createUrlTree(['/']);
};
