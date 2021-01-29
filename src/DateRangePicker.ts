import {
  html,
  svg,
  css,
  LitElement,
  TemplateResult,
  SVGTemplateResult,
  property,
  query,
} from 'lit-element';
import dayjs from 'dayjs/esm/index.js';

// these values can be overridden via the component's HTML (camelCased) attributes
const WIDTH = 180;
const HEIGHT = 40;
const SLIDER_WIDTH = 10;
const TOOLTIP_WIDTH = 125;
const TOOLTIP_HEIGHT = 30;
const DATE_FORMAT = 'M/D/YYYY';

// these constants are not set up to be overridden
const DATE_PARSING_ERROR = -1;
const SLIDER_CORNER_SIZE = 4;

// these CSS custom props can be overridden from the HTML that is invoking this component
const sliderFill = 'var(--dateRangePickerSliderFill, #4B65FE)';
const selectedRangeFill = 'var(--dateRangePickerSelectedRangeFill, #DBE0FF)';
const barIncludedFill = 'var(--dateRangePickerBarIncludedFill, #2C2C2C)';
const barExcludedFill = 'var(--dateRangePickerBarExcludedFill, #CCCCCC)';
const inputBorder = css`var(--dateRangePickerInputBorder, 0.5px solid #2C2C2C)`;
const inputWidth = css`var(--dateRangePickerInputWidth, 70px)`;
const inputFontSize = css`var(--dateRangePickerInputFontSize, 1.2rem)`;
const tooltipBackgroundColor = css`var(--dateRangePickerTooltipBackgroundColor, #2C2C2C)`;
const tooltipTextColor = css`var(--dateRangePickerTooltipTextColor, #FFFFFF)`;
const tooltipFontSize = css`var(--dateRangePickerTooltipFontSize, 1.1rem)`;

type SliderIds = 'slider-min' | 'slider-max';
type InputIds = 'date-min' | 'date-max';

interface HistogramInputData {
  minDate: string;
  maxDate: string;
  bins: number[];
}

interface HistogramItem {
  value: number;
  height: number;
  binStart: string;
  binEnd: string;
}

export class DateRangePicker extends LitElement {
  /* eslint-disable lines-between-class-members */

  // these properties are intended to be passed in as attributes
  @property({ type: Number }) width = WIDTH;
  @property({ type: Number }) height = HEIGHT;
  @property({ type: Number }) sliderWidth = SLIDER_WIDTH;
  @property({ type: Number }) tooltipWidth = TOOLTIP_WIDTH;
  @property({ type: Number }) tooltipHeight = TOOLTIP_HEIGHT;
  @property({ type: String }) dateFormat = DATE_FORMAT;
  @property({ type: Object }) data?: HistogramInputData;
  @property({ type: Object }) currentSlider?: SVGRectElement;

  // these properties are intended to be private
  @property({ type: Number }) _leftSliderX: number = 0;
  @property({ type: Number }) _rightSliderX: number = 0;

  @query('#tooltip') tooltip!: HTMLDivElement;
  @query('#container') container!: HTMLDivElement;

  // these properties don't need to be tracked for changes
  _minDate: number = 0;
  _maxDate: number = 0;
  _dragOffset: number = 0;
  _histWidth: number = 0;
  _numBins: number = 0;
  _binWidth: number = 0;
  _histData: HistogramItem[] = [];

  /* eslint-enable lines-between-class-members */

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
      display: none;
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

  firstUpdated(): void {
    this._leftSliderX = this.sliderWidth;
    this._rightSliderX = this.width - this.sliderWidth;
    this._minDate = dayjs(this.data?.minDate).valueOf();
    this._maxDate = dayjs(this.data?.maxDate).valueOf();
    this._histWidth = this.width - this.sliderWidth * 2;
    this._numBins = this.data?.bins?.length ?? 1;
    this._binWidth = this._histWidth / this._numBins;
    this._histData = this.generateHistData();
  }

  generateHistData(): HistogramItem[] {
    if (!this.data) {
      return [];
    }
    const minValue = Math.min(...this.data.bins);
    const maxValue = Math.max(...this.data.bins);
    const valueScale = this.height / Math.log1p(maxValue - minValue);
    const dateScale = this.dateRange() / this._numBins;
    return this.data.bins.map((v: number, i: number) => {
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
  }

  dateRange(): number {
    return this._maxDate - this._minDate;
  }

  showTooltip(e: PointerEvent): void {
    if (Array.from(this.container.classList).includes('dragging')) {
      return;
    }
    const target = e.currentTarget as SVGRectElement;
    const x = target.x.baseVal.value + this.sliderWidth / 2;
    const data = target.dataset;
    const itemsText = `item${data.numItems !== '1' ? 's' : ''}`;
    const tooltipOffset =
      x + (this._binWidth - this.sliderWidth - this.tooltipWidth) / 2;
    this.tooltip.style.left = `${tooltipOffset}px`;
    this.tooltip.innerHTML = `${data.numItems} ${itemsText}<br>${data.binStart} - ${data.binEnd}`;
    this.tooltip.style.display = 'block';
  }

  hideTooltip(): void {
    this.tooltip.style.display = 'none';
    this.tooltip.innerHTML = '';
  }

  // use arrow functions (rather than standard JS class instance methods) so
  // that `this` is bound to the DateRangePicker object and not the event
  // target. for more info see
  // https://lit-element.polymer-project.org/guide/events#using-this-in-event-listeners
  drag = (e: PointerEvent): void => {
    // prevent selecting text or other ranges while dragging, especially in Safari
    e.preventDefault();

    this.setDragOffset(e);
    this.container.classList.add('dragging');

    window.addEventListener('pointermove', this.move);
    window.addEventListener('pointerup', this.drop);
    window.addEventListener('pointercancel', this.drop);
  };

  drop = (): void => {
    this.container.classList.remove('dragging');

    window.removeEventListener('pointermove', this.move);
    window.removeEventListener('pointerup', this.drop);
    window.removeEventListener('pointercancel', this.drop);
  };

  move = (e: PointerEvent): void => {
    const newX = e.offsetX - this._dragOffset;
    const slider = this.currentSlider as SVGRectElement;
    return (slider.id as SliderIds) === 'slider-min'
      ? this.setLeftSlider(newX)
      : this.setRightSlider(newX);
  };

  // find position of pointer in relation to the current slider
  setDragOffset(e: PointerEvent): void {
    this.currentSlider = e.currentTarget as SVGRectElement;
    const sliderX =
      (this.currentSlider.id as SliderIds) === 'slider-min'
        ? this._leftSliderX
        : this._rightSliderX;
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

  setLeftSlider(newX: number): void {
    const toSet = Math.max(newX, this.sliderWidth);
    this._leftSliderX = Math.min(toSet, this._rightSliderX);
  }

  setRightSlider(newX: number): void {
    const toSet = Math.max(newX, this._leftSliderX);
    this._rightSliderX = Math.min(toSet, this.width - this.sliderWidth);
  }

  translatePositionToDate(x: number): string {
    const milliseconds =
      ((x - this.sliderWidth) * this.dateRange()) / this._histWidth;
    const date = dayjs(this._minDate + milliseconds);
    return date.format(this.dateFormat);
  }

  translateDateToPosition(date: string): number {
    const milliseconds: number | undefined = dayjs(date).valueOf();
    if (!milliseconds) {
      return DATE_PARSING_ERROR;
    }
    // translate where we are within the date range into what the new x-position
    // of the slider should be
    return (
      this.sliderWidth +
      ((milliseconds - this._minDate) * this._histWidth) / this.dateRange()
    );
  }

  handleDateInput(e: InputEvent): void {
    const target = e.currentTarget as HTMLInputElement;
    const newX = this.translateDateToPosition(target.value);
    if ((target.id as InputIds) === 'date-min') {
      if (newX !== DATE_PARSING_ERROR) {
        this.setLeftSlider(newX);
      }
      target.value = this.translatePositionToDate(this._leftSliderX);
    } else {
      if (newX !== DATE_PARSING_ERROR) {
        this.setRightSlider(newX);
      }
      target.value = this.translatePositionToDate(this._rightSliderX);
    }
  }

  renderSlider(id: SliderIds): SVGTemplateResult {
    const x = id === 'slider-min' ? this._leftSliderX : this._rightSliderX;
    const k = id === 'slider-min' ? 1 : -1;
    const c = SLIDER_CORNER_SIZE;
    const sliderShape =
      id === 'slider-min'
        ? `
            M${x},0
            h-${this.sliderWidth - c}
            q-${c},0 -${c},${c}
            v${this.height - c * 2}
            q0,${c} ${c},${c}
            h${this.sliderWidth - c}
          `
        : `
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

  barIncluded(x: number): boolean {
    return x >= this._leftSliderX && x <= this._rightSliderX;
  }

  renderSelectedRange(): SVGTemplateResult {
    return svg`
      <rect
        x="${this._leftSliderX}"
        y="0"
        width="${this._rightSliderX - this._leftSliderX}"
        height="${this.height}"
        fill="${selectedRangeFill}"
      />`;
  }

  renderHistogram(): SVGTemplateResult[] {
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
          fill="${this.barIncluded(x) ? barIncludedFill : barExcludedFill}"
          data-num-items="${data.value}"
          data-bin-start="${data.binStart}"
          data-bin-end="${data.binEnd}"
        />`;
      x += xScale;
      return bar;
    });
  }

  renderInput(kind: 'min' | 'max', x: number): TemplateResult {
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

  renderTooltipStyleUpdates(): TemplateResult {
    return html`
      <style>
        #tooltip {
          width: ${this.tooltipWidth}px;
          height: ${this.tooltipHeight}px;
          top: ${-9 - this.tooltipHeight}px;
        }
        #tooltip:after {
          left: ${this.tooltipWidth / 2}px;
        }
      </style>
    `;
  }

  render(): TemplateResult {
    if (!this.data || !this._histData) {
      return html`no data`;
    }
    return html`
      <div id="container" class="noselect" style="width: ${this.width}px">
        ${this.renderTooltipStyleUpdates()}
        <div id="tooltip"></div>
        <svg
          width="${this.width}"
          height="${this.height}"
          @pointerleave="${this.drop}"
        >
          ${this.renderSelectedRange()}
          <svg id="histogram">${this.renderHistogram()}</svg>
          ${this.renderSlider('slider-min')} ${this.renderSlider('slider-max')}
        </svg>
        <div id="inputs">
          ${this.renderInput('min', this._leftSliderX)}
          <div class="dash">-</div>
          ${this.renderInput('max', this._rightSliderX)}
        </div>
      </div>
    `;
  }
}
