import { useSearchParams } from 'react-router-dom';

export interface TableParams {
  page: number;
  pageSize: number;
  search: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  [key: string]: any; // Phục vụ cho custom filters
}

export function useTableParams(defaultSortBy = 'createdAt', defaultSortOrder: 'asc' | 'desc' = 'desc') {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Number(searchParams.get('page')) || 1;
  const pageSize = Number(searchParams.get('pageSize')) || 10;
  const search = searchParams.get('search') || '';
  const sortBy = searchParams.get('sortBy') || defaultSortBy;
  const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || defaultSortOrder;

  // Lọc lấy các custom filter (nếu có) không thuộc nhóm param cơ bản
  const getCustomFilters = () => {
    const filters: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      if (!['page', 'pageSize', 'search', 'sortBy', 'sortOrder'].includes(key)) {
        filters[key] = value;
      }
    });
    return filters;
  };

  const updateTableParams = (newParams: Partial<TableParams>) => {
    const currentParams = Object.fromEntries(searchParams.entries());

    // Xoá tham số nếu giá trị là falsy (ngoại trừ số 0 hoặc boolean false)
    Object.keys(newParams).forEach((key) => {
      const value = newParams[key as keyof TableParams];
      if (value === undefined || value === null || value === '') {
        delete currentParams[key];
      } else {
        currentParams[key] = String(value);
      }
    });

    // Reset về page 1 nếu params thay đổi và không truyền tường minh thuộc tính page
    if (!newParams.page && (newParams.search !== undefined || Object.keys(newParams).some(k => !['page', 'pageSize', 'sortBy', 'sortOrder'].includes(k)))) {
      currentParams.page = '1';
    }

    setSearchParams(currentParams);
  };

  return {
    params: {
      page,
      pageSize,
      search,
      sortBy,
      sortOrder,
      ...getCustomFilters(),
    },
    updateTableParams,
  };
}
