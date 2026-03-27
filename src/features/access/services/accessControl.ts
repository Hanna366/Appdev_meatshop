import { permissionMatrix } from '../config/permissionMatrix';
import type { PermissionAction, UserRole } from '../types/accessTypes';
import type { FeatureFlag } from '../../subscription/types/subscriptionTypes';

export function hasPermission(role: UserRole | undefined, action: PermissionAction): boolean {
  if (!role) {
    return false;
  }

  return permissionMatrix[role].includes(action);
}

export function hasFeature(features: FeatureFlag[], feature: FeatureFlag): boolean {
  return features.includes(feature);
}
