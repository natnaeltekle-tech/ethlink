package com.ethlink.app;

import android.graphics.Color;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    /**
     * Tiny read-only bridge for the web app: window.EthLinksNative.pushReady()
     * is true only when this APK was built with android/app/google-services.json.
     * Without Firebase, PushNotifications.register() would crash the app, so the
     * web code checks this first and simply skips push registration.
     */
    public static class NativeInfo {
        private final boolean pushReady;

        NativeInfo(boolean pushReady) {
            this.pushReady = pushReady;
        }

        @JavascriptInterface
        public boolean pushReady() {
            return pushReady;
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
                webView.addJavascriptInterface(new NativeInfo(firebaseConfigured), "EthLinksNative");
            }
        } catch (Exception e) {
            // Bridge may not be ready; non-fatal
        }
    }
}
