package com.redpenstudio.myteacherlife;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final int BAR_COLOR = Color.parseColor("#F97316");

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Android 15+ (API 35+) draws apps targeting SDK 35/36 edge-to-edge: the WebView would sit
        // under the status bar AND the navigation bar, hiding the bottom buttons. On those versions
        // we go edge-to-edge explicitly and shrink the WebView into the safe area ourselves.
        // Older Android versions already lay the app out between the system bars, so nothing changes there.
        if (Build.VERSION.SDK_INT < 35) return;

        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        WebView webView = getBridge().getWebView();
        // A WebView ignores its own padding for page layout, so pad its container instead:
        // the WebView then fills exactly the area between the system bars.
        View container = (View) webView.getParent();
        View decor = getWindow().getDecorView();
        ViewGroup content = findViewById(android.R.id.content);
        content.setBackgroundColor(BAR_COLOR); // colour shown behind the status / navigation bars

        // Listen on the decor view (the root) so we always receive the full insets, before any
        // inner layout can consume them.
        ViewCompat.setOnApplyWindowInsetsListener(decor, (v, insets) -> {
            Insets safe = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
            );
            container.setPadding(safe.left, safe.top, safe.right, safe.bottom);
            return WindowInsetsCompat.CONSUMED;
        });
        ViewCompat.requestApplyInsets(decor);

        // White status / navigation bar icons on the orange bars.
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(getWindow(), decor);
        controller.setAppearanceLightStatusBars(false);
        controller.setAppearanceLightNavigationBars(false);
    }
}
