#import <Cordova/CDVPlugin.h>

@interface OriginLock : CDVPlugin
@property (nonatomic, strong) NSArray<NSDictionary*>* allowed;
@property (nonatomic, assign) BOOL reportOnly;
@property (nonatomic, strong) NSMutableArray<NSString*>* pending;
@property (nonatomic, assign) BOOL scheduled;
@property (nonatomic, assign) int alertsShown;
@end

@implementation OriginLock

static NSNumber* EffectivePort(NSURL* u) {
    if (u.port) return u.port;
    NSString* s = u.scheme.lowercaseString;
    if ([s isEqualToString:@"https"]) return @443;
    if ([s isEqualToString:@"http"])  return @80;
    return @(-1);
}

- (void)pluginInitialize {
    self.reportOnly = [[self.commandDelegate.settings[@"originlockmode"] lowercaseString] isEqualToString:@"report"];
    NSString* pref = self.commandDelegate.settings[@"originlockallowed"];
    if (!pref.length) pref = @"https://localhost,http://localhost,ionic://localhost,app://localhost,https://ts11dev.outsystems.net";
    NSMutableArray* list = [NSMutableArray array];
    for (NSString* raw in [pref componentsSeparatedByString:@","]) {
        NSString* e = [raw stringByTrimmingCharactersInSet:NSCharacterSet.whitespaceCharacterSet];
        NSURL* u = [NSURL URLWithString:e];
        if (!u.scheme || !u.host) continue;
        [list addObject:@{ @"s": u.scheme.lowercaseString,
                           @"h": u.host.lowercaseString,
                           @"p": EffectivePort(u) }];
    }
    self.allowed = list;
}

// Report mode only: batch blocked URLs into one on-screen alert (no Xcode/Console needed).
- (void)notifyBlocked:(NSURL*)url {
    if (!self.reportOnly || self.alertsShown >= 3 || !url) return;
    if (!self.pending) self.pending = [NSMutableArray array];
    NSString* str = url.absoluteString;
    if (str.length > 120) str = [str substringToIndex:120];
    if (![self.pending containsObject:str] && self.pending.count < 8) [self.pending addObject:str];
    if (self.scheduled) return;
    self.scheduled = YES;
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(4 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
        NSString* msg = [self.pending componentsJoinedByString:@"\n\n"];
        UIAlertController* a = [UIAlertController alertControllerWithTitle:@"OriginLock would block"
                                message:msg preferredStyle:UIAlertControllerStyleAlert];
        [a addAction:[UIAlertAction actionWithTitle:@"OK" style:UIAlertActionStyleDefault handler:nil]];
        [self.viewController presentViewController:a animated:YES completion:nil];
        [self.pending removeAllObjects];
        self.alertsShown++;
        self.scheduled = NO;
    });
}

- (BOOL)isAllowed:(NSURL*)u {
    if (!u) return NO;
    if ([u.absoluteString isEqualToString:@"about:blank"]) return YES;
    // Bundled app content only (not arbitrary file paths)
    if ([u.scheme.lowercaseString isEqualToString:@"file"]) {
        return [u.path hasPrefix:NSBundle.mainBundle.bundlePath];
    }
    if (!u.scheme || !u.host) return NO;
    if (u.user || u.password) return NO; // https://ts11dev.outsystems.net@evil.com trick
    for (NSDictionary* a in self.allowed) {
        if ([a[@"s"] isEqualToString:u.scheme.lowercaseString] &&
            [a[@"h"] isEqualToString:u.host.lowercaseString] &&
            [a[@"p"] isEqualToNumber:EffectivePort(u)]) return YES;
    }
    return NO;
}

// Called by CDVWebViewNavigationDelegate for every navigation; returning NO blocks it.
// (Parameter type is NSInteger; the base declaration uses the equivalent enum - a harmless warning at most.)
- (BOOL)shouldOverrideLoadWithRequest:(NSURLRequest*)request navigationType:(NSInteger)navigationType {
    BOOL ok = [self isAllowed:request.URL];
    if (!ok) NSLog(@"[OriginLock] %@: %@", self.reportOnly ? @"WOULD BLOCK (report mode)" : @"Blocked navigation to", request.URL);
    if (!ok) [self notifyBlocked:request.URL];
    return ok || self.reportOnly;
}

@end
