import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

// Angular Material Modules
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';

// Angular Animations
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate('0.6s ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('staggerFadeIn', [
      transition(':enter', [
        query('.animate-item', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          stagger(150, [
            animate('0.5s ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ]),
    trigger('pulseAnimation', [
      transition(':enter', [
        style({ transform: 'scale(0.8)', opacity: 0 }),
        animate('0.4s ease-out', style({ transform: 'scale(1)', opacity: 1 }))
      ])
    ]),
    trigger('bounceIn', [
      transition(':enter', [
        style({ transform: 'scale(0.3)', opacity: 0 }),
        animate('0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)', style({ transform: 'scale(1)', opacity: 1 }))
      ])
    ])
  ]
})
export class HomeComponent {
  features = [
    { icon: 'local_shipping', title: 'Fast Delivery', description: 'Hot and fresh meals delivered to your doorstep' },
    { icon: 'eco', title: 'Fresh Ingredients', description: 'We use only the finest, freshest ingredients' },
    { icon: 'favorite', title: 'Made with Love', description: 'Traditional recipes crafted with care' }
  ];

  constructor(private router: Router) {}

  orderNow(): void {
    this.router.navigate(['/menu']);
  }
}
