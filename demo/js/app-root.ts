import { LitElement, html, TemplateResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import '../../src/histogram-date-range';

interface DataSource {
  minDate: unknown;
  maxDate: unknown;
  minSelectedDate: unknown;
  maxSelectedDate: unknown;
  bins: number[];
}

/**
 * This is mainly to test the histogram-date-range within
 * a lit-element.
 */
@customElement('app-root')
export class AppRoot extends LitElement {
  @state() dataSource: DataSource = {
    minDate: 1955,
    maxDate: 2000,
    minSelectedDate: 1955,
    maxSelectedDate: 2000,
    bins: [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    ],
  };

  render(): TemplateResult {
    return html`
      <histogram-date-range
        .minDate=${this.dataSource?.minDate}
        .maxDate=${this.dataSource?.maxDate}
        .minSelectedDate=${this.dataSource?.minSelectedDate}
        .maxSelectedDate=${this.dataSource?.maxSelectedDate}
        .updateDelay=${1000}
        .bins=${this.dataSource?.bins}
      ></histogram-date-range>

      <button @click=${this.randomize}>Randomize</button>
    `;
  }

  private randomize() {
    const minDate = Math.round(Math.random() * 1000);
    const maxDate = minDate + Math.round(Math.random() * 1000);
    // generate random bins
    const bins = Array.from({ length: 20 }, () =>
      Math.floor(Math.random() * minDate)
    );
    this.dataSource = {
      minDate,
      maxDate,
      minSelectedDate: minDate,
      maxSelectedDate: maxDate,
      bins: bins,
    };
  }
}
