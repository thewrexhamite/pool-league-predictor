'use client';

import { useState, useCallback, useRef } from 'react';

interface UIState {
  // Modals
  showMyTeamModal: boolean;
  showNotificationSettings: boolean;
  timeMachineOpen: boolean;

  // Dropdowns and menus
  leagueDropdownOpen: boolean;
  mobileMenuOpen: boolean;

  // Search
  searchOpen: boolean;
  searchFocusIndex: number;
  searchQuery: string;
}

export function useUIState() {
  // Modal state
  const [showMyTeamModal, setShowMyTeamModal] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [timeMachineOpen, setTimeMachineOpen] = useState(false);

  // Dropdown and menu state
  const [leagueDropdownOpen, setLeagueDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchFocusIndex, setSearchFocusIndex] = useState(-1);
  const [searchQuery, setSearchQuery] = useState('');

  // Refs for UI elements
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const leagueDropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Toggle functions
  const toggleMyTeamModal = useCallback(() => {
    setShowMyTeamModal((prev) => !prev);
  }, []);

  const toggleNotificationSettings = useCallback(() => {
    setShowNotificationSettings((prev) => !prev);
  }, []);

  const toggleTimeMachine = useCallback(() => {
    setTimeMachineOpen((prev) => !prev);
  }, []);

  const toggleLeagueDropdown = useCallback(() => {
    setLeagueDropdownOpen((prev) => !prev);
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen((prev) => !prev);
  }, []);

  const toggleSearch = useCallback(() => {
    setSearchOpen((prev) => !prev);
  }, []);

  // Close all dropdowns and menus
  const closeAllDropdowns = useCallback(() => {
    setLeagueDropdownOpen(false);
    setMobileMenuOpen(false);
    setSearchOpen(false);
  }, []);

  // Close all modals
  const closeAllModals = useCallback(() => {
    setShowMyTeamModal(false);
    setShowNotificationSettings(false);
    setTimeMachineOpen(false);
  }, []);

  // Reset search
  const resetSearch = useCallback(() => {
    setSearchQuery('');
    setSearchFocusIndex(-1);
  }, []);

  return {
    // Modal state
    showMyTeamModal,
    setShowMyTeamModal,
    toggleMyTeamModal,
    showNotificationSettings,
    setShowNotificationSettings,
    toggleNotificationSettings,
    timeMachineOpen,
    setTimeMachineOpen,
    toggleTimeMachine,

    // Dropdown and menu state
    leagueDropdownOpen,
    setLeagueDropdownOpen,
    toggleLeagueDropdown,
    mobileMenuOpen,
    setMobileMenuOpen,
    toggleMobileMenu,

    // Search state
    searchOpen,
    setSearchOpen,
    toggleSearch,
    searchFocusIndex,
    setSearchFocusIndex,
    searchQuery,
    setSearchQuery,
    resetSearch,

    // Refs
    searchRef,
    searchInputRef,
    leagueDropdownRef,
    mobileMenuRef,

    // Utility functions
    closeAllDropdowns,
    closeAllModals,
  };
}
