import createClient from 'openapi-fetch';
import { expect, onTestFinished } from 'vitest';
import type { ApiClient } from '../api/api-client.js';
import type { paths } from '../api/schema.js';

// One request the code under test sent. `url` is the path + query relative to the base URL ("/meters?active=true");
// `body` is the parsed JSON body, undefined when there is none.
export interface RecordedRequest {
  method: string;
  url: string;
  body: unknown;
}

// Route key "METHOD /path?query" (e.g. "GET /meters?active=true") → the response. A Response is cloned per call;
// a function may build one from the request or throw (= a network error).
export type Route = Response | ((req: RecordedRequest) => Response);
export type Routes = Record<string, Route>;

const BASE_URL = 'http://api.test';

// The real openapi-fetch client (same typed calls as production) with a fake fetch. An unknown route throws and
// also fails the test at its end — the code under test may swallow the throw (ParseResultReporter does).
export function fakeApi(routes: Routes): { api: ApiClient; requests: RecordedRequest[] } {
  const requests: RecordedRequest[] = [];
  const unknown: string[] = [];
  onTestFinished(() => {
    expect(unknown, 'requests without a fakeApi route').toEqual([]);
  });

  const fetch = async (request: Request): Promise<Response> => {
    const { pathname, search } = new URL(request.url);
    const text = await request.text();
    const recorded: RecordedRequest = {
      method: request.method,
      url: `${pathname}${search}`,
      body: text === '' ? undefined : JSON.parse(text),
    };
    requests.push(recorded);
    const key = `${recorded.method} ${recorded.url}`;
    const route = routes[key];
    if (!route) {
      unknown.push(key);
      throw new Error(`fakeApi: no route for ${key}`);
    }
    return typeof route === 'function' ? route(recorded) : route.clone();
  };

  return { api: createClient<paths>({ baseUrl: BASE_URL, fetch }), requests };
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// An error response with the API's error body ({ statusCode, message, ... }).
export function status(code: number, body: Record<string, unknown> = {}): Response {
  return json({ statusCode: code, ...body }, code);
}
