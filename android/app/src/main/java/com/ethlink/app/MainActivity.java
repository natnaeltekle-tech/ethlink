package com.ethlink.app;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    /**
     * Tiny bridge for the web app (window.EthLinksNative):
     *  - pushReady(): true only when this APK was built with android/app/google-services.json.
     *    Without Firebase, PushNotifications.register() would crash the app, so the
     *    web code checks this first and simply skips push registration.
     *  - openAppSettings(): opens Settings → Apps → Eth-Links, so a user who tapped
     *    "Don't allow" on the location prompt can turn it back on in one tap.
     *  - openLocationSettings(): opens the device Location (GPS) switch.
     *  - oauthReady(): true in builds that handle the com.ethlink.app://login-callback
     *    deep link, so the web app only offers "Continue with Google" where it can return.
     */
    public static class NativeInfo {
        private final boolean pushReady;
        private final Activity activity;

        NativeInfo(Activity activity, boolean pushReady) {
            this.activity = activity;
            this.pushReady = pushReady;
        }

        @JavascriptInterface
        public boolean pushReady() {
            return pushReady;
        }

        @JavascriptInterface
        public boolean oauthReady() {
            return true;
        }

        @JavascriptInterface
        public boolean openAppSettings() {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                Uri.fromParts("package", activity.getPackageName(), null));
            return launch(intent);
        }

        @JavascriptInterface
        public boolean openLocationSettings() {
            return launch(new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS));
        }

        private boolean launch(Intent intent) {
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try {
                activity.runOnUiThread(() -> {
                    try {
                        activity.startActivity(intent);
                    } catch (Exception ignored) {
                        // No settings screen on this device; the web app shows written steps instead
                    }
                });
                return true;
            } catch (Exception e) {
                return false;
            }
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                // Force WebView background to dark — prevents white flash between
                // splash screen hide and page render for remote URL loading
                webView.setBackgroundColor(Color.parseColor("#0B0C15"));

                // The google-services Gradle plugin generates this string resource.
                boolean firebaseConfigured =
                    getResources().getIdentifier("google_app_id", "string", getPackageName()) != 0;
                webView.addJavascriptInterface(new NativeInfo(this, firebaseConfigured), "EthLinksNative");
            }
        } catch (Exception e) {
            // Bridge may not be ready; non-fatal
        }
    }
}
