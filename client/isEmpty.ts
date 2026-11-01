export function isEmpty<T>(arr: T[] | undefined): arr is undefined {
  return arr === undefined || arr.length === 0;
}