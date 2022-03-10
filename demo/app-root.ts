import { LitElement, html, TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import '../src/histogram-date-range';

/**
 * This is mainly to test the histogram-date-range within
 * a lit-element.
 */
@customElement('app-root')
export class AppRoot extends LitElement {
  render(): TemplateResult {
    return html`
      <histogram-date-range
        .minDate=${1400}
        .maxDate=${2021}
        .updateDelay=${1000}
        .bins=${[74, 67, 17, 66, 49, 93]}
      ></histogram-date-range>
    `;
  }
}
