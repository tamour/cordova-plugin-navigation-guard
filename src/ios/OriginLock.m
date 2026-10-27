#import <Cordova/CDVPlugin.h>

@interface OriginLock : CDVPlugin
@property (nonatomic, strong) NSArray<NSDictionary*>* allowed;
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

- (BOOL)isAllowed:(NSURL*)u {
    if (!u) return NO;
    if ([u.absoluteString isEqualToString:@"about:blank"]) return YES;
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
    if (!ok) NSLog(@"[OriginLock] Blocked navigation to: %@", request.URL);
    return ok;
}

@end
