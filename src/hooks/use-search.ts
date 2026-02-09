'use client';

import { useState, useCallback, useRef } from 'react';

export function useSearch() {
  const [searchQuery, setSearchQueryState] = useState('');
  const [searchOpen, setSearchOpenState] = useState(false);
  const [searchFocusIndex, setSearchFocusIndexState] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const setSearchQuery = useCallback((query: string) => {
    setSearchQueryState(query);
    setSearchFocusIndexState(-1);
  }, []);

  const clearSearchQuery = useCallback(() => {
    setSearchQueryState('');
    setSearchFocusIndexState(-1);
  }, []);

  const openSearch = useCallback(() => {
    setSearchOpenState(true);
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpenState(false);
    setSearchQueryState('');
    setSearchFocusIndexState(-1);
  }, []);

  const setSearchFocusIndex = useCallback((index: number) => {
    setSearchFocusIndexState(index);
  }, []);

  const handleSearchKeyDown = useCallback((
    e: React.KeyboardEvent,
    resultsLength: number,
    onSelect?: () => void
  ) => {
    if (e.key === 'Escape') {
      closeSearch();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSearchFocusIndexState(i => Math.min(i + 1, resultsLength - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSearchFocusIndexState(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && onSelect) {
      e.preventDefault();
      onSelect();
    }
  }, [closeSearch]);

  const handleSearchSelect = useCallback(() => {
    setSearchQueryState('');
    setSearchOpenState(false);
    setSearchFocusIndexState(-1);
  }, []);

  return {
    searchQuery,
    searchOpen,
    searchFocusIndex,
    searchRef,
    searchInputRef,
    setSearchQuery,
    clearSearchQuery,
    openSearch,
    closeSearch,
    setSearchFocusIndex,
    handleSearchKeyDown,
    handleSearchSelect,
  };
}
