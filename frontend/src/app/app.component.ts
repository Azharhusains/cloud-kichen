import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavigationComponent } from './components/navigation/navigation.component';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavigationComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'cloud-kitchen';

  constructor(private themeService: ThemeService) {}

  get isDarkMode(): boolean {
    return this.themeService.currentTheme.name === 'dark';
  }

  ngOnInit(): void {
    this.themeService.initTheme();
  }
}
