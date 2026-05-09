export type ImportErrorCode =
  | "user_not_found"
  | "rate_limited"
  | "api_error"
  | "network_error";

export class ImportError extends Error {
  readonly code: ImportErrorCode;

  constructor(code: ImportErrorCode, message: string) {
    super(message);
    this.name = "ImportError";
    this.code = code;
  }
}
