# \<histogram-date-range>

This webcomponent follows the [open-wc](https://github.com/open-wc/open-wc) recommendation.

Travis:
[![Build Status](https://travis-ci.com/internetarchive/iaux-histogram-date-range.svg?branch=main)](https://travis-ci.com/internetarchive/iaux-histogram-date-range)
CodeCov: [![codecov](https://codecov.io/gh/internetarchive/iaux-histogram-date-range/branch/main/graph/badge.svg)](https://codecov.io/gh/internetarchive/iaux-histogram-date-range)

## Installation

```bash
npm i histogram-date-range
```

## Usage

```html
<script type="module">
  import 'histogram-date-range/histogram-date-range.js';
</script>

<histogram-date-range></histogram-date-range>
```

## Linting with ESLint, Prettier, and Types

To scan the project for linting errors, run

```bash
npm run lint
```

You can lint with ESLint and Prettier individually as well

```bash
npm run lint:eslint
```

```bash
npm run lint:prettier
```

To automatically fix many linting errors, run

```bash
npm run format
```

You can format using ESLint and Prettier individually as well

```bash
npm run format:eslint
```

```bash
npm run format:prettier
```

## Testing with Web Test Runner

To run the suite of Web Test Runner tests, run

```bash
npm run test
```

To run the tests in watch mode (for &lt;abbr title=&#34;test driven development&#34;&gt;TDD&lt;/abbr&gt;, for example), run

```bash
npm run test:watch
```

## Tooling configs

For most of the tools, the configuration is in the `package.json` to reduce the amount of files in your project.

If you customize the configuration a lot, you can consider moving them to individual files.

## Local Demo with `web-dev-server`

```bash
npm start
```

To run a local development server that serves the basic demo located in `demo/index.html`
