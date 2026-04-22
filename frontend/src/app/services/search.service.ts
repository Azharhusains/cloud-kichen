import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject, debounceTime, distinctUntilChanged, map, of, shareReplay, switchMap, tap } from 'rxjs';
import { SearchConfig, SearchResult } from '../models/search.model';

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private readonly DEFAULT_CONFIG: SearchConfig = {
    debounceMs: 350,
    minLength: 1,
    caseSensitive: false,
    includeScore: false
  };

  private searchTerm$ = new BehaviorSubject<string>('');
  private loading$ = new BehaviorSubject<boolean>(false);
  private searchCache = new Map<string, any[]>();

  // Observable streams
  public searchTermChanges$: Observable<string>;
  public isLoading$: Observable<boolean>;

  constructor() {
    this.searchTermChanges$ = this.searchTerm$.asObservable().pipe(
      debounceTime(this.DEFAULT_CONFIG.debounceMs),
      distinctUntilChanged(),
      shareReplay(1)
    );

    this.isLoading$ = this.loading$.asObservable();
  }

  /**
   * Update the current search term
   */
  setSearchTerm(term: string): void {
    const normalizedTerm = term.trim().toLowerCase();
    if (this.searchTerm$.value !== normalizedTerm) {
      this.searchTerm$.next(normalizedTerm);
    }
  }

  /**
   * Clear the current search
   */
  clearSearch(): void {
    this.searchTerm$.next('');
    this.searchCache.clear();
  }

  /**
   * Get current search term
   */
  getCurrentSearchTerm(): string {
    return this.searchTerm$.value;
  }

  /**
   * Create a filtered observable stream for any dataset
   * @param items$ Source data stream to filter
   * @param searchFields Fields to search against
   * @param config Optional search configuration
   */
  filter<T>(
    items$: Observable<T[]>,
    searchFields: (keyof T)[],
    config?: Partial<SearchConfig>
  ): Observable<SearchResult<T>[]> {
    const searchConfig = { ...this.DEFAULT_CONFIG, ...config };

    return this.searchTermChanges$.pipe(
      tap(() => this.loading$.next(true)),
      switchMap(searchTerm => 
        items$.pipe(
          map(items => {
            if (!searchTerm || searchTerm.length < searchConfig.minLength) {
              return items.map((item, index) => ({
                item,
                matches: [],
                score: 1,
                rank: index
              }));
            }

            const cacheKey = this.getCacheKey(searchTerm, items);
            if (this.searchCache.has(cacheKey)) {
              return this.searchCache.get(cacheKey) as SearchResult<T>[];
            }

            const results = this.filterItems(items, searchTerm, searchFields, searchConfig);
            
            if (searchConfig.cacheResults !== false) {
              this.searchCache.set(cacheKey, results);
            }

            return results;
          }),
          tap(() => this.loading$.next(false))
        )
      ),
      shareReplay(1)
    );
  }

  /**
   * Filter items synchronously (for non-reactive use cases
   */
  filterSync<T>(
    items: T[],
    searchTerm: string,
    searchFields: (keyof T)[],
    config?: Partial<SearchConfig>
  ): SearchResult<T>[] {
    const searchConfig = { ...this.DEFAULT_CONFIG, ...config };
    const normalizedTerm = searchTerm.trim().toLowerCase();

    if (!normalizedTerm || normalizedTerm.length < searchConfig.minLength) {
      return items.map((item, index) => ({
        item,
        matches: [],
        score: 1,
        rank: index
      }));
    }

    return this.filterItems(items, normalizedTerm, searchFields, searchConfig);
  }

  private filterItems<T>(
    items: T[],
    searchTerm: string,
    searchFields: (keyof T)[],
    config: SearchConfig
  ): SearchResult<T>[] {
    const results: SearchResult<T>[] = [];
    const terms = searchTerm.split(/\s+/).filter(term => term.length > 0);

    items.forEach((item, index) => {
      let totalScore = 0;
      const matches: string[] = [];

      searchFields.forEach(field => {
        const fieldValue = item[field];
        if (fieldValue == null) return;

        const value = String(fieldValue).toLowerCase();
        
        terms.forEach(term => {
          const termIndex = value.indexOf(term);
          if (termIndex !== -1) {
            // Higher score for exact matches at start of string
            const positionBonus = termIndex === 0 ? 2 : 1;
            // Higher score for full word matches
            const wordBonus = (termIndex === 0 || value[termIndex - 1] === ' ') ? 1.5 : 1;
            totalScore += positionBonus * wordBonus;
            matches.push(String(field));
          }
        });
      });

      if (totalScore > 0) {
        results.push({
          item,
          matches: [...new Set(matches)],
          score: totalScore,
          rank: index
        });
      }
    });

    // Sort by score descending, then original order
    return results.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.rank - b.rank;
    });
  }

  private getCacheKey<T>(searchTerm: string, items: T[]): string {
    return `${searchTerm}:${items.length}`;
  }

  /**
   * Clear search cache
   */
  clearCache(): void {
    this.searchCache.clear();
  }
}