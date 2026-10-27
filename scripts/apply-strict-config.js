module.exports = function(context) {
    var fs = require('fs');
    var path = require('path');

    // The restricted domain allowed for this application
    var targetOrigin = "https://ts11dev.outsystems.net";

    function secureConfig(configPath) {
        if (!fs.existsSync(configPath)) {
            return;
        }
        
        console.log("Locking down WebView rules in: " + configPath);
        var content = fs.readFileSync(configPath, 'utf8');

        // 1. Strip out all existing permissive access, navigation, and intent tags
        content = content.replace(/<access[^>]*>/g, '');
        content = content.replace(/<allow-navigation[^>]*>/g, '');
        content = content.replace(/<allow-intent[^>]*>/g, '');
        content = content.replace(/<preference\s+name="UnsafeEvalUsage"[^>]*>/g, '');

        // 2. Define the secure payload based on the vulnerability remediation
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

        // 3. Inject the secured rules right before the closing </widget> tag
        content = content.replace('</widget>', secureRules);

        fs.writeFileSync(configPath, content);
    }

    // Target Android: <project_root>/platforms/android/app/src/main/res/xml/config.xml
    var androidConfig = path.join(context.opts.projectRoot, 'platforms', 'android', 'app', 'src', 'main', 'res', 'xml', 'config.xml');
    secureConfig(androidConfig);

    // Target iOS: <project_root>/platforms/ios/<app_name>/config.xml
    var iosPlatformDir = path.join(context.opts.projectRoot, 'platforms', 'ios');
    if (fs.existsSync(iosPlatformDir)) {
        var iosFiles = fs.readdirSync(iosPlatformDir);
        iosFiles.forEach(function(folderName) {
            var iosConfigPath = path.join(iosPlatformDir, folderName, 'config.xml');
            // Check if the config.xml exists inside this subfolder (identifying the <app_name> directory)
            if (fs.existsSync(iosConfigPath) && fs.statSync(path.join(iosPlatformDir, folderName)).isDirectory()) {
                secureConfig(iosConfigPath);
            }
        });
    }
};