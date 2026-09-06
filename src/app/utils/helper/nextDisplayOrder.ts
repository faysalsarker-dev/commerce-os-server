type CountableModel = {
  count: (...args: any[]) => Promise<number> | number;
};

export const getNextDisplayOrder = async (
  model: CountableModel,
  startAt: number = 1,
): Promise<number> => {
  const totalCount = await model.count();
  return Number(totalCount) + startAt;
};
