from pathlib import Path
root = Path('e:/Life Style')
html_files = [p for p in root.glob('*.html') if p.name not in ('admin.html', 'payment.html')]
new_modal = '''    <!-- Auth Modal -->
    <div class="modal-overlay" id="auth-overlay"></div>
    <div class="auth-modal" id="auth-modal">
        <button class="close-modal-btn" id="close-auth-btn"><i class="fas fa-times"></i></button>
        <div class="auth-content">
            <h2>WELCOME BACK</h2>
            <p>Login to House Of Viyara for a personalized experience.</p>
            <div id="google-login-btn" style="margin: 20px 0; min-height: 40px;"></div>
            <div style="text-align: center; margin-top: -10px; margin-bottom: 20px;">
                <a href="admin.html" class="admin-access-link" style="font-size: 0.8rem; font-weight: 800; text-decoration: underline; color: var(--primary-color); opacity: 0.7; transition: all 0.2s; display: inline-flex; align-items: center; gap: 5px;">
                    <i class="fas fa-user-shield"></i> ADMIN PORTAL
                </a>
            </div>
            <p style="font-size: 0.85rem; opacity: 0.7; text-align: center; margin-top: 15px;">Sign in with Google to continue.</p>
        </div>
    </div>
'''
for path in sorted(html_files):
    text = path.read_text(encoding='utf-8')
    if '<!-- Auth Modal -->' not in text:
        print(f'SKIP {path.name}: no auth modal marker')
        continue
    start = text.index('<!-- Auth Modal -->')
    end = text.find('\n    <div class="mobile-menu"', start)
    if end == -1:
        end = text.find('\n    <div class="cart-drawer-overlay"', start)
    if end == -1:
        end = text.find('\n    <main', start)
    if end == -1:
        print(f'NO END MARKER {path.name}')
        continue
    new_text = text[:start] + new_modal + text[end:]
    if new_text != text:
        path.write_text(new_text, encoding='utf-8')
        print(f'Patched {path.name}')
    else:
        print(f'No change {path.name}')
