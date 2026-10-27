# cordova-plugin-navigation-guard

Confines the WebView to an allow-list of origins.

## OutSystems (Extensibility Configurations JSON)
```json
{
  "plugin": {
    "url": "https://github.com/<you>/cordova-plugin-navigation-guard.git#1.0.0",
    "variables": [
      { "name": "ALLOWED_ORIGINS",
        "value": "https://localhost,http://localhost,ionic://localhost,app://localhost,https://ts11dev.outsystems.net" }
    ]
  }
}
```
Host the folder in a Git repo reachable by MABS (or use a zip/local path per your MABS setup).
Rebuild the app via MABS, then retest `window.location.href='https://10.18.122.207'` - it must not navigate.
