/** Throw inside a route; the app error handler turns it into `{ error }` with this status code. */
export function fail(statusCode: number, message: string): never {
  throw Object.assign(new Error(message), { statusCode });
}
