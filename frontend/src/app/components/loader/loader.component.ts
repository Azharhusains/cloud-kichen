import { Component, inject, effect, signal } from '@angular/core';
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
  
  private messages = [
    "Preparing your order 🍳",
    "Cooking something delicious 🔥",
    "Plating your experience 🍽️",
    "Serving fresh data 🚀",
    "Kitchen is busy... almost ready 👨‍🍳",
    "Final touches in progress ✨"
  ];
  
  currentMessage = signal(this.messages[0]);
  
  constructor() {
    effect(() => {
      if (this.isLoading()) {
        // Pick new random message only when loading starts
        const randomIndex = Math.floor(Math.random() * this.messages.length);
        this.currentMessage.set(this.messages[randomIndex]);
      }
    });
  }

  getRandomMessage = () => this.currentMessage();
}

