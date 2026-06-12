'use client';

import React from 'react';
import { MapPinOff, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LocationAlertBannerProps {
  onActionClick: () => void;
}

export function LocationAlertBanner({ onActionClick }: LocationAlertBannerProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="
        flex items-center justify-between gap-3 p-3 rounded-lg 
        bg-destructive/10 border border-destructive/20 
        w-full transition-all duration-200 ease-in-out hover:bg-destructive/15
      "
    >
      {/* 
        Text wrapper with min-w-0, truncate, and whitespace-nowrap
        to prevent text from overflowing or breaking the layout.
      */}
      <div className="flex items-center gap-2 min-w-0">
        <MapPinOff className="h-4 w-4 shrink-0 text-destructive animate-pulse" aria-hidden="true" />
        <div className="min-w-0 truncate">
          <span className="truncate min-w-0 whitespace-nowrap text-sm font-semibold text-destructive">
            Location Disabled
          </span>
        </div>
      </div>

      {/* 
        Action button protected by shrink-0 to remain visible 
        on all viewports including extremely narrow screens.
      */}
      <Button
        variant="destructive"
        size="sm"
        onClick={onActionClick}
        aria-label="View instructions to enable location"
        className="
          shrink-0 text-xs font-semibold px-3 py-1.5 h-8 flex items-center gap-1.5
          shadow-sm transition-transform active:scale-95
        "
      >
        <HelpCircle className="h-3.5 w-3.5" />
        <span>Fix Settings</span>
      </Button>
    </div>
  );
}
