module.exports = function(context) {
    var fs = require('fs');
    var path = require('path');

    var targetOrigin = "https://ts11dev.outsystems.net";
    var appName = "TA_LocalStorage_DBScanner";

    function secureConfig(configPath) {
        if (!fs.existsSync(configPath)) {
            console.log("WebView Lockdown: File not found -> " + configPath);
            return;
        }
        
        console.log("WebView Lockdown: Securing " + configPath);
        var content = fs.readFileSync(configPath, 'utf8');

        // 1. Strip out all existing permissive tags to ensure a clean slate
        content = content.replace(/<access[^>]*>/g, '');
        content = content.replace(/<allow-navigation[^>]*>/g, '');
        content = content.replace(/<allow-intent[^>]*>/g, '');
        content = content.replace(/<preference\s+name="UnsafeEvalUsage"[^>]*>/g, '');

        // 2. Define the secure payload
        var secureRules = `
    <!-- Restrict backend access -->
    <access origin="${targetOrigin}" />
    <access origin="outsystems://*" />
    <access origin="cdvfile://*" />
    
    <!-- Lock WebView navigation exclusively to the trusted backend -->
    <allow-navigation href="${targetOrigin}/*" />
    
    <!-- Restrict intents to standard, safe OS handlers -->
    <allow-intent href="tel:*" />
    <allow-intent href="sms:*" />
    <allow-intent href="mailto:*" />
    <allow-intent href="geo:*" />
    
    <!-- Disable unsafe evaluation to harden the CSP -->
    <preference name="UnsafeEvalUsage" value="false" />
</widget>`;

        // 3. Inject the secured rules before closing tag
        if (content.indexOf('</widget>') !== -1) {
            content = content.replace('</widget>', secureRules);
            fs.writeFileSync(configPath, content);
            console.log("WebView Lockdown: Successfully secured " + configPath);
        }
    }

    // Target Android: <project_root>/platforms/android/app/src/main/res/xml/config.xml
    var androidConfig = path.join(context.opts.projectRoot, 'platforms', 'android', 'app', 'src', 'main', 'res', 'xml', 'config.xml');
    secureConfig(androidConfig);

    // Target iOS: <project_root>/platforms/ios/TA_LocalStorage_DBScanner/config.xml
    var iosConfigPath = path.join(context.opts.projectRoot, 'platforms', 'ios', appName, 'config.xml');
    secureConfig(iosConfigPath);
};