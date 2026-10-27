package com.security.guard;

import android.content.Intent;
import android.net.Uri;
import android.util.Log;
import org.apache.cordova.CordovaPlugin;
import java.util.Arrays;
import java.util.List;

public class NavigationGuardPlugin extends CordovaPlugin {
    private static final String TAG = "NavigationGuard";

    // Allowed domains for internal WebView navigation
    private static final List<String> ALLOWED_HOSTS = Arrays.asList(
        "localhost",
        "ts11dev.outsystems.net"
    );

    @Override
    public boolean onOverrideUrlLoading(String url) {
        if (url == null) {
            return true;
        }

        Uri uri = Uri.parse(url);
        String scheme = uri.getScheme();

        // 1. Block dangerous inline schemes
        if ("data".equalsIgnoreCase(scheme) || "javascript".equalsIgnoreCase(scheme)) {
            Log.w(TAG, "Blocked dangerous scheme navigation: " + scheme);
            return true;
        }

        // Permit local packaged assets
        if ("file".equalsIgnoreCase(scheme)) {
            return false;
        }

        // 2. Reject cleartext HTTP
        if ("http".equalsIgnoreCase(scheme)) {
            Log.w(TAG, "Blocked cleartext HTTP navigation: " + url);
            return true;
        }

        // 3. Enforce hostname containment on HTTPS
        if ("https".equalsIgnoreCase(scheme)) {
            String host = uri.getHost();
            if (host != null) {
                for (String allowed : ALLOWED_HOSTS) {
                    if (host.equalsIgnoreCase(allowed) || host.endsWith("." + allowed)) {
                        return false; // Allow inside privileged WebView
                    }
                }
            }

            // Untrusted domain: Eject to system browser
            Log.i(TAG, "Untrusted destination. Ejecting to system browser: " + url);
            try {
                Intent browserIntent = new Intent(Intent.ACTION_VIEW, uri);
                cordova.getActivity().startActivity(browserIntent);
            } catch (Exception e) {
                Log.e(TAG, "Failed to launch external browser", e);
            }
            return true; // Cancel internal navigation
        }

        return true;
    }
}