import type { Access, FieldAccess } from "payload";
import { hasRole } from "@/lib/auth/roles";

/**
 * Server-side access rules shared by every collection. Payload's default
 * lets ANY signed-in user create, update and delete, so every collection
 * must spell out all four operations with these helpers.
 */
export const anyone: Access = () => true;
export const nobody: Access = () => false;

export const owner: Access = ({ req }) => hasRole(req.user, "owner");
export const ownerOrManager: Access = ({ req }) =>
  hasRole(req.user, "owner", "manager");
export const anyStaff: Access = ({ req }) =>
  hasRole(req.user, "owner", "manager", "barista");

export const ownerField: FieldAccess = ({ req }) => hasRole(req.user, "owner");
export const hiddenField: FieldAccess = () => false;

/** Content anyone may read; owner or manager may edit; owner may delete. */
export const editorialAccess = {
  read: anyone,
  create: ownerOrManager,
  update: ownerOrManager,
  delete: owner,
};
