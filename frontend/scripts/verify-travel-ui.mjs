// Dependency-free browser smoke checks using Chrome's local DevTools protocol.
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const profile = await mkdtemp(join(tmpdir(), 'vivu-ui-'));
const chrome = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 19387;
const origin = process.env.UI_BASE_URL || 'http://localhost:5173';
const browser = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
let socket;
let id = 0;
const pending = new Map();
const runtimeErrors = [];
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(fn, description) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await fn()) return;
    await pause(150);
  }
  throw new Error(`Timed out: ${description}`);
}
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const requestId = ++id;
    const timer = setTimeout(() => { pending.delete(requestId); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
    pending.set(requestId, { resolve: value => { clearTimeout(timer); resolve(value); }, reject });
    socket.send(JSON.stringify({ id: requestId, method, params }));
  });
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
async function navigate(hash) {
  await send('Page.navigate', { url: `${origin}/#${hash}` });
  await waitFor(() => evaluate('!!document.querySelector(".customer-site, .management-root")'), hash);
}
async function noOverflow(label) {
  const dimensions = await evaluate('({width:innerWidth, content:document.documentElement.scrollWidth})');
  if (dimensions.content > dimensions.width + 1) console.log(await evaluate('JSON.stringify([...document.querySelectorAll("body *")].filter(el => el.getBoundingClientRect().right > innerWidth + 1).map(el => ({tag: el.tagName, class: el.className, right: el.getBoundingClientRect().right})).slice(0, 20))'));
  assert.ok(dimensions.content <= dimensions.width + 1, `${label}: ${JSON.stringify(dimensions)}`);
  console.log(`PASS ${label}: no horizontal overflow`);
}
try {
  let version;
  await waitFor(async () => { try { version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); return !!version; } catch { return false; } }, 'Chrome startup');
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') runtimeErrors.push(message.params.exceptionDetails.text);
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
  });
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await navigate('/');
  await waitFor(() => evaluate('document.querySelectorAll(".tour-card").length > 0'), 'live tour cards');
  assert.equal(await evaluate('document.querySelectorAll(".destination-card").length'), 6);
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".home-hero h1 em")).fontStyle'), 'normal');
  assert.equal(await evaluate('document.querySelectorAll(".home-benefits > div").length'), 5);
  await waitFor(() => evaluate('[...document.querySelectorAll(".destination-card img")].every(img => img.complete && img.naturalWidth > 0)'), 'destination images');
  await noOverflow('Desktop home');
  await pause(1400); // Let progressive reveal animations settle before taking a screenshot.
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const screenshotPath = join(tmpdir(), 'vivu-travel-desktop.png');
  await writeFile(screenshotPath, Buffer.from(shot.data, 'base64'));
  console.log(`Screenshot: ${screenshotPath}`);
  await evaluate('document.querySelector(".search-panel input[name=search]").value="Hạ Long"; document.querySelector(".search-panel").requestSubmit()');
  await waitFor(() => evaluate('location.hash.includes("search=") && !!document.querySelector(".listing-layout")'), 'search navigation');
  assert.equal(await evaluate('new URLSearchParams(location.hash.split("?")[1]).get("search")'), 'Hạ Long');
  console.log('PASS search form retains Vietnamese query');
  await navigate('/');
  await waitFor(() => evaluate('document.querySelectorAll("select[name=categoryId] option").length > 1'), 'home categories');
  const selectedCategory = await evaluate('document.querySelector("select[name=categoryId]").options[1].value');
  await evaluate('document.querySelector("select[name=categoryId]").selectedIndex = 1; document.querySelector("input[name=departureCity]").value = "Hà Nội"; document.querySelector(".search-panel").requestSubmit()');
  await waitFor(() => evaluate('!!document.querySelector(".listing-layout")'), 'category and departure search');
  assert.equal(await evaluate('new URLSearchParams(location.hash.split("?")[1]).get("categoryId")'), selectedCategory);
  assert.equal(await evaluate('new URLSearchParams(location.hash.split("?")[1]).get("departureCity")'), 'Hà Nội');
  await navigate('/');
  await evaluate('document.querySelectorAll(".destination-card")[1].click()');
  await waitFor(() => evaluate('!!document.querySelector(".listing-layout")'), 'destination navigation');
  assert.equal(await evaluate('new URLSearchParams(location.hash.split("?")[1]).get("destination")'), 'Hạ Long');
  console.log('PASS home category, departure city and destination navigation');
  await navigate('/tours');
  await waitFor(() => evaluate('document.querySelectorAll(".tour-card").length > 0'), 'tour listing');
  await noOverflow('Desktop listing');
  await evaluate('document.querySelector(".explore-filters input[name=minPrice]").value="5000000"; document.querySelector(".explore-filters input[name=maxPrice]").value="1000000"; document.querySelector(".explore-filters form").requestSubmit()');
  assert.equal(await evaluate('!!document.querySelector(".explore-filters [role=alert]")'), true);
  await evaluate('document.querySelector(".explore-filters input[name=minPrice]").value="1000000"; document.querySelector(".explore-filters input[name=maxPrice]").value="10000000"; document.querySelector(".explore-filters form").requestSubmit()');
  await waitFor(() => evaluate('location.hash.includes("minPrice=1000000") && !!document.querySelector(".explore-active")'), 'explore price filter');
  await evaluate('document.querySelector(".explore-active button").click()');
  await waitFor(() => evaluate('!new URLSearchParams(location.hash.split("?")[1]).has("minPrice")'), 'remove one filter');
  await evaluate('const select = document.querySelector(".results-heading select"); select.value="price:ASC"; select.dispatchEvent(new Event("change", {bubbles:true}))');
  await waitFor(() => evaluate('location.hash.includes("sortBy=price")'), 'explore sorting');
  await navigate('/tours?search=NO_MATCH_TOURGO_92731');
  await waitFor(() => evaluate('!!document.querySelector(".explore-empty-reset")'), 'explore empty result');
  await evaluate('document.querySelector(".explore-empty-reset").click()');
  await waitFor(() => evaluate('document.querySelectorAll(".tour-card").length > 0'), 'reset empty result');
  await pause(900);
  const exploreShot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile(join(tmpdir(), 'tourgo-explore-desktop.png'), Buffer.from(exploreShot.data, 'base64'));
  console.log('PASS explore: range validation, filter chips, sorting and empty reset');
  await evaluate('document.querySelector(".tour-card h3 a").click()');
  await waitFor(() => evaluate('!!document.querySelector(".detail-cover")'), 'tour detail');
  const detailHash = await evaluate('location.hash.slice(1)');
  await noOverflow('Desktop detail');
  for (const width of [390, 320]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: true });
    await navigate('/');
    await waitFor(() => evaluate('document.querySelectorAll(".tour-card").length > 0'), 'mobile cards');
    await noOverflow(`Mobile home ${width}px`);
    await evaluate('document.querySelector(".menu-toggle").click()');
    assert.equal(await evaluate('document.querySelector(".menu-toggle").getAttribute("aria-expanded")'), 'true');
    await evaluate('[...document.querySelectorAll("#customer-navigation a")].find(link => link.getAttribute("href") === "#/tours").click()');
    await waitFor(() => evaluate('!!document.querySelector(".listing-layout")'), 'mobile listing');
    assert.equal(await evaluate('document.querySelector(".menu-toggle").getAttribute("aria-expanded")'), 'false');
    await noOverflow(`Mobile listing ${width}px`);
    assert.equal(await evaluate('getComputedStyle(document.querySelector(".explore-filters")).display'), 'none');
    await evaluate('document.querySelector(".explore-filter-toggle").click()');
    assert.equal(await evaluate('document.querySelector(".explore-filter-toggle").getAttribute("aria-expanded")'), 'true');
    await noOverflow(`Mobile open filters ${width}px`);
    await evaluate('document.querySelector(".explore-filters form").requestSubmit()');
    assert.equal(await evaluate('document.querySelector(".explore-filter-toggle").getAttribute("aria-expanded")'), 'false');
    await navigate(detailHash);
    await waitFor(() => evaluate('!!document.querySelector(".detail-cover")'), 'mobile detail');
    await noOverflow(`Mobile detail ${width}px`);
    await navigate('/login');
    await noOverflow(`Customer login ${width}px`);
    if (width === 390) {
      await navigate('/');
      await pause(1400);
      const mobileShot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      const mobilePath = join(tmpdir(), 'vivu-travel-mobile.png');
      await writeFile(mobilePath, Buffer.from(mobileShot.data, 'base64'));
      console.log(`Screenshot: ${mobilePath}`);
    }
  }
  await send('Emulation.setDeviceMetricsOverride', { width: 1536, height: 1024, deviceScaleFactor: 1, mobile: false });
  await navigate('/login');
  assert.equal(await evaluate('!!document.querySelector(".destination-login")'), true);
  assert.equal(await evaluate('!!document.querySelector(".tourgo-header, .footer")'), false);
  await evaluate('document.querySelector(".password-toggle").click()');
  assert.equal(await evaluate('document.querySelector("input[name=password]").type'), 'text');
  await evaluate('document.querySelector(".password-toggle").click()');
  assert.equal(await evaluate('document.querySelector("input[name=password]").type'), 'password');
  assert.equal(await evaluate('document.querySelectorAll(".login-social button:disabled").length'), 2);
  await evaluate('document.querySelector(".login-register-link").click()');
  assert.equal(await evaluate('!!document.querySelector("input[name=fullName]")'), true);
  await noOverflow('New registration desktop');
  await evaluate('document.querySelector(".login-register-link").click()');
  await pause(600);
  const loginShot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const loginShotPath = join(tmpdir(), 'tourgo-login-desktop.png');
  await writeFile(loginShotPath, Buffer.from(loginShot.data, 'base64'));
  console.log(`Login screenshot: ${loginShotPath}`);
  for (const width of [390, 320]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: true });
    await noOverflow(`New login ${width}px`);
    await evaluate('document.querySelector(".login-register-link").click()');
    await noOverflow(`New registration ${width}px`);
    await evaluate('document.querySelector(".login-register-link").click()');
  }
  console.log('PASS new login: password visibility, registration switch, honest disabled social options');
  await navigate('/admin/login');
  assert.equal(await evaluate('!!document.querySelector(".customer-site, .header, .footer")'), false);
  console.log('PASS internal login is separate from customer layout');
  // Deterministic customer fixture: intercept browser fetch only, never create/change database records.
  const fixtureBooking = {
    id: 'ui-booking', code: 'BK-UI-TEST', tourId: 'ui-tour', status: 'CONFIRMED', createdAt: '2026-10-20T07:30:00Z', confirmedAt: '2026-10-21T02:00:00Z', startDate: '2026-11-15', endDate: '2026-11-17',
    tourName: 'Tour Đà Nẵng – Hội An 3 ngày 2 đêm', contactName: 'Khách kiểm thử', contactEmail: 'ui@example.test', contactPhone: '0901234567', passengerCount: 3, subtotal: 2700000, discount: 200000, total: 2500000,
    passengers: [{ id: 'p1', fullName: 'Khách 1', dob: '1990-01-01', type: 'ADULT', unitPrice: 1000000 }, { id: 'p2', fullName: 'Khách 2', dob: '1991-01-01', type: 'ADULT', unitPrice: 1000000 }, { id: 'p3', fullName: 'Khách 3', dob: '2020-01-01', type: 'CHILD', unitPrice: 700000 }],
    invoice: null, cancelRequests: [],
  };
  const fixtureRoutes = {
    '/api/auth/me': { id: 'ui-customer', fullName: 'Khách kiểm thử', email: 'ui@example.test', roles: ['CUSTOMER'], permissions: ['booking:create'] },
    '/api/bookings/ui-booking': fixtureBooking,
    '/api/bookings/me': { items: [fixtureBooking], total: 1 },
    '/api/schedules/tour/ui-tour': [{ id: 'ui-schedule', tourName: fixtureBooking.tourName, startDate: '2026-11-15', endDate: '2026-11-17', priceAdult: 1000000, priceChild: 700000, priceInfant: 100000, meetingPoint: 'Sân bay Đà Nẵng' }],
    '/api/bookings/quote': { lines: [{ type: 'ADULT', quantity: 1, amount: 1000000 }], subtotal: 1000000, discount: 0, total: 1000000, canBook: true },
    '/api/bookings': { id: 'ui-created-booking', code: 'BK-UI-CREATED', status: 'PENDING_PAYMENT', total: 1000000, passengerCount: 1, contactName: 'Khách cập nhật', expiresAt: '2026-11-01T10:00:00Z' },
    '/api/tours/ui-tour': { id: 'ui-tour', name: fixtureBooking.tourName, departureCity: 'Đà Nẵng', durationDays: 3, durationNights: 2, avgRating: 4.8, reviewCount: 12, images: [{ id: 'im1', url: '/images/hoi-an.jpg', isCover: true }, { id: 'im2', url: '/images/ha-long.jpg' }], destinations: [{ name: 'Đà Nẵng' }, { name: 'Hội An' }], itinerary: [{ id: 'd1', dayNo: 1, title: 'Khám phá thành phố', content: 'Lịch trình kiểm thử giao diện.' }], cancelPolicy: { name: 'Chính sách thử nghiệm', rules: [{ daysBefore: 7, feePercent: 20 }] } },
    '/api/payments/booking/ui-booking': { paidTotal: 2500000, outstanding: 0, refundedTotal: 0, payments: [{ id: 'pay1', method: 'BANK_TRANSFER', status: 'SUCCESS', amount: 2500000 }] },
  };
  const fixtureScript = await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    sessionStorage.setItem('vivu-session', JSON.stringify({accessToken:'ui-test-not-a-real-token'}));
    const fixtureRoutes = ${JSON.stringify(fixtureRoutes)};
    const realFetch = window.fetch.bind(window);
    window.fetch = async (input, options) => {
      const url = new URL(typeof input === 'string' ? input : input.url, location.origin);
      if (url.pathname.startsWith('/api/')) {
        if (window.staffOps) {
          const state = window.staffOps;
          const response = (body, status = 200) => new Response(JSON.stringify(body), {status,headers:{'Content-Type':'application/json'}});
          if (url.pathname === '/api/bookings/ui-booking') return response(state.booking);
          if (url.pathname === '/api/payments/booking/ui-booking') return response({paidTotal:2500000,outstanding:0,refundedTotal:0});
          if (url.pathname.startsWith('/api/bookings/ui-booking/') && options?.method === 'PATCH') {
            state.requests.push({path:url.pathname,body:JSON.parse(options.body)});
            if (state.fail) return response({message:'Dữ liệu gửi lên không hợp lệ',details:[{field:'approve',message:'Quyết định không hợp lệ'}]},400);
            const body = JSON.parse(options.body);
            if (url.pathname.endsWith('/cancel-request/process')) { state.booking.status = body.approve ? 'CANCELLED' : 'CONFIRMED'; state.booking.cancelRequests[0].status = body.approve ? 'APPROVED' : 'REJECTED'; }
            if (url.pathname.endsWith('/confirm')) state.booking.status = 'CONFIRMED';
            if (url.pathname.endsWith('/reject')) state.booking.status = 'REJECTED';
            if (url.pathname.endsWith('/cancel')) state.booking.status = 'CANCELLED';
            return response(state.booking);
          }
          if (url.pathname === '/api/bookings') {
            state.lastBookingQuery = url.search;
            return response({items:!url.searchParams.get('status') || url.searchParams.get('status') === state.booking.status ? [state.booking] : [],total:1});
          }
          if (url.pathname === '/api/schedules/staff-schedule') {
            if (options?.method === 'PATCH') {
              const body = JSON.parse(options.body); state.pickupBody = body;
              state.schedule.meetingPoint = body.meetingPoint;
              state.schedule.checkpoints = body.checkpoints.map((row,index) => ({...row,id:'pickup-'+index}));
            }
            return response(state.schedule);
          }
          if (url.pathname === '/api/schedules') { state.lastScheduleQuery = url.search; return response({items:[state.schedule],total:1}); }
        }
        if (url.pathname === '/api/auth/me' && window.fixtureUser) return new Response(JSON.stringify(window.fixtureUser), {status:200, headers:{'Content-Type':'application/json'}});
        if (window.fixtureUser && window.staffData && (!options?.method || options.method === 'GET')) {
          let body;
          if (url.pathname === '/api/bookings') body = {items: url.searchParams.get('status') ? [] : [fixtureRoutes['/api/bookings/ui-booking']], total: url.searchParams.get('status') ? 0 : 1};
          if (url.pathname === '/api/schedules') body = {items:[{id:'staff-schedule',tourName:'Đà Nẵng – Hội An',startDate:'2026-11-15',status:'OPEN'}],total:1};
          if (url.pathname === '/api/users') body = {items:[],total:18};
          if (url.pathname === '/api/notifications') body = {items:[{id:'staff-note',title:'Yêu cầu hỗ trợ mới',body:'Khách hàng cần tư vấn tour.',createdAt:'2026-10-28T08:00:00Z',isRead:false}],total:1};
          if (body) return new Response(JSON.stringify(body), {status:200,headers:{'Content-Type':'application/json'}});
        }
        if (window.fixtureUser && ['/api/bookings', '/api/payments', '/api/schedules', '/api/users', '/api/notifications', '/api/support/tickets'].includes(url.pathname) && (!options?.method || options.method === 'GET')) return new Response(JSON.stringify({items:[],total:0}), {status:200, headers:{'Content-Type':'application/json'}});
        if (options?.method === 'POST') {
          window.fixturePosts ??= [];
          window.fixturePosts.push({path:url.pathname, body:JSON.parse(options.body)});
        }
        if (url.pathname === '/api/bookings/quote' && window.fixtureQuoteError) return new Response(JSON.stringify({message:'Mã ưu đãi không hợp lệ'}), {status:400, headers:{'Content-Type':'application/json'}});
        if (window.paymentFixture && url.pathname.startsWith('/api/payments')) {
          const state = window.paymentFixture;
          if (state.error) return new Response(JSON.stringify({message:'Không thể xử lý giao dịch thử nghiệm'}), {status:400, headers:{'Content-Type':'application/json'}});
          if (url.pathname === '/api/payments' && options?.method === 'POST') {
            const request = JSON.parse(options.body);
            state.payments.unshift({id:'fixture-pay-' + state.payments.length, method:request.method, amount:state.outstanding, status:'PENDING', gatewayTxnRef:'TEST-REF'});
          }
          if (url.pathname.endsWith('/proof')) state.payments.find(p => url.pathname.includes(p.id)).status = 'PROOF_SUBMITTED';
          if (url.pathname.includes('/mock-gateway/pay/')) { state.payments[0].status = 'SUCCESS'; state.paidTotal = state.total; state.outstanding = 0; state.bookingStatus = 'CONFIRMED'; }
          return new Response(JSON.stringify(state), {status:200, headers:{'Content-Type':'application/json'}});
        }
        if (url.pathname === '/api/system/settings/public-info') return new Response(JSON.stringify(window.fixtureBank || {}), {status:200, headers:{'Content-Type':'application/json'}});
        const body = fixtureRoutes[url.pathname];
        if (url.pathname === '/api/bookings/quote') body.canBook = !window.fixtureSoldOut;
        return new Response(JSON.stringify(body ?? {message:'UI fixture endpoint not provided'}), {status:body ? 200 : 404, headers:{'Content-Type':'application/json'}});
      }
      return realFetch(input, options);
    };
  ` });
  await send('Emulation.setDeviceMetricsOverride', { width: 1536, height: 1024, deviceScaleFactor: 1, mobile: false });
  await navigate('/bookings/ui-booking');
  await send('Page.reload', { ignoreCache: true });
  await waitFor(() => evaluate('!!document.querySelector(".order-cover") && document.querySelectorAll(".order-thumbnails button").length === 2'), 'reference booking fixture');
  await noOverflow('Fixture booking desktop');
  assert.ok(await evaluate('document.querySelector(".order-total-line").textContent.includes("2.500.000")'));
  assert.equal(await evaluate('document.querySelector(".order-actions button").disabled'), true);
  for (const tab of ['passengers', 'itinerary', 'payments', 'policy', 'support', 'overview']) {
    await evaluate(`document.getElementById('order-tab-${tab}').click()`);
    assert.equal(await evaluate(`document.getElementById('order-tab-${tab}').getAttribute('aria-selected')`), 'true');
  }
  await evaluate('document.querySelectorAll(".order-thumbnails button")[1].click()');
  assert.ok(await evaluate('document.querySelector(".order-cover").src.endsWith("/images/ha-long.jpg")'));
  await evaluate('document.querySelectorAll(".order-thumbnails button")[0].click()');
  await pause(1400);
  const orderShot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const orderShotPath = join(tmpdir(), 'tourgo-booking-desktop.png');
  await writeFile(orderShotPath, Buffer.from(orderShot.data, 'base64'));
  console.log(`Fixture screenshot: ${orderShotPath}`);
  for (const width of [390, 320]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: true });
    await noOverflow(`Fixture booking ${width}px`);
    await evaluate('document.querySelector(".account-menu-toggle").click()');
    assert.equal(await evaluate('document.querySelector(".account-menu-toggle").getAttribute("aria-expanded")'), 'true');
    await noOverflow(`Fixture account navigation ${width}px`);
    await evaluate('document.querySelector(".account-menu-toggle").click()');
    await evaluate('document.getElementById("order-tab-passengers").click()');
    await noOverflow(`Fixture passenger table ${width}px`);
    await evaluate('document.getElementById("order-tab-overview").click()');
  }
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await navigate('/booking/ui-tour?scheduleId=ui-schedule');
  await waitFor(() => evaluate('!!document.querySelector(".checkout-submit")'), 'checkout fixture');
  await noOverflow('Checkout desktop');
  assert.equal(await evaluate('document.querySelector(".checkout-submit").textContent.includes("Xem báo giá")'), true);
  await evaluate('document.querySelector(".checkout-add").click()');
  assert.equal(await evaluate('document.querySelectorAll(".checkout-passenger").length'), 2);
  await evaluate('document.querySelector(".checkout-passenger button").click()');
  assert.equal(await evaluate('document.querySelectorAll(".checkout-passenger").length'), 1);
  await evaluate(`
    function setReactInput(el, value) {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, value);
      el.dispatchEvent(new Event('input', {bubbles:true}));
    }
    window.setReactInput = setReactInput;
    setReactInput(document.querySelector('input[name=contactPhone]'), '0901234567');
    setReactInput(document.querySelector('.checkout-passenger input:not([type=date])'), 'Khách kiểm thử');
    setReactInput(document.querySelector('.checkout-passenger input[type=date]'), '1990-01-01');
  `);
  await evaluate('document.getElementById("tour-booking-form").requestSubmit()');
  await waitFor(() => evaluate('!!document.querySelector(".checkout-total")'), 'checkout quote');
  assert.equal(await evaluate('window.fixturePosts.filter(p => p.path === "/api/bookings").length'), 0);
  assert.ok(await evaluate('document.querySelector(".checkout-total").textContent.includes("1.000.000")'));
  await evaluate('setReactInput(document.querySelector(".checkout-passenger input:not([type=date])"), "Khách cập nhật")');
  await waitFor(() => evaluate('!document.querySelector(".checkout-total")'), 'quote invalidated on edit');
  await evaluate('window.fixtureSoldOut = true; document.getElementById("tour-booking-form").requestSubmit()');
  await waitFor(() => evaluate('!!document.querySelector(".checkout-total")'), 'sold out quote');
  assert.equal(await evaluate('document.querySelector(".checkout-submit").disabled'), true);
  await evaluate('window.fixtureSoldOut = false; setReactInput(document.querySelector(".checkout-form > section:last-of-type input"), "BADCODE")');
  await evaluate('window.fixtureQuoteError = true; document.getElementById("tour-booking-form").requestSubmit()');
  await waitFor(() => evaluate('!!document.querySelector(".checkout-form [role=alert]")'), 'quote error');
  await evaluate('window.fixtureQuoteError = false; setReactInput(document.querySelector(".checkout-form > section:last-of-type input"), "")');
  await evaluate('document.getElementById("tour-booking-form").requestSubmit()');
  await waitFor(() => evaluate('!!document.querySelector(".checkout-total")'), 'quote retry');
  for (const width of [390, 320]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: true });
    await noOverflow(`Checkout ${width}px`);
  }
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await evaluate('scrollTo(0,0)');
  await pause(700);
  const checkoutShot = await send('Page.captureScreenshot', { format:'png', captureBeyondViewport:false });
  await writeFile(join(tmpdir(), 'tourgo-checkout-desktop.png'), Buffer.from(checkoutShot.data, 'base64'));
  await evaluate('document.querySelector(".checkout-submit").click()');
  await waitFor(() => evaluate('!!document.querySelector(".checkout-success")'), 'checkout success');
  const bookingPost = await evaluate('window.fixturePosts.find(p => p.path === "/api/bookings").body');
  assert.equal(bookingPost.contactPhone, '0901234567');
  assert.equal(bookingPost.passengers[0].fullName, 'Khách cập nhật');
  assert.equal(bookingPost.scheduleId, 'ui-schedule');
  assert.equal('total' in bookingPost, false);
  assert.equal(await evaluate('document.querySelector(".checkout-success .btn").getAttribute("href")'), '#/payment/ui-created-booking');
  assert.equal(await evaluate('document.activeElement.id'), 'success-heading');
  assert.ok(await evaluate('document.querySelector(".success-code").textContent.includes("BK-UI-CREATED")'));
  assert.ok(await evaluate('document.querySelector(".success-amount").textContent.includes("1.000.000")'));
  assert.ok(await evaluate('document.querySelector(".success-advisory").textContent.includes("chưa đồng nghĩa đã thanh toán")'));
  assert.equal(await evaluate('document.querySelectorAll(".success-next li").length'), 3);
  assert.equal(await evaluate('document.querySelector(".success-actions .outline").getAttribute("href")'), '#/bookings/ui-created-booking');
  await noOverflow('Booking success desktop');
  await pause(700);
  const successShot = await send('Page.captureScreenshot', {format:'png', captureBeyondViewport:false});
  await writeFile(join(tmpdir(), 'tourgo-booking-success-desktop.png'), Buffer.from(successShot.data, 'base64'));
  for (const width of [390, 320]) {
    await send('Emulation.setDeviceMetricsOverride', {width, height:844, deviceScaleFactor:1, mobile:true});
    await noOverflow(`Booking success ${width}px`);
  }
  console.log('PASS booking success: API code/total, focus, next steps, payment/detail links and responsive layout');
  await navigate('/booking/ui-tour?scheduleId=missing');
  await waitFor(() => evaluate('!!document.querySelector(".checkout-page .state")'), 'missing schedule');
  assert.equal(await evaluate('!!document.querySelector(".checkout-submit")'), false);
  console.log('PASS checkout fixture: add/remove passengers, quote invalidation, unavailable seats, errors, submit payload, success and missing schedule; no database changes');
  await evaluate(`window.paymentFixture = {bookingCode:'BK-UI-TEST', bookingStatus:'PENDING_PAYMENT', total:2500000, paidTotal:0, refundedTotal:0, outstanding:2500000, payments:[]}`);
  await navigate('/payment/ui-booking');
  await waitFor(() => evaluate('!!document.querySelector(".payment-create")'), 'payment methods');
  assert.equal(await evaluate('document.querySelectorAll(".payment-method input").length'), 3);
  assert.ok(await evaluate('document.querySelector(".payment-bank").textContent.includes("Chưa cấu hình")'));
  await noOverflow('Payment desktop');
  await evaluate('document.querySelector(".payment-create").click()');
  await waitFor(() => evaluate('!!document.querySelector(".payment-proof-form")'), 'transfer proof form');
  const paymentCreatePost = await evaluate('window.fixturePosts.find(p => p.path === "/api/payments").body');
  assert.deepEqual(paymentCreatePost, {bookingId:'ui-booking', method:'BANK_TRANSFER'});
  await evaluate('document.querySelector(".payment-proof-form input").value="https://example.test/proof.jpg"; document.querySelector(".payment-proof-form textarea").value="Chứng từ kiểm thử"; document.querySelector(".payment-proof-form").requestSubmit()');
  await waitFor(() => evaluate('!!document.querySelector(".payment-review-note")'), 'proof awaiting review');
  assert.ok(await evaluate('document.querySelector(".payment-sidebar .checkout-total").textContent.includes("2.500.000")'));
  assert.equal(await evaluate('!!document.querySelector(".payment-outcome")'), false);
  await evaluate('document.querySelector("input[value=VNPAY]").click()');
  await evaluate('document.querySelector(".payment-create").click()');
  await waitFor(() => evaluate('!!document.querySelector(".payment-simulate")'), 'mock payment');
  for (const width of [390, 320]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height:844, deviceScaleFactor:1, mobile:true });
    await noOverflow(`Payment ${width}px`);
  }
  await send('Emulation.setDeviceMetricsOverride', { width:1440, height:1000, deviceScaleFactor:1, mobile:false });
  await evaluate('scrollTo(0,0)');
  await pause(600);
  const paymentShot = await send('Page.captureScreenshot', {format:'png', captureBeyondViewport:false});
  await writeFile(join(tmpdir(), 'tourgo-payment-desktop.png'), Buffer.from(paymentShot.data, 'base64'));
  await evaluate('window.confirm = () => false; document.querySelector(".payment-simulate").click()');
  assert.equal(await evaluate('window.paymentFixture.outstanding'), 2500000);
  await evaluate('window.confirm = () => true; document.querySelector(".payment-simulate").click()');
  await waitFor(() => evaluate('!!document.querySelector(".payment-outcome")'), 'payment recorded');
  assert.equal(await evaluate('!!document.querySelector(".payment-create, .payment-proof-form, .payment-simulate")'), false);
  await evaluate('window.paymentFixture.bookingStatus="CANCELLED"; window.paymentFixture.outstanding=2500000; window.paymentFixture.paidTotal=0; document.querySelector(".payment-refresh").click()');
  await waitFor(() => evaluate('!!document.querySelector(".payment-closed")'), 'closed booking');
  assert.equal(await evaluate('!!document.querySelector(".payment-create, .payment-proof-form, .payment-simulate")'), false);
  await evaluate('window.paymentFixture.error=true; document.querySelector(".payment-refresh").click()');
  await waitFor(() => evaluate('!!document.querySelector(".payment-page .state.error")'), 'payment API failure');
  await evaluate('window.paymentFixture.error=false; document.querySelector(".payment-page .state.error button").click()');
  await waitFor(() => evaluate('!!document.querySelector(".payment-history")'), 'payment retry');
  console.log('PASS payment fixture: methods, missing bank, create payload without amount, proof pending, mock consent/success, closed booking, retry and mobile; no real payments');
  await evaluate(`window.staffData = true; window.fixtureUser = {id:'ui-staff',fullName:'Nguyễn Thị Hoa',email:'staff@example.test',roles:['STAFF'],permissions:['booking:read','payment:read','schedule:read','user:read','support:manage','notification:manage']}; window.dispatchEvent(new Event('auth-change')); location.hash='/admin';`);
  await waitFor(() => evaluate('location.hash === "#/staff" && !!document.querySelector(".staff-shell")'), 'staff separate home');
  assert.equal(await evaluate('!!document.querySelector(".admin-shell, .customer-site")'), false);
  assert.equal(await evaluate('document.querySelectorAll(".staff-task").length'), 6);
  await waitFor(() => evaluate('document.querySelectorAll(".staff-recent tbody tr").length === 1 && document.querySelectorAll(".staff-departure").length === 1'), 'staff dashboard real API contracts');
  assert.equal(await evaluate('document.querySelectorAll(".staff-metric").length'), 4);
  assert.equal(await evaluate('document.querySelectorAll(".staff-chart-column").length'), 12);
  assert.equal(await evaluate('document.querySelector(".staff-donut strong").textContent'), '1');
  await evaluate('document.querySelector(".staff-recent .staff-view").click()');
  await waitFor(() => evaluate('!!document.querySelector(".workspace-form") && document.querySelector(".workspace-form").textContent.includes("BK-UI-TEST")'), 'staff recent booking opens exact detail');
  await navigate('/staff');
  await waitFor(() => evaluate('document.querySelectorAll(".staff-recent tbody tr").length === 1'), 'staff dashboard return');
  await evaluate('document.querySelector(".staff-search input").value="Nguyễn An"; document.querySelector(".staff-search").requestSubmit()');
  await waitFor(() => evaluate('!!document.querySelector(".admin-toolbar input[name=search]")'), 'staff topbar search');
  assert.equal(await evaluate('new URLSearchParams(location.hash.split("?")[1]).get("search")'), 'Nguyễn An');
  assert.equal(await evaluate('document.querySelector(".admin-toolbar input[name=search]").value'), 'Nguyễn An');
  await navigate('/staff');
  await waitFor(() => evaluate('document.querySelectorAll(".staff-recent tbody tr").length === 1'), 'staff dashboard screenshot ready');
  assert.equal(await evaluate('[...document.querySelectorAll(".staff-shell a")].some(a => a.getAttribute("href").startsWith("#/admin"))'), false);
  await noOverflow('Staff desktop');
  await pause(500);
  const staffShot = await send('Page.captureScreenshot', {format:'png', captureBeyondViewport:false});
  await writeFile(join(tmpdir(), 'tourgo-staff-desktop.png'), Buffer.from(staffShot.data, 'base64'));
  await navigate('/staff?tab=bookings');
  await waitFor(() => evaluate('!!document.querySelector(".staff-shell .admin-toolbar")'), 'staff bookings');
  await evaluate(`window.staffOps = {booking:structuredClone(${JSON.stringify(fixtureBooking)}),schedule:{id:'staff-schedule',tourId:'ui-tour',tourCode:'TOUR-01',tourName:'Đà Nẵng – Hội An',startDate:'2026-11-15',endDate:'2026-11-17',priceAdult:1000000,priceChild:700000,priceInfant:100000,maxSeats:30,soldSeats:12,heldSeats:3,availableSeats:15,status:'OPEN',meetingPoint:'Sân bay Đà Nẵng',checkpoints:[{id:'cp1',name:'Đón tại sân bay',meetTime:'07:30',dayNo:1,sortOrder:0}]},requests:[]}; window.fixtureUser.permissions.push('booking:confirm','booking:cancel'); window.dispatchEvent(new Event('auth-change')); window.confirm = () => true;`);
  await navigate('/staff?tab=bookings&booking=ui-booking');
  await waitFor(() => evaluate('!!document.querySelector(".ops-detail-summary")'), 'redesigned booking detail');
  await evaluate('document.querySelector(".ops-close").click(); window.scrollTo(0,0)');
  await waitFor(() => evaluate('!document.querySelector(".ops-detail")'), 'booking detail closed');
  await evaluate('document.querySelector(".ops-bookings .ops-view").click()');
  await waitFor(() => evaluate('document.activeElement?.classList.contains("ops-booking-detail-target") && document.querySelector(".ops-booking-detail-target").getBoundingClientRect().top < innerHeight - 100'), 'processing click scrolls to and focuses detail');
  await evaluate('window.scrollTo(0,0); document.querySelector(".ops-bookings .ops-view").click()');
  await waitFor(() => evaluate('document.activeElement?.classList.contains("ops-booking-detail-target") && document.querySelector(".ops-booking-detail-target").getBoundingClientRect().top < innerHeight - 100'), 'same booking processing click reveals detail again');
  await evaluate('document.querySelector(".ops-close").click()');
  assert.equal(await evaluate('document.activeElement?.classList.contains("ops-view")'), true);
  await evaluate('document.querySelector(".ops-bookings .ops-view").click()');
  await waitFor(() => evaluate('!!document.querySelector(".ops-detail-summary")'), 'booking reopened');
  await noOverflow('Staff booking desktop');
  await evaluate('document.querySelector(".ops-filters input[name=fromDate]").value="2026-11-01"; document.querySelector(".ops-filters input[name=toDate]").value="2026-11-30"; document.querySelector(".ops-filters").requestSubmit()');
  await waitFor(() => evaluate('window.staffOps.lastBookingQuery.includes("fromDate=2026-11-01")'), 'booking date filter');
  for (const decision of [false,true]) {
    await evaluate(`window.staffOps.booking.status='CANCEL_REQUESTED'; window.staffOps.booking.cancelRequests=[{id:'cr1',status:'PENDING',reason:'Khách có việc đột xuất',feeAmount:100000,feePercent:4,refundAmount:2400000,createdAt:'2026-10-28'}]; document.querySelector('.ops-heading-actions button').click();`);
    await waitFor(() => evaluate('[...document.querySelectorAll(".ops-processing button")].some(b => b.textContent === "Duyệt yêu cầu hủy")'), 'cancel approval buttons');
    await evaluate(`[...document.querySelectorAll('.ops-processing button')].find(b => b.textContent === '${decision ? 'Duyệt yêu cầu hủy' : 'Từ chối yêu cầu hủy'}').click()`);
    if (!decision) await evaluate('document.querySelector(".ops-action-form textarea").value="Không đủ điều kiện hủy"');
    if (decision) {
      await evaluate('window.staffOps.fail=true; document.querySelector(".ops-action-form").requestSubmit()');
      await waitFor(() => evaluate('document.querySelector(".ops-detail [role=alert]")?.textContent.includes("approve")'), 'cancellation validation details visible');
      await evaluate('window.staffOps.fail=false');
    }
    await evaluate('document.querySelector(".ops-action-form").requestSubmit()');
    await waitFor(() => evaluate(`document.querySelector('.ops-detail-summary .ops-badge')?.classList.contains('${decision ? 'cancelled' : 'confirmed'}')`), 'cancel decision refresh');
    assert.deepEqual(await evaluate('window.staffOps.requests.at(-1).body'), decision ? {approve:true} : {approve:false,rejectReason:'Không đủ điều kiện hủy'});
  }
  await evaluate('window.staffOps.booking.status="PENDING_CONFIRMATION"; window.staffOps.booking.cancelRequests=[]; document.querySelector(".ops-heading-actions button").click()');
  await waitFor(() => evaluate('[...document.querySelectorAll(".ops-processing button")].some(b => b.textContent === "Xác nhận đơn")'), 'confirmation action');
  await evaluate('[...document.querySelectorAll(".ops-processing button")].find(b => b.textContent === "Xác nhận đơn").click()');
  await waitFor(() => evaluate('!!document.querySelector(".ops-action-form")'), 'confirmation form rendered');
  await evaluate('document.querySelector(".ops-action-form").requestSubmit()');
  await waitFor(() => evaluate('document.querySelector(".ops-detail-summary .ops-badge")?.classList.contains("confirmed")'), 'confirmation refreshed');
  await evaluate('window.staffOps.booking.scheduleId="staff-schedule"; document.querySelector(".ops-heading-actions button").click()');
  await waitFor(() => evaluate('!!document.querySelector(".ops-open-schedule")'), 'booking schedule link');
  await evaluate('document.querySelector(".ops-open-schedule").click()');
  await waitFor(() => evaluate('document.querySelector(".ops-schedule-bookings")?.textContent.includes("Đã nhận")'), 'paid booking visible in linked departure');
  assert.equal(await evaluate('new URLSearchParams(location.hash.split("?")[1]).get("schedule")'), 'staff-schedule');
  assert.equal(await evaluate('new URLSearchParams(window.staffOps.lastBookingQuery).get("scheduleId")'), 'staff-schedule');
  assert.ok(await evaluate('document.querySelector(".ops-schedule-bookings").textContent.includes("BK-UI-TEST")'));
  await evaluate('document.querySelector(".ops-schedule-bookings .ops-view").click()');
  await waitFor(() => evaluate('!!document.querySelector(".ops-detail-summary")'), 'departure booking link back');
  for (const width of [390,320]) {
    await send('Emulation.setDeviceMetricsOverride', {width,height:844,deviceScaleFactor:1,mobile:true});
    await noOverflow(`Staff bookings detail ${width}px`);
  }
  await send('Emulation.setDeviceMetricsOverride', {width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await writeFile(join(tmpdir(),'tourgo-staff-bookings.png'),Buffer.from((await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));
  await navigate('/staff?tab=schedules');
  await waitFor(() => evaluate('!!document.querySelector(".ops-schedules .ops-view")'), 'staff schedules list');
  assert.equal(await evaluate('[...document.querySelectorAll(".ops-schedules button")].some(b => /Thêm lịch|Chỉnh sửa lịch|Xóa lịch/.test(b.textContent))'),false);
  await evaluate('document.querySelector(".ops-schedules .ops-view").click()');
  await waitFor(() => evaluate('document.querySelector(".ops-checkpoints")?.textContent.includes("07:30")'), 'schedule checkpoints');
  assert.ok(await evaluate('document.querySelector(".ops-detail").textContent.includes("Sân bay Đà Nẵng")'));
  assert.equal(await evaluate('!!document.querySelector(".ops-pickup-editor button")'),false);
  await evaluate('window.fixtureUser.permissions.push("schedule:write"); window.dispatchEvent(new Event("auth-change"))');
  await waitFor(() => evaluate('!!document.querySelector(".ops-pickup-editor button")'), 'pickup write permission');
  await evaluate('document.querySelector(".ops-pickup-editor button").click()');
  await waitFor(() => evaluate('!!document.querySelector(".ops-pickup-editor form")'), 'pickup form open');
  await evaluate('setReactInput(document.querySelector(".ops-pickup-editor input[name=meetingPoint]"),"Sân bay – Cột 12"); [...document.querySelectorAll(".ops-pickup-editor button")].find(b=>b.textContent.includes("+ Thêm điểm đón")).click()');
  await waitFor(() => evaluate('document.querySelectorAll(".ops-pickup-row").length===2'), 'pickup row added');
  await evaluate('setReactInput(document.querySelectorAll(".ops-pickup-row")[1].querySelectorAll("input")[2],"Khách sạn trung tâm")');
  await send('Emulation.setDeviceMetricsOverride', {width:320,height:844,deviceScaleFactor:1,mobile:true});
  await noOverflow('Pickup editor 320px');
  await send('Emulation.setDeviceMetricsOverride', {width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await evaluate('document.querySelector(".ops-pickup-editor form").requestSubmit()');
  await waitFor(() => evaluate('window.staffOps.pickupBody?.checkpoints.length===2 && document.querySelectorAll(".ops-checkpoints li").length===2'), 'pickup persisted and refreshed');
  assert.equal(await evaluate('window.staffOps.pickupBody.meetingPoint'),'Sân bay – Cột 12');
  assert.equal(await evaluate('window.staffOps.pickupBody.checkpoints[1].name'),'Khách sạn trung tâm');
  assert.equal(await evaluate('"id" in window.staffOps.pickupBody.checkpoints[0]'),false);
  await evaluate('window.fixtureUser.permissions=window.fixtureUser.permissions.filter(p=>p!=="schedule:write"); window.dispatchEvent(new Event("auth-change"))');
  await evaluate('document.querySelector(".ops-filters input[name=fromDate]").value="2026-12-01"; document.querySelector(".ops-filters input[name=toDate]").value="2026-11-01"; document.querySelector(".ops-filters").requestSubmit()');
  await waitFor(() => evaluate('!!document.querySelector(".ops-schedules [role=alert]")'), 'inverted schedule dates rejected');
  await evaluate('document.querySelector(".ops-filters input[name=toDate]").value="2026-12-31"; document.querySelector(".ops-filters").requestSubmit()');
  await waitFor(() => evaluate('window.staffOps.lastScheduleQuery.includes("toDate=2026-12-31")'), 'schedule filters sent');
  await noOverflow('Staff schedules desktop');
  await writeFile(join(tmpdir(),'tourgo-staff-schedules.png'),Buffer.from((await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));
  for (const width of [390,320]) {
    await send('Emulation.setDeviceMetricsOverride', {width,height:844,deviceScaleFactor:1,mobile:true});
    await noOverflow(`Staff schedules detail ${width}px`);
  }
  await evaluate(`window.fixtureUser.permissions=window.fixtureUser.permissions.filter(p=>!['booking:confirm','booking:cancel'].includes(p)); window.dispatchEvent(new Event('auth-change'));`);
  await navigate('/staff?tab=bookings&booking=ui-booking');
  await waitFor(() => evaluate('!!document.querySelector(".ops-detail-summary")'), 'read only booking detail');
  assert.equal(await evaluate('!!document.querySelector(".ops-processing")'),false);
  await evaluate('delete window.staffOps');
  console.log('PASS staff operations: date filters, booking detail, confirm, approve/reject cancellation with strict booleans, validation errors, schedule checkpoints, readonly permissions and responsive tables; no real mutations');
  await navigate('/staff?tab=settings');
  await waitFor(() => evaluate('!!document.querySelector(".staff-content [role=alert]")'), 'staff admin tab denied');
  await navigate('/staff');
  for (const width of [390,320]) {
    await send('Emulation.setDeviceMetricsOverride', {width,height:844,deviceScaleFactor:1,mobile:true});
    await noOverflow(`Staff ${width}px`);
    await evaluate('document.querySelector(".staff-menu-toggle").click()');
    assert.equal(await evaluate('document.querySelector(".staff-menu-toggle").getAttribute("aria-expanded")'), 'true');
    await noOverflow(`Staff open menu ${width}px`);
    await evaluate('document.querySelector("#staff-navigation a").click()');
    assert.equal(await evaluate('document.querySelector(".staff-menu-toggle").getAttribute("aria-expanded")'), 'false');
  }
  await evaluate(`window.fixtureUser = {...window.fixtureUser, roles:['ADMIN'],permissions:['report:read']}; window.dispatchEvent(new Event('auth-change'));`);
  await waitFor(() => evaluate('location.hash === "#/admin" && !!document.querySelector(".admin-shell")'), 'admin separate redirect');
  assert.equal(await evaluate('!!document.querySelector(".staff-shell")'), false);
  await evaluate(`window.fixtureUser = {...window.fixtureUser, roles:['CUSTOMER'],permissions:['booking:create']}; window.dispatchEvent(new Event('auth-change')); location.hash='/staff';`);
  await waitFor(() => evaluate('!!document.querySelector(".management-root .state") && !document.querySelector(".staff-shell")'), 'customer staff denied');
  console.log('PASS staff/admin separate shells, redirects, permission allowlist, forbidden tab, customer denial and mobile menu');
  await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: fixtureScript.identifier });
  console.log('PASS fixture: booking totals, tabs, image gallery, account mobile menu, unavailable invoice');
  assert.deepEqual(runtimeErrors, []);
  console.log('PASS no uncaught browser runtime errors');
} finally {
  if (socket?.readyState === WebSocket.OPEN) {
    try { await send('Browser.close'); } catch { /* Browser may close before replying. */ }
    socket.close();
  }
  browser.kill();
  await pause(500);
  await rm(profile, { recursive: true, force: true, maxRetries: 5 }).catch(() => {});
}

