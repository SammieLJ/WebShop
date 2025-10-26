// Shim loader for app.v2.js — keeps compatibility for any pages still requesting /js/app.js
(function () {
    try {
        console.log('Loading app.v2.js shim...');
        var s = document.createElement('script');
        s.src = '/js/app.v2.js';
        s.async = true;
        s.onload = function () { console.log('Loaded /js/app.v2.js'); };
        s.onerror = function () { console.error('Failed to load /js/app.v2.js'); };
        document.head.appendChild(s);
    } catch (e) {
        console.error('Error in app.js shim:', e);
    }
})();

