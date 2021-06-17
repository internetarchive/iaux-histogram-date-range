# \<histogram-date-range>

Check out the [interactive demo](https://internetarchive.github.io/iaux-histogram-date-range/demo/).

This webcomponent follows the [open-wc](https://github.com/open-wc/open-wc) recommendation.

Travis:
[![Build Status](https://travis-ci.com/internetarchive/iaux-histogram-date-range.svg?branch=main)](https://travis-ci.com/internetarchive/iaux-histogram-date-range)
CodeCov: [![codecov](https://codecov.io/gh/internetarchive/iaux-histogram-date-range/branch/main/graph/badge.svg)](https://codecov.io/gh/internetarchive/iaux-histogram-date-range)

## Installation

```bash
npm i @internetarchive/histogram-date-range
```

## Usage

```html
<script type="module">
  import 'histogram-date-range/dist/src/histogram-date-range.js';
</script>
<histogram-date-range
  width="300"
  height="50"
  tooltipWidth="140"
  dateFormat="DD MMM YYYY"
  style="
    --histogramDateRangeTooltipFontSize: 1rem;
    --histogramDateRangeInputWidth: 85px;
  "
  minDate="1400"
  maxDate="2021"
  minSelectedDate="1800"
  maxSelectedDate="1900"
  bins="[ 74, 67, 17, 66, 49, 93, 47, 61, 32, 46, 53, 2,
          13, 45, 28, 1, 8, 70, 37, 74, 67, 17, 66, 49, 93,
          47, 61, 70, 37, 74, 67, 17, 66, 49, 93, 47, 61, 32,
          32, 70, 37, 74, 67, 17, 66, 49, 93, 47, 61, 32
        ]"
></histogram-date-range>
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
