import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { MenuComponent } from './components/menu/menu.component';
import { CartComponent } from './components/cart/cart.component';
import { CheckoutComponent } from './components/checkout/checkout.component';
import { OrderConfirmationComponent } from './components/order-confirmation/order-confirmation.component';
import { OrderTrackingComponent } from './components/order-tracking/order-tracking.component';
import { ProfileComponent } from './components/profile/profile.component';
import { DashboardComponent } from './components/admin/dashboard/dashboard.component';
import { MenuManagementComponent } from './components/admin/menu-management/menu-management.component';
import { OrderManagementComponent } from './components/admin/order-management/order-management.component';
import { InventoryManagementComponent } from './components/admin/inventory-management/inventory-management.component';
import { CategoryManagementComponent } from './components/admin/category-management/category-management.component';
import { VoiceOrderComponent } from './components/voice-order/voice-order.component';

export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'menu', component: MenuComponent, canActivate: [AuthGuard] },
  { path: 'cart', component: CartComponent, canActivate: [AuthGuard] },
  { path: 'checkout', component: CheckoutComponent, canActivate: [AuthGuard] },
  { path: 'order-confirmation/:id', component: OrderConfirmationComponent, canActivate: [AuthGuard] },
  { path: 'order-tracking/:id', component: OrderTrackingComponent, canActivate: [AuthGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [AuthGuard] },
  { path: 'voice-order', component: VoiceOrderComponent, canActivate: [AuthGuard] },
  // Admin routes
  { path: 'admin/dashboard', component: DashboardComponent, canActivate: [AuthGuard], data: { roles: ['admin'] } },
  { path: 'admin/menu', component: MenuManagementComponent, canActivate: [AuthGuard], data: { roles: ['admin'] } },
  { path: 'admin/orders', component: OrderManagementComponent, canActivate: [AuthGuard], data: { roles: ['admin'] } },
  { path: 'admin/inventory', component: InventoryManagementComponent, canActivate: [AuthGuard], data: { roles: ['admin'] } },
  { path: 'admin/categories', component: CategoryManagementComponent, canActivate: [AuthGuard], data: { roles: ['admin'] } },
  { path: '**', redirectTo: '/home' }
];
