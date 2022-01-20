var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __decorate = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc(target, key) : target;
  for (var i = decorators.length - 1, decorator; i >= 0; i--)
    if (decorator = decorators[i])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result)
    __defProp(target, key, result);
  return result;
};
import {
  css,
  html,
  nothing,
  LitElement,
  svg
} from "../../_snowpack/pkg/lit.js";
import {property, state, customElement} from "../../_snowpack/pkg/lit/decorators.js";
import {live} from "../../_snowpack/pkg/lit/directives/live.js";
import dayjs from "../../_snowpack/pkg/dayjs/esm/index.js";
import customParseFormat from "../../_snowpack/pkg/dayjs/esm/plugin/customParseFormat.js";
dayjs.extend(customParseFormat);
import "../../_snowpack/pkg/@internetarchive/ia-activity-indicator/ia-activity-indicator.js";
const WIDTH = 180;
const HEIGHT = 40;
const SLIDER_WIDTH = 10;
const TOOLTIP_WIDTH = 125;
const TOOLTIP_HEIGHT = 30;
const DATE_FORMAT = "YYYY";
const MISSING_DATA = "no data";
const UPDATE_DEBOUNCE_DELAY_MS = 0;
const SLIDER_CORNER_SIZE = 4;
const sliderColor = css`var(--histogramDateRangeSliderColor, #4B65FE)`;
const selectedRangeColor = css`var(--histogramDateRangeSelectedRangeColor, #DBE0FF)`;
const barIncludedFill = css`var(--histogramDateRangeBarIncludedFill, #2C2C2C)`;
const activityIndicatorColor = css`var(--histogramDateRangeActivityIndicator, #2C2C2C)`;
const barExcludedFill = css`var(--histogramDateRangeBarExcludedFill, #CCCCCC)`;
const inputBorder = css`var(--histogramDateRangeInputBorder, 0.5px solid #2C2C2C)`;
const inputWidth = css`var(--histogramDateRangeInputWidth, 35px)`;
const inputFontSize = css`var(--histogramDateRangeInputFontSize, 1.2rem)`;
const inputFontFamily = css`var(--histogramDateRangeInputFontFamily, sans-serif)`;
const tooltipBackgroundColor = css`var(--histogramDateRangeTooltipBackgroundColor, #2C2C2C)`;
const tooltipTextColor = css`var(--histogramDateRangeTooltipTextColor, #FFFFFF)`;
const tooltipFontSize = css`var(--histogramDateRangeTooltipFontSize, 1.1rem)`;
const tooltipFontFamily = css`var(--histogramDateRangeTooltipFontFamily, sans-serif)`;
export let HistogramDateRange = class extends LitElement {
  constructor() {
    super(...arguments);
    this.width = WIDTH;
    this.height = HEIGHT;
    this.sliderWidth = SLIDER_WIDTH;
    this.tooltipWidth = TOOLTIP_WIDTH;
    this.tooltipHeight = TOOLTIP_HEIGHT;
    this.updateDelay = UPDATE_DEBOUNCE_DELAY_MS;
    this.dateFormat = DATE_FORMAT;
    this.missingDataMessage = MISSING_DATA;
    this.minDate = "";
    this.maxDate = "";
    this.disabled = false;
    this.bins = [];
    this._tooltipOffset = 0;
    this._tooltipVisible = false;
    this._isDragging = false;
    this._isLoading = false;
    this._minSelectedDate = "";
    this._maxSelectedDate = "";
    this._minDateMS = 0;
    this._maxDateMS = 0;
    this._dragOffset = 0;
    this._histWidth = 0;
    this._binWidth = 0;
    this._histData = [];
    this._previousDateRange = "";
    this.drag = (e) => {
      e.preventDefault();
      if (this.disabled) {
        return;
      }
      this.setDragOffset(e);
      this._isDragging = true;
      this.addListeners();
      this.cancelPendingUpdateEvent();
    };
    this.drop = () => {
      if (this._isDragging) {
        this.removeListeners();
        this.beginEmitUpdateProcess();
      }
      this._isDragging = false;
    };
    this.move = (e) => {
      const newX = e.offsetX - this._dragOffset;
      const slider = this._currentSlider;
      if (slider.id === "slider-min") {
        this.minSelectedDate = this.translatePositionToDate(this.validMinSliderX(newX));
      } else {
        this.maxSelectedDate = this.translatePositionToDate(this.validMaxSliderX(newX));
      }
    };
  }
  disconnectedCallback() {
    this.removeListeners();
    super.disconnectedCallback();
  }
  updated(changedProps) {
    if (changedProps.has("bins") || changedProps.has("minDate") || changedProps.has("maxDate") || changedProps.has("minSelectedDate") || changedProps.has("maxSelectedDate")) {
      this.handleDataUpdate();
    }
  }
  handleDataUpdate() {
    if (!this.hasBinData) {
      return;
    }
    this._histWidth = this.width - this.sliderWidth * 2;
    this._minDateMS = this.getMSFromString(this.minDate);
    this._maxDateMS = this.getMSFromString(this.maxDate);
    this._binWidth = this._histWidth / this._numBins;
    this._previousDateRange = this.currentDateRangeString;
    this._histData = this.calculateHistData();
    this.minSelectedDate = this.minSelectedDate ? this.minSelectedDate : this.minDate;
    this.maxSelectedDate = this.maxSelectedDate ? this.maxSelectedDate : this.maxDate;
    this.requestUpdate();
  }
  calculateHistData() {
    const minValue = Math.min(...this.bins);
    const maxValue = Math.max(...this.bins);
    const valueRange = minValue === maxValue ? 1 : Math.log1p(maxValue - minValue);
    const valueScale = this.height / valueRange;
    const dateScale = this.dateRangeMS / this._numBins;
    return this.bins.map((v, i) => {
      return {
        value: v,
        height: Math.floor(Math.log1p(v) * valueScale),
        binStart: `${this.formatDate(i * dateScale + this._minDateMS)}`,
        binEnd: `${this.formatDate((i + 1) * dateScale + this._minDateMS)}`
      };
    });
  }
  get hasBinData() {
    return this._numBins > 0;
  }
  get _numBins() {
    if (!this.bins || !this.bins.length) {
      return 0;
    }
    return this.bins.length;
  }
  get loading() {
    return this._isLoading;
  }
  set loading(value) {
    this.disabled = value;
    this._isLoading = value;
  }
  get minSelectedDate() {
    return this.formatDate(this.getMSFromString(this._minSelectedDate));
  }
  set minSelectedDate(rawDate) {
    if (!this._minSelectedDate) {
      this._minSelectedDate = rawDate;
      return;
    }
    let ms = this.getMSFromString(rawDate);
    if (!Number.isNaN(ms)) {
      ms = Math.min(ms, this.getMSFromString(this._maxSelectedDate));
      this._minSelectedDate = this.formatDate(ms);
    }
    this.requestUpdate();
  }
  get maxSelectedDate() {
    return this.formatDate(this.getMSFromString(this._maxSelectedDate));
  }
  set maxSelectedDate(rawDate) {
    if (!this._maxSelectedDate) {
      this._maxSelectedDate = rawDate;
      return;
    }
    let ms = this.getMSFromString(rawDate);
    if (!Number.isNaN(ms)) {
      ms = Math.max(this.getMSFromString(this._minSelectedDate), ms);
      this._maxSelectedDate = this.formatDate(ms);
    }
    this.requestUpdate();
  }
  get minSliderX() {
    const x = this.translateDateToPosition(this.minSelectedDate);
    return this.validMinSliderX(x);
  }
  get maxSliderX() {
    const x = this.translateDateToPosition(this.maxSelectedDate);
    return this.validMaxSliderX(x);
  }
  get dateRangeMS() {
    return this._maxDateMS - this._minDateMS;
  }
  showTooltip(e) {
    if (this._isDragging || this.disabled) {
      return;
    }
    const target = e.currentTarget;
    const x = target.x.baseVal.value + this.sliderWidth / 2;
    const dataset = target.dataset;
    const itemsText = `item${dataset.numItems !== "1" ? "s" : ""}`;
    const formattedNumItems = Number(dataset.numItems).toLocaleString();
    this._tooltipOffset = x + (this._binWidth - this.sliderWidth - this.tooltipWidth) / 2;
    this._tooltipContent = html`
      ${formattedNumItems} ${itemsText}<br />
      ${dataset.binStart} - ${dataset.binEnd}
    `;
    this._tooltipVisible = true;
  }
  hideTooltip() {
    this._tooltipContent = void 0;
    this._tooltipVisible = false;
  }
  validMinSliderX(newX) {
    if (Number.isNaN(newX)) {
      return this.sliderWidth;
    }
    return this.clamp(newX, this.sliderWidth, this.translateDateToPosition(this.maxSelectedDate));
  }
  validMaxSliderX(newX) {
    if (Number.isNaN(newX)) {
      return this.width - this.sliderWidth;
    }
    return this.clamp(newX, this.translateDateToPosition(this.minSelectedDate), this.width - this.sliderWidth);
  }
  addListeners() {
    window.addEventListener("pointermove", this.move);
    window.addEventListener("pointerup", this.drop);
    window.addEventListener("pointercancel", this.drop);
  }
  removeListeners() {
    window.removeEventListener("pointermove", this.move);
    window.removeEventListener("pointerup", this.drop);
    window.removeEventListener("pointercancel", this.drop);
  }
  beginEmitUpdateProcess() {
    this.cancelPendingUpdateEvent();
    this._emitUpdatedEventTimer = setTimeout(() => {
      if (this.currentDateRangeString === this._previousDateRange) {
        return;
      }
      this._previousDateRange = this.currentDateRangeString;
      const options = {
        detail: {
          minDate: this.minSelectedDate,
          maxDate: this.maxSelectedDate
        },
        bubbles: true,
        composed: true
      };
      this.dispatchEvent(new CustomEvent("histogramDateRangeUpdated", options));
    }, this.updateDelay);
  }
  cancelPendingUpdateEvent() {
    if (this._emitUpdatedEventTimer === void 0) {
      return;
    }
    clearTimeout(this._emitUpdatedEventTimer);
    this._emitUpdatedEventTimer = void 0;
  }
  setDragOffset(e) {
    this._currentSlider = e.currentTarget;
    const sliderX = this._currentSlider.id === "slider-min" ? this.minSliderX : this.maxSliderX;
    this._dragOffset = e.offsetX - sliderX;
    if (this._dragOffset > this.sliderWidth || this._dragOffset < -this.sliderWidth) {
      this._dragOffset = 0;
    }
  }
  translatePositionToDate(x) {
    const milliseconds = Math.ceil((x - this.sliderWidth) * this.dateRangeMS / this._histWidth);
    return this.formatDate(this._minDateMS + milliseconds);
  }
  translateDateToPosition(date) {
    const milliseconds = this.getMSFromString(date);
    return this.sliderWidth + (milliseconds - this._minDateMS) * this._histWidth / this.dateRangeMS;
  }
  clamp(x, minValue, maxValue) {
    return Math.min(Math.max(x, minValue), maxValue);
  }
  handleMinDateInput(e) {
    const target = e.currentTarget;
    this.minSelectedDate = target.value;
    this.beginEmitUpdateProcess();
  }
  handleMaxDateInput(e) {
    const target = e.currentTarget;
    this.maxSelectedDate = target.value;
    this.beginEmitUpdateProcess();
  }
  handleKeyUp(e) {
    if (e.key === "Enter") {
      const target = e.currentTarget;
      target.blur();
    }
  }
  get currentDateRangeString() {
    return `${this.minSelectedDate}:${this.maxSelectedDate}`;
  }
  getMSFromString(date) {
    const digitGroupCount = (date.split(/(\d+)/).length - 1) / 2;
    if (digitGroupCount === 1) {
      const dateObj = new Date(0, 0);
      dateObj.setFullYear(Number(date));
      return dateObj.getTime();
    }
    return dayjs(date, [this.dateFormat, DATE_FORMAT]).valueOf();
  }
  handleBarClick(e) {
    const dataset = e.currentTarget.dataset;
    const distanceFromMinSlider = this.getMSFromString(dataset.binStart) - this.getMSFromString(this.minSelectedDate);
    const distanceFromMaxSlider = this.getMSFromString(this.maxSelectedDate) - this.getMSFromString(dataset.binEnd);
    if (distanceFromMinSlider < distanceFromMaxSlider) {
      this.minSelectedDate = dataset.binStart;
    } else {
      this.maxSelectedDate = dataset.binEnd;
    }
    this.beginEmitUpdateProcess();
  }
  get minSliderTemplate() {
    const cs = SLIDER_CORNER_SIZE;
    const sliderShape = `
            M${this.minSliderX},0
            h-${this.sliderWidth - cs}
            q-${cs},0 -${cs},${cs}
            v${this.height - cs * 2}
            q0,${cs} ${cs},${cs}
            h${this.sliderWidth - cs}
          `;
    return this.generateSliderSVG(this.minSliderX, "slider-min", sliderShape);
  }
  get maxSliderTemplate() {
    const cs = SLIDER_CORNER_SIZE;
    const sliderShape = `
            M${this.maxSliderX},0
            h${this.sliderWidth - cs}
            q${cs},0 ${cs},${cs}
            v${this.height - cs * 2}
            q0,${cs} -${cs},${cs}
            h-${this.sliderWidth - cs}
          `;
    return this.generateSliderSVG(this.maxSliderX, "slider-max", sliderShape);
  }
  generateSliderSVG(sliderPositionX, id, sliderShape) {
    const k = id === "slider-min" ? 1 : -1;
    return svg`
    <svg
      id="${id}"
      class="
      ${this.disabled ? "" : "draggable"} 
      ${this._isDragging ? "dragging" : ""}"
      @pointerdown="${this.drag}"
    >
      <path d="${sliderShape} z" fill="${sliderColor}" />
      <rect
        x="${sliderPositionX - this.sliderWidth * k + this.sliderWidth * 0.4 * k}"
        y="${this.height / 3}"
        width="1"
        height="${this.height / 3}"
        fill="white"
      />
      <rect
        x="${sliderPositionX - this.sliderWidth * k + this.sliderWidth * 0.6 * k}"
        y="${this.height / 3}"
        width="1"
        height="${this.height / 3}"
        fill="white"
      />
    </svg>
    `;
  }
  get selectedRangeTemplate() {
    return svg`
      <rect
        x="${this.minSliderX}"
        y="0"
        width="${this.maxSliderX - this.minSliderX}"
        height="${this.height}"
        fill="${selectedRangeColor}"
      />`;
  }
  get histogramTemplate() {
    const xScale = this._histWidth / this._numBins;
    const barWidth = xScale - 1;
    let x = this.sliderWidth;
    return this._histData.map((data) => {
      const bar = svg`
        <rect
          class="bar"
          style='stroke-dasharray: 0 ${barWidth} ${data.height} ${barWidth} 0 ${data.height};'
          x="${x}"
          y="${this.height - data.height}"
          width="${barWidth}"
          height="${data.height}"
          @pointerenter="${this.showTooltip}"
          @pointerleave="${this.hideTooltip}"
          @click="${this.handleBarClick}"
          fill="${x + barWidth >= this.minSliderX && x <= this.maxSliderX ? barIncludedFill : barExcludedFill}"
          data-num-items="${data.value}"
          data-bin-start="${data.binStart}"
          data-bin-end="${data.binEnd}"
        />`;
      x += xScale;
      return bar;
    });
  }
  formatDate(dateMS) {
    if (Number.isNaN(dateMS)) {
      return "";
    }
    const date = dayjs(dateMS);
    if (date.year() < 1e3) {
      return String(date.year());
    }
    return date.format(this.dateFormat);
  }
  get minInputTemplate() {
    return html`
      <input
        id="date-min"
        placeholder="${this.dateFormat}"
        type="text"
        @focus="${this.cancelPendingUpdateEvent}"
        @blur="${this.handleMinDateInput}"
        @keyup="${this.handleKeyUp}"
        .value="${live(this.minSelectedDate)}"
        ?disabled="${this.disabled}"
      />
    `;
  }
  get maxInputTemplate() {
    return html`
      <input
        id="date-max"
        placeholder="${this.dateFormat}"
        type="text"
        @focus="${this.cancelPendingUpdateEvent}"
        @blur="${this.handleMaxDateInput}"
        @keyup="${this.handleKeyUp}"
        .value="${live(this.maxSelectedDate)}"
        ?disabled="${this.disabled}"
      />
    `;
  }
  get tooltipTemplate() {
    return html`
      <style>
        #tooltip {
          width: ${this.tooltipWidth}px;
          height: ${this.tooltipHeight}px;
          top: ${-9 - this.tooltipHeight}px;
          left: ${this._tooltipOffset}px;
          display: ${this._tooltipVisible ? "block" : "none"};
        }
        #tooltip:after {
          left: ${this.tooltipWidth / 2}px;
        }
      </style>
      <div id="tooltip">${this._tooltipContent}</div>
    `;
  }
  get noDataTemplate() {
    return html`
      <div class="missing-data-message">${this.missingDataMessage}</div>
    `;
  }
  get activityIndicatorTemplate() {
    if (!this.loading) {
      return nothing;
    }
    return html`
      <ia-activity-indicator mode="processing"> </ia-activity-indicator>
    `;
  }
  render() {
    if (!this.hasBinData) {
      return this.noDataTemplate;
    }
    return html`
      <div
        id="container"
        class="
          noselect 
          ${this._isDragging ? "dragging" : ""}
        "
        style="width: ${this.width}px"
      >
        ${this.activityIndicatorTemplate} ${this.tooltipTemplate}
        <div
          class="inner-container
          ${this.disabled ? "disabled" : ""}"
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
};
HistogramDateRange.styles = css`
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
      font-family: ${tooltipFontFamily};
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
      font-family: ${inputFontFamily};
    }
  `;
__decorate([
  property({type: Number})
], HistogramDateRange.prototype, "width", 2);
__decorate([
  property({type: Number})
], HistogramDateRange.prototype, "height", 2);
__decorate([
  property({type: Number})
], HistogramDateRange.prototype, "sliderWidth", 2);
__decorate([
  property({type: Number})
], HistogramDateRange.prototype, "tooltipWidth", 2);
__decorate([
  property({type: Number})
], HistogramDateRange.prototype, "tooltipHeight", 2);
__decorate([
  property({type: Number})
], HistogramDateRange.prototype, "updateDelay", 2);
__decorate([
  property()
], HistogramDateRange.prototype, "dateFormat", 2);
__decorate([
  property()
], HistogramDateRange.prototype, "missingDataMessage", 2);
__decorate([
  property()
], HistogramDateRange.prototype, "minDate", 2);
__decorate([
  property()
], HistogramDateRange.prototype, "maxDate", 2);
__decorate([
  property({type: Boolean})
], HistogramDateRange.prototype, "disabled", 2);
__decorate([
  property({type: Object})
], HistogramDateRange.prototype, "bins", 2);
__decorate([
  state()
], HistogramDateRange.prototype, "_tooltipOffset", 2);
__decorate([
  state()
], HistogramDateRange.prototype, "_tooltipContent", 2);
__decorate([
  state()
], HistogramDateRange.prototype, "_tooltipVisible", 2);
__decorate([
  state()
], HistogramDateRange.prototype, "_isDragging", 2);
__decorate([
  state()
], HistogramDateRange.prototype, "_isLoading", 2);
__decorate([
  property({type: Boolean})
], HistogramDateRange.prototype, "loading", 1);
__decorate([
  property()
], HistogramDateRange.prototype, "minSelectedDate", 1);
__decorate([
  property()
], HistogramDateRange.prototype, "maxSelectedDate", 1);
HistogramDateRange = __decorate([
  customElement("histogram-date-range")
], HistogramDateRange);
