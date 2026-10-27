#!/usr/bin/env node
// Runs after `cordova prepare`: strips wildcard allow-* entries from the platform config.xml
// and re-adds only the allow-listed origins. Pure Node (no npm deps) so it works in cloud builds.
const fs = require('fs');
const path = require('path');

const REMOVE_UNSAFE_EVAL = false; // set true ONLY after testing - OutSystems runtime may need eval

module.exports = function (ctx) {
  const root = ctx.opts.projectRoot;
  const origins = (process.env.ORIGINLOCK_ALLOWED ||
    'https://localhost,http://localhost,https://ts11dev.outsystems.net').split(',').map(s => s.trim()).filter(Boolean);
  // Only network origins belong in allow-navigation / access
  const hosts = origins.filter(o => /^https?:\/\//.test(o));

  const files = [];
  const android = path.join(root, 'platforms/android/app/src/main/res/xml/config.xml');
  if (fs.existsSync(android)) files.push(android);
  const iosDir = path.join(root, 'platforms/ios');
  if (fs.existsSync(iosDir)) {
    fs.readdirSync(iosDir).forEach(d => {
      const f = path.join(iosDir, d, 'config.xml');
      if (fs.existsSync(f)) files.push(f);
    });
  }

  files.forEach(f => {
    let xml = fs.readFileSync(f, 'utf8');
    xml = xml.replace(/[ \t]*<(allow-navigation|access|allow-intent)\b[^>]*?(\/>|>\s*<\/\1>)[ \t]*\r?\n?/g, '');
    if (REMOVE_UNSAFE_EVAL) {
      xml = xml.replace(/[ \t]*<preference\s+name="UnsafeEvalUsage"[^>]*\/>[ \t]*\r?\n?/gi, '');
    }
    const add = hosts.map(h => `    <allow-navigation href="${h}" />\n    <access origin="${h}" />`).join('\n');
    xml = xml.replace(/<\/widget>/, add + '\n</widget>');
    fs.writeFileSync(f, xml);
    console.log('[originlock] hardened ' + f);
  });
};
