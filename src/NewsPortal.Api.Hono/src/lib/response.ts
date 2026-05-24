// Response shape helpers — match the legacy ASP.NET Core API exactly so the
// React client can talk to either backend without code changes.

export type PagedResult<T> = {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export function paged<T>(items: T[], totalCount: number, page: number, pageSize: number): PagedResult<T> {
  const totalPages = pageSize > 0 ? Math.ceil(totalCount / pageSize) : 0;
  return {
    items,
    totalCount,
    page,
    pageSize,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

/** Simple error JSON — matches the .NET API style of `{ message }`. */
export function errMsg(message: string) {
  return { message };
}
