import {
  css,
  html,
  LitElement,
  PropertyValues,
  svg,
  SVGTemplateResult,
  TemplateResult,
} from 'lit';
import { property, state, customElement } from 'lit/decorators.js';
import { live } from 'lit/directives/live.js';
import dayjs from 'dayjs/esm/index.js';
import '@internetarchive/ia-activity-indicator/ia-activity-indicator';

// these values can be overridden via the component's HTML (camelCased) attributes
const WIDTH = 180;
const HEIGHT = 40;
const SLIDER_WIDTH = 10;
const TOOLTIP_WIDTH = 125;
const TOOLTIP_HEIGHT = 30;
const DATE_FORMAT = 'YYYY';
const MISSING_DATA = 'no data';
const UPDATE_DEBOUNCE_DELAY_MS = 1000;

// this constant is not set up to be overridden
const SLIDER_CORNER_SIZE = 4;

// these CSS custom props can be overridden from the HTML that is invoking this component
const sliderFill = css`var(--histogramDateRangeSliderFill, #4B65FE)`;
const selectedRangeFill = css`var(--histogramDateRangeSelectedRangeFill, #DBE0FF)`;
const barIncludedFill = css`var(--histogramDateRangeBarIncludedFill, #2C2C2C)`;
const activityIndicatorColor = css`var(--histogramDateRangeActivityIndicator, #2C2C2C)`;
const barExcludedFill = css`var(--histogramDateRangeBarExcludedFill, #CCCCCC)`;
const inputBorder = css`var(--histogramDateRangeInputBorder, 0.5px solid #2C2C2C)`;
const inputWidth = css`var(--histogramDateRangeInputWidth, 35px)`;
const inputFontSize = css`var(--histogramDateRangeInputFontSize, 1.2rem)`;
const tooltipBackgroundColor = css`var(--histogramDateRangeTooltipBackgroundColor, #2C2C2C)`;
const tooltipTextColor = css`var(--histogramDateRangeTooltipTextColor, #FFFFFF)`;
const tooltipFontSize = css`var(--histogramDateRangeTooltipFontSize, 1.1rem)`;

type SliderId = 'slider-min' | 'slider-max';

interface HistogramItem {
  value: number;
  height: number;
  binStart: string;
  binEnd: string;
}

interface BarDataset extends DOMStringMap {
  numItems: string;
  binStart: string;
  binEnd: string;
}

@customElement('histogram-date-range')
export class HistogramDateRange extends LitElement {
  /* eslint-disable lines-between-class-members */

  // public reactive properties that can be set via HTML attributes
  @property({ type: Number }) width = WIDTH;
  @property({ type: Number }) height = HEIGHT;
  @property({ type: Number }) sliderWidth = SLIDER_WIDTH;
  @property({ type: Number }) tooltipWidth = TOOLTIP_WIDTH;
  @property({ type: Number }) tooltipHeight = TOOLTIP_HEIGHT;
  @property({ type: Number }) updateDelay = UPDATE_DEBOUNCE_DELAY_MS;
  @property() dateFormat = DATE_FORMAT;
  @property() missingDataMessage = MISSING_DATA;
  @property() minDate = '';
  @property() maxDate = '';
  @property({ type: Boolean }) disabled = false;
  @property({ type: Object }) bins: number[] = [];

  // internal reactive properties not exposed as attributes
  @state() private _tooltipOffset = 0;
  @state() private _tooltipContent?: TemplateResult;
  @state() private _tooltipVisible = false;
  @state() private _isDragging = false;
  @state() private _isLoading = false;

  // non-reactive properties (changes don't auto-trigger re-rendering)
  private _minSelectedDate = '';
  private _maxSelectedDate = '';
  private _minDateMS = 0;
  private _maxDateMS = 0;
  private _dragOffset = 0;
  private _histWidth = 0;
  private _binWidth = 0;
  private _currentSlider?: SVGRectElement;
  private _histData: HistogramItem[] = [];
  private _emitUpdatedEventTimer?: ReturnType<typeof setTimeout>;
  private _previousDateRange = '';

  /* eslint-enable lines-between-class-members */

  disconnectedCallback(): void {
    this.removeListeners();
    super.disconnectedCallback();
  }

  updated(changedProps: PropertyValues): void {
    if (changedProps.has('bins') || changedProps.has('Date')) {
      this.handleDataUpdate();
    }
  }

  /**
   * Set private properties that depend on the attribute bin data
   *
   * We're caching these values and not using getters to avoid recalculating all
   * of the hist data every time the user drags a slider or hovers over a bar
   * creating a tooltip.
   */
  private handleDataUpdate(): void {
    if (!this.hasBinData) {
      return;
    }
    this._histWidth = this.width - this.sliderWidth * 2;
    this._minDateMS = dayjs(this.minDate).valueOf();
    this._maxDateMS = dayjs(this.maxDate).valueOf();
    this._binWidth = this._histWidth / this._numBins;
    this._previousDateRange = this.currentDateRangeString;
    this._histData = this.calculateHistData();
    this.minSelectedDate = this.minSelectedDate
      ? this.minSelectedDate
      : this.minDate;
    this.maxSelectedDate = this.maxSelectedDate
      ? this.maxSelectedDate
      : this.maxDate;
    this.requestUpdate();
  }

  private calculateHistData(): HistogramItem[] {
    const minValue = Math.min(...this.bins);
    const maxValue = Math.max(...this.bins);
    const valueScale = this.height / Math.log1p(maxValue - minValue);
    const dateScale = this.dateRangeMS / this._numBins;
    return this.bins.map((v: number, i: number) => {
      return {
        value: v,
        height: Math.floor(Math.log1p(v) * valueScale),
        binStart: `${this.formatDate(i * dateScale + this._minDateMS)}`,
        binEnd: `${this.formatDate((i + 1) * dateScale + this._minDateMS)}`,
      };
    });
  }

  private get hasBinData(): boolean {
    return this._numBins > 0;
  }

  private get _numBins(): number {
    if (!this.bins || !this.bins.length) {
      return 0;
    }
    return this.bins.length;
  }

  /** component's loading (and disabled) state */
  @property({ type: Boolean }) get loading(): boolean {
    return this._isLoading;
  }

  set loading(value: boolean) {
    this.disabled = value;
    this._isLoading = value;
  }

  /** formatted minimum date of selected date range */
  @property() get minSelectedDate(): string {
    return this.formatDate(this._minSelectedDate);
  }

  set minSelectedDate(rawDate: string) {
    if (!this._minSelectedDate) {
      // because the values needed to calculate valid max/min values are not
      // available during the lit init when it's populating properties from
      // attributes, fall back to just the raw date if nothing is already set
      this._minSelectedDate = rawDate;
    }
    const x = this.translateDateToPosition(rawDate);
    if (x) {
      const validX = this.validMinSliderX(x);
      this._minSelectedDate = this.translatePositionToDate(validX);
    }
    this.requestUpdate();
  }

  /** formatted maximum date of selected date range */
  @property() get maxSelectedDate(): string {
    return this.formatDate(this._maxSelectedDate);
  }

  set maxSelectedDate(rawDate: string) {
    if (!this._maxSelectedDate) {
      // see comment above in the minSelectedDate setter
      this._maxSelectedDate = rawDate;
    }
    const x = this.translateDateToPosition(rawDate);
    if (x) {
      const validX = this.validMaxSliderX(x);
      this._maxSelectedDate = this.translatePositionToDate(validX);
    }
    this.requestUpdate();
  }
  /** horizontal position of min date slider */
  get minSliderX(): number {
    return (
      // default to leftmost position if missing or invalid min position
      this.translateDateToPosition(this.minSelectedDate) ?? this.sliderWidth
    );
  }

  /** horizontal position of max date slider */
  get maxSliderX(): number {
    return (
      // default to rightmost position if missing or invalid max position
      this.translateDateToPosition(this.maxSelectedDate) ??
      this.width - this.sliderWidth
    );
  }

  private get dateRangeMS(): number {
    return this._maxDateMS - this._minDateMS;
  }

  private showTooltip(e: PointerEvent): void {
    if (this._isDragging || this.disabled) {
      return;
    }
    const target = e.currentTarget as SVGRectElement;
    const x = target.x.baseVal.value + this.sliderWidth / 2;
    const dataset = target.dataset as BarDataset;
    const itemsText = `item${dataset.numItems !== '1' ? 's' : ''}`;

    this._tooltipOffset =
      x + (this._binWidth - this.sliderWidth - this.tooltipWidth) / 2;

    this._tooltipContent = html`
      ${dataset.numItems} ${itemsText}<br />
      ${dataset.binStart} - ${dataset.binEnd}
    `;
    this._tooltipVisible = true;
  }

  private hideTooltip(): void {
    this._tooltipContent = undefined;
    this._tooltipVisible = false;
  }

  // use arrow functions (rather than standard JS class instance methods) so
  // that `this` is bound to the histogramDateRange object and not the event
  // target. for more info see
  // https://lit-element.polymer-project.org/guide/events#using-this-in-event-listeners
  private drag = (e: PointerEvent): void => {
    // prevent selecting text or other ranges while dragging, especially in Safari
    e.preventDefault();
    if (this.disabled) {
      return;
    }
    this.setDragOffset(e);
    this._isDragging = true;
    this.addListeners();
    this.cancelPendingUpdateEvent();
  };

  private drop = (): void => {
    if (this._isDragging) {
      this.removeListeners();
      this.beginEmitUpdateProcess();
    }
    this._isDragging = false;
  };

  /**
   * Adjust the date range based on slider movement
   *
   * @param e PointerEvent from the slider being moved
   */
  private move = (e: PointerEvent): void => {
    const newX = e.offsetX - this._dragOffset;
    const slider = this._currentSlider as SVGRectElement;
    const date = this.translatePositionToDate(newX);
    if ((slider.id as SliderId) === 'slider-min') {
      this.minSelectedDate = date;
    } else {
      this.maxSelectedDate = date;
    }
  };

  /**
   * Constrain a proposed value for the minimum (left) slider
   *
   * If the value is less than the leftmost valid position, then set it to the
   * left edge of the widget (ie the slider width). If the value is greater than
   * the rightmost valid position (the position of the max slider), then set it
   * to the position of the max slider
   */
  private validMinSliderX(newX: number): number {
    const validX = Math.max(newX, this.sliderWidth);
    return Math.min(validX, this.maxSliderX);
  }

  /**
   * Constrain a proposed value for the maximum (right) slider
   *
   * If the value is greater than the rightmost valid position, then set it to
   * the right edge of the widget (ie widget width - slider width). If the value
   * is less than the leftmost valid position (the position of the min slider),
   * then set it to the position of the min slider
   */
  private validMaxSliderX(newX: number): number {
    const validX = Math.max(newX, this.minSliderX);
    return Math.min(validX, this.width - this.sliderWidth);
  }

  private addListeners(): void {
    window.addEventListener('pointermove', this.move);
    window.addEventListener('pointerup', this.drop);
    window.addEventListener('pointercancel', this.drop);
  }

  private removeListeners(): void {
    window.removeEventListener('pointermove', this.move);
    window.removeEventListener('pointerup', this.drop);
    window.removeEventListener('pointercancel', this.drop);
  }

  /**
   * start a timer to emit an update event. this timer can be canceled (and the
   * event not emitted) if user drags a slider or focuses a date input within
   * the update delay
   */
  private beginEmitUpdateProcess(): void {
    this.cancelPendingUpdateEvent();
    this._emitUpdatedEventTimer = setTimeout(() => {
      if (this.currentDateRangeString === this._previousDateRange) {
        // don't emit duplicate event if no change since last emitted event
        return;
      }
      this._previousDateRange = this.currentDateRangeString;
      const options = {
        detail: {
          minDate: this.minSelectedDate,
          maxDate: this.maxSelectedDate,
        },
        bubbles: true,
        composed: true,
      };
      this.dispatchEvent(new CustomEvent('histogramDateRangeUpdated', options));
    }, this.updateDelay);
  }

  private cancelPendingUpdateEvent(): void {
    if (this._emitUpdatedEventTimer === undefined) {
      return;
    }
    clearTimeout(this._emitUpdatedEventTimer);
    this._emitUpdatedEventTimer = undefined;
  }

  /**
   * find position of pointer in relation to the current slider
   */
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

  /**
   * @param x horizontal position of slider
   * @returns string representation of date
   */
  private translatePositionToDate(x: number): string {
    // use Math.ceil to round up to fix case where input like 1/1/2010 would get
    // translated to 12/31/2009
    const milliseconds = Math.ceil(
      ((x - this.sliderWidth) * this.dateRangeMS) / this._histWidth
    );
    return this.formatDate(this._minDateMS + milliseconds);
  }

  /**
   * Returns slider x-position corresponding to given date (or null if invalid
   * date)
   *
   * @param date
   * @returns x-position of slider
   */
  private translateDateToPosition(date: string): number | null {
    const milliseconds = dayjs(date).valueOf();
    const xPosition =
      this.sliderWidth +
      ((milliseconds - this._minDateMS) * this._histWidth) / this.dateRangeMS;
    return isNaN(milliseconds) || isNaN(xPosition) ? null : xPosition;
  }

  private handleMinDateInput(e: InputEvent): void {
    const target = e.currentTarget as HTMLInputElement;
    this.minSelectedDate = target.value;
    this.beginEmitUpdateProcess();
  }

  private handleMaxDateInput(e: InputEvent): void {
    const target = e.currentTarget as HTMLInputElement;
    this.maxSelectedDate = target.value;
    this.beginEmitUpdateProcess();
  }

  private get currentDateRangeString(): string {
    return `${this.minSelectedDate}:${this.maxSelectedDate}`;
  }

  /** minimum selected date in milliseconds */
  private get minSelectedDateMS(): number {
    return dayjs(this.minSelectedDate).valueOf();
  }

  /** maximum selected date in milliseconds */
  private get maxSelectedDateMS(): number {
    return dayjs(this.maxSelectedDate).valueOf();
  }

  private handleBarClick(e: InputEvent): void {
    const dataset = (e.currentTarget as SVGRectElement).dataset as BarDataset;
    const binStartDateMS = dayjs(dataset.binStart).valueOf();
    if (binStartDateMS < this.minSelectedDateMS) {
      this.minSelectedDate = dataset.binStart;
    }
    const binEndDateMS = dayjs(dataset.binEnd).valueOf();
    if (binEndDateMS > this.maxSelectedDateMS) {
      this.maxSelectedDate = dataset.binEnd;
    }
    this.beginEmitUpdateProcess();
  }

  private get minSliderTemplate(): SVGTemplateResult {
    // width/height in pixels of curved part of the sliders (like
    // border-radius); used as part of a SVG quadratic curve. see
    // https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths#curve_commands
    const cs = SLIDER_CORNER_SIZE;

    const sliderShape = `
            M${this.minSliderX},0
            h-${this.sliderWidth - cs}
            q-${cs},0 -${cs},${cs}
            v${this.height - cs * 2}
            q0,${cs} ${cs},${cs}
            h${this.sliderWidth - cs}
          `;
    return this.generateSliderSVG(this.minSliderX, 'slider-min', sliderShape);
  }

  private get maxSliderTemplate(): SVGTemplateResult {
    const cs = SLIDER_CORNER_SIZE;
    const sliderShape = `
            M${this.maxSliderX},0
            h${this.sliderWidth - cs}
            q${cs},0 ${cs},${cs}
            v${this.height - cs * 2}
            q0,${cs} -${cs},${cs}
            h-${this.sliderWidth - cs}
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
      class="
      ${this.disabled ? '' : 'draggable'} 
      ${this._isDragging ? 'dragging' : ''}"
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

    // the stroke-dasharray style below creates a transparent border around the
    // right edge of the bar, which prevents user from encountering a gap
    // between adjacent bars (eg when viewing the tooltips or when trying to
    // extend the range by clicking on a bar)
    return this._histData.map(data => {
      const bar = svg`
        <rect
          class="bar"
          style='stroke-dasharray: 0 ${barWidth} ${data.height} ${barWidth} 0 ${
        data.height
      };'
          x="${x}"
          y="${this.height - data.height}"
          width="${barWidth}"
          height="${data.height}"
          @pointerenter="${this.showTooltip}"
          @pointerleave="${this.hideTooltip}"
          @click="${this.handleBarClick}"
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

  private formatDate(rawDate: string | number): string {
    const date = dayjs(rawDate);
    return date.isValid() ? date.format(this.dateFormat) : '';
  }

  /**
   * NOTE: we are relying on the lit `live` directive in the template to
   * ensure that the change to minSelectedDate is noticed and the input value
   * gets properly re-rendered. see
   * https://lit.dev/docs/templates/directives/#live
   */
  get minInputTemplate(): TemplateResult {
    return html`
      <input
        id="date-min"
        placeholder="${this.dateFormat}"
        type="text"
        @focus="${this.cancelPendingUpdateEvent}"
        @blur="${this.handleMinDateInput}"
        .value="${live(this.minSelectedDate)}"
        ?disabled="${this.disabled}"
      />
    `;
  }

  get maxInputTemplate(): TemplateResult {
    return html`
      <input
        id="date-max"
        placeholder="${this.dateFormat}"
        type="text"
        @focus="${this.cancelPendingUpdateEvent}"
        @blur="${this.handleMaxDateInput}"
        .value="${live(this.maxSelectedDate)}"
        ?disabled="${this.disabled}"
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
          left: ${this._tooltipOffset}px;
          display: ${this._tooltipVisible ? 'block' : 'none'};
        }
        #tooltip:after {
          left: ${this.tooltipWidth / 2}px;
        }
      </style>
      <div id="tooltip">${this._tooltipContent}</div>
    `;
  }

  private get noDataTemplate(): TemplateResult {
    return html`
      <div class="missing-data-message">${this.missingDataMessage}</div>
    `;
  }

  private get activityIndicatorTemplate(): TemplateResult {
    if (!this.loading) {
      return html``;
    }
    return html`
      <ia-activity-indicator mode="processing"> </ia-activity-indicator>
    `;
  }

  static styles = css`
    .missing-data-message {
      text-align: center;
    }
    #container {
      margin: 0;
      touch-action: none;
      position: relative;
    }
    .disabled {
      opacity: 0.3;
    }
    ia-activity-indicator {
      position: absolute;
      left: calc(50% - 10px);
      top: 10px;
      width: 20px;
      height: 20px;
      --activityIndicatorLoadingDotColor: rgba(0, 0, 0, 0);
      --activityIndicatorLoadingRingColor: ${activityIndicatorColor};
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
    .bar {
      /* create a transparent border around the hist bars to prevent "gaps" and
      flickering when moving around between bars. this also helps with handling
      clicks on the bars, preventing users from being able to click in between
      bars */
      stroke: rgba(0, 0, 0, 0);
      /* ensure transparent stroke wide enough to cover gap between bars */
      stroke-width: 2px;
    }
    .bar:hover {
      /* highlight currently hovered bar */
      fill-opacity: 0.7;
    }
    .disabled .bar:hover {
      /* ensure no visual hover interaction when disabled */
      fill-opacity: 1;
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
    if (!this.hasBinData) {
      return this.noDataTemplate;
    }
    return html`
      <div
        id="container"
        class="
          noselect 
          ${this._isDragging ? 'dragging' : ''}
        "
        style="width: ${this.width}px"
      >
        ${this.activityIndicatorTemplate} ${this.tooltipTemplate}
        <div
          class="inner-container
          ${this.disabled ? 'disabled' : ''}"
        >
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
      </div>
    `;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    'histogram-date-range': HistogramDateRange;
  }
}
