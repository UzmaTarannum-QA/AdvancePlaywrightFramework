# `create-booking.spec.ts` — API request flow notes

Use this guide to explain how the create-booking test works and how it delegates
HTTP work to `ApiHelper`.

## What the test is checking

The test sends a `POST` request to `/booking` with booking details, expects a
successful HTTP response, parses the response JSON, and checks that the server
returned a booking ID and echoed selected booking details.

## Request-to-response flow

```text
Playwright test
  -> request fixture (APIRequestContext)
  -> new ApiHelper(request)
  -> api.post('/booking', payload)
  -> ApiHelper.post(url, data)
  -> ApiHelper.callApi({ url, method: 'POST', data })
  -> ApiHelper.getRequest() and ApiHelper.buildUrl(...)
  -> APIRequestContext.post(fullUrl, { headers, data, timeout })
  -> APIResponse
  -> success assertion
  -> parse JSON as CreateBookingResponse
  -> assert booking ID and echoed values
```

## Walk through the spec

### 1. Imports and logger

```ts
import { test, expect } from '@playwright/test';
import { ApiHelper } from '@utils/ApiHelper';
import { createLogger } from '@utils/logger';

const log = createLogger('create-booking');
```

- `test` provides Playwright's test and fixture APIs.
- `expect` provides assertions.
- `ApiHelper` is the project wrapper that sends API requests.
- `createLogger` creates a named logger for messages from this test.

### 2. Type definitions

- `BookingDates` describes the `checkin` and `checkout` strings.
- `BookingPayload` describes the data sent to create a booking.
- `CreateBookingResponse` describes the subset of response data this test reads:
  the `bookingid` and selected fields in `booking`.

These are compile-time TypeScript shapes. They help catch mismatched field
names/types while writing the test; they do not validate the server's JSON at
runtime.

### 3. Test declaration and Playwright fixture

```ts
test('POST /booking creates a booking and echoes it back',
  async ({ request }, testInfo) => {
```

- `request` is Playwright's built-in `APIRequestContext` fixture. It can send
  HTTP requests without opening a browser page.
- `testInfo` is another built-in fixture, but this test currently does not use
  it.
- The test is inside a `test.describe` group labelled with `@P0` and
  `@regression`.

### 4. Construct the helper

```ts
const api = new ApiHelper(request);
```

The `request` fixture is passed to the helper's constructor and saved in its
private `context` property. Its type is `ApiContext`, which allows either a
`Page` or an `APIRequestContext`. This test passes an `APIRequestContext`.

### 5. Build the request body

```ts
const payload: BookingPayload = {
  firstname: 'Helper',
  lastname: 'Creator',
  totalprice: 640,
  depositpaid: false,
  bookingdates: { checkin: '2026-04-01', checkout: '2026-04-10' },
  additionalneeds: 'Breakfast',
};
```

`payload` is a local object in the test. Its `BookingPayload` annotation checks
that it has the required booking fields with the expected TypeScript types.
It is the HTTP request body—not a property on the `ApiHelper` class.

### 6. Send the POST request

```ts
const response = await api.post('/booking', payload);
```

This calls the helper's method:

```ts
post(url: string, data?: unknown, options?: ...)
```

Argument mapping:

| Call argument | `ApiHelper.post` parameter | Meaning |
|---|---|---|
| `'/booking'` | `url` | Endpoint path |
| `payload` | `data` | Request body |
| omitted | `options` | Optional headers, query params, or timeout |

`data` is typed as `unknown` in the helper, so the helper can accept different
request-body shapes. In this test, the more specific `BookingPayload` type
checks the object before it is passed in.

### 7. What `ApiHelper.post` does

The helper's `post` convenience method creates the options object and delegates
to `callApi`:

```ts
return this.callApi({ url, method: 'POST', data, ...options });
```

For this call, the resulting object is effectively:

```ts
{
  url: '/booking',
  method: 'POST',
  data: payload
}
```

No custom options were supplied, so `headers`, `params`, and `timeout` are
undefined.

### 8. What `callApi` does

`callApi` takes that object as an `ApiRequestOptions` value and first extracts
its fields:

```ts
const { url, method, headers, data, params, timeout } = options;
```

Then it prepares the request and URL:

```ts
const request = this.getRequest();
const fullUrl = this.buildUrl(url, params);
```

- `getRequest()` returns the stored `APIRequestContext` directly in this test.
  If a `Page` had been passed instead, it would return `page.request`.
- `buildUrl()` returns `url` unchanged when no query params are provided. Here,
  `fullUrl` is `'/booking'`.
- If `params` were provided, `buildUrl()` would encode them as a query string.

The method switch sees `method: 'POST'`, so it runs:

```ts
return await request.post(fullUrl, { headers, data, timeout });
```

Here, `data` is the same payload object passed to `api.post`. Playwright sends
that object as the request body. The configured `baseURL` in
`playwright.config.ts` allows the relative path `'/booking'` to be resolved
against the API server URL.

`await` waits for the HTTP response. The helper returns Playwright's
`APIResponse` to the test; it does not parse the response body itself.

### 9. Check status and parse the response

```ts
expect(api.isSuccess(response)).toBe(true);
body = await api.parseJsonResponse<CreateBookingResponse>(response);
```

- `isSuccess()` reads the response status and returns `true` for status codes
  from 200 through 299. This checks for a successful 2xx response, not only
  status `200`.
- `parseJsonResponse<T>()` calls `response.json()` and returns the parsed
  result, with `CreateBookingResponse` as its TypeScript type.
- The generic type helps TypeScript understand how the test uses `body`.
  The type assertion does not inspect or validate the actual JSON at runtime.

If the success assertion fails, Playwright marks the test as failed, so the
subsequent parsing and verification do not proceed.

### 10. Verify the response

```ts
expect(body.bookingid).toBeGreaterThan(0);
expect(body.booking.firstname).toBe(payload.firstname);
expect(body.booking.totalprice).toBe(payload.totalprice);
```

These assertions check that:

1. The server returned a positive booking ID.
2. The response booking's first name matches the sent payload.
3. The response booking's total price matches the sent payload.

The test does not currently compare every field in the payload.

## How `ApiHelper` fits in

`ApiHelper` separates reusable HTTP mechanics from individual tests:

- `ApiRequestOptions` defines the shape for a general request: URL, HTTP
  method, and optional headers, body, query params, and timeout.
- `HttpMethod` restricts the allowed methods to `GET`, `POST`, `PUT`, `DELETE`,
  and `PATCH`.
- `callApi()` selects the matching Playwright request method.
- `post()` is a convenience method that supplies `method: 'POST'`.
- `get()`, `put()`, `delete()`, and `patch()` provide similar conveniences for
  other HTTP methods.
- `callApiWithRetry()` supports retrying requests based on a caller-provided
  condition, but this test does not use it.
- `isSuccess()` checks for a 2xx response.
- `parseJsonResponse<T>()` parses response JSON and gives it a compile-time
  type.

## Interview-ready answers

### “What does `api.post('/booking', payload)` do?”

It calls the `ApiHelper.post` convenience method. The path becomes the `url`
argument, and `payload` becomes the `data` argument. `post()` forwards both to
`callApi()` with the method set to `POST`. `callApi()` obtains the underlying
Playwright `APIRequestContext`, prepares the URL, and calls
`request.post(fullUrl, { headers, data, timeout })`. The returned
`APIResponse` is then checked and parsed by the test.

### “Where does `request` come from?”

It is Playwright's built-in `request` test fixture, injected into the test
callback. It is an `APIRequestContext`. The test passes it to `new ApiHelper`,
and the helper stores it as its context.

### “Where does `fullUrl` come from?”

`callApi()` calls `buildUrl(url, params)`. The test supplies `'/booking'` and no
params, so `fullUrl` stays `'/booking'`. Playwright combines this relative path
with the configured `baseURL`.

### “Is `payload` stored by the helper?”

No. The test owns the local `payload` variable. The helper receives it as the
`data` argument, places it in request options, and passes it to Playwright as
the POST body.

### “Why use `ApiHelper` rather than call `request.post` in every test?”

It centralizes common request behavior and gives tests a consistent API:
convenience methods, URL/option handling, status checks, JSON parsing, and
optional retry support. A test can focus on its endpoint-specific setup and
assertions.

### “Does `parseJsonResponse<CreateBookingResponse>` validate the response?”

No. It parses JSON, then tells TypeScript to treat it as that type. It does not
perform runtime schema validation. Assertions in the test verify the particular
response values the test cares about.

### “What happens if the server responds with an error?”

`isSuccess()` returns `false` for a non-2xx status, and the `expect(...).toBe(true)`
assertion fails the test. If the request itself cannot complete, the awaited
Playwright request can throw, which also fails the test.

### “Is this test testing retries?”

No. It uses `api.post()` directly. Retry behavior is provided by
`callApiWithRetry()`, which this test does not call.

## One-sentence summary

The test builds a typed booking payload, sends it through `ApiHelper` as a
Playwright POST request to `/booking`, then checks that the response is
successful and contains an ID and selected values matching the payload.
