"""Static Pages publishing gate; does not make network requests."""
from html.parser import HTMLParser
from pathlib import Path
import subprocess

CONTROLLER = 'https://apex.barsys.com/hud-assets/js/apex_analytics_consent.js'

class Scripts(HTMLParser):
    def __init__(self):
        super().__init__()
        self.matches = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'script' and attrs.get('src') == CONTROLLER:
            self.matches.append(attrs)

files = subprocess.check_output(['git', 'ls-files', '*.html'], text=True).splitlines()
assert len(files) >= 20
for name in files:
    parser = Scripts()
    parser.feed(Path(name).read_text())
    assert len(parser.matches) == 1, name
    assert parser.matches[0].get('referrerpolicy') == 'no-referrer', name
notice = Path('privacy-policy.html').read_text()
for text in ['off by default', 'form field values', '_apex_sid', 'Global Privacy Control']:
    assert text in notice, text
print(f'PASS: {len(files)} public pages install the consent controller once; notice covers storage and revocation.')
