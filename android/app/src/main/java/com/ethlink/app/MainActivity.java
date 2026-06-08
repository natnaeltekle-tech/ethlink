package com.ethlink.app;

import android.graphics.Color;
import android.os.Bundle;
import android.webkit.WebView;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final String DARK_BG = "#0B0C15";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Install Android 12+ splash screen BEFORE super.onCreate()
        // so the system splash uses our dark theme from styles.xml
        SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);

        // Attempt to set WebView background immediately after bridge init.
        // May fail if bridge isn't ready yet — onResume() will retry.
        setWebViewDarkBackground();
    }

    @Override
    protected void onResume() {
        super.onResume();
        // Retry setting the WebView background here, guaranteeing the bridge
        // is fully initialized. This closes the race condition where
        // getBridge().getWebView() returns null during onCreate().
        setWebViewDarkBackground();
    }

    /**
     * Forces the Capacitor WebView background to our dark theme color.
     * Prevents the default white WebView background from flashing between
     * the native splash screen hide and the remote page's first paint.
     */
    private void setWebViewDarkBackground() {
        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                webView.setBackgroundColor(Color.parseColor(DARK_BG));
            }
        } catch (Exception e) {
            // Bridge may not be ready; non-fatal — onResume will retry
        }
    }
}
