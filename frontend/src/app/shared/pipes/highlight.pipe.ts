import { Pipe, PipeTransform, SecurityContext } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { HighlightConfig } from '../../models/search.model';

@Pipe({
  name: 'highlight',
  standalone: true
})
export class HighlightPipe implements PipeTransform {
  private readonly DEFAULT_CONFIG: HighlightConfig = {
    highlightClass: 'search-highlight',
    tag: 'mark'
  };

  constructor(private sanitizer: DomSanitizer) {}

  transform(
    text: string,
    searchTerm: string,
    config?: Partial<HighlightConfig>
  ): SafeHtml | string {
    if (!text || !searchTerm) {
      return text;
    }

    const highlightConfig = { ...this.DEFAULT_CONFIG, ...config };
    const terms = searchTerm.trim().toLowerCase().split(/\s+/).filter(t => t.length > 0);
    
    if (terms.length === 0) {
      return text;
    }

    let result = text;
    
    terms.forEach(term => {
      const regex = new RegExp(`(${this.escapeRegex(term)})`, 'gi');
      const classAttr = highlightConfig.highlightClass 
        ? ` class="${highlightConfig.highlightClass}"` 
        : '';
      
      result = result.replace(regex, `<${highlightConfig.tag}${classAttr}>$1</${highlightConfig.tag}>`);
    });

    return this.sanitizer.sanitize(SecurityContext.HTML, result) || result;
  }

  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}