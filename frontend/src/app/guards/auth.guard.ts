import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return false;
    }

    const requiredRoles = route.data['roles'] as string[];
    if (requiredRoles) {
      const userRole = this.authService.normalizeRole(this.authService.getUserRole() || '');
      if (!userRole || !requiredRoles.some(r => this.authService.normalizeRole(r) === userRole)) {
        this.router.navigate(['/menu']);
        return false;
      }
    }

    return true;
  }
}
