package com.mycompany.originlock;

import android.net.Uri;
import android.util.Log;

import org.apache.cordova.CordovaPlugin;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Blocks any top-level navigation whose origin is not in the allow-list.
 * PluginManager consults plugins BEFORE the config.xml allow-navigation list,
 * so even if a wildcard slips into config.xml this plugin still wins.
 */
public class OriginLock extends CordovaPlugin {
    private static final String TAG = "OriginLock";
    private static final String DEFAULT =
        "https://localhost,http://localhost,https://ts11dev.outsystems.net";

    private final List<String[]> allowed = new ArrayList<>(); // {scheme, host, port}

    @Override
    protected void pluginInitialize() {
        String pref = preferences.getString("OriginLockAllowed", DEFAULT);
        for (String entry : pref.split(",")) {
            entry = entry.trim();
            if (entry.isEmpty()) continue;
            Uri u = Uri.parse(entry);
            if (u.getScheme() == null || u.getHost() == null) continue;
            allowed.add(new String[]{
                u.getScheme().toLowerCase(Locale.ROOT),
                u.getHost().toLowerCase(Locale.ROOT),
                String.valueOf(effectivePort(u))});
        }
        Log.d(TAG, "Allowed origins: " + pref);
    }

    private static int effectivePort(Uri u) {
        if (u.getPort() != -1) return u.getPort();
        String s = u.getScheme() == null ? "" : u.getScheme().toLowerCase(Locale.ROOT);
        if (s.equals("https")) return 443;
        if (s.equals("http")) return 80;
        return -1;
    }

    private boolean isAllowed(String url) {
        if (url == null) return false;
        if (url.equals("about:blank")) return true;
        Uri u;
        try { u = Uri.parse(url); } catch (Exception e) { return false; }
        if (u.getScheme() == null || u.getHost() == null) return false;
        // Reject userinfo tricks like https://ts11dev.outsystems.net@evil.com
        if (u.getUserInfo() != null) return false;
        String scheme = u.getScheme().toLowerCase(Locale.ROOT);
        String host = u.getHost().toLowerCase(Locale.ROOT);
        String port = String.valueOf(effectivePort(u));
        for (String[] a : allowed) {
            if (a[0].equals(scheme) && a[1].equals(host) && a[2].equals(port)) return true;
        }
        return false;
    }

    /** Consume (block) the navigation entirely so it can't fall through to an external intent. */
    @Override
    public boolean onOverrideUrlLoading(String url) {
        if (!isAllowed(url)) {
            Log.w(TAG, "Blocked navigation to: " + url);
            return true; // handled -> WebView does not load it
        }
        return false;
    }

    @Override
    public Boolean shouldAllowNavigation(String url) {
        return isAllowed(url) ? Boolean.TRUE : Boolean.FALSE;
    }

    @Override
    public Boolean shouldOpenExternalUrl(String url) {
        return Boolean.FALSE; // never hand arbitrary URLs to other apps
    }
}
