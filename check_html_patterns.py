from pathlib import Path
import re
root = Path('e:/Life Style')
patterns = [r'auth-target', r'auth-email', r'send-otp-btn', r'verify-otp-btn', r'auth-otp', r'OR USE OTP', r'google-auth-btn', r'google-login-btn', r'payment\.html\?txnid', r'/api/']
for path in sorted(root.glob('*.html')):
    text = path.read_text(encoding='utf-8')
    found = [pat for pat in patterns if re.search(pat, text)]
    if found:
        print(path.name, found)
