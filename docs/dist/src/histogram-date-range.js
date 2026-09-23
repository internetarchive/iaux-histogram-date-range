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
import "../../_snowpack/pkg/@internetarchive/ia-activity-indicator.js";
import dayjs from "../../_snowpack/pkg/dayjs/esm.js";
import customParseFormat from "../../_snowpack/pkg/dayjs/esm/plugin/customParseFormat.js";
import fixFirstCenturyYears from "./plugins/fix-first-century-years.js";
import {
  css,
  html,
  LitElement,
  nothing,
  svg
} from "../../_snowpack/pkg/lit.js";
import {customElement, property, state, query} from "../../_snowpack/pkg/lit/decorators.js";
import {live} from "../../_snowpack/pkg/lit/directives/live.js";
import {classMap} from "../../_snowpack/pkg/lit/directives/class-map.js";
import {styleMap} from "../../_snowpack/pkg/lit/directives/style-map.js";
dayjs.extend(customParseFormat);
dayjs.extend(fixFirstCenturyYears);
const WIDTH = 180;
const HEIGHT = 40;
const SLIDER_WIDTH = 10;
const TOOLTIP_WIDTH = 125;
const TOOLTIP_HEIGHT = 30;
const DATE_FORMAT = "YYYY";
const MISSING_DATA = "no data";
const UPDATE_DEBOUNCE_DELAY_MS = 0;
const TOOLTIP_LABEL = "item";
const SLIDER_CORNER_SIZE = 4;
const BAR_SCALING_PRESET_FNS = {
  linear: (binValue) => binValue,
  logarithmic: (binValue) => Math.log1p(binValue)
};
const sliderColor = css`var(--histogramDateRangeSliderColor, #4B65FE)`;
const selectedRangeColor = css`var(--histogramDateRangeSelectedRangeColor, #DBE0FF)`;
const barIncludedFill = css`var(--histogramDateRangeBarIncludedFill, #2C2C2C)`;
const activityIndicatorColor = css`var(--histogramDateRangeActivityIndicator, #2C2C2C)`;
const barExcludedFill = css`var(--histogramDateRangeBarExcludedFill, #CCCCCC)`;
const inputRowMargin = css`var(--histogramDateRangeInputRowMargin, 0)`;
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
    this.updateWhileFocused = false;
    this.binSnapping = "none";
    this.tooltipLabel = TOOLTIP_LABEL;
    this.barScaling = "logarithmic";
    this._tooltipOffsetX = 0;
    this._tooltipOffsetY = 0;
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
      const histogramClientX = this.getBoundingClientRect().x;
      const newX = e.clientX - histogramClientX - this._dragOffset;
      const slider = this._currentSlider;
      if (slider.id === "slider-min") {
        this.minSelectedDate = this.translatePositionToDate(this.validMinSliderX(newX));
      } else {
        this.maxSelectedDate = this.translatePositionToDate(this.validMaxSliderX(newX));
        if (this.getMSFromString(this.maxSelectedDate) > this._maxDateMS) {
          this.maxSelectedDate = this.maxDate;
        }
      }
    };
  }
  disconnectedCallback() {
    this.removeListeners();
    super.disconnectedCallback();
  }
  willUpdate(changedProps) {
    if (changedProps.has("bins") || changedProps.has("minDate") || changedProps.has("maxDate") || changedProps.has("minSelectedDate") || changedProps.has("maxSelectedDate") || changedProps.has("width") || changedProps.has("height") || changedProps.has("binSnapping") || changedProps.has("barScaling")) {
      this.handleDataUpdate();
    }
  }
  handleDataUpdate() {
    if (!this.hasBinData) {
      return;
    }
    this._histWidth = this.width - this.sliderWidth * 2;
    this._minDateMS = this.snapTimestamp(this.getMSFromString(this.minDate));
    this._maxDateMS = this.snapTimestamp(this.getMSFromString(this.maxDate) + this.snapInterval) + this.snapEndOffset;
    this._binWidth = this._histWidth / this._numBins;
    this._histData = this.calculateHistData();
    this.minSelectedDate = this.minSelectedDate ? this.minSelectedDate : this.minDate;
    this.maxSelectedDate = this.maxSelectedDate ? this.maxSelectedDate : this.maxDate;
  }
  snapToNextSecond(timestamp) {
    return Math.ceil(timestamp / 1e3) * 1e3;
  }
  snapToMonth(timestamp) {
    const d = dayjs(timestamp);
    const monthsToAdd = d.date() < 16 ? 0 : 1;
    const snapped = d.add(monthsToAdd, "month").date(1).hour(0).minute(0).second(0).millisecond(0);
    return snapped.valueOf();
  }
  snapToYear(timestamp) {
    const d = dayjs(timestamp);
    const yearsToAdd = d.month() < 6 ? 0 : 1;
    const snapped = d.add(yearsToAdd, "year").month(0).date(1).hour(0).minute(0).second(0).millisecond(0);
    return snapped.valueOf();
  }
  snapTimestamp(timestamp) {
    switch (this.binSnapping) {
      case "year":
        return this.snapToYear(timestamp);
      case "month":
        return this.snapToMonth(timestamp);
      case "none":
      default:
        return this.snapToNextSecond(timestamp);
    }
  }
  get barScalingFunction() {
    if (typeof this.barScaling === "string") {
      return BAR_SCALING_PRESET_FNS[this.barScaling];
    }
    return this.barScaling;
  }
  calculateHistData() {
    const {bins, height, dateRangeMS, _numBins, _minDateMS} = this;
    const minValue = Math.min(...this.bins);
    const maxValue = Math.max(...this.bins);
    const valueRange = minValue === maxValue ? 1 : this.barScalingFunction(maxValue);
    const valueScale = height / valueRange;
    const dateScale = dateRangeMS / _numBins;
    return bins.map((v, i) => {
      const binStartMS = this.snapTimestamp(i * dateScale + _minDateMS);
      const binStart = this.formatDate(binStartMS);
      const binEndMS = this.snapTimestamp((i + 1) * dateScale + _minDateMS) + this.snapEndOffset;
      const binEnd = this.formatDate(binEndMS);
      const tooltipStart = this.formatDate(binStartMS, this.tooltipDateFormat);
      const tooltipEnd = this.formatDate(binEndMS, this.tooltipDateFormat);
      const tooltip = tooltipStart === tooltipEnd ? tooltipStart : `${tooltipStart} - ${tooltipEnd}`;
      return {
        value: v,
        height: Math.floor(this.barScalingFunction(v) * valueScale),
        binStart,
        binEnd,
        tooltip
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
  get histogramLeftEdgeX() {
    return this.sliderWidth;
  }
  get histogramRightEdgeX() {
    return this.width - this.sliderWidth;
  }
  get snapInterval() {
    const yearMS = 31536e6;
    const monthMS = 2592e6;
    switch (this.binSnapping) {
      case "year":
        return yearMS;
      case "month":
        return monthMS;
      case "none":
      default:
        return 0;
    }
  }
  get snapEndOffset() {
    return this.binSnapping !== "none" && this._numBins > 1 ? -1 : 0;
  }
  get tooltipDateFormat() {
    return this._tooltipDateFormat ?? this.dateFormat;
  }
  set tooltipDateFormat(value) {
    this._tooltipDateFormat = value;
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
    const proposedDateMS = this.getMSFromString(rawDate);
    const isValidDate = !Number.isNaN(proposedDateMS);
    const isNotTooRecent = proposedDateMS <= this.getMSFromString(this.maxSelectedDate);
    if (isValidDate && isNotTooRecent) {
      this._minSelectedDate = this.formatDate(proposedDateMS);
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
    const proposedDateMS = this.getMSFromString(rawDate);
    const isValidDate = !Number.isNaN(proposedDateMS);
    const isNotTooOld = proposedDateMS >= this.getMSFromString(this.minSelectedDate);
    if (isValidDate && isNotTooOld) {
      this._maxSelectedDate = this.formatDate(proposedDateMS);
    }
    this.requestUpdate();
  }
  get minSliderX() {
    const x = this.translateDateToPosition(this.minSelectedDate);
    return this.validMinSliderX(x);
  }
  get maxSliderX() {
    const maxSelectedDateMS = this.snapTimestamp(this.getMSFromString(this.maxSelectedDate) + this.snapInterval);
    const x = this.translateDateToPosition(this.formatDate(maxSelectedDateMS));
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
    const itemsText = `${this.tooltipLabel}${dataset.numItems !== "1" ? "s" : ""}`;
    const formattedNumItems = Number(dataset.numItems).toLocaleString();
    const tooltipPadding = 2;
    const bufferHeight = 9;
    const heightAboveHistogram = bufferHeight + this.tooltipHeight;
    const histogramBounds = this.getBoundingClientRect();
    const barX = histogramBounds.x + x;
    const histogramY = histogramBounds.y;
    this._tooltipOffsetX = barX - tooltipPadding + (this._binWidth - this.sliderWidth - this.tooltipWidth) / 2 + window.scrollX;
    this._tooltipOffsetY = histogramY - heightAboveHistogram + window.scrollY;
    this._tooltipContent = html`
      ${formattedNumItems} ${itemsText}<br />
      ${dataset.tooltip}
    `;
    this._tooltip.showPopover?.();
  }
  hideTooltip() {
    this._tooltipContent = void 0;
    this._tooltip.hidePopover?.();
  }
  validMinSliderX(newX) {
    const rightLimit = Math.min(this.translateDateToPosition(this.maxSelectedDate), this.histogramRightEdgeX);
    newX = this.clamp(newX, this.histogramLeftEdgeX, rightLimit);
    const isInvalid = Number.isNaN(newX) || rightLimit < this.histogramLeftEdgeX;
    return isInvalid ? this.histogramLeftEdgeX : newX;
  }
  validMaxSliderX(newX) {
    const leftLimit = Math.max(this.histogramLeftEdgeX, this.translateDateToPosition(this.minSelectedDate));
    newX = this.clamp(newX, leftLimit, this.histogramRightEdgeX);
    const isInvalid = Number.isNaN(newX) || leftLimit > this.histogramRightEdgeX;
    return isInvalid ? this.histogramRightEdgeX : newX;
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
    const histogramClientX = this.getBoundingClientRect().x;
    this._dragOffset = e.clientX - histogramClientX - sliderX;
  }
  translatePositionToDate(x) {
    const milliseconds = this.snapToNextSecond((x - this.sliderWidth) * this.dateRangeMS / this._histWidth);
    return this.formatDate(this._minDateMS + milliseconds);
  }
  translateDateToPosition(date) {
    const milliseconds = this.getMSFromString(date);
    return this.sliderWidth + (milliseconds - this._minDateMS) * this._histWidth / this.dateRangeMS;
  }
  clamp(x, minValue, maxValue) {
    return Math.min(Math.max(x, minValue), maxValue);
  }
  handleInputFocus() {
    if (!this.updateWhileFocused) {
      this.cancelPendingUpdateEvent();
    }
  }
  handleMinDateInput(e) {
    const target = e.currentTarget;
    if (target.value !== this.minSelectedDate) {
      this.minSelectedDate = target.value;
      this.beginEmitUpdateProcess();
    }
  }
  handleMaxDateInput(e) {
    const target = e.currentTarget;
    if (target.value !== this.maxSelectedDate) {
      this.maxSelectedDate = target.value;
      this.beginEmitUpdateProcess();
    }
  }
  handleKeyUp(e) {
    if (e.key === "Enter") {
      const target = e.currentTarget;
      target.blur();
      if (target.id === "date-min") {
        this.handleMinDateInput(e);
      } else if (target.id === "date-max") {
        this.handleMaxDateInput(e);
      }
    }
  }
  get currentDateRangeString() {
    return `${this.minSelectedDate}:${this.maxSelectedDate}`;
  }
  getMSFromString(date) {
    const stringified = typeof date === "string" ? date : String(date);
    const digitGroupCount = (stringified.split(/(\d+)/).length - 1) / 2;
    if (digitGroupCount === 1) {
      const dateObj = new Date(0, 0);
      dateObj.setFullYear(Number(stringified));
      return dateObj.getTime();
    }
    return dayjs(stringified, [this.dateFormat, DATE_FORMAT]).valueOf();
  }
  handleBarClick(e) {
    const dataset = e.currentTarget.dataset;
    const clickPosition = (this.getMSFromString(dataset.binStart) + this.getMSFromString(dataset.binEnd)) / 2;
    const distanceFromMinSlider = Math.abs(clickPosition - this.getMSFromString(this.minSelectedDate));
    const distanceFromMaxSlider = Math.abs(clickPosition - this.getMSFromString(this.maxSelectedDate));
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
    const sliderClasses = classMap({
      slider: true,
      draggable: !this.disabled,
      dragging: this._isDragging
    });
    return svg`
    <svg
      id=${id}
      class=${sliderClasses}
      @pointerdown=${this.drag}
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
      const {minSelectedDate, maxSelectedDate} = this;
      const barHeight = data.height;
      const binIsBeforeMin = this.isBefore(data.binEnd, minSelectedDate);
      const binIsAfterMax = this.isAfter(data.binStart, maxSelectedDate);
      const barFill = binIsBeforeMin || binIsAfterMax ? barExcludedFill : barIncludedFill;
      const barStyle = `stroke-dasharray: 0 ${barWidth} ${barHeight} ${barWidth} 0 ${barHeight}`;
      const bar = svg`
        <rect
          class="bar-pointer-target"
          x=${x}
          y="0"
          width=${barWidth}
          height=${this.height}
          @pointerenter=${this.showTooltip}
          @pointerleave=${this.hideTooltip}
          @click=${this.handleBarClick}
          fill="transparent"
          data-num-items=${data.value}
          data-bin-start=${data.binStart}
          data-bin-end=${data.binEnd}
          data-tooltip=${data.tooltip}
        />
        <rect
          class="bar"
          style=${barStyle}
          x=${x}
          y=${this.height - barHeight}
          width=${barWidth}
          height=${barHeight}
          fill=${barFill}
        />`;
      x += xScale;
      return bar;
    });
  }
  isBefore(date1, date2) {
    const date1MS = this.getMSFromString(date1);
    const date2MS = this.getMSFromString(date2);
    return date1MS < date2MS;
  }
  isAfter(date1, date2) {
    const date1MS = this.getMSFromString(date1);
    const date2MS = this.getMSFromString(date2);
    return date1MS > date2MS;
  }
  formatDate(dateMS, format = this.dateFormat) {
    if (Number.isNaN(dateMS)) {
      return "";
    }
    const date = dayjs(dateMS);
    if (date.year() < 1e3) {
      const tmpDate = date.year(199999);
      return tmpDate.format(format).replace(/199999/g, date.year().toString());
    }
    return date.format(format);
  }
  get minInputTemplate() {
    return html`
      <input
        id="date-min"
        placeholder=${this.dateFormat}
        type="text"
        @focus=${this.handleInputFocus}
        @blur=${this.handleMinDateInput}
        @keyup=${this.handleKeyUp}
        .value=${live(this.minSelectedDate)}
        ?disabled=${this.disabled}
      />
    `;
  }
  get maxInputTemplate() {
    return html`
      <input
        id="date-max"
        placeholder=${this.dateFormat}
        type="text"
        @focus=${this.handleInputFocus}
        @blur=${this.handleMaxDateInput}
        @keyup=${this.handleKeyUp}
        .value=${live(this.maxSelectedDate)}
        ?disabled=${this.disabled}
      />
    `;
  }
  get minLabelTemplate() {
    return html`<label for="date-min" class="sr-only">Minimum date:</label>`;
  }
  get maxLabelTemplate() {
    return html`<label for="date-max" class="sr-only">Maximum date:</label>`;
  }
  get tooltipTemplate() {
    const styles = styleMap({
      width: `${this.tooltipWidth}px`,
      height: `${this.tooltipHeight}px`,
      top: `${this._tooltipOffsetY}px`,
      left: `${this._tooltipOffsetX}px`
    });
    return html`
      <div id="tooltip" style=${styles} popover>${this._tooltipContent}</div>
    `;
  }
  get histogramAccessibilityTemplate() {
    let rangeText = "";
    if (this.minSelectedDate && this.maxSelectedDate) {
      rangeText = ` from ${this.minSelectedDate} to ${this.maxSelectedDate}`;
    } else if (this.minSelectedDate) {
      rangeText = ` from ${this.minSelectedDate}`;
    } else if (this.maxSelectedDate) {
      rangeText = ` up to ${this.maxSelectedDate}`;
    }
    const titleText = `Filter results for dates${rangeText}`;
    const descText = `This histogram shows the distribution of dates${rangeText}`;
    return html`<title id="histogram-title">${titleText}</title
      ><desc id="histogram-desc">${descText}</desc>`;
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
            aria-labelledby="histogram-title histogram-desc"
            @pointerleave="${this.drop}"
          >
            ${this.histogramAccessibilityTemplate} ${this.selectedRangeTemplate}
            <svg id="histogram">${this.histogramTemplate}</svg>
            ${this.minSliderTemplate} ${this.maxSliderTemplate}
          </svg>
          <div id="inputs">
            ${this.minLabelTemplate} ${this.minInputTemplate}
            <div class="dash">-</div>
            ${this.maxLabelTemplate} ${this.maxInputTemplate}
            <slot name="inputs-right-side"></slot>
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
    .bar,
    .bar-pointer-target {
      /* create a transparent border around the hist bars to prevent "gaps" and
      flickering when moving around between bars. this also helps with handling
      clicks on the bars, preventing users from being able to click in between
      bars */
      stroke: rgba(0, 0, 0, 0);
      /* ensure transparent stroke wide enough to cover gap between bars */
      stroke-width: 2px;
    }
    .bar {
      /* ensure the bar's pointer target receives events, not the bar itself */
      pointer-events: none;
    }
    .bar-pointer-target:hover + .bar {
      /* highlight currently hovered bar */
      fill-opacity: 0.7;
    }
    .disabled .bar-pointer-target:hover + .bar {
      /* ensure no visual hover interaction when disabled */
      fill-opacity: 1;
    }
    /****** histogram ********/
    #tooltip {
      position: absolute;
      background: ${tooltipBackgroundColor};
      margin: 0;
      border: 0;
      color: ${tooltipTextColor};
      text-align: center;
      border-radius: 3px;
      padding: 2px;
      font-size: ${tooltipFontSize};
      font-family: ${tooltipFontFamily};
      touch-action: none;
      pointer-events: none;
      overflow: visible;
    }
    #tooltip:after {
      content: '';
      position: absolute;
      margin-left: -5px;
      top: 100%;
      left: 50%;
      /* arrow */
      border: 5px solid ${tooltipTextColor};
      border-color: ${tooltipBackgroundColor} transparent transparent
        transparent;
    }
    /****** slider ********/
    .slider {
      shape-rendering: crispEdges; /* So the slider doesn't get blurry if dragged between pixels */
    }
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
      margin: ${inputRowMargin};
    }
    #inputs .dash {
      position: relative;
      bottom: -1px;
      align-self: center; /* Otherwise the dash sticks to the top while the inputs grow */
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
    .sr-only {
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      margin: 0 !important;
      padding: 0 !important;
      border: 0 !important;
      overflow: hidden !important;
      white-space: nowrap !important;
      clip: rect(1px, 1px, 1px, 1px) !important;
      -webkit-clip-path: inset(50%) !important;
      clip-path: inset(50%) !important;
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
  property({type: String})
], HistogramDateRange.prototype, "dateFormat", 2);
__decorate([
  property({type: String})
], HistogramDateRange.prototype, "missingDataMessage", 2);
__decorate([
  property({type: String})
], HistogramDateRange.prototype, "minDate", 2);
__decorate([
  property({type: String})
], HistogramDateRange.prototype, "maxDate", 2);
__decorate([
  property({type: Boolean})
], HistogramDateRange.prototype, "disabled", 2);
__decorate([
  property({type: Array})
], HistogramDateRange.prototype, "bins", 2);
__decorate([
  property({type: Boolean})
], HistogramDateRange.prototype, "updateWhileFocused", 2);
__decorate([
  property({type: String})
], HistogramDateRange.prototype, "binSnapping", 2);
__decorate([
  property({type: String})
], HistogramDateRange.prototype, "tooltipLabel", 2);
__decorate([
  property({type: String})
], HistogramDateRange.prototype, "barScaling", 2);
__decorate([
  state()
], HistogramDateRange.prototype, "_tooltipOffsetX", 2);
__decorate([
  state()
], HistogramDateRange.prototype, "_tooltipOffsetY", 2);
__decorate([
  state()
], HistogramDateRange.prototype, "_tooltipContent", 2);
__decorate([
  state()
], HistogramDateRange.prototype, "_tooltipDateFormat", 2);
__decorate([
  state()
], HistogramDateRange.prototype, "_isDragging", 2);
__decorate([
  state()
], HistogramDateRange.prototype, "_isLoading", 2);
__decorate([
  query("#tooltip")
], HistogramDateRange.prototype, "_tooltip", 2);
__decorate([
  property({type: String})
], HistogramDateRange.prototype, "tooltipDateFormat", 1);
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
