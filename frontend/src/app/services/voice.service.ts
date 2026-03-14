import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, fromEvent, merge, of } from 'rxjs';
import { map, catchError, finalize } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { CartService } from './cart.service';

export interface VoiceState {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  isProcessing: boolean;
}

export interface AIResponse {
  success: boolean;
  message: string;
  intents: string[];
  commands: any[];
  cartItems: any[];
  selectedAddress: any;
  order: any;
}

@Injectable({
  providedIn: 'root'
})
export class VoiceService {
  // Speech Recognition API types
  private SpeechRecognition: any;
  private speechRecognition: any = null;

  // State management
  private voiceStateSubject = new BehaviorSubject<VoiceState>({
    isListening: false,
    isSupported: false,
    transcript: '',
    interimTranscript: '',
    error: null,
    isProcessing: false
  });

  public voiceState$ = this.voiceStateSubject.asObservable();

  // Order completion subject - emits when order with payment is successfully completed
  private orderCompletedSubject = new BehaviorSubject<AIResponse | null>(null);
  public orderCompleted$ = this.orderCompletedSubject.asObservable();

  // Silence detection
  private silenceTimeout: any = null;
  private silenceDelay = 5000; // 5 seconds
  private lastSpeechTime: number = 0;
  private noSpeechCount: number = 0;
  private maxNoSpeechAttempts: number = 2; // Stop after 2 consecutive no-speech errors
  private isManuallyStopped: boolean = false; // Track if user intentionally stopped

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private cartService: CartService
  ) {
    this.initializeSpeechRecognition();
  }

  /**
   * Initialize Speech Recognition API
   */
  private initializeSpeechRecognition(): void {
    // Check for browser support
    const SpeechRecognitionAPI = (window as any).SpeechRecognition ||
                                  (window as any).webkitSpeechRecognition;

    if (SpeechRecognitionAPI) {
      this.SpeechRecognition = SpeechRecognitionAPI;
      this.updateState({ isSupported: true });
      console.log('Speech Recognition is supported');
    } else {
      this.updateState({ 
        isSupported: false,
        error: 'Voice not supported in this browser'
      });
      console.warn('Speech Recognition is not supported in this browser');
    }
  }

  /**
   * Check if speech recognition is supported
   */
  isSupported(): boolean {
    return this.voiceStateSubject.value.isSupported;
  }

  /**
   * Start voice recognition (must be triggered by user action)
   */
  startListening(): void {
    if (!this.isSupported()) {
      this.updateState({ error: 'Voice not supported in this browser' });
      return;
    }

    if (this.voiceStateSubject.value.isListening) {
      return;
    }

    // Reset the manual stop flag when starting fresh
    this.isManuallyStopped = false;

    try {
      // Create new recognition instance
      this.speechRecognition = new this.SpeechRecognition();
      
      // Reset no-speech counter for new session
      this.noSpeechCount = 0;
      
      // Configure recognition
      this.speechRecognition.continuous = true;
      this.speechRecognition.interimResults = true;
      this.speechRecognition.lang = 'en-US';
      this.speechRecognition.maxAlternatives = 1;

      // Set up event handlers
      this.setupRecognitionHandlers();

      // Start recognition
      this.speechRecognition.start();

      // Initialize silence detection
      this.lastSpeechTime = Date.now();
      this.startSilenceTimer();

      // Update state
      this.updateState({
        isListening: true,
        transcript: '',
        interimTranscript: '',
        error: null
      });

      console.log('Voice recognition started');

    } catch (error: any) {
      console.error('Failed to start speech recognition:', error);
      this.updateState({
        error: 'Failed to start voice recognition: ' + error.message
      });
    }
  }

  /**
   * Stop voice recognition
   */
  stopListening(): void {
    // Mark as manually stopped to prevent auto-restart
    this.isManuallyStopped = true;
    
    if (this.speechRecognition) {
      try {
        this.speechRecognition.stop();
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
    }

    this.clearSilenceTimer();
    this.finalizeTranscript();
  }

  /**
   * Set up speech recognition event handlers
   */
  private setupRecognitionHandlers(): void {
    if (!this.speechRecognition) return;

    // Handle recognition results
    this.speechRecognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Update state with transcripts
      this.updateState({
        interimTranscript,
        transcript: this.voiceStateSubject.value.transcript + finalTranscript
      });

      // Reset silence timer on speech detection
      if (finalTranscript || interimTranscript) {
        this.lastSpeechTime = Date.now();
        this.resetSilenceTimer();
      }
    };

    // Handle speech end
    this.speechRecognition.onspeechend = () => {
      console.log('Speech ended');
      this.lastSpeechTime = Date.now();
    };

    // Handle recognition errors
    this.speechRecognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      
      // For "no-speech" error, increment counter and check if we should stop
      if (event.error === 'no-speech') {
        this.noSpeechCount++;
        console.log(`No speech detected (${this.noSpeechCount}/${this.maxNoSpeechAttempts}), will restart in onend handler`);
        this.lastSpeechTime = Date.now();
        this.resetSilenceTimer();
        return;
      }

      // For other errors, show appropriate message
      const errorMessages: { [key: string]: string } = {
        'audio-capture': 'No microphone found. Please check your microphone.',
        'not-allowed': 'Microphone access denied. Please allow microphone access.',
        'network': 'Network error. Please check your internet connection.',
        'aborted': 'Recognition was aborted.',
        'language-not-supported': 'Language not supported.'
      };

      const errorMessage = errorMessages[event.error] || 
                          `Error: ${event.error}`;

      this.updateState({
        isListening: false,
        error: errorMessage
      });

      this.clearSilenceTimer();
    };

    // Handle recognition end
    this.speechRecognition.onend = () => {
      console.log('Speech recognition ended');
      
      const state = this.voiceStateSubject.value;
      
      if (state.isListening && state.transcript) {
        this.finalizeTranscript();
      }
      
      // If user manually stopped, don't restart - just update state
      if (this.isManuallyStopped) {
        console.log('User manually stopped - not restarting');
        this.isManuallyStopped = false; // Reset flag
        this.noSpeechCount = 0;
        this.updateState({ isListening: false });
        this.clearSilenceTimer();
        return;
      }
      
      // If we were supposed to be listening but it ended unexpectedly, restart
      // Only restart if we haven't exceeded max no-speech attempts
      if (state.isListening && !state.isProcessing) {
        if (this.noSpeechCount >= this.maxNoSpeechAttempts) {
          // Too many no-speech errors, stop listening
          console.log(`Too many no-speech errors (${this.noSpeechCount}), stopping recognition`);
          this.noSpeechCount = 0; // Reset counter
          this.updateState({ 
            isListening: false,
            error: 'No speech detected. Please try again.'
          });
          this.clearSilenceTimer();
          return;
        }
        
        console.log('Recognition ended unexpectedly, restarting...');
        try {
          this.speechRecognition.start();
          console.log('Recognition restarted after unexpected end');
          return; // Don't set isListening to false
        } catch (e) {
          console.error('Failed to restart recognition:', e);
        }
      }
      
      this.noSpeechCount = 0; // Reset counter when stopping normally
      this.updateState({ isListening: false });
      this.clearSilenceTimer();
    };
  }

  /**
   * Start silence detection timer
   */
  private startSilenceTimer(): void {
    this.clearSilenceTimer();
    
    this.silenceTimeout = setTimeout(() => {
      const state = this.voiceStateSubject.value;
      
      if (state.isListening) {
        console.log('No speech detected for 5 seconds. Auto-stopping...');
        this.stopListening();
        this.updateState({
          error: 'No speech detected for 5 seconds. Processing your request.'
        });
      }
    }, this.silenceDelay);
  }

  /**
   * Reset silence timer
   */
  private resetSilenceTimer(): void {
    this.lastSpeechTime = Date.now();
    this.startSilenceTimer();
  }

  /**
   * Clear silence timer
   */
  private clearSilenceTimer(): void {
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }
  }

  /**
   * Finalize transcript and send to backend
   */
  private finalizeTranscript(): void {
    const state = this.voiceStateSubject.value;
    
    if (state.transcript && !state.isProcessing) {
      const finalTranscript = state.transcript.trim();
      
      if (finalTranscript) {
        console.log('Final transcript:', finalTranscript);
        this.processVoiceCommand(finalTranscript);
      }
    }
  }

  /**
   * Process voice command via backend AI
   * @param transcript - Processed voice transcript
   */
  processVoiceCommand(transcript: string): void {
    const state = this.voiceStateSubject.value;
    
    if (state.isProcessing || !transcript) {
      return;
    }

    this.updateState({ isProcessing: true });

    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });

    // Get current cart from localStorage
    let cart: any[] = [];
    const cartData = localStorage.getItem('cart');
    if (cartData) {
      try {
        cart = JSON.parse(cartData);
      } catch (e) {
        console.error('Error parsing cart:', e);
      }
    }

    // Get browser info
    const browserInfo = navigator.userAgent;

    this.http.post<AIResponse>(
      `${environment.apiUrl}/ai/process`,
      {
        voiceInput: transcript,
        cart: cart,
        browserInfo
      },
      { headers }
    ).pipe(
      finalize(() => {
        this.updateState({ 
          isProcessing: false,
          isListening: false 
        });
      })
    ).subscribe({
      next: (response) => {
        console.log('AI Response:', response);
        
        if (response.success) {
          this.updateState({
            transcript: '',
            interimTranscript: ''
          });

          // Update local cart if items were modified
          if (response.cartItems) {
            localStorage.setItem('cart', JSON.stringify(response.cartItems));
            this.cartService.reloadCart();
          }

          // Handle order completion - navigate when order is placed
          // Either with payment or without (cash on delivery default)
          if (response.order) {
            localStorage.removeItem('cart');
            this.cartService.reloadCart();
            
            // Check if payment was successful OR if order was placed without explicit payment
            // (e.g., user said "order biryani at home" - order placed, payment via cash on delivery)
            const paymentCommand = response.commands?.find(
              (cmd: any) => cmd.action === 'payment' && cmd.success === true
            );
            
            const checkoutCommand = response.commands?.find(
              (cmd: any) => cmd.action === 'checkout' && cmd.success === true
            );
            
            // REMOVED: No longer emit orderCompleted$ from voice
            // Only checkout page emits order completion after real payment
            // Voice flow now redirects to checkout, manual payment required
          }
        } else {
          this.updateState({
            error: response.message
          });
        }
      },
      error: (error) => {
        console.error('AI processing error:', error);
        
        // Extract the actual error message from backend response
        // Backend returns { success: false, message: "..." } even on HTTP 400/500
        let errorMessage = 'Failed to process voice command. Please try again.';
        
        if (error.error) {
          // Check for response body with message
          if (typeof error.error === 'string') {
            errorMessage = error.error;
          } else if (error.error.message) {
            errorMessage = error.error.message;
          } else if (error.error.error) {
            // Some error responses use 'error' field instead of 'message'
            errorMessage = error.error.error;
          }
        } else if (error.message) {
          // Fallback to HTTP error message for network issues
          errorMessage = error.message;
        }
        
        this.updateState({
          error: errorMessage
        });
      }
    });
  }

  /**
   * Get available menu items via AI
   */
  getMenuItems(category?: string): Observable<AIResponse> {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : ''
    });

    const url = category 
      ? `${environment.apiUrl}/ai/menu?category=${category}`
      : `${environment.apiUrl}/ai/menu`;

    return this.http.get<AIResponse>(url, { headers });
  }

  /**
   * Get user addresses via AI
   */
  getUserAddresses(): Observable<any> {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : ''
    });

    return this.http.get<any>(`${environment.apiUrl}/ai/addresses`, { headers });
  }

  /**
   * Get command history
   */
  getHistory(limit: number = 10): Observable<any> {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : ''
    });

    return this.http.get<any>(
      `${environment.apiUrl}/ai/history?limit=${limit}`,
      { headers }
    );
  }

  /**
   * Update voice state
   */
  private updateState(partialState: Partial<VoiceState>): void {
    const currentState = this.voiceStateSubject.value;
    this.voiceStateSubject.next({ ...currentState, ...partialState });
  }

  /**
   * Clear error
   */
  clearError(): void {
    this.updateState({ error: null });
  }

  /**
   * Reset transcript
   */
  resetTranscript(): void {
    this.updateState({
      transcript: '',
      interimTranscript: '',
      error: null
    });
  }

  /**
   * Reset order completed state - call this when opening a new voice order
   */
  resetOrderCompleted(): void {
    this.orderCompletedSubject.next(null);
  }

  /**
   * Reset all voice service states - call this when opening a new voice order dialog
   * This ensures a clean slate when the user wants to place a new order
   */
  resetAllStates(): void {
    // Reset order completed
    this.orderCompletedSubject.next(null);
    
    // Reset voice state to initial values
    this.voiceStateSubject.next({
      isListening: false,
      isSupported: this.voiceStateSubject.value.isSupported,
      transcript: '',
      interimTranscript: '',
      error: null,
      isProcessing: false
    });
    
    // Clear any silence timers
    this.clearSilenceTimer();
    
    // Stop any ongoing speech recognition
    if (this.speechRecognition) {
      try {
        this.speechRecognition.stop();
      } catch (error) {
        console.error('Error stopping recognition during reset:', error);
      }
    }
    
    console.log('Voice service all states reset');
  }
}
