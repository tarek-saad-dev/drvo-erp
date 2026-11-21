'use strict';

/** Shared Pilot Owner action set — must match SQL040 + disposable seed. */
const PILOT_OWNER_MODULE_ACTIONS = Object.freeze([
  'branch.read',
  'users.read',
  'users.assign_role',
  'customers.read',
  'customers.manage',
  'catalog.read',
  'catalog.manage',
  'booking.read',
  'booking.manage',
  'hr.read',
  'hr.manage',
  'salon.barber.manage',
  'pos.draft.read',
  'pos.draft.manage',
  'inventory.read',
]);

const PILOT_API_FLAGS = Object.freeze([
  'DRVO_K5_AUTH_ENABLED',
  'DRVO_CATALOG_ENABLED',
  'DRVO_CUSTOMERS_ENABLED',
  'DRVO_BOOKING_ENABLED',
  'DRVO_POS_PREVIEW_ENABLED',
  'DRVO_POS_DRAFTS_ENABLED',
  'DRVO_POS_RICH_ENABLED',
  'DRVO_HR_ENABLED',
  'DRVO_INVENTORY_ENABLED',
]);

const PILOT_WEB_FLAGS = Object.freeze([
  'DRVO_K5_WEB_ENABLED',
  'DRVO_CATALOG_WEB_ENABLED',
  'DRVO_CUSTOMERS_WEB_ENABLED',
  'DRVO_BOOKING_WEB_ENABLED',
  'DRVO_POS_PREVIEW_WEB_ENABLED',
  'DRVO_POS_DRAFTS_WEB_ENABLED',
  'DRVO_POS_RICH_WEB_ENABLED',
  'DRVO_HR_WEB_ENABLED',
  'DRVO_INVENTORY_WEB_ENABLED',
]);

function buildOwnerPilotPermissionPlan() {
  return Object.freeze({
    schema: 'drvo.pilot.owner-module-permissions.v1',
    migration: '040_owner_pilot_module_permissions.sql',
    procedure: 'core.EnsureOwnerPilotModulePermissions',
    claimProcedure: 'core.ClaimApprovedOwner',
    actions: PILOT_OWNER_MODULE_ACTIONS,
    apiFlagsRequiredYes: PILOT_API_FLAGS,
    webFlagsRequiredYes: PILOT_WEB_FLAGS,
    adr031Posting: 'BLOCKED',
    cutLiveImport: 'BLOCKED',
    productionVerificationClaimed: false,
    note:
      'New Owner claims receive Pilot actions via SQL040 ClaimApprovedOwner. Existing Owners need EnsureOwnerPilotModulePermissions once after migrate.',
  });
}

module.exports = {
  PILOT_OWNER_MODULE_ACTIONS,
  PILOT_API_FLAGS,
  PILOT_WEB_FLAGS,
  buildOwnerPilotPermissionPlan,
};
