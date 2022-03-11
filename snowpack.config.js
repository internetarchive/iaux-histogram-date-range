module.exports = {
  buildOptions: {
    out: 'docs',
  },
  mount: {
    'demo/js': { url: '/dist/demo/js' },
    demo: { url: '/demo' },
    src: { url: '/dist/src' },
  },
};
