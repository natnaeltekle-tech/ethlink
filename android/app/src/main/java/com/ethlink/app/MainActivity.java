package com.ethlink.app;

import android.graphics.Color;
import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Force WebView background to dark — prevents white flash between
        // splash screen hide and page render for remote URL loading
        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                webView.setBackgroundColor(Color.parseColor("#0B0C15"));
            }
        } catch (Exception e) {
            // Bridge may not be ready; non-fatal
        }
    }
}
