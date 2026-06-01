// utils/query.util.js


export const buildQuery = (query, allowedFields = []) => {
  const filter = {};


  if (query.filter) {
    const filters = query.filter.split(",");

    filters.forEach(f => {
      const [field, value] = f.split(":");

      if (allowedFields.includes(field) && value) {
        filter[field] = { $regex: value, $options: "i" };
      }
    });
  }

 
  if (query.advanced) {
    const ops = query.advanced.split(",");

    ops.forEach(op => {
      const match = op.match(/(\w+)(>=|<=|>|<)(.+)/);

      if (!match) return;

      const [, field, operator, value] = match;

      if (!allowedFields.includes(field)) return;

      if (!filter[field]) filter[field] = {};

      const mongoOp = {
        ">": "$gt",
        "<": "$lt",
        ">=": "$gte",
        "<=": "$lte"
      }[operator];

      filter[field][mongoOp] = isNaN(value) ? value : Number(value);
    });
  }

  return filter;
};


// 🔹 Pagination
export const buildPagination = (query) => {
  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = Math.min(parseInt(query.limit) || 20, 100);

  return {
    page,
    limit,
    skip: (page - 1) * limit
  };
};


// 🔹 Sorting
export const buildSort = (query, allowedFields = []) => {
  let sort = { createdAt: -1 };

  if (query.sort) {
    const field = query.sort.replace("-", "");
    const order = query.sort.startsWith("-") ? -1 : 1;

    if (allowedFields.includes(field)) {
      sort = { [field]: order };
    }
  }

  return sort;
};