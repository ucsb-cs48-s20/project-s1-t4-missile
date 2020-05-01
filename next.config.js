// next.config.js

// module.exports = {
//   /* make the game page not prerender */
//   devIndicators: {
//     autoPrerender: false,
//   },
// }

const withSass = require('@zeit/next-sass');
const withImages = require('next-images');

const devIndicators = { autoPrerender: false }

module.exports = withSass(withImages(devIndicators));
