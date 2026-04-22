export interface SearchConfig {
  /** Debounce time in milliseconds */
  debounceMs: number;
  /** Minimum search term length before filtering */
  minLength: number;
  /** Whether search is case sensitive */
  caseSensitive: boolean;
  /** Whether to include match score in results */
  includeScore: boolean;
  /** Whether to cache search results */
  cacheResults?: boolean;
  /** Fields to search (for future API search) */
  searchFields?: string[];
}

export interface SearchResult<T> {
  /** The original item */
  item: T;
  /** Array of field names that matched */
  matches: string[];
  /** Relevance score (higher = better match) */
  score: number;
  /** Original index/rank of the item */
  rank: number;
}

export interface HighlightConfig {
  /** CSS class to apply to matched text */
  highlightClass?: string;
  /** HTML tag to wrap matched text */
  tag?: string;
}

export interface SearchState<T> {
  results: SearchResult<T>[];
  isLoading: boolean;
  hasResults: boolean;
  searchTerm: string;
}

// For future server-side search integration
export interface SearchRequest {
  query: string;
  page?: number;
  limit?: number;
  filters?: Record<string, any>;
}

export interface SearchResponse<T> {
  results: T[];
  total: number;
  page: number;
  limit: number;
}