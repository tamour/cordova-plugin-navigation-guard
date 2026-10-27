module.exports = function(context) {
    var fs = require('fs');
    var path = require('path');

    var targetOrigin = "https://ts11dev.outsystems.net";
    var appName = "TA_LocalStorage_DBScanner";
    var projectRoot = context.opts.projectRoot;

    function secureConfig(configPath) {
        if (!fs.existsSync(configPath)) {
            return;
        }
        
        var content = fs.readFileSync(configPath, 'utf8');

        // If the script has already run on this file, just do a secondary scrub of the wildcards
        if (content.indexOf('<!-- SECURE_LOCKDOWN_APPLIED -->') !== -1) {
            content = content.replace(/<allow-navigation[^>]*href="\*".*?>/gi, '');
            content = content.replace(/<allow-navigation[^>]*href="http:\/\/\*".*?>/gi, '');
            content = content.replace(/<allow-navigation[^>]*href="https:\/\/\*".*?>/gi, '');
            content = content.replace(/<allow-navigation[^>]*href="data:\*".*?>/gi, '');
            fs.writeFileSync(configPath, content);
            return;
        }

        console.log("WebView Lockdown: Securing " + configPath);

        // 1. Strip ALL existing permissive tags globally
        content = content.replace(/<access[^>]*>/gi, '');
        content = content.replace(/<allow-navigation[^>]*>/gi, '');
        content = content.replace(/<allow-intent[^>]*>/gi, '');
        content = content.replace(/<preference\s+name="UnsafeEvalUsage"[^>]*>/gi, '');

        // 2. Define the secure payload with a tracking comment
        var secureRules = `
    <!-- SECURE_LOCKDOWN_APPLIED -->
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
        }
    }

    // 1. Target ROOT config.xml (Crucial: MABS uses this to derive the other two)
    var rootConfig = path.join(projectRoot, 'config.xml');
    secureConfig(rootConfig);

    // 2. Target Android config.xml
    var androidConfig = path.join(projectRoot, 'platforms', 'android', 'app', 'src', 'main', 'res', 'xml', 'config.xml');
    secureConfig(androidConfig);

    // 3. Target iOS config.xml using your exact app name
    var iosConfigPath = path.join(projectRoot, 'platforms', 'ios', appName, 'config.xml');
    secureConfig(iosConfigPath);
};