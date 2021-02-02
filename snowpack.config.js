module.exports = {
  buildOptions: {
    out: 'docs',
  },
  mount: {
    demo: { url: '/demo', static: true },
    src: { url: '/dist' },
  },
};

