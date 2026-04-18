import { Component, inject, effect, signal, NgZone } from '@angular/core';
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
  private ngZone = inject(NgZone);
  
  private messages = [
    "Preparing your order 🍳",
    "Cooking something delicious 🔥",
    "Plating your experience 🍽️",
    "Serving fresh data 🚀",
    "Kitchen is busy... almost ready 👨‍🍳",
    "Final touches in progress ✨"
  ];
  
  currentMessageIndex = 0;
  currentMessage = signal(this.messages[0]);
  private messageInterval: any;
  
  constructor() {
    // Cycle messages safely when loading starts/ends
    effect(() => {
      if (this.isLoading()) {
        this.startMessageCycle();
      } else {
        this.stopMessageCycle();
        // Reset to first message when hiding
        this.currentMessageIndex = 0;
        this.currentMessage.set(this.messages[0]);
      }
    });
  }

  private startMessageCycle() {
    if (this.messageInterval) return;
    
    this.ngZone.runOutsideAngular(() => {
      this.messageInterval = setInterval(() => {
        this.ngZone.run(() => {
          this.currentMessageIndex = (this.currentMessageIndex + 1) % this.messages.length;
          this.currentMessage.set(this.messages[this.currentMessageIndex]);
        });
      }, 2000);
    });
  }

  private stopMessageCycle() {
    if (this.messageInterval) {
      clearInterval(this.messageInterval);
      this.messageInterval = null;
    }
  }
}

