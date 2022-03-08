import { html, fixture, expect, oneEvent, aTimeout } from '@open-wc/testing';

import { HistogramDateRange } from '../src/histogram-date-range';
import '../src/histogram-date-range';

const SLIDER_WIDTH = 10;
const WIDTH = 200;

const subject = html`
  <histogram-date-range
    width="${WIDTH}"
    tooltipWidth="140"
    height="50"
    dateFormat="M/D/YYYY"
    minDate="1900"
    maxDate="12/4/2020"
    bins="[33, 1, 100]"
  >
  </histogram-date-range>
`;

async function createCustomElementInHTMLContainer(): Promise<HistogramDateRange> {
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
  return fixture<HistogramDateRange>(subject, { parentNode });
}

describe('HistogramDateRange', () => {
  it('shows scaled histogram bars when provided with data', async () => {
    const el = await createCustomElementInHTMLContainer();
    const bars = el.shadowRoot?.querySelectorAll(
      '.bar'
    ) as unknown as SVGRectElement[];
    const heights = Array.from(bars).map(b => b.height.baseVal.value);

    expect(heights).to.eql([38, 7, 50]);
  });

  it('changes the position of the sliders and standardizes date format when dates are entered', async () => {
    const el = await createCustomElementInHTMLContainer();

    /* -------------------------- minimum (left) slider ------------------------- */
    expect(el.minSliderX).to.eq(SLIDER_WIDTH);
    const minDateInput = el.shadowRoot?.querySelector(
      '#date-min'
    ) as HTMLInputElement;

    const pressEnterEvent = new KeyboardEvent('keyup', {
      key: 'Enter',
    });

    // valid min date
    minDateInput.value = '1950';
    minDateInput.dispatchEvent(pressEnterEvent);

    expect(Math.floor(el.minSliderX)).to.eq(84);
    expect(el.minSelectedDate).to.eq('1/1/1950'); // set to correct format

    // attempt to set date earlier than first item
    minDateInput.value = '10/1/1850';
    minDateInput.dispatchEvent(new Event('blur'));

    expect(Math.floor(el.minSliderX)).to.eq(SLIDER_WIDTH); // leftmost valid position
    // allow date value less than slider range
    expect(el.minSelectedDate).to.eq('10/1/1850');

    /* -------------------------- maximum (right) slider ------------------------- */
    expect(el.maxSliderX).to.eq(WIDTH - SLIDER_WIDTH);
    const maxDateInput = el.shadowRoot?.querySelector(
      '#date-max'
    ) as HTMLInputElement;

    // set valid max date
    maxDateInput.value = '3/12/1975';
    maxDateInput.dispatchEvent(pressEnterEvent);

    expect(Math.floor(el.maxSliderX)).to.eq(121);
    expect(maxDateInput.value).to.eq('3/12/1975');

    // attempt to set date later than last item
    maxDateInput.value = '12/31/2199';
    maxDateInput.dispatchEvent(new Event('blur'));
    await el.updateComplete;

    expect(el.maxSliderX).to.eq(WIDTH - SLIDER_WIDTH); // rightmost valid position
    // allow date value greater than slider range
    expect(maxDateInput.value).to.eq('12/31/2199');
  });

  it('handles invalid date inputs', async () => {
    const el = await createCustomElementInHTMLContainer();

    /* -------------------------- minimum (left) slider ------------------------- */
    const minDateInput = el.shadowRoot?.querySelector(
      '#date-min'
    ) as HTMLInputElement;

    minDateInput.value = '5/17/1961';
    minDateInput.dispatchEvent(new Event('blur'));
    await el.updateComplete;

    expect(Math.floor(el.minSliderX)).to.eq(101);
    expect(minDateInput.value).to.eq('5/17/1961');

    // enter invalid value
    minDateInput.value = 'invalid';
    minDateInput.dispatchEvent(new Event('blur'));
    await el.updateComplete;

    expect(Math.floor(el.minSliderX)).to.eq(101); // does not move
    expect(minDateInput.value).to.eq('5/17/1961'); // resets back to previous date

    /* -------------------------- maximum (right) slider ------------------------- */
    const maxDateInput = el.shadowRoot?.querySelector(
      '#date-max'
    ) as HTMLInputElement;

    // initial values
    expect(el.maxSliderX).to.eq(WIDTH - SLIDER_WIDTH);
    expect(maxDateInput.value).to.eq('12/4/2020');

    // enter invalid value
    maxDateInput.value = 'Abc 12, 1YYY';
    maxDateInput.dispatchEvent(new Event('blur'));
    await el.updateComplete;

    expect(Math.floor(el.maxSliderX)).to.eq(WIDTH - SLIDER_WIDTH); // does not move
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
    expect(Array.from(minSlider.classList).join(' ')).to.eq('draggable');

    // pointer down
    minSlider.dispatchEvent(new PointerEvent('pointerdown'));
    await el.updateComplete;

    // cursor changes to 'grab'
    const classList = minSlider.classList;
    expect(classList.contains('draggable')).to.be.true;
    expect(classList.contains('dragging')).to.be.true;

    // slide to right
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 70 }));
    await el.updateComplete;

    // slider has moved
    expect(Math.round(minSlider.getBoundingClientRect().x)).to.eq(168);
    // min date is updated
    expect(minDateInput.value).to.eq('4/23/1940');

    // stop dragging
    window.dispatchEvent(new PointerEvent('pointerup'));
    await el.updateComplete;

    // cursor returns to normal
    expect(Array.from(container.classList)).not.to.include('dragging');

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
    await el.updateComplete;

    // slider has moved
    expect(Math.round(maxSlider.getBoundingClientRect().x)).to.eq(268);
    // max date is updated
    expect(maxDateInput.value).to.eq('10/8/2000');
    await el.updateComplete;

    // try to slide min slider past max slider
    minSlider.dispatchEvent(new PointerEvent('pointerdown', { clientX: 62 }));
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 190 }));
    await el.updateComplete;

    // slider moves all the way to meet the right slider
    expect(Math.round(minSlider.getBoundingClientRect().x)).to.eq(258);

    // try to slide max slider past min slider
    maxSlider.dispatchEvent(new PointerEvent('pointerdown', { clientX: 120 }));
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 50 }));
    await el.updateComplete;
    expect(Math.round(maxSlider.getBoundingClientRect().x)).to.eq(268); // max slider didn't move
  });

  it("emits a custom event when the element's date range changes", async () => {
    const el = await createCustomElementInHTMLContainer();
    el.updateDelay = 30; // set debounce delay of 30ms

    const minDateInput = el.shadowRoot?.querySelector(
      '#date-min'
    ) as HTMLInputElement;
    const updateEventPromise = oneEvent(el, 'histogramDateRangeUpdated');

    // simulate typing a new value into input
    minDateInput.value = '1955';
    minDateInput.dispatchEvent(new Event('blur'));

    // will wait longer than debounce delay
    const { detail } = await updateEventPromise;
    // verify that event is emitted
    expect(detail.minDate).to.equal('1/1/1955');
    expect(detail.maxDate).to.equal('12/4/2020');

    let eventCount = 0;
    el.addEventListener('histogramDateRangeUpdated', () => (eventCount += 1));

    // events are not sent if no change since the last event that was sent
    minDateInput.value = '1955';
    minDateInput.dispatchEvent(new Event('blur'));
    await aTimeout(60); // wait longer than debounce delay
    expect(eventCount).to.equal(0);

    const updateEventPromise2 = oneEvent(el, 'histogramDateRangeUpdated');

    // with the debounce, multiple quick changes only result in one event sent
    minDateInput.value = '1965';
    minDateInput.dispatchEvent(new Event('blur'));
    await aTimeout(10); // wait less than the debounce delay

    minDateInput.dispatchEvent(new Event('focus'));
    minDateInput.value = '1975';
    minDateInput.dispatchEvent(new Event('blur'));
    await aTimeout(10);

    minDateInput.dispatchEvent(new Event('focus'));
    minDateInput.value = '1985';
    minDateInput.dispatchEvent(new Event('blur'));
    await aTimeout(10);

    const event2 = await updateEventPromise2;
    expect(event2.detail.minDate).to.equal('1/1/1985');
    expect(eventCount).to.equal(1); // only one event was fired
  });

  it('shows/hides tooltip when hovering over (or pointing at) a bar', async () => {
    const el = await createCustomElementInHTMLContainer();
    // include a number which will require commas (1,000,000)
    el.bins = [1000000, 1, 100];
    await aTimeout(10);
    const bars = el.shadowRoot?.querySelectorAll(
      '.bar'
    ) as unknown as SVGRectElement[];
    const tooltip = el.shadowRoot?.querySelector('#tooltip') as HTMLDivElement;
    expect(tooltip.innerText).to.eq('');

    // hover
    bars[0].dispatchEvent(new PointerEvent('pointerenter'));
    await el.updateComplete;
    expect(tooltip.innerText).to.match(
      /^1,000,000 items\n1\/1\/1900 - 4\/23\/1940/
    );
    expect(getComputedStyle(tooltip).display).to.eq('block');

    // leave
    bars[0].dispatchEvent(new PointerEvent('pointerleave'));
    await el.updateComplete;
    expect(getComputedStyle(tooltip).display).to.eq('none');
    expect(tooltip.innerText).to.eq('');

    // ensure singular item is not pluralized
    bars[1].dispatchEvent(new PointerEvent('pointerenter'));
    await el.updateComplete;
    expect(tooltip.innerText).to.match(/^1 item\n4\/23\/1940 - 8\/13\/1980/);
  });

  it('does not show tooltip while dragging', async () => {
    const el = await createCustomElementInHTMLContainer();
    const bars = el.shadowRoot?.querySelectorAll(
      '.bar'
    ) as unknown as SVGRectElement[];
    const tooltip = el.shadowRoot?.querySelector('#tooltip') as HTMLDivElement;
    expect(tooltip.innerText).to.eq('');
    const minSlider = el.shadowRoot?.querySelector('#slider-min') as SVGElement;

    // pointer down and slide right
    minSlider.dispatchEvent(new PointerEvent('pointerdown'));
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 100 }));
    await el.updateComplete;

    // hover over bar
    bars[0].dispatchEvent(new PointerEvent('pointerenter'));
    await el.updateComplete;
    // tooltip display is suppressed while dragging
    expect(tooltip.style.display).to.eq('');
  });

  it('passes the a11y audit', async () => {
    await fixture<HistogramDateRange>(subject).then(el =>
      expect(el).shadowDom.to.be.accessible()
    );
  });

  it('allows range to be pre-selected', async () => {
    const el = await fixture<HistogramDateRange>(
      html`
        <histogram-date-range
          minDate="1900"
          maxDate="Dec 4, 2020"
          minSelectedDate="2012"
          maxSelectedDate="2019"
          bins="[33, 1, 100]"
        >
        </histogram-date-range>
      `
    );
    const minDateInput = el.shadowRoot?.querySelector(
      '#date-min'
    ) as HTMLInputElement;
    expect(minDateInput.value).to.eq('2012');

    const maxDateInput = el.shadowRoot?.querySelector(
      '#date-max'
    ) as HTMLInputElement;
    expect(maxDateInput.value).to.eq('2019');
  });

  it('extends the selected range when the histogram is clicked outside of the current range', async () => {
    const el = await fixture<HistogramDateRange>(
      html`
        <histogram-date-range
          minDate="1900"
          maxDate="2020"
          minSelectedDate="1950"
          maxSelectedDate="1955"
          bins="[33, 1, 1, 1, 10, 10, 1, 1, 1, 50, 100]"
        >
        </histogram-date-range>
      `
    );

    const leftBarToClick = Array.from(
      el.shadowRoot?.querySelectorAll('.bar') as NodeList
    )[1]; // click on second bar to the left

    leftBarToClick.dispatchEvent(new Event('click'));
    await el.updateComplete;
    expect(el.minSelectedDate).to.eq('1910'); // range was extended to left

    const rightBarToClick = Array.from(
      el.shadowRoot?.querySelectorAll('.bar') as NodeList
    )[8]; // click on second bar from the right

    rightBarToClick.dispatchEvent(new Event('click'));
    expect(el.maxSelectedDate).to.eq('1998'); // range was extended to right
  });

  it('narrows the selected range when the histogram is clicked inside of the current range', async () => {
    const el = await fixture<HistogramDateRange>(
      html`
        <histogram-date-range
          minDate="1900"
          maxDate="2020"
          minSelectedDate="1900"
          maxSelectedDate="2020"
          bins="[33, 1, 1, 1, 10, 10, 1, 1, 1, 50, 100]"
        >
        </histogram-date-range>
      `
    );

    ///////////////////////////////////////////////
    // NB: the slider nearest the clicked bar moves
    ///////////////////////////////////////////////

    const leftBarToClick = Array.from(
      el.shadowRoot?.querySelectorAll('.bar') as NodeList
    )[3]; // click on fourth bar to the left

    leftBarToClick.dispatchEvent(new Event('click'));
    expect(el.minSelectedDate).to.eq('1932'); // range was extended to the right

    const rightBarToClick = Array.from(
      el.shadowRoot?.querySelectorAll('.bar') as NodeList
    )[8]; // click on second bar from the right

    rightBarToClick.dispatchEvent(new Event('click'));
    expect(el.maxSelectedDate).to.eq('1998'); // range was extended to the left
  });

  it('handles invalid pre-selected range by defaulting to overall max and min', async () => {
    const el = await fixture<HistogramDateRange>(
      html`
        <histogram-date-range
          minDate="1900"
          maxDate="2020"
          minSelectedDate="2000xyz"
          maxSelectedDate="5000"
          bins="[33, 1, 100]"
        >
        </histogram-date-range>
      `
    );
    const minDateInput = el.shadowRoot?.querySelector(
      '#date-min'
    ) as HTMLInputElement;
    // malformed min date defaults to overall min
    expect(minDateInput.value).to.eq('1900');

    const maxDateInput = el.shadowRoot?.querySelector(
      '#date-max'
    ) as HTMLInputElement;
    // well-formed max date is allowed
    expect(maxDateInput.value).to.eq('5000');
  });

  it('handles year values less than 1000 by overriding date format to just display year', async () => {
    const el = await fixture<HistogramDateRange>(
      html`
        <histogram-date-range
          dateFormat="M/D/YYYY"
          minDate="-2000"
          maxDate="2000"
          minSelectedDate="-500"
          maxSelectedDate="500"
          bins="[33, 1, 100]"
        >
        </histogram-date-range>
      `
    );
    const minDateInput = el.shadowRoot?.querySelector(
      '#date-min'
    ) as HTMLInputElement;
    expect(minDateInput.value).to.eq('-500');

    const maxDateInput = el.shadowRoot?.querySelector(
      '#date-max'
    ) as HTMLInputElement;
    expect(maxDateInput.value).to.eq('500');
  });

  it('handles missing data', async () => {
    let el = await fixture<HistogramDateRange>(
      html`<histogram-date-range>
        minDate="1900" maxDate="2020" bins=""
      </histogram-date-range>`
    );
    expect(el.shadowRoot?.innerHTML).to.contain('no data');
    el = await fixture<HistogramDateRange>(
      html`<histogram-date-range
        minDate="1900"
        maxDate="2020"
        bins="[]"
        missingDataMessage="no data available"
      ></histogram-date-range>`
    );
    expect(el.shadowRoot?.innerHTML).to.contain('no data available');
  });

  it('correctly displays data consisting of a single bin', async () => {
    const el = await fixture<HistogramDateRange>(
      html`
        <histogram-date-range minDate="2020" maxDate="2020" bins="[50]">
        </histogram-date-range>
      `
    );
    const bars = el.shadowRoot?.querySelectorAll(
      '.bar'
    ) as unknown as SVGRectElement[];
    const heights = Array.from(bars).map(b => b.height.baseVal.value);
    expect(heights).to.eql([157]);
  });

  it('correctly displays small diff between max and min values', async () => {
    const el = await fixture<HistogramDateRange>(
      html`
        <histogram-date-range bins="[1519,2643,1880,2041,1638,1441]">
        </histogram-date-range>
      `
    );
    const bars = el.shadowRoot?.querySelectorAll(
      '.bar'
    ) as unknown as SVGRectElement[];
    const heights = Array.from(bars).map(b => b.height.baseVal.value);
    expect(heights).to.eql([37, 40, 38, 38, 37, 36]);
  });

  it('has a disabled state', async () => {
    const el = await fixture<HistogramDateRange>(
      html`
        <histogram-date-range
          minDate="1900"
          maxDate="2020"
          disabled
          bins="[33, 1, 100]"
        >
        </histogram-date-range>
      `
    );
    expect(
      el.shadowRoot
        ?.querySelector('.inner-container')
        ?.classList.contains('disabled')
    ).to.eq(true);

    const minSlider = el.shadowRoot?.querySelector('#slider-min') as SVGElement;

    expect(Math.round(minSlider.getBoundingClientRect().x)).to.eq(8); // initial state

    // attempt to slide to right
    minSlider.dispatchEvent(new PointerEvent('pointerdown'));
    await el.updateComplete;

    // cursor is not draggable if disabled
    expect(Array.from(minSlider.classList).join(' ')).to.eq('');

    // attempt to slide to right
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 70 }));
    await el.updateComplete;

    // slider does not moved if element disabled
    expect(Math.round(minSlider.getBoundingClientRect().x)).to.eq(8);
  });

  it('has a loading state with an activity indicator', async () => {
    const el = await fixture<HistogramDateRange>(
      html`
        <histogram-date-range
          minDate="1900"
          maxDate="2020"
          loading
          bins="[33, 1, 100]"
        >
        </histogram-date-range>
      `
    );
    expect(
      el.shadowRoot
        ?.querySelector('ia-activity-indicator')
        ?.attributes?.getNamedItem('mode')?.value
    ).to.eq('processing');
  });
});
