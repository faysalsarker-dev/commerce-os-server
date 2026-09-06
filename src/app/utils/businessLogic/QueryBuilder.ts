
const normalizeFilterValue = (key: string, value: any) => {
  if (typeof value !== "string") return value;

  const lowerValue = value.trim().toLowerCase();

  if (key === "isActive") {
    if (lowerValue === "true") return true;
    if (lowerValue === "false") return false;
  }

  if (/[\d.]+/.test(lowerValue) && !Number.isNaN(Number(value))) {
    return Number(value);
  }

  return value;
};

export const buildPrismaQuery = <T>(
  query: Record<string, any>,
  searchableFields: string[]
) => {
  const { searchTerm, page, limit, sortBy, sortOrder, ...filterData } = query;

  const queryObj: any = { where: {} };

  // 1. Searching (Dynamic fields like name, email, etc.)
  if (searchTerm) {
    queryObj.where.OR = searchableFields.map((field) => ({
      [field]: {
        contains: searchTerm,
        mode: "insensitive",
      },
    }));
  }

  // 2. Filtering (Exact matches for everything else)
  if (Object.keys(filterData).length > 0) {
    queryObj.where.AND = Object.keys(filterData).map((key) => ({
      [key]: normalizeFilterValue(key, filterData[key]),
    }));
  }

  // 3. Sorting
  const sortField = sortBy || "createdAt";
  const order = sortOrder || "desc";
  queryObj.orderBy = { [sortField]: order };

  // 4. Pagination
  const pageNumber = Number(page) || 1;
  const limitNumber = Number(limit) || 10;
  const skip = (pageNumber - 1) * limitNumber;

  return {
    where: queryObj.where,
    orderBy: queryObj.orderBy,
    skip,
    take: limitNumber,
    page: pageNumber,
  };
};