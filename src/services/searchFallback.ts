const SEARCH_FALLBACK_BATCH_SIZE = 100;

function normalizeSearchValue(value: string | null | undefined): string {
  return (value ?? '').trim().toLocaleLowerCase();
}

export function matchesCaseInsensitiveSearch(
  search: string | undefined,
  fields: Array<string | null | undefined>,
): boolean {
  const normalizedSearch = normalizeSearchValue(search);
  if (!normalizedSearch) {
    return true;
  }

  return fields.some((field) => normalizeSearchValue(field).includes(normalizedSearch));
}

export function paginateFallbackItems<T>(
  items: T[],
  page: number,
  pageSize: number,
): { data: T[]; total: number; page: number; pageSize: number } {
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, pageSize);
  const startIndex = (safePage - 1) * safePageSize;

  return {
    data: items.slice(startIndex, startIndex + safePageSize),
    total: items.length,
    page: safePage,
    pageSize: safePageSize,
  };
}

export async function collectPaginatedItems<TPayload, TItem>(options: {
  fetchPage: (page: number, limit: number) => Promise<TPayload>;
  getItems: (payload: TPayload) => TItem[];
  getTotalPages: (payload: TPayload) => number;
}): Promise<TItem[]> {
  const items: TItem[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const payload = await options.fetchPage(page, SEARCH_FALLBACK_BATCH_SIZE);
    items.push(...options.getItems(payload));
    totalPages = Math.max(1, options.getTotalPages(payload));
    page += 1;
  }

  return items;
}
