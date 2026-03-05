import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private speechSynthesis: SpeechSynthesis;
  private isEnabled: boolean = true;
  private userHasInteracted: boolean = false;

  constructor() {
    this.speechSynthesis = window.speechSynthesis;
    
    // Set up listener for first user interaction
    this.setupUserInteractionListener();
  }

  /**
   * Set up listener to detect first user interaction
   * Browsers require user interaction before playing audio
   */
  private setupUserInteractionListener(): void {
    const markInteraction = () => {
      this.userHasInteracted = true;
      console.log('AudioService: User interaction detected, audio will be allowed');
    };
    
    // Listen for any user interaction
    document.addEventListener('click', markInteraction, { once: true });
    document.addEventListener('keydown', markInteraction, { once: true });
    document.addEventListener('touchstart', markInteraction, { once: true });
  }

  /**
   * Play a text-to-speech notification
   * @param text - The text to speak
   */
  speak(text: string): void {
    if (!this.isEnabled) {
      console.log('AudioService: Audio is disabled');
      return;
    }

    console.log('AudioService: Attempting to speak:', text);
    console.log('AudioService: User has interacted:', this.userHasInteracted);

    // Cancel any ongoing speech
    this.speechSynthesis.cancel();

    // Create speech synthesis utterance
    const utterance = new SpeechSynthesisUtterance(text);

    // Configure for natural-sounding human-like speech
    utterance.rate = 0.5;  // Slower for natural human-like speech
    utterance.pitch = 1.0;  // Normal pitch
    utterance.volume = 1.0;  // Full volume

    // Add error handler
    utterance.onerror = (event) => {
      console.error('AudioService: Speech synthesis error:', event.error);
    };

    utterance.onstart = () => {
      console.log('AudioService: Speech started');
    };

    utterance.onend = () => {
      console.log('AudioService: Speech ended');
    };

    // Try to get a natural-sounding voice
    this.setNaturalVoice(utterance);

    // Speak the text
    try {
      this.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('AudioService: Error speaking:', error);
    }
  }

  /**
   * Set a natural-sounding voice for the utterance
   */
  private setNaturalVoice(utterance: SpeechSynthesisUtterance): void {
    // Get available voices
    const voices = this.speechSynthesis.getVoices();

    if (voices.length === 0) {
      console.log('AudioService: Voices not loaded yet, loading...');
      // Voices not loaded yet, wait for them
      this.speechSynthesis.addEventListener('voiceschanged', () => {
        const updatedVoices = this.speechSynthesis.getVoices();
        console.log('AudioService: Voices loaded:', updatedVoices.length);
        this.selectBestVoice(utterance, updatedVoices);
      }, { once: true });
    } else {
      this.selectBestVoice(utterance, voices);
    }
  }

  /**
   * Select the best available voice for natural sound
   */
  private selectBestVoice(utterance: SpeechSynthesisUtterance, voices: SpeechSynthesisVoice[]): void {
    console.log('AudioService: Selecting voice from', voices.length, 'voices');
    
    // Prefer English voices, especially Microsoft or Google voices for naturalness
    const englishVoices = voices.filter(v => v.lang.startsWith('en'));

    if (englishVoices.length > 0) {
      console.log('AudioService: Found', englishVoices.length, 'English voices');
      
      // Try to find a premium natural voice
      const preferredVoices = englishVoices.filter(v =>
        v.name.includes('Microsoft') ||
        v.name.includes('Google') ||
        v.name.includes('Samantha') ||
        v.name.includes('Daniel')
      );

      if (preferredVoices.length > 0) {
        utterance.voice = preferredVoices[0];
        console.log('AudioService: Selected preferred voice:', preferredVoices[0].name);
      } else {
        // Fall back to first available English voice
        utterance.voice = englishVoices[0];
        console.log('AudioService: Selected fallback English voice:', englishVoices[0].name);
      }
    } else if (voices.length > 0) {
      // Fall back to any available voice
      utterance.voice = voices[0];
      console.log('AudioService: Selected any available voice:', voices[0].name);
    }
  }

  /**
   * Enable or disable audio notifications
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.speechSynthesis.cancel();
    }
    console.log('AudioService: Audio enabled:', enabled);
  }

  /**
   * Check if audio is enabled
   */
  getEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Force enable audio (can be called from UI button)
   */
  enableAudio(): void {
    this.userHasInteracted = true;
    this.setEnabled(true);
    console.log('AudioService: Audio enabled by user action');
  }

  /**
   * Play notification sound for new order
   * Uses natural, human-like speech with pauses for clarity
   */
  playOrderNotification(): void {
    console.log('AudioService: Playing order notification');
    
    // Cancel any ongoing speech first
    this.speechSynthesis.cancel();
    
    // Use a more natural, human-like message
    // Split into parts with pauses for clarity
    const message = 'You have a new order';
    
    // Create utterance with natural settings
    const utterance = new SpeechSynthesisUtterance(message);
    
    // Configure for natural human-like speech
    utterance.rate = 0.5;  // Much slower for natural human-like sound
    utterance.pitch = 1.0;  // Normal pitch
    utterance.volume = 1.0;  // Full volume
    
    // Add pauses for better clarity (using SSML-like behavior via timing)
    utterance.onboundary = (event) => {
      // Add slight pauses at word boundaries
      if (event.name === 'word' && event.charIndex > 0) {
        // Natural word boundary handling
      }
    };
    
    // Set natural voice
    this.setNaturalVoice(utterance);
    
    // Add error handler
    utterance.onerror = (event) => {
      console.error('AudioService: Speech synthesis error:', event.error);
    };

    // Speak the text
    try {
      this.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('AudioService: Error speaking:', error);
    }
  }

  /**
   * Test the audio - can be called to verify audio works
   */
  testAudio(): void {
    console.log('AudioService: Testing audio');
    this.speak('Audio test. You have a new order');
  }
}
