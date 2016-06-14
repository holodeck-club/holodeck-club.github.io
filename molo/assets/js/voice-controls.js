/* global WEBVR_VOICE_NAV */
(function () {
  if (!('WEBVR_VOICE_NAV' in window)) {
    return;
  }
  WEBVR_VOICE_NAV.addItems([
    {
      title: 'A-Painter',
      slug: 'apainter',
      url: '/mozillavr/apainter/',
      keywords: ['paint', 'painting', 'tiltbrush', 'tilt', 'brush']
    },
    {
      title: 'Droids Hunter',
      slug: 'droidshunter',
      url: '/mozillavr/droidshunter/',
      keywords: ['droid', 'shooting', 'shooter', 'shoot']
    },
    {
      title: 'Dynamic Lights',
      slug: 'dynamic-lights',
      url: '/mozillavr/dynamic-lights/'
    },
    {
      title: 'Spheres and Fog',
      slug: 'spheres-and-fog',
      url: '/mozillavr/spheres-and-fog/'
    },
    {
      title: 'Teleport',
      slug: 'teleport',
      url: '/mozillavr/teleport/'
    },
    {
      title: 'The Composer',
      slug: 'the-composer',
      url: '/molo/teleport/',
      keywords: ['music', 'musical', 'instrument', 'creature', 'cute']
    }
  ]);
})();
