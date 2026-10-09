export const requireItem = <T>(item: T | undefined): T => {
  if (!item) throw new Error("The requested record was not found.");
  return item;
};
