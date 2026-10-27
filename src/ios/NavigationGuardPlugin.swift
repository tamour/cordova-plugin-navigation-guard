import Foundation
import UIKit
import WebKit

@objc(NavigationGuardPlugin)
class NavigationGuardPlugin: CDVPlugin {

    // Allowed domains for internal WebView navigation
    private let allowedHosts: Set<String> = [
        "localhost",
        "ts11dev.outsystems.net"
    ]

    @objc override func shouldAllowNavigation(to url: URL) -> Bool {
        guard let scheme = url.scheme?.lowercased() else {
            return false
        }

        // 1. Block dangerous inline schemes
        if scheme == "data" || scheme == "javascript" {
            NSLog("[NavigationGuard] Blocked dangerous scheme: %@", scheme)
            return false
        }

        // Permit local packaged assets
        if scheme == "file" || scheme == "app" || scheme == "ionic" {
            return true
        }

        // 2. Reject cleartext HTTP
        if scheme == "http" {
            NSLog("[NavigationGuard] Blocked cleartext HTTP navigation: %@", url.absoluteString)
            return false
        }

        // 3. Enforce hostname containment on HTTPS
        if scheme == "https", let host = url.host?.lowercased() {
            let isAllowed = allowedHosts.contains { allowed in
                host == allowed || host.hasSuffix("." + allowed)
            }

            if isAllowed {
                return true // Allow inside privileged WKWebView
            }

            // Untrusted domain: Eject to Safari
            NSLog("[NavigationGuard] Untrusted destination. Routing to Safari: %@", url.absoluteString)
            DispatchQueue.main.async {
                UIApplication.shared.open(url, options: [:], completionHandler: nil)
            }
            return false // Cancel internal navigation
        }

        return false
    }
}