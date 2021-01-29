/* eslint-disable no-debugger */
import { html, fixture, expect, aTimeout } from '@open-wc/testing';

import { DateRangePicker } from '../src/DateRangePicker.js';
import '../src/date-range-picker.js';

const SLIDER_WIDTH = 10;
const WIDTH = 200;

const subject = html`
  <date-range-picker
    width="${WIDTH}"
    tooltipWidth="140"
    height="50"
    data='{ "minDate": "1900", "maxDate": "Dec 4, 2020","bins": [ 33, 1, 100] }'
  >
  </date-range-picker>
`;

async function createCustomElementInHTMLContainer() {
  document.head.insertAdjacentHTML(
    'beforeend',
    `<style>
      html {
        font-size:10px;
      }
      .container {
        width: 400px; 
        height: 400px; 
        display: flex; 
        background: #FFF6E1;
        justify-content: center; 
        align-items: center;
      }
    </style>`
  );
  // https://open-wc.org/docs/testing/helpers/#customize-the-fixture-container
  const parentNode = document.createElement('div');
  parentNode.setAttribute('class', 'container');
  return fixture<DateRangePicker>(subject, { parentNode });
}

describe('DateRangePicker', () => {
  it('shows scaled histogram bars when provided with data', async () => {
    const el = await createCustomElementInHTMLContainer();
    const bars = (el.shadowRoot?.querySelectorAll(
      '.bar'
    ) as unknown) as SVGRectElement[];
    const heights = Array.from(bars).map(b => b.height.baseVal.value);

    expect(heights).to.eql([38, 7, 50]);
  });

  it('changes the position of the sliders and standardizes date format when dates are entered', async () => {
    const el = await createCustomElementInHTMLContainer();

    /* -------------------------- minimum (left) slider ------------------------- */
    expect(el._leftSliderX).to.eq(SLIDER_WIDTH);
    const minDateInput = el.shadowRoot?.querySelector(
      '#date-min'
    ) as HTMLInputElement;

    // valid min date
    minDateInput.value = '1950';
    minDateInput.dispatchEvent(new Event('change'));
    expect(Math.floor(el._leftSliderX)).to.eq(84);
    expect(minDateInput.value).to.eq('1/1/1950');

    // attempt to set date earlier than first item
    minDateInput.value = 'October 1, 1850';
    minDateInput.dispatchEvent(new Event('change'));
    expect(Math.floor(el._leftSliderX)).to.eq(SLIDER_WIDTH); // move all the way to left
    expect(minDateInput.value).to.eq('1/1/1900'); // set to date of first item

    /* -------------------------- maximum (right) slider ------------------------- */
    expect(el._rightSliderX).to.eq(WIDTH - SLIDER_WIDTH);
    const maxDateInput = el.shadowRoot?.querySelector(
      '#date-max'
    ) as HTMLInputElement;

    // set valid max date
    maxDateInput.value = 'March 12 1975';
    maxDateInput.dispatchEvent(new Event('change'));
    expect(Math.floor(el._rightSliderX)).to.eq(121);
    expect(maxDateInput.value).to.eq('3/12/1975');

    // attempt to set date later than last item
    maxDateInput.value = 'Dec 31 2199';
    maxDateInput.dispatchEvent(new Event('change'));
    expect(Math.floor(el._rightSliderX)).to.eq(WIDTH - SLIDER_WIDTH); // all the way to right
    expect(maxDateInput.value).to.eq('12/4/2020'); // date of last item
  });

  it('handles invalid date inputs', async () => {
    const el = await createCustomElementInHTMLContainer();

    /* -------------------------- minimum (left) slider ------------------------- */
    const minDateInput = el.shadowRoot?.querySelector(
      '#date-min'
    ) as HTMLInputElement;

    minDateInput.value = 'May 17, 1961';
    minDateInput.dispatchEvent(new Event('change'));
    expect(Math.floor(el._leftSliderX)).to.eq(101);
    expect(minDateInput.value).to.eq('5/17/1961');

    // enter invalid value
    minDateInput.value = 'invalid';
    minDateInput.dispatchEvent(new Event('change'));

    expect(Math.floor(el._leftSliderX)).to.eq(101); // does not move
    expect(minDateInput.value).to.eq('5/17/1961'); // resets back to previous date

    /* -------------------------- maximum (right) slider ------------------------- */
    const maxDateInput = el.shadowRoot?.querySelector(
      '#date-max'
    ) as HTMLInputElement;

    // initial values
    expect(el._rightSliderX).to.eq(WIDTH - SLIDER_WIDTH);
    expect(maxDateInput.value).to.eq('12/4/2020');

    // enter invalid value
    maxDateInput.value = 'Abc 12, 1YYY';
    maxDateInput.dispatchEvent(new Event('change'));

    expect(Math.floor(el._rightSliderX)).to.eq(WIDTH - SLIDER_WIDTH); // does not move
    expect(maxDateInput.value).to.eq('12/4/2020'); // resets back to previous date
  });

  it('updates the date inputs when the sliders are moved', async () => {
    const el = await createCustomElementInHTMLContainer();

    /* -------------------------- minimum (left) slider ------------------------- */
    const minSlider = el.shadowRoot?.querySelector('#slider-min') as SVGElement;
    const container = el.shadowRoot?.querySelector(
      '#container'
    ) as HTMLDivElement;
    const minDateInput = el.shadowRoot?.querySelector(
      '#date-min'
    ) as HTMLInputElement;

    // initial state
    expect(minSlider.getBoundingClientRect().x).to.eq(108);
    expect(minSlider.classList[0]).to.be.undefined;

    // pointer down
    minSlider.dispatchEvent(new PointerEvent('pointerdown'));
    expect(container.classList[0]).to.eq('dragging'); // cursor changes to 'grab'

    // slide to right
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 70 }));
    await aTimeout(20);

    // slider has moved
    expect(minSlider.getBoundingClientRect().x).to.eq(168);
    // min date is updated
    expect(minDateInput.value).to.eq('4/23/1940');

    // stop dragging
    window.dispatchEvent(new PointerEvent('pointerup'));
    await aTimeout(20);
    // cursor returns to normal
    expect(container.classList[0]).to.be.undefined;

    /* -------------------------- maximum (right) slider ------------------------- */
    const maxSlider = el.shadowRoot?.querySelector('#slider-max') as SVGElement;
    const maxDateInput = el.shadowRoot?.querySelector(
      '#date-max'
    ) as HTMLInputElement;

    // initial state
    expect(maxSlider.getBoundingClientRect().x).to.eq(298);

    // slide to left
    maxSlider.dispatchEvent(new PointerEvent('pointerdown', { clientX: 195 }));
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 160 }));
    await aTimeout(20);

    // slider has moved
    expect(maxSlider.getBoundingClientRect().x).to.eq(268);
    // max date is updated
    expect(maxDateInput.value).to.eq('10/8/2000');
    await aTimeout(20);

    // try to slide min slider past max slider
    minSlider.dispatchEvent(new PointerEvent('pointerdown', { clientX: 62 }));
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 190 }));
    await aTimeout(20);

    // slider moves all the way to meet the right slider
    expect(minSlider.getBoundingClientRect().x).to.eq(258);

    // try to slide max slider past min slider
    maxSlider.dispatchEvent(new PointerEvent('pointerdown', { clientX: 120 }));
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 50 }));
    await aTimeout(20);
    expect(maxSlider.getBoundingClientRect().x).to.eq(268); // max slider didn't move
  });

  it('shows/hides tooltip when hovering over (or pointing at) a bar', async () => {
    const el = await createCustomElementInHTMLContainer();
    const bars = (el.shadowRoot?.querySelectorAll(
      '.bar'
    ) as unknown) as SVGRectElement[];
    const tooltip = el.shadowRoot?.querySelector('#tooltip') as HTMLDivElement;
    expect(tooltip.innerText).to.eq('');

    // hover
    bars[0].dispatchEvent(new PointerEvent('pointerenter'));
    expect(tooltip.innerText).to.match(/^33 items\n1\/1\/1900 - 4\/23\/1940/);
    expect(tooltip.style.display).to.eq('block');

    // leave
    bars[0].dispatchEvent(new PointerEvent('pointerleave'));
    expect(tooltip.style.display).to.eq('none');
    expect(tooltip.innerText).to.eq('');

    // ensure singular item is not pluralized
    bars[1].dispatchEvent(new PointerEvent('pointerenter'));
    expect(tooltip.innerText).to.match(/^1 item\n4\/23\/1940 - 8\/13\/1980/);
  });

  it('does not show tooltip while dragging', async () => {
    const el = await createCustomElementInHTMLContainer();
    const bars = (el.shadowRoot?.querySelectorAll(
      '.bar'
    ) as unknown) as SVGRectElement[];
    const tooltip = el.shadowRoot?.querySelector('#tooltip') as HTMLDivElement;
    expect(tooltip.innerText).to.eq('');
    const minSlider = el.shadowRoot?.querySelector('#slider-min') as SVGElement;

    // pointer down and slide right
    minSlider.dispatchEvent(new PointerEvent('pointerdown'));
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 100 }));
    await aTimeout(20);

    // hover over bar
    bars[0].dispatchEvent(new PointerEvent('pointerenter'));
    await aTimeout(20);
    // tooltip display is suppressed while dragging
    expect(tooltip.style.display).to.eq('');
  });

  it('passes the a11y audit', async () => {
    await fixture<DateRangePicker>(subject).then(el =>
      expect(el).shadowDom.to.be.accessible()
    );
  });

  it('shows a message if no data', async () => {
    const el = await fixture<DateRangePicker>(
      html`<date-range-picker></date-range-picker>`
    );
    expect(el.shadowRoot?.innerHTML).to.contain('no data');
  });
});
