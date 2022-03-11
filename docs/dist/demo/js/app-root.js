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
import {LitElement, html} from "../../../_snowpack/pkg/lit.js";
import {customElement, state} from "../../../_snowpack/pkg/lit/decorators.js";
import "../../src/histogram-date-range.js";
export let AppRoot = class extends LitElement {
  constructor() {
    super(...arguments);
    this.dataSource = {
      minDate: 1955,
      maxDate: 2e3,
      minSelectedDate: 1955,
      maxSelectedDate: 2e3,
      bins: [
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14,
        15,
        16,
        17,
        18,
        19,
        20
      ]
    };
  }
  render() {
    return html`
      <histogram-date-range
        .minDate=${this.dataSource?.minDate}
        .maxDate=${this.dataSource?.maxDate}
        .minSelectedDate=${this.dataSource?.minSelectedDate}
        .maxSelectedDate=${this.dataSource?.maxSelectedDate}
        .updateDelay=${1e3}
        .bins=${this.dataSource?.bins}
      ></histogram-date-range>

      <button @click=${this.randomize}>Randomize</button>
    `;
  }
  randomize() {
    const minDate = Math.round(Math.random() * 1e3);
    const maxDate = minDate + Math.round(Math.random() * 1e3);
    const bins = Array.from({length: 20}, () => Math.floor(Math.random() * minDate));
    this.dataSource = {
      minDate,
      maxDate,
      minSelectedDate: minDate,
      maxSelectedDate: maxDate,
      bins
    };
  }
};
__decorate([
  state()
], AppRoot.prototype, "dataSource", 2);
AppRoot = __decorate([
  customElement("app-root")
], AppRoot);
