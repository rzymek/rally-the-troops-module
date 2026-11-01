/** The role after `active`, going round the table. */
export function nextActiveRole(active: number, roleCount: number): number {
  return (active + 1) % roleCount
}
