// Standard response envelope — matches the legacy ASP.NET Core API shape so
// the React client can swap VITE_API_BASE_URL between stacks transparently.

export type ApiSuccess<T> = {
  success: true;
  data: T;
  message?: string;
};

export type ApiError = {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
};

export function successResult<T>(data: T, message?: string): ApiSuccess<T> {
  return message ? { success: true, data, message } : { success: true, data };
}

export function errorResult(message: string, errors?: Record<string, string[]>): ApiError {
  return errors ? { success: false, message, errors } : { success: false, message };
}

export type PagedResult<T> = {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function pagedResult<T>(items: T[], totalCount: number, page: number, pageSize: number): PagedResult<T> {
  return {
    items,
    totalCount,
    page,
    pageSize,
    totalPages: pageSize > 0 ? Math.ceil(totalCount / pageSize) : 0,
  };
}
