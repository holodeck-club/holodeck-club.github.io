/* global annyang */
(function () {
  if (!('annyang' in window)) {
    return;
  }
  if (annyang.addItems) {
    annyang.addItems([
      {
        title: 'A-Painter',
        slug: 'apainter',
        url: '/mozillavr/apainter/',
        keywords: ['paint', 'painting', 'tiltbrush', 'tilt', 'brush'],
      },
      {
        title: 'Droids Hunter',
        slug: 'droidshunter',
        url: '/mozillavr/droidshunter/'
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
      }
    ]);
  }
  annyang.start();
})();
