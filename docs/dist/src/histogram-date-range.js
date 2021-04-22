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
  LitElement,
  svg
} from "../../_snowpack/pkg/lit.js";
import {property, state, query, customElement} from "../../_snowpack/pkg/lit/decorators.js";
import dayjs from "../../_snowpack/pkg/dayjs/esm/index.js";
const WIDTH = 180;
const HEIGHT = 40;
const SLIDER_WIDTH = 10;
const TOOLTIP_WIDTH = 125;
const TOOLTIP_HEIGHT = 30;
const DATE_FORMAT = "M/D/YYYY";
const MISSING_DATA = "no data";
const SLIDER_CORNER_SIZE = 4;
const sliderFill = "var(--histogramDateRangeSliderFill, #4B65FE)";
const selectedRangeFill = "var(--histogramDateRangeSelectedRangeFill, #DBE0FF)";
const barIncludedFill = "var(--histogramDateRangeBarIncludedFill, #2C2C2C)";
const barExcludedFill = "var(--histogramDateRangeBarExcludedFill, #CCCCCC)";
const inputBorder = css`var(--histogramDateRangeInputBorder, 0.5px solid #2C2C2C)`;
const inputWidth = css`var(--histogramDateRangeInputWidth, 70px)`;
const inputFontSize = css`var(--histogramDateRangeInputFontSize, 1.2rem)`;
const tooltipBackgroundColor = css`var(--histogramDateRangeTooltipBackgroundColor, #2C2C2C)`;
const tooltipTextColor = css`var(--histogramDateRangeTooltipTextColor, #FFFFFF)`;
const tooltipFontSize = css`var(--histogramDateRangeTooltipFontSize, 1.1rem)`;
class HistogramInputData {
  constructor() {
    this.minDate = "";
    this.maxDate = "";
    this.bins = [];
  }
}
export let HistogramDateRange = class extends LitElement {
  constructor() {
    super(...arguments);
    this.width = WIDTH;
    this.height = HEIGHT;
    this.sliderWidth = SLIDER_WIDTH;
    this.tooltipWidth = TOOLTIP_WIDTH;
    this.tooltipHeight = TOOLTIP_HEIGHT;
    this.dateFormat = DATE_FORMAT;
    this.missingDataMessage = MISSING_DATA;
    this.data = new HistogramInputData();
    this.minSliderX = 0;
    this.maxSliderX = 0;
    this.tooltipOffset = 0;
    this.tooltipVisible = false;
    this.isDragging = false;
    this._minDate = 0;
    this._maxDate = 0;
    this._dragOffset = 0;
    this._histWidth = 0;
    this._numBins = 0;
    this._binWidth = 0;
    this._histData = [];
    this.drag = (e) => {
      e.preventDefault();
      this.setDragOffset(e);
      this.isDragging = true;
      window.addEventListener("pointermove", this.move);
      window.addEventListener("pointerup", this.drop);
      window.addEventListener("pointercancel", this.drop);
    };
    this.drop = () => {
      this.isDragging = false;
      window.removeEventListener("pointermove", this.move);
      window.removeEventListener("pointerup", this.drop);
      window.removeEventListener("pointercancel", this.drop);
    };
    this.move = (e) => {
      const newX = e.offsetX - this._dragOffset;
      const slider = this._currentSlider;
      return slider.id === "slider-min" ? this.setMinSlider(newX) : this.setMaxSlider(newX);
    };
  }
  updated(changedProps) {
    if (changedProps.has("data")) {
      this.handleDataUpdate();
    }
  }
  handleDataUpdate() {
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
    this._histData = this.data.bins.map((v, i) => {
      return {
        value: v,
        height: Math.floor(Math.log1p(v) * valueScale),
        binStart: `${dayjs(i * dateScale + this._minDate).format(this.dateFormat)}`,
        binEnd: `${dayjs((i + 1) * dateScale + this._minDate).format(this.dateFormat)}`
      };
    });
    this.requestUpdate();
  }
  get hasData() {
    return this.data.bins.length > 0;
  }
  get dateRange() {
    return this._maxDate - this._minDate;
  }
  showTooltip(e) {
    if (this.isDragging) {
      return;
    }
    const target = e.currentTarget;
    const x = target.x.baseVal.value + this.sliderWidth / 2;
    const dataset = target.dataset;
    const itemsText = `item${dataset.numItems !== "1" ? "s" : ""}`;
    this.tooltipOffset = x + (this._binWidth - this.sliderWidth - this.tooltipWidth) / 2;
    this.tooltipContent = html`
      ${dataset.numItems} ${itemsText}<br />
      ${dataset.binStart} - ${dataset.binEnd}
    `;
    this.tooltipVisible = true;
  }
  hideTooltip() {
    this.tooltipContent = void 0;
    this.tooltipVisible = false;
  }
  setDragOffset(e) {
    this._currentSlider = e.currentTarget;
    const sliderX = this._currentSlider.id === "slider-min" ? this.minSliderX : this.maxSliderX;
    this._dragOffset = e.offsetX - sliderX;
    if (this._dragOffset > this.sliderWidth || this._dragOffset < -this.sliderWidth) {
      this._dragOffset = 0;
    }
  }
  setMinSlider(newX) {
    const toSet = Math.max(newX, this.sliderWidth);
    this.minSliderX = Math.min(toSet, this.maxSliderX);
  }
  setMaxSlider(newX) {
    const toSet = Math.max(newX, this.minSliderX);
    this.maxSliderX = Math.min(toSet, this.width - this.sliderWidth);
  }
  translatePositionToDate(x) {
    const milliseconds = (x - this.sliderWidth) * this.dateRange / this._histWidth;
    const date = dayjs(this._minDate + milliseconds);
    return date.isValid() ? date.format(this.dateFormat) : "";
  }
  translateDateToPosition(date) {
    const milliseconds = dayjs(date).valueOf();
    if (!milliseconds) {
      return null;
    }
    return this.sliderWidth + (milliseconds - this._minDate) * this._histWidth / this.dateRange;
  }
  handleMinDateInput(e) {
    const target = e.currentTarget;
    const newX = this.translateDateToPosition(target.value);
    if (newX) {
      this.setMinSlider(newX);
    }
    target.value = this.minInputValue;
  }
  handleMaxDateInput(e) {
    const target = e.currentTarget;
    const newX = this.translateDateToPosition(target.value);
    if (newX) {
      this.setMaxSlider(newX);
    }
    target.value = this.maxInputValue;
  }
  get minInputValue() {
    return this.translatePositionToDate(this.minSliderX);
  }
  get maxInputValue() {
    return this.translatePositionToDate(this.maxSliderX);
  }
  get minSliderTemplate() {
    const c = SLIDER_CORNER_SIZE;
    const sliderShape = `
            M${this.minSliderX},0
            h-${this.sliderWidth - c}
            q-${c},0 -${c},${c}
            v${this.height - c * 2}
            q0,${c} ${c},${c}
            h${this.sliderWidth - c}
          `;
    return this.generateSliderSVG(this.minSliderX, "slider-min", sliderShape);
  }
  get maxSliderTemplate() {
    const c = SLIDER_CORNER_SIZE;
    const sliderShape = `
            M${this.maxSliderX},0
            h${this.sliderWidth - c}
            q${c},0 ${c},${c}
            v${this.height - c * 2}
            q0,${c} -${c},${c}
            h-${this.sliderWidth - c}
          `;
    return this.generateSliderSVG(this.maxSliderX, "slider-max", sliderShape);
  }
  generateSliderSVG(sliderPositionX, id, sliderShape) {
    const k = id === "slider-min" ? 1 : -1;
    return svg`
    <svg
      id="${id}"
      @pointerdown="${this.drag}"
    >
      <path d="${sliderShape} z" fill="${sliderFill}" />
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
        fill="${selectedRangeFill}"
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
          x="${x}"
          y="${this.height - data.height}"
          width="${barWidth}"
          height="${data.height}"
          @pointerenter="${this.showTooltip}"
          @pointerleave="${this.hideTooltip}"
          fill="${x >= this.minSliderX && x <= this.maxSliderX ? barIncludedFill : barExcludedFill}"
          data-num-items="${data.value}"
          data-bin-start="${data.binStart}"
          data-bin-end="${data.binEnd}"
        />`;
      x += xScale;
      return bar;
    });
  }
  get minInputTemplate() {
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
  get maxInputTemplate() {
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
  get tooltipTemplate() {
    return html`
      <style>
        #tooltip {
          width: ${this.tooltipWidth}px;
          height: ${this.tooltipHeight}px;
          top: ${-9 - this.tooltipHeight}px;
          left: ${this.tooltipOffset}px;
          display: ${this.tooltipVisible ? "block" : "none"};
        }
        #tooltip:after {
          left: ${this.tooltipWidth / 2}px;
        }
      </style>
      <div id="tooltip">${this.tooltipContent}</div>
    `;
  }
  render() {
    if (!this.hasData) {
      return html`${this.missingDataMessage}`;
    }
    return html`
      <div
        id="container"
        class="noselect ${this.isDragging ? "dragging" : ""}"
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
};
HistogramDateRange.styles = css`
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
  property({type: String})
], HistogramDateRange.prototype, "dateFormat", 2);
__decorate([
  property({type: String})
], HistogramDateRange.prototype, "missingDataMessage", 2);
__decorate([
  property({type: Object})
], HistogramDateRange.prototype, "data", 2);
__decorate([
  state()
], HistogramDateRange.prototype, "minSliderX", 2);
__decorate([
  state()
], HistogramDateRange.prototype, "maxSliderX", 2);
__decorate([
  state()
], HistogramDateRange.prototype, "tooltipOffset", 2);
__decorate([
  state()
], HistogramDateRange.prototype, "tooltipContent", 2);
__decorate([
  state()
], HistogramDateRange.prototype, "tooltipVisible", 2);
__decorate([
  state()
], HistogramDateRange.prototype, "isDragging", 2);
__decorate([
  query("#tooltip")
], HistogramDateRange.prototype, "tooltip", 2);
__decorate([
  query("#container")
], HistogramDateRange.prototype, "container", 2);
HistogramDateRange = __decorate([
  customElement("histogram-date-range")
], HistogramDateRange);
