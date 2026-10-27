package com.mycompany.originlock;

import android.net.Uri;
import android.util.Log;
import android.widget.Toast;

import org.apache.cordova.CordovaPlugin;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.Set;
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
    private boolean reportOnly = false;
    private final Set<String> shown = new HashSet<>();

    /** Report mode only: show the URL on screen (max 8 distinct) so no adb is needed. */
    private void notifyBlocked(final String url) {
        if (!reportOnly || shown.size() >= 8 || !shown.add(url)) return;
        cordova.getActivity().runOnUiThread(new Runnable() {
            public void run() {
                Toast.makeText(cordova.getActivity(), "OriginLock would block:\n" + url, Toast.LENGTH_LONG).show();
            }
        });
    }

    @Override
    protected void pluginInitialize() {
        reportOnly = "report".equalsIgnoreCase(preferences.getString("OriginLockMode", "enforce"));
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
        // Bundled app content only (not arbitrary file paths)
        if (url.startsWith("file:///android_asset/")) return true;
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
            Log.w(TAG, (reportOnly ? "WOULD BLOCK (report mode): " : "Blocked navigation to: ") + url);
            notifyBlocked(url);
            return !reportOnly; // handled -> WebView does not load it
        }
        return false;
    }

    @Override
    public Boolean shouldAllowNavigation(String url) {
        if (reportOnly) { if (!isAllowed(url)) notifyBlocked(url); return Boolean.TRUE; }
        return isAllowed(url) ? Boolean.TRUE : Boolean.FALSE;
    }

    @Override
    public Boolean shouldOpenExternalUrl(String url) {
        if (reportOnly) return null;
        return Boolean.FALSE; // never hand arbitrary URLs to other apps
    }
}
