/* global WEBVR_VOICE_NAV */
(function () {
  if (!('WEBVR_VOICE_NAV' in window)) {
    return;
  }
  WEBVR_VOICE_NAV.addItems([
    {
      title: 'The Original Scene',
      slug: 'tos',
      url: '/~cvan/tos/',
      keywords: []
    }
  ]);
})();
