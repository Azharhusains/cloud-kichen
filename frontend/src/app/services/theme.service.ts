import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Theme {
  name: 'light' | 'dark';
  class: 'light-theme' | 'dark-theme';
}

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private _theme$ = new BehaviorSubject<Theme>({ name: 'light' as const, class: 'light-theme' });
  theme$ = this._theme$.asObservable();

  get currentTheme(): Theme {
    return this._theme$.value;
  }

  toggleTheme(): void {
    const newTheme: Theme = this.currentTheme.name === 'light' 
      ? { name: 'dark' as const, class: 'dark-theme' }
      : { name: 'light' as const, class: 'light-theme' };

    this._theme$.next(newTheme);
    localStorage.setItem('theme', newTheme.name);
    document.body.classList.remove('light-theme', 'dark-theme');
    document.body.classList.add(newTheme.class);
  }

  initTheme(): void {
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const theme: Theme = (saved || (prefersDark ? 'dark' : 'light')) as Theme['name'] extends infer T ? T : never;
    const themeObj: Theme = {
      name: theme,
      class: theme === 'dark' ? 'dark-theme' : 'light-theme'
    };

    this._theme$.next(themeObj);
    document.body.classList.add(themeObj.class);
  }

  isDarkMode(): boolean {
    return this.currentTheme.name === 'dark';
  }
}
