import { html, fixture, expect } from '@open-wc/testing';

import { DateRangePicker } from '../src/DateRangePicker.js';
import '../date-range-picker.js';

describe('DateRangePicker', () => {
  it('has a default title "Hey there" and counter 5', async () => {
    const el = await fixture<DateRangePicker>(html`<date-range-picker></date-range-picker>`);

    expect(el.title).to.equal('Hey there');
    expect(el.counter).to.equal(5);
  });

  it('increases the counter on button click', async () => {
    const el = await fixture<DateRangePicker>(html`<date-range-picker></date-range-picker>`);
    el.shadowRoot!.querySelector('button')!.click();

    expect(el.counter).to.equal(6);
  });

  it('can override the title via attribute', async () => {
    const el = await fixture<DateRangePicker>(html`<date-range-picker title="attribute title"></date-range-picker>`);

    expect(el.title).to.equal('attribute title');
  });

  it('passes the a11y audit', async () => {
    const el = await fixture<DateRangePicker>(html`<date-range-picker></date-range-picker>`);

    await expect(el).shadowDom.to.be.accessible();
  });
});
