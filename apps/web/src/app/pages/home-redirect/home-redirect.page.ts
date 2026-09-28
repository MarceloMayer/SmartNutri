import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-home-redirect-page',
  standalone: true,
  template: '<p class="sr-only">Redirecionando…</p>',
  styles: [`
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
  `]
})
export class HomeRedirectPage implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      void this.router.navigateByUrl('/login');
      return;
    }

    if (this.authService.hasAnyRole(['admin', 'nutritionist'])) {
      void this.router.navigateByUrl('/nutritionist');
      return;
    }

    void this.router.navigateByUrl('/minha-dieta');
  }
}
