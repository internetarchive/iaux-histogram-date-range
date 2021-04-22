import {
  css,
  html,
  LitElement,
  PropertyValues,
  svg,
  SVGTemplateResult,
  TemplateResult,
} from 'lit';
import { property, state, query, customElement } from 'lit/decorators.js';
import dayjs from 'dayjs/esm/index.js';

// these values can be overridden via the component's HTML (camelCased) attributes
const WIDTH = 180;
const HEIGHT = 40;
const SLIDER_WIDTH = 10;
const TOOLTIP_WIDTH = 125;
const TOOLTIP_HEIGHT = 30;
const DATE_FORMAT = 'M/D/YYYY';
const MISSING_DATA = 'no data';

// this constant is not set up to be overridden
const SLIDER_CORNER_SIZE = 4;

// these CSS custom props can be overridden from the HTML that is invoking this component
const sliderFill = 'var(--histogramDateRangeSliderFill, #4B65FE)';
const selectedRangeFill = 'var(--histogramDateRangeSelectedRangeFill, #DBE0FF)';
const barIncludedFill = 'var(--histogramDateRangeBarIncludedFill, #2C2C2C)';
const barExcludedFill = 'var(--histogramDateRangeBarExcludedFill, #CCCCCC)';
const inputBorder = css`var(--histogramDateRangeInputBorder, 0.5px solid #2C2C2C)`;
const inputWidth = css`var(--histogramDateRangeInputWidth, 70px)`;
const inputFontSize = css`var(--histogramDateRangeInputFontSize, 1.2rem)`;
const tooltipBackgroundColor = css`var(--histogramDateRangeTooltipBackgroundColor, #2C2C2C)`;
const tooltipTextColor = css`var(--histogramDateRangeTooltipTextColor, #FFFFFF)`;
const tooltipFontSize = css`var(--histogramDateRangeTooltipFontSize, 1.1rem)`;

type SliderId = 'slider-min' | 'slider-max';

class HistogramInputData {
  minDate = '';
  maxDate = '';
  bins: number[] = [];
}

interface HistogramItem {
  value: number;
  height: number;
  binStart: string;
  binEnd: string;
}

@customElement('histogram-date-range')
export class HistogramDateRange extends LitElement {
  /* eslint-disable lines-between-class-members */

  // these properties are intended to be passed in as attributes
  @property({ type: Number }) width = WIDTH;
  @property({ type: Number }) height = HEIGHT;
  @property({ type: Number }) sliderWidth = SLIDER_WIDTH;
  @property({ type: Number }) tooltipWidth = TOOLTIP_WIDTH;
  @property({ type: Number }) tooltipHeight = TOOLTIP_HEIGHT;
  @property({ type: String }) dateFormat = DATE_FORMAT;
  @property({ type: String }) missingDataMessage = MISSING_DATA;
  @property({ type: Object }) data = new HistogramInputData();

  @state() minSliderX = 0;
  @state() maxSliderX = 0;
  @state() tooltipOffset = 0;
  @state() tooltipContent?: TemplateResult;
  @state() tooltipVisible = false;
  @state() isDragging = false;

  @query('#tooltip') tooltip!: HTMLDivElement;
  @query('#container') container!: HTMLDivElement;

  // these properties don't need to be tracked for changes
  private _minDate = 0;
  private _maxDate = 0;
  private _dragOffset = 0;
  private _histWidth = 0;
  private _numBins = 0;
  private _binWidth = 0;
  private _currentSlider?: SVGRectElement;
  private _histData: HistogramItem[] = [];

  /* eslint-enable lines-between-class-members */

  updated(changedProps: PropertyValues): void {
    if (changedProps.has('data')) {
      this.handleDataUpdate();
    }
  }

  private handleDataUpdate(): void {
    if (!this.hasData) {
      return;
    }
    this.minSliderX = this.sliderWidth;
    this.maxSliderX = this.width - this.sliderWidth;
    this._histWidth = this.width - this.sliderWidth * 2;
    this._minDate = dayjs(this.data.minDate).valueOf();
    this._maxDate = dayjs(this.data.maxDate).valueOf();
    this._numBins = this.data.bins.length;
    this._binWidth = this._histWidth / this._numBins;
    const minValue = Math.min(...this.data.bins);
    const maxValue = Math.max(...this.data.bins);
    const valueScale = this.height / Math.log1p(maxValue - minValue);
    const dateScale = this.dateRange / this._numBins;
    this._histData = this.data.bins.map((v: number, i: number) => {
      return {
        value: v,
        height: Math.floor(Math.log1p(v) * valueScale),
        binStart: `${dayjs(i * dateScale + this._minDate).format(
          this.dateFormat
        )}`,
        binEnd: `${dayjs((i + 1) * dateScale + this._minDate).format(
          this.dateFormat
        )}`,
      };
    });
    this.requestUpdate();
  }

  private get hasData(): boolean {
    return this.data.bins.length > 0;
  }

  private get dateRange(): number {
    return this._maxDate - this._minDate;
  }

  private showTooltip(e: PointerEvent): void {
    if (this.isDragging) {
      return;
    }
    const target = e.currentTarget as SVGRectElement;
    const x = target.x.baseVal.value + this.sliderWidth / 2;
    const dataset = target.dataset;
    const itemsText = `item${dataset.numItems !== '1' ? 's' : ''}`;

    this.tooltipOffset =
      x + (this._binWidth - this.sliderWidth - this.tooltipWidth) / 2;

    this.tooltipContent = html`
      ${dataset.numItems} ${itemsText}<br />
      ${dataset.binStart} - ${dataset.binEnd}
    `;
    this.tooltipVisible = true;
  }

  private hideTooltip(): void {
    this.tooltipContent = undefined;
    this.tooltipVisible = false;
  }

  // use arrow functions (rather than standard JS class instance methods) so
  // that `this` is bound to the histogramDateRange object and not the event
  // target. for more info see
  // https://lit-element.polymer-project.org/guide/events#using-this-in-event-listeners
  private drag = (e: PointerEvent): void => {
    // prevent selecting text or other ranges while dragging, especially in Safari
    e.preventDefault();

    this.setDragOffset(e);
    this.isDragging = true;

    window.addEventListener('pointermove', this.move);
    window.addEventListener('pointerup', this.drop);
    window.addEventListener('pointercancel', this.drop);
  };

  private drop = (): void => {
    this.isDragging = false;

    window.removeEventListener('pointermove', this.move);
    window.removeEventListener('pointerup', this.drop);
    window.removeEventListener('pointercancel', this.drop);
  };

  private move = (e: PointerEvent): void => {
    const newX = e.offsetX - this._dragOffset;
    const slider = this._currentSlider as SVGRectElement;
    return (slider.id as SliderId) === 'slider-min'
      ? this.setMinSlider(newX)
      : this.setMaxSlider(newX);
  };

  // find position of pointer in relation to the current slider
  private setDragOffset(e: PointerEvent): void {
    this._currentSlider = e.currentTarget as SVGRectElement;
    const sliderX =
      (this._currentSlider.id as SliderId) === 'slider-min'
        ? this.minSliderX
        : this.maxSliderX;
    this._dragOffset = e.offsetX - sliderX;
    // work around Firefox issue where e.offsetX seems to be not based on current
    // element but on background element
    if (
      this._dragOffset > this.sliderWidth ||
      this._dragOffset < -this.sliderWidth
    ) {
      this._dragOffset = 0;
    }
  }

  private setMinSlider(newX: number): void {
    const toSet = Math.max(newX, this.sliderWidth);
    this.minSliderX = Math.min(toSet, this.maxSliderX);
  }

  private setMaxSlider(newX: number): void {
    const toSet = Math.max(newX, this.minSliderX);
    this.maxSliderX = Math.min(toSet, this.width - this.sliderWidth);
  }

  private translatePositionToDate(x: number): string {
    const milliseconds =
      ((x - this.sliderWidth) * this.dateRange) / this._histWidth;
    const date = dayjs(this._minDate + milliseconds);
    return date.isValid() ? date.format(this.dateFormat) : '';
  }

  private translateDateToPosition(date: string): number | null {
    const milliseconds: number | undefined = dayjs(date).valueOf();
    if (!milliseconds) {
      return null;
    }
    // translate where we are within the date range into what the new x-position
    // of the slider should be
    return (
      this.sliderWidth +
      ((milliseconds - this._minDate) * this._histWidth) / this.dateRange
    );
  }

  private handleMinDateInput(e: InputEvent): void {
    const target = e.currentTarget as HTMLInputElement;
    const newX = this.translateDateToPosition(target.value);
    if (newX) {
      this.setMinSlider(newX);
    }
    target.value = this.minInputValue;
  }

  private handleMaxDateInput(e: InputEvent): void {
    const target = e.currentTarget as HTMLInputElement;
    const newX = this.translateDateToPosition(target.value);
    if (newX) {
      this.setMaxSlider(newX);
    }
    target.value = this.maxInputValue;
  }

  private get minInputValue(): string {
    return this.translatePositionToDate(this.minSliderX);
  }

  private get maxInputValue(): string {
    return this.translatePositionToDate(this.maxSliderX);
  }

  private get minSliderTemplate(): SVGTemplateResult {
    // width/height in pixels of curved part of the sliders (like
    // border-radius); used as part of a SVG quadratic curve. see
    // https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths#curve_commands
    const c = SLIDER_CORNER_SIZE;

    const sliderShape = `
            M${this.minSliderX},0
            h-${this.sliderWidth - c}
            q-${c},0 -${c},${c}
            v${this.height - c * 2}
            q0,${c} ${c},${c}
            h${this.sliderWidth - c}
          `;
    return this.generateSliderSVG(this.minSliderX, 'slider-min', sliderShape);
  }

  private get maxSliderTemplate(): SVGTemplateResult {
    const c = SLIDER_CORNER_SIZE;
    const sliderShape = `
            M${this.maxSliderX},0
            h${this.sliderWidth - c}
            q${c},0 ${c},${c}
            v${this.height - c * 2}
            q0,${c} -${c},${c}
            h-${this.sliderWidth - c}
          `;
    return this.generateSliderSVG(this.maxSliderX, 'slider-max', sliderShape);
  }

  private generateSliderSVG(
    sliderPositionX: number,
    id: SliderId,
    sliderShape: string
  ): SVGTemplateResult {
    // whether the curved part of the slider is facing towards the left (1), ie
    // minimum, or facing towards the right (-1), ie maximum
    const k = id === 'slider-min' ? 1 : -1;

    return svg`
    <svg
      id="${id}"
      @pointerdown="${this.drag}"
    >
      <path d="${sliderShape} z" fill="${sliderFill}" />
      <rect
        x="${
          sliderPositionX - this.sliderWidth * k + this.sliderWidth * 0.4 * k
        }"
        y="${this.height / 3}"
        width="1"
        height="${this.height / 3}"
        fill="white"
      />
      <rect
        x="${
          sliderPositionX - this.sliderWidth * k + this.sliderWidth * 0.6 * k
        }"
        y="${this.height / 3}"
        width="1"
        height="${this.height / 3}"
        fill="white"
      />
    </svg>
    `;
  }

  get selectedRangeTemplate(): SVGTemplateResult {
    return svg`
      <rect
        x="${this.minSliderX}"
        y="0"
        width="${this.maxSliderX - this.minSliderX}"
        height="${this.height}"
        fill="${selectedRangeFill}"
      />`;
  }

  get histogramTemplate(): SVGTemplateResult[] {
    const xScale = this._histWidth / this._numBins;
    const barWidth = xScale - 1;
    let x = this.sliderWidth; // start at the left edge of the histogram
    return this._histData.map(data => {
      const bar = svg`
        <rect
          class="bar"
          x="${x}"
          y="${this.height - data.height}"
          width="${barWidth}"
          height="${data.height}"
          @pointerenter="${this.showTooltip}"
          @pointerleave="${this.hideTooltip}"
          fill="${
            x >= this.minSliderX && x <= this.maxSliderX
              ? barIncludedFill
              : barExcludedFill
          }"
          data-num-items="${data.value}"
          data-bin-start="${data.binStart}"
          data-bin-end="${data.binEnd}"
        />`;
      x += xScale;
      return bar;
    });
  }

  get minInputTemplate(): TemplateResult {
    return html`
      <input
        id="date-min"
        placeholder="${DATE_FORMAT}"
        type="text"
        @change="${this.handleMinDateInput}"
        .value="${this.minInputValue}"
      />
    `;
  }

  get maxInputTemplate(): TemplateResult {
    return html`
      <input
        id="date-max"
        placeholder="${DATE_FORMAT}"
        type="text"
        @change="${this.handleMaxDateInput}"
        .value="${this.maxInputValue}"
      />
    `;
  }

  get tooltipTemplate(): TemplateResult {
    return html`
      <style>
        #tooltip {
          width: ${this.tooltipWidth}px;
          height: ${this.tooltipHeight}px;
          top: ${-9 - this.tooltipHeight}px;
          left: ${this.tooltipOffset}px;
          display: ${this.tooltipVisible ? 'block' : 'none'};
        }
        #tooltip:after {
          left: ${this.tooltipWidth / 2}px;
        }
      </style>
      <div id="tooltip">${this.tooltipContent}</div>
    `;
  }

  static styles = css`
    #container {
      margin: 0;
      touch-action: none;
      position: relative;
    }
    /* prevent selection from interfering with tooltip, especially on mobile */
    /* https://stackoverflow.com/a/4407335/1163042 */
    .noselect {
      -webkit-touch-callout: none; /* iOS Safari */
      -webkit-user-select: none; /* Safari */
      -moz-user-select: none; /* Old versions of Firefox */
      -ms-user-select: none; /* Internet Explorer/Edge */
      user-select: none; /* current Chrome, Edge, Opera and Firefox */
    }
    .bar:hover {
      fill-opacity: 0.7;
    }
    /****** histogram ********/
    #tooltip {
      position: absolute;
      background: ${tooltipBackgroundColor};
      color: ${tooltipTextColor};
      text-align: center;
      border-radius: 3px;
      padding: 2px;
      font-size: ${tooltipFontSize};
      font-family: sans-serif;
      touch-action: none;
      pointer-events: none;
    }
    #tooltip:after {
      content: '';
      position: absolute;
      margin-left: -5px;
      top: 100%;
      /* arrow */
      border: 5px solid ${tooltipTextColor};
      border-color: ${tooltipBackgroundColor} transparent transparent
        transparent;
    }
    /****** slider ********/
    .draggable:hover {
      cursor: grab;
    }
    .dragging {
      cursor: grabbing !important;
    }
    /****** inputs ********/
    #inputs {
      display: flex;
      justify-content: center;
    }
    #inputs .dash {
      position: relative;
      bottom: -1px;
    }
    input {
      width: ${inputWidth};
      margin: 0 3px;
      border: ${inputBorder};
      border-radius: 2px !important;
      text-align: center;
      font-size: ${inputFontSize};
    }
  `;

  render(): TemplateResult {
    if (!this.hasData) {
      return html`${this.missingDataMessage}`;
    }
    return html`
      <div
        id="container"
        class="noselect ${this.isDragging ? 'dragging' : ''}"
        style="width: ${this.width}px"
      >
        ${this.tooltipTemplate}
        <svg
          width="${this.width}"
          height="${this.height}"
          @pointerleave="${this.drop}"
        >
          ${this.selectedRangeTemplate}
          <svg id="histogram">${this.histogramTemplate}</svg>
          ${this.minSliderTemplate} ${this.maxSliderTemplate}
        </svg>
        <div id="inputs">
          ${this.minInputTemplate}
          <div class="dash">-</div>
          ${this.maxInputTemplate}
        </div>
      </div>
    `;
  }
}
