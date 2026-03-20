/** Matches backend `ListResponse` from @app/common. */
export interface PaginationInfo {
  pageIndex: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface ListResponse<T> {
  total: number;
  data: T[];
  paginationInfo: PaginationInfo;
}

export function isListResponse<T>(body: unknown): body is ListResponse<T> {
  return (
    !!body &&
    typeof body === "object" &&
    "data" in body &&
    Array.isArray((body as ListResponse<T>).data) &&
    "paginationInfo" in body
  );
}

/** Normalize GET list endpoints that may return legacy arrays or ListResponse. */
export function unwrapListData<T>(body: T[] | ListResponse<T>): T[] {
  if (Array.isArray(body)) return body;
  return body.data ?? [];
}
