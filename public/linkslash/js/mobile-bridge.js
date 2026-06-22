/**
 * Capacitor native paylaşım köprüsü — tam web uygulamasında ShareReceiver dinler.
 */
(function() {
  if (typeof window === 'undefined') return;
  if (!window.Capacitor || !window.Capacitor.Plugins || !window.Capacitor.Plugins.ShareReceiver) return;

  var MOBILE_SHELL = '/linkslash/mobile/whatsapp';

  async function forwardPendingShare() {
    try {
      var pending = await window.Capacitor.Plugins.ShareReceiver.getPendingShare();
      if (!pending || (!pending.text && !pending.html && !pending.title)) return;

      var isWhatsApp =
        pending.kind === 'whatsapp_export' ||
        (pending.text && pending.text.length > 500 && pending.text.indexOf('http') === -1);

      if (isWhatsApp || (pending.mimeType && String(pending.mimeType).indexOf('zip') !== -1)) {
        window.location.href = MOBILE_SHELL;
        return;
      }

      if (pending.text && /https?:\/\//i.test(pending.text)) {
        window.location.href = MOBILE_SHELL;
      }
    } catch (err) {
      console.warn('[LinkSlash mobile-bridge]', err);
    }
  }

  forwardPendingShare();

  if (window.Capacitor.Plugins.App && window.Capacitor.Plugins.App.addListener) {
    window.Capacitor.Plugins.App.addListener('appStateChange', function(state) {
      if (state && state.isActive) forwardPendingShare();
    });
  }
})();
