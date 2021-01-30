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
  html,
  svg,
  css,
  LitElement,
  property,
  query
} from "../_snowpack/pkg/lit-element.js";
import {nothing} from "../_snowpack/pkg/lit-html.js";
import dayjs from "../_snowpack/pkg/dayjs/esm/index.js";
const WIDTH = 180;
const HEIGHT = 40;
const SLIDER_WIDTH = 10;
const TOOLTIP_WIDTH = 125;
const TOOLTIP_HEIGHT = 30;
const DATE_FORMAT = "M/D/YYYY";
const SLIDER_CORNER_SIZE = 4;
const sliderFill = "var(--dateRangePickerSliderFill, #4B65FE)";
const selectedRangeFill = "var(--dateRangePickerSelectedRangeFill, #DBE0FF)";
const barIncludedFill = "var(--dateRangePickerBarIncludedFill, #2C2C2C)";
const barExcludedFill = "var(--dateRangePickerBarExcludedFill, #CCCCCC)";
const inputBorder = css`var(--dateRangePickerInputBorder, 0.5px solid #2C2C2C)`;
const inputWidth = css`var(--dateRangePickerInputWidth, 70px)`;
const inputFontSize = css`var(--dateRangePickerInputFontSize, 1.2rem)`;
const tooltipBackgroundColor = css`var(--dateRangePickerTooltipBackgroundColor, #2C2C2C)`;
const tooltipTextColor = css`var(--dateRangePickerTooltipTextColor, #FFFFFF)`;
const tooltipFontSize = css`var(--dateRangePickerTooltipFontSize, 1.1rem)`;
export class DateRangePicker extends LitElement {
  constructor() {
    super(...arguments);
    this.width = WIDTH;
    this.height = HEIGHT;
    this.sliderWidth = SLIDER_WIDTH;
    this.tooltipWidth = TOOLTIP_WIDTH;
    this.tooltipHeight = TOOLTIP_HEIGHT;
    this.tooltipOffset = 0;
    this.tooltipContent = nothing;
    this.tooltipDisplay = "none";
    this.dateFormat = DATE_FORMAT;
    this._leftSliderX = 0;
    this._rightSliderX = 0;
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
      this.container.classList.add("dragging");
      window.addEventListener("pointermove", this.move);
      window.addEventListener("pointerup", this.drop);
      window.addEventListener("pointercancel", this.drop);
    };
    this.drop = () => {
      this.container.classList.remove("dragging");
      window.removeEventListener("pointermove", this.move);
      window.removeEventListener("pointerup", this.drop);
      window.removeEventListener("pointercancel", this.drop);
    };
    this.move = (e) => {
      const newX = e.offsetX - this._dragOffset;
      const slider = this._currentSlider;
      return slider.id === "slider-min" ? this.setLeftSlider(newX) : this.setRightSlider(newX);
    };
  }
  firstUpdated() {
    this._leftSliderX = this.sliderWidth;
    this._rightSliderX = this.width - this.sliderWidth;
    this._minDate = dayjs(this.data?.minDate).valueOf();
    this._maxDate = dayjs(this.data?.maxDate).valueOf();
    this._histWidth = this.width - this.sliderWidth * 2;
    this._numBins = this.data?.bins?.length ?? 1;
    this._binWidth = this._histWidth / this._numBins;
    this._histData = this.generateHistData();
  }
  generateHistData() {
    if (!this.data) {
      return [];
    }
    const minValue = Math.min(...this.data.bins);
    const maxValue = Math.max(...this.data.bins);
    const valueScale = this.height / Math.log1p(maxValue - minValue);
    const dateScale = this.dateRange / this._numBins;
    return this.data.bins.map((v, i) => {
      return {
        value: v,
        height: Math.floor(Math.log1p(v) * valueScale),
        binStart: `${dayjs(i * dateScale + this._minDate).format(this.dateFormat)}`,
        binEnd: `${dayjs((i + 1) * dateScale + this._minDate).format(this.dateFormat)}`
      };
    });
  }
  get dateRange() {
    return this._maxDate - this._minDate;
  }
  showTooltip(e) {
    if (Array.from(this.container.classList).includes("dragging")) {
      return;
    }
    const target = e.currentTarget;
    const x = target.x.baseVal.value + this.sliderWidth / 2;
    const data = target.dataset;
    const itemsText = `item${data.numItems !== "1" ? "s" : ""}`;
    this.tooltipOffset = x + (this._binWidth - this.sliderWidth - this.tooltipWidth) / 2;
    this.tooltipContent = html`
      ${data.numItems} ${itemsText}<br />
      ${data.binStart} - ${data.binEnd}
    `;
    this.tooltipDisplay = "block";
  }
  hideTooltip() {
    this.tooltipContent = nothing;
    this.tooltipDisplay = "none";
  }
  setDragOffset(e) {
    this._currentSlider = e.currentTarget;
    const sliderX = this._currentSlider.id === "slider-min" ? this._leftSliderX : this._rightSliderX;
    this._dragOffset = e.offsetX - sliderX;
    if (this._dragOffset > this.sliderWidth || this._dragOffset < -this.sliderWidth) {
      this._dragOffset = 0;
    }
  }
  setLeftSlider(newX) {
    const toSet = Math.max(newX, this.sliderWidth);
    this._leftSliderX = Math.min(toSet, this._rightSliderX);
  }
  setRightSlider(newX) {
    const toSet = Math.max(newX, this._leftSliderX);
    this._rightSliderX = Math.min(toSet, this.width - this.sliderWidth);
  }
  translatePositionToDate(x) {
    const milliseconds = (x - this.sliderWidth) * this.dateRange / this._histWidth;
    const date = dayjs(this._minDate + milliseconds);
    return date.format(this.dateFormat);
  }
  translateDateToPosition(date) {
    const milliseconds = dayjs(date).valueOf();
    if (!milliseconds) {
      return null;
    }
    return this.sliderWidth + (milliseconds - this._minDate) * this._histWidth / this.dateRange;
  }
  handleDateInput(e) {
    const target = e.currentTarget;
    const newX = this.translateDateToPosition(target.value);
    if (target.id === "date-min") {
      if (newX) {
        this.setLeftSlider(newX);
      }
      target.value = this.translatePositionToDate(this._leftSliderX);
    } else {
      if (newX) {
        this.setRightSlider(newX);
      }
      target.value = this.translatePositionToDate(this._rightSliderX);
    }
  }
  renderSlider(id) {
    const x = id === "slider-min" ? this._leftSliderX : this._rightSliderX;
    const k = id === "slider-min" ? 1 : -1;
    const c = SLIDER_CORNER_SIZE;
    const sliderShape = id === "slider-min" ? `
            M${x},0
            h-${this.sliderWidth - c}
            q-${c},0 -${c},${c}
            v${this.height - c * 2}
            q0,${c} ${c},${c}
            h${this.sliderWidth - c}
          ` : `
            M${x},0
            h${this.sliderWidth - c}
            q${c},0 ${c},${c}
            v${this.height - c * 2}
            q0,${c} -${c},${c}
            h-${this.sliderWidth - c}
          `;
    return svg`
    <svg
      id="${id}"
      @pointerdown="${this.drag}"
    >
      <path d="${sliderShape} z" fill="${sliderFill}" />
      <rect
        x="${x - this.sliderWidth * k + this.sliderWidth * 0.4 * k}"
        y="${this.height / 3}"
        width="1"
        height="${this.height / 3}"
        fill="white"
      />
      <rect
        x="${x - this.sliderWidth * k + this.sliderWidth * 0.6 * k}"
        y="${this.height / 3}"
        width="1"
        height="${this.height / 3}"
        fill="white"
      />
    </svg>
    `;
  }
  barIncluded(x) {
    return x >= this._leftSliderX && x <= this._rightSliderX;
  }
  renderSelectedRange() {
    return svg`
      <rect
        x="${this._leftSliderX}"
        y="0"
        width="${this._rightSliderX - this._leftSliderX}"
        height="${this.height}"
        fill="${selectedRangeFill}"
      />`;
  }
  renderHistogram() {
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
          fill="${this.barIncluded(x) ? barIncludedFill : barExcludedFill}"
          data-num-items="${data.value}"
          data-bin-start="${data.binStart}"
          data-bin-end="${data.binEnd}"
        />`;
      x += xScale;
      return bar;
    });
  }
  renderInput(kind, x) {
    return html`
      <input
        id="date-${kind}"
        placeholder="${DATE_FORMAT}"
        type="text"
        @change="${this.handleDateInput}"
        .value="${this.translatePositionToDate(x)}"
      />
    `;
  }
  renderTooltip() {
    return html`
      <style>
        #tooltip {
          width: ${this.tooltipWidth}px;
          height: ${this.tooltipHeight}px;
          top: ${-9 - this.tooltipHeight}px;
          left: ${this.tooltipOffset}px;
          display: ${this.tooltipDisplay};
        }
        #tooltip:after {
          left: ${this.tooltipWidth / 2}px;
        }
      </style>
      <div id="tooltip">${this.tooltipContent}</div>
    `;
  }
  render() {
    if (!this.data || !this._histData) {
      return html`no data`;
    }
    return html`
      <div id="container" class="noselect" style="width: ${this.width}px">
        ${this.renderTooltip()}
        <svg
          width="${this.width}"
          height="${this.height}"
          @pointerleave="${this.drop}"
        >
          ${this.renderSelectedRange()}
          <svg id="histogram">${this.renderHistogram()}</svg>
          ${this.renderSlider("slider-min")} ${this.renderSlider("slider-max")}
        </svg>
        <div id="inputs">
          ${this.renderInput("min", this._leftSliderX)}
          <div class="dash">-</div>
          ${this.renderInput("max", this._rightSliderX)}
        </div>
      </div>
    `;
  }
}
DateRangePicker.styles = css`
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
      bottom: 1px;
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
], DateRangePicker.prototype, "width", 2);
__decorate([
  property({type: Number})
], DateRangePicker.prototype, "height", 2);
__decorate([
  property({type: Number})
], DateRangePicker.prototype, "sliderWidth", 2);
__decorate([
  property({type: Number})
], DateRangePicker.prototype, "tooltipWidth", 2);
__decorate([
  property({type: Number})
], DateRangePicker.prototype, "tooltipHeight", 2);
__decorate([
  property({type: Number})
], DateRangePicker.prototype, "tooltipOffset", 2);
__decorate([
  property({type: String})
], DateRangePicker.prototype, "tooltipContent", 2);
__decorate([
  property({type: String})
], DateRangePicker.prototype, "tooltipDisplay", 2);
__decorate([
  property({type: String})
], DateRangePicker.prototype, "dateFormat", 2);
__decorate([
  property({type: Object})
], DateRangePicker.prototype, "data", 2);
__decorate([
  property({type: Number})
], DateRangePicker.prototype, "_leftSliderX", 2);
__decorate([
  property({type: Number})
], DateRangePicker.prototype, "_rightSliderX", 2);
__decorate([
  query("#tooltip")
], DateRangePicker.prototype, "tooltip", 2);
__decorate([
  query("#container")
], DateRangePicker.prototype, "container", 2);
