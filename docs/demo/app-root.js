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
import {LitElement, html} from "../_snowpack/pkg/lit.js";
import {customElement} from "../_snowpack/pkg/lit/decorators.js";
import "../dist/src/histogram-date-range.js";
export let AppRoot = class extends LitElement {
  render() {
    return html`
      <histogram-date-range
        .minDate=${1400}
        .maxDate=${2021}
        .updateDelay=${1e3}
        .bins=${[74, 67, 17, 66, 49, 93]}
      ></histogram-date-range>
    `;
  }
};
AppRoot = __decorate([
  customElement("app-root")
], AppRoot);
