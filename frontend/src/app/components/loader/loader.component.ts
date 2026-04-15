import { Component, inject, effect } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { LoaderService } from '../../services/loader.service';

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loader.component.html',
  styleUrls: ['./loader.component.scss']
})
export class LoaderComponent {
  loaderService = inject(LoaderService);
  isLoading = toSignal(this.loaderService.isLoading$, { initialValue: false });

  getRandomMessage() {
    const messages = [
       "Preparing your order 🍳",
  "Cooking something delicious 🔥",
  "Plating your experience 🍽️",
  "Serving fresh data 🚀",
  "Kitchen is busy... almost ready 👨‍🍳",
  "Final touches in progress ✨"
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
}

