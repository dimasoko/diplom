export class HttpError extends Error {
  public readonly statusCode: number;
  public readonly error: unknown;

  constructor(statusCode: number, message: string, error?: unknown) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.error = error;
  }
}
