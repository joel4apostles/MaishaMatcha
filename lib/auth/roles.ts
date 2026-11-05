/**
 * Staff roles. Owner: everything. Manager: menu, inventory, purchase orders,
 * reports (no owner settings, no staff admin). Barista: POS only.
 * Pure module so it can be unit tested and shared by Payload access rules
 * and the POS server actions.
 */
export const ROLES = ["owner", "manager", "barista"] as const;
export type Role = (typeof ROLES)[number];

type MaybeUser =
  | { role?: string | null; active?: boolean | null; collection?: string }
  | null
  | undefined;

export function isActiveStaff(user: MaybeUser): boolean {
  if (!user || user.active === false) return false;
  if (user.collection && user.collection !== "users") return false;
  return ROLES.includes(user.role as Role);
}

export function hasRole(user: MaybeUser, ...roles: Role[]): boolean {
  return isActiveStaff(user) && roles.includes(user!.role as Role);
}

/** Who may open the Payload back office at /admin. Baristas use the POS. */
export const canUseBackOffice = (user: MaybeUser) =>
  hasRole(user, "owner", "manager");
