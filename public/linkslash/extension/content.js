(function() {
  if (window.__linkslashFabMounted) return;
  window.__linkslashFabMounted = true;

  if (location.protocol === 'chrome:' || location.protocol === 'chrome-extension:') return;
  if (location.hostname.includes('enaunity.com.tr') && location.pathname.startsWith('/dealer/linkslash')) return;

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.title = 'LinkSlash\'a Kaydet';
  btn.setAttribute('aria-label', 'LinkSlash\'a Kaydet');
  btn.textContent = '🔗';
  btn.style.cssText = [
    'position:fixed',
    'bottom:24px',
    'right:24px',
    'z-index:2147483646',
    'width:48px',
    'height:48px',
    'border:none',
    'border-radius:999px',
    'background:linear-gradient(135deg,#06b6d4,#0891b2)',
    'color:#fff',
    'font-size:20px',
    'cursor:pointer',
    'box-shadow:0 8px 24px rgba(0,0,0,0.25)',
    'opacity:0.92',
    'transition:transform 0.15s ease, opacity 0.15s ease'
  ].join(';');

  btn.addEventListener('mouseenter', function() {
    btn.style.transform = 'scale(1.06)';
    btn.style.opacity = '1';
  });
  btn.addEventListener('mouseleave', function() {
    btn.style.transform = 'scale(1)';
    btn.style.opacity = '0.92';
  });

  btn.addEventListener('click', function() {
    btn.disabled = true;
    btn.textContent = '…';
    chrome.runtime.sendMessage({ action: 'captureCurrentPage' }, function(response) {
      btn.disabled = false;
      btn.textContent = '🔗';
      if (!response) return;
      if (response.success) {
        btn.textContent = '✓';
        setTimeout(function() { btn.textContent = '🔗'; }, 1500);
      } else if (response.code === 'AUTH_REQUIRED' && response.loginUrl) {
        window.open(response.loginUrl, '_blank');
      } else if (response.gatewayUrl) {
        window.open(response.gatewayUrl, '_blank');
      }
    });
  });

  document.documentElement.appendChild(btn);
})();
