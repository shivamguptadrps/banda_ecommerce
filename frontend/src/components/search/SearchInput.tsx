"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, X, Clock, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { useGetSearchSuggestionsQuery } from "@/store/api/productApi";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface SearchSuggestion {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  vendor: string | null;
  min_price: number | null;
  primary_image: string | null;
}

interface SearchInputProps {
  placeholder?: string;
  className?: string;
  onSearch?: (query: string) => void;
  showSuggestions?: boolean;
  autoFocus?: boolean;
}

/**
 * Search Input Component with Autocomplete
 */
export function SearchInput({
  placeholder = 'Search "milk", "bread"...',
  className,
  onSearch,
  showSuggestions = true,
  autoFocus = false,
}: SearchInputProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestionsDropdown, setShowSuggestionsDropdown] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mark component as mounted (client-side only)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load search history from localStorage (client-side only)
  useEffect(() => {
    if (isMounted && typeof window !== "undefined") {
      const history = localStorage.getItem("search_history");
      if (history) {
        try {
          setSearchHistory(JSON.parse(history));
        } catch {
          // Ignore parse errors
        }
      }
    }
  }, [isMounted]);

  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search for suggestions
  const debouncedSearch = useCallback((query: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      if (query.trim().length >= 2) {
        setShowSuggestionsDropdown(true);
      } else {
        setShowSuggestionsDropdown(false);
      }
    }, 300);
  }, []);

  // Get search suggestions
  const { data: suggestionsData, isLoading: isLoadingSuggestions } = useGetSearchSuggestionsQuery(
    { query: searchQuery, limit: 8 },
    { skip: !showSuggestions || searchQuery.trim().length < 2 || !showSuggestionsDropdown }
  );

  const suggestions: SearchSuggestion[] = suggestionsData?.suggestions || [];

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    debouncedSearch(value);
  };

  // Handle search submit
  const handleSearch = useCallback(
    (query: string = searchQuery) => {
      const trimmedQuery = query.trim();
      if (!trimmedQuery) return;

      // Add to search history (client-side only)
      if (isMounted && typeof window !== "undefined") {
        const history = searchHistory.filter((h) => h.toLowerCase() !== trimmedQuery.toLowerCase());
        const newHistory = [trimmedQuery, ...history].slice(0, 10); // Keep last 10
        setSearchHistory(newHistory);
        localStorage.setItem("search_history", JSON.stringify(newHistory));
      }

      // Navigate to products page
      router.push(`/products?q=${encodeURIComponent(trimmedQuery)}`);
      setShowSuggestionsDropdown(false);
      setIsFocused(false);
      inputRef.current?.blur();

      // Call custom onSearch handler if provided
      onSearch?.(trimmedQuery);
    },
    [searchQuery, router, onSearch, searchHistory, isMounted]
  );

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    handleSearch(suggestion.name);
  };

  // Handle history item click
  const handleHistoryClick = (historyItem: string) => {
    setSearchQuery(historyItem);
    handleSearch(historyItem);
  };

  // Clear search
  const handleClear = () => {
    setSearchQuery("");
    setShowSuggestionsDropdown(false);
    inputRef.current?.focus();
  };

  // Remove from history
  const handleRemoveHistory = (item: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newHistory = searchHistory.filter((h) => h !== item);
    setSearchHistory(newHistory);
    if (isMounted && typeof window !== "undefined") {
      localStorage.setItem("search_history", JSON.stringify(newHistory));
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestionsDropdown(false);
        setIsFocused(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasSuggestions = suggestions.length > 0;
  const hasHistory = isMounted && searchHistory.length > 0 && searchQuery.trim().length === 0;
  const showDropdown = isMounted && showSuggestionsDropdown && (hasSuggestions || hasHistory) && isFocused;

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <form onSubmit={handleSubmit} className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={() => {
            setIsFocused(true);
            if (searchQuery.trim().length >= 2 || searchHistory.length > 0) {
              setShowSuggestionsDropdown(true);
            }
          }}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={cn(
            "w-full h-11 rounded-xl border border-gray-200 bg-gray-50 pl-12 pr-10 text-sm",
            "focus:outline-none focus:border-[#0c831f] focus:ring-2 focus:ring-[#0c831f]/20 focus:bg-white",
            "transition-all"
          )}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </form>

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto"
          >
            {/* Search Suggestions */}
            {hasSuggestions && (
              <div className="p-2">
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Suggestions
                </div>
                {isLoadingSuggestions ? (
                  <div className="px-3 py-4 text-center text-sm text-gray-500">Searching...</div>
                ) : (
                  suggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left group"
                    >
                      {suggestion.primary_image ? (
                        <img
                          src={suggestion.primary_image}
                          alt={suggestion.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <Search className="h-5 w-5 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate group-hover:text-[#0c831f] transition-colors">
                          {suggestion.name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {suggestion.category && (
                            <>
                              <span>{suggestion.category}</span>
                              {suggestion.vendor && <span>•</span>}
                            </>
                          )}
                          {suggestion.vendor && <span>{suggestion.vendor}</span>}
                          {suggestion.min_price && (
                            <>
                              <span>•</span>
                              <span className="font-semibold text-[#0c831f]">
                                {formatPrice(suggestion.min_price)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Search History */}
            {hasHistory && (
              <div className="p-2 border-t border-gray-100">
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  Recent Searches
                </div>
                {searchHistory.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => handleHistoryClick(item)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700 truncate group-hover:text-[#0c831f] transition-colors">
                        {item}
                      </span>
                    </div>
                    <button
                      onClick={(e) => handleRemoveHistory(item, e)}
                      className="p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </button>
                ))}
              </div>
            )}

            {/* Trending Searches (if no suggestions/history) */}
            {!hasSuggestions && !hasHistory && searchQuery.trim().length === 0 && (
              <div className="p-2">
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                  <TrendingUp className="h-3 w-3" />
                  Trending Searches
                </div>
                {["milk", "bread", "eggs", "rice", "vegetables"].map((trend) => (
                  <button
                    key={trend}
                    onClick={() => handleSearch(trend)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left"
                  >
                    <TrendingUp className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-700 capitalize">{trend}</span>
                  </button>
                ))}
              </div>
            )}

            {/* No Results */}
            {searchQuery.trim().length >= 2 && !hasSuggestions && !isLoadingSuggestions && (
              <div className="p-4 text-center">
                <p className="text-sm text-gray-500">No products found for "{searchQuery}"</p>
                <button
                  onClick={() => handleSearch()}
                  className="mt-2 text-sm text-[#0c831f] hover:underline"
                >
                  Search anyway
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

