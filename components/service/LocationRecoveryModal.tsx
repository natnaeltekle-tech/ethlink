'use client';

import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Compass, Chrome, Settings, X, Shield, RefreshCw, MapPin, Smartphone } from 'lucide-react';
import { canOpenAppSettings, isNativeApp, openAppSettings, openLocationSettings } from '@/lib/location';

export type LocationProblem = 'denied' | 'services_off' | 'app_outdated';

interface LocationRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Why location failed; decides which help is shown. */
  reason?: LocationProblem;
  /** Re-check location (e.g. after the user comes back from Settings). */
  onRetry?: () => void;
}

export function LocationRecoveryModal({ isOpen, onClose, reason = 'denied', onRetry }: LocationRecoveryModalProps) {
  // Android app: real Settings buttons instead of browser instructions.
  if (isNativeApp()) {
    return <NativeLocationHelp isOpen={isOpen} onClose={onClose} reason={reason} onRetry={onRetry} />;
  }
  return <BrowserLocationHelp isOpen={isOpen} onClose={onClose} />;
}

const SHEET =
  'max-sm:fixed max-sm:bottom-0 max-sm:top-auto max-sm:left-0 max-sm:right-0 max-sm:translate-x-0 max-sm:translate-y-0 ' +
  'max-sm:rounded-t-2xl max-sm:rounded-b-none max-sm:max-w-full max-sm:border-t max-sm:border-x-0 max-sm:border-b-0 ' +
  'max-h-[85vh] flex flex-col gap-4 overflow-y-auto duration-300 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] bg-background border border-border sm:rounded-xl shadow-xl';

function NativeLocationHelp({ isOpen, onClose, reason, onRetry }: Required<Pick<LocationRecoveryModalProps, 'isOpen' | 'onClose' | 'reason'>> & { onRetry?: () => void }) {
  const [opened, setOpened] = useState(false);
  const servicesOff = reason === 'services_off';
  const outdated = reason === 'app_outdated';
  const canOpen = !outdated && canOpenAppSettings();

  const title = outdated ? 'Update Eth-Links to use location'
    : servicesOff ? 'Turn on your phone\'s Location'
      : 'Allow Eth-Links to use your location';
  const text = outdated
    ? 'This version of the app can\'t ask for location. Install the latest Eth-Links app, then try again.'
    : servicesOff
      ? 'Your phone\'s Location switch is off. Turn it on so we can show services near you.'
      : 'Location permission for Eth-Links is turned off. Turn it on in Settings so we can sort services by distance.';

  const open = () => {
    const ok = servicesOff ? openLocationSettings() : openAppSettings();
    setOpened(ok);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent className={SHEET}>
        <AlertDialogHeader className="relative pr-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-primary/15 text-primary rounded-full">
              {outdated ? <Smartphone className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
            </div>
            <AlertDialogTitle className="text-lg font-bold tracking-tight text-left">{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-sm text-muted-foreground text-left">{text}</AlertDialogDescription>
          <button onClick={onClose} aria-label="Close dialog" className="absolute top-0 right-0 p-1.5 rounded-full hover:bg-secondary transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </AlertDialogHeader>

        {!outdated && (
          <ol className="space-y-2 list-decimal list-inside pl-1 text-sm">
            {servicesOff ? (
              <>
                <li>Tap <span className="font-semibold">Open Location Settings</span>.</li>
                <li>Turn <span className="font-semibold">Use location</span> on.</li>
                <li>Come back to Eth-Links — we&apos;ll find you automatically.</li>
              </>
            ) : (
              <>
                <li>Tap <span className="font-semibold">Open App Settings</span>.</li>
                <li>Tap <span className="font-semibold">Permissions</span> → <span className="font-semibold">Location</span>.</li>
                <li>Choose <span className="font-semibold text-primary">Allow only while using the app</span>.</li>
                <li>Come back to Eth-Links — we&apos;ll find you automatically.</li>
              </>
            )}
          </ol>
        )}
        {!canOpen && !outdated && !servicesOff && (
          <p className="text-xs text-muted-foreground">Or open your phone&apos;s Settings → Apps → Eth-Links → Permissions → Location.</p>
        )}

        <AlertDialogFooter className="flex flex-col gap-2 mt-2 max-sm:w-full sm:flex-col">
          {!outdated && (canOpen || servicesOff) && (
            <Button onClick={open} className="h-12 w-full gap-2 bg-[#f5c619] text-black hover:bg-[#f5c619]/90 font-bold">
              <Settings className="h-4 w-4" />
              {servicesOff ? 'Open Location Settings' : 'Open App Settings'}
            </Button>
          )}
          {onRetry && (
            <Button variant="outline" onClick={onRetry} className="h-12 w-full gap-2">
              <RefreshCw className="h-4 w-4" />
              {opened ? 'I turned it on — try again' : 'Try again'}
            </Button>
          )}
          <AlertDialogCancel asChild>
            <Button variant="ghost" onClick={onClose} className="h-11 w-full mt-0">Not now</Button>
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function BrowserLocationHelp({ isOpen, onClose }: Pick<LocationRecoveryModalProps, 'isOpen' | 'onClose'>) {
  const [activeTab, setActiveTab] = useState<'safari' | 'chrome' | 'general'>('safari');

  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* 
        Custom responsive layout for mobile viewport: 
        On small screens, it behaves like a bottom sheet sliding up.
        On larger screens, it behaves like a centered dialog.
      */}
      <AlertDialogContent 
        className="
          max-sm:fixed max-sm:bottom-0 max-sm:top-auto max-sm:left-0 max-sm:right-0 max-sm:translate-x-0 max-sm:translate-y-0
          max-sm:rounded-t-2xl max-sm:rounded-b-none max-sm:max-w-full max-sm:border-t max-sm:border-x-0 max-sm:border-b-0
          max-h-[85vh] flex flex-col gap-4 overflow-y-auto duration-300 p-6 bg-background border border-border sm:rounded-xl shadow-xl
        "
      >
        <AlertDialogHeader className="relative pr-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-destructive/10 text-destructive rounded-full">
              <Shield className="h-5 w-5" />
            </div>
            <AlertDialogTitle className="text-lg font-bold tracking-tight">
              How to Enable Location
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-sm text-muted-foreground text-left">
            Browser security requires manual permission updates once location is blocked. Follow these steps to restore service discovery.
          </AlertDialogDescription>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="absolute top-0 right-0 p-1.5 rounded-full hover:bg-secondary transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </AlertDialogHeader>

        {/* Tab selection for browser type */}
        <div className="flex border-b border-border p-1 bg-secondary/30 rounded-lg">
          <button
            onClick={() => setActiveTab('safari')}
            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'safari'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Compass className="h-3.5 w-3.5" />
            Safari (iOS)
          </button>
          <button
            onClick={() => setActiveTab('chrome')}
            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'chrome'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Chrome className="h-3.5 w-3.5" />
            Chrome
          </button>
          <button
            onClick={() => setActiveTab('general')}
            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'general'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
            Device Settings
          </button>
        </div>

        {/* Instructions content */}
        <div className="flex-1 min-h-[160px] py-2 text-sm text-foreground">
          {activeTab === 'safari' && (
            <ol className="space-y-3 list-decimal list-inside pl-1">
              <li className="leading-relaxed">
                Tap the <span className="font-semibold bg-secondary px-1.5 py-0.5 rounded text-xs">aA</span> icon or the <span className="font-semibold bg-secondary px-1.5 py-0.5 rounded text-xs">Lock</span> icon in the browser address bar.
              </li>
              <li className="leading-relaxed">
                Select <span className="font-semibold">Website Settings</span> from the dropdown menu.
              </li>
              <li className="leading-relaxed">
                Under Location, set the permission state to <span className="font-semibold text-primary">Allow</span>.
              </li>
              <li className="leading-relaxed">
                Close settings and tap <span className="font-semibold">Reload</span> below to apply changes.
              </li>
            </ol>
          )}

          {activeTab === 'chrome' && (
            <ol className="space-y-3 list-decimal list-inside pl-1">
              <li className="leading-relaxed">
                Tap the <span className="font-semibold bg-secondary px-1.5 py-0.5 rounded text-xs">Lock</span> or <span className="font-semibold bg-secondary px-1.5 py-0.5 rounded text-xs">Settings</span> icon to the left of the website URL.
              </li>
              <li className="leading-relaxed">
                Tap <span className="font-semibold">Permissions</span> or <span className="font-semibold">Site Settings</span>.
              </li>
              <li className="leading-relaxed">
                Find <span className="font-semibold">Location</span> and toggle it to <span className="font-semibold text-primary">Allow</span>.
              </li>
              <li className="leading-relaxed">
                Return to the page and refresh it to sort services.
              </li>
            </ol>
          )}

          {activeTab === 'general' && (
            <ol className="space-y-3 list-decimal list-inside pl-1">
              <li className="leading-relaxed">
                Open your device&apos;s global <span className="font-semibold">Settings</span> app.
              </li>
              <li className="leading-relaxed">
                Go to <span className="font-semibold">Privacy & Security</span> &gt; <span className="font-semibold">Location Services</span>.
              </li>
              <li className="leading-relaxed">
                Ensure Location is turned ON and permissions are enabled for your browser (Safari or Chrome).
              </li>
              <li className="leading-relaxed">
                Restart your browser and try reloading the application.
              </li>
            </ol>
          )}
        </div>

        <AlertDialogFooter className="flex flex-col sm:flex-row gap-2 mt-4 max-sm:w-full">
          <Button
            onClick={handleReload}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2"
            variant="default"
          >
            <RefreshCw className="h-4 w-4" />
            Reload Page
          </Button>
          <AlertDialogCancel asChild>
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 sm:flex-initial mt-0"
            >
              Dismiss
            </Button>
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
