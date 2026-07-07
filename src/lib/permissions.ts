/** Central permission service — Berechtigungsmatrix v0.2. */
export const MODULE_KEYS = ['cockpit','tasks','documents','suppliers','serviceProviders','inventory','temperature','trainings','capa','kpi','reports','users','system'] as const;
export type ModuleKey = (typeof MODULE_KEYS)[number];
export const INPUT_RIGHT_KEYS = ['createAssignTasks','reviewApproveDocuments','approveSuppliersInventory','recordCapa','closeCapa','manageTrainings','signReports','manageUsers','manageSystem'] as const;
export type InputRightKey = (typeof INPUT_RIGHT_KEYS)[number];
export const ROLE_KEYS = ['gl','rp','qmb','deputyRp','deputyQmb','warehouse','service','external','auditor','admin'] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];
export const MODULE_LABELS: Record<ModuleKey, string> = { cockpit:'Cockpit',tasks:'Aufgaben',documents:'Dokumente',suppliers:'Lieferanten',serviceProviders:'Dienstleister',inventory:'Inventar',temperature:'Temperatur',trainings:'Schulungen',capa:'CAPA',kpi:'KPI',reports:'Berichte',users:'Benutzer & Rollen',system:'System & Backup' };
export const INPUT_RIGHT_LABELS: Record<InputRightKey, string> = { createAssignTasks:'Aufgaben anlegen / zuweisen',reviewApproveDocuments:'Dokumente prüfen / freigeben',approveSuppliersInventory:'Lieferanten / Inventar freigeben',recordCapa:'CAPA erfassen / bearbeiten',closeCapa:'CAPA abschließen (Wirksamkeitsprüfung)',manageTrainings:'Schulungen verwalten',signReports:'Berichte unterzeichnen',manageUsers:'Benutzer & Rollen verwalten',manageSystem:'System & Backup' };
export const ROLE_LABELS: Record<RoleKey, string> = { gl:'Geschäftsleitung (GL)',rp:'Verantwortliche Person (RP)',qmb:'QM-Beauftragte:r (QMB)',deputyRp:'Stellvertretende RP',deputyQmb:'Stellvertretende QMB',warehouse:'Lagercrew',service:'Servicecrew',external:'Externe:r (PIN-Zugang)',auditor:'Auditor (Lesezugriff)',admin:'Administrator (technisch)' };
const ALL_MODULES = [...MODULE_KEYS];
const ALL_INPUTS = [...INPUT_RIGHT_KEYS];
export const ROLE_DEFAULTS: Record<RoleKey, { modules: ModuleKey[]; inputs: InputRightKey[] }> = {
  gl: { modules: ALL_MODULES, inputs: ALL_INPUTS.filter((i) => i !== 'signReports') },
  rp: { modules: ALL_MODULES, inputs: ALL_INPUTS },
  qmb: { modules: ALL_MODULES.filter((m) => m !== 'system'), inputs: ALL_INPUTS.filter((i) => i !== 'manageSystem' && i !== 'signReports') },
  deputyRp: { modules: ALL_MODULES.filter((m) => m !== 'users' && m !== 'system'), inputs: ['createAssignTasks','reviewApproveDocuments','approveSuppliersInventory','recordCapa','closeCapa','signReports'] },
  deputyQmb: { modules: ALL_MODULES.filter((m) => m !== 'users' && m !== 'system'), inputs: ['createAssignTasks','reviewApproveDocuments','approveSuppliersInventory','recordCapa','closeCapa','manageTrainings'] },
  warehouse: { modules: ['cockpit','tasks','documents','suppliers','serviceProviders','inventory','temperature','trainings','capa'], inputs: ['recordCapa'] },
  service: { modules: ['cockpit','tasks','documents','suppliers','serviceProviders','trainings','capa'], inputs: ['recordCapa'] },
  external: { modules: ['tasks','documents','trainings'], inputs: [] },
  auditor: { modules: ALL_MODULES.filter((m) => m !== 'users' && m !== 'system'), inputs: [] },
  admin: { modules: ['users','system'], inputs: ['manageUsers','manageSystem'] },
};
export interface RoleRightRecord { roleKey: RoleKey; kind: 'module' | 'input'; rightKey: string; allowed: boolean }
export interface UserRightRecord { kind: 'module' | 'input'; rightKey: string; allowed: boolean }
export interface EffectivePermissions { modules: Set<ModuleKey>; inputs: Set<InputRightKey>; readOnly: boolean }
export interface PermissionUser { roleKeys: RoleKey[] }
export class PermissionForbiddenError extends Error { readonly status = 403; constructor(message = 'Keine Berechtigung für diese Aktion.') { super(message); this.name = 'PermissionForbiddenError'; } }
const isModuleKey = (k: string): k is ModuleKey => (MODULE_KEYS as readonly string[]).includes(k);
const isInputRightKey = (k: string): k is InputRightKey => (INPUT_RIGHT_KEYS as readonly string[]).includes(k);
const isKnownRoleKey = (k: string): k is RoleKey => (ROLE_KEYS as readonly string[]).includes(k);
function roleDefaultsFor(roleKey: RoleKey) { const d = ROLE_DEFAULTS[roleKey]; return { modules: new Set(d.modules), inputs: new Set(d.inputs) }; }
function applyRoleOverrides(roleKey: RoleKey, base: { modules: Set<ModuleKey>; inputs: Set<InputRightKey> }, roleRights: RoleRightRecord[]) {
  const modules = new Set(base.modules); const inputs = new Set(base.inputs);
  for (const o of roleRights) {
    if (o.roleKey !== roleKey) continue;
    if (o.kind === 'module' && isModuleKey(o.rightKey)) {
      if (o.allowed) modules.add(o.rightKey);
      else modules.delete(o.rightKey);
    }
    if (o.kind === 'input' && isInputRightKey(o.rightKey)) {
      if (o.allowed) inputs.add(o.rightKey);
      else inputs.delete(o.rightKey);
    }
  }
  return { modules, inputs };
}
function unionRolePermissions(roleKeys: RoleKey[], roleRights: RoleRightRecord[]) {
  const modules = new Set<ModuleKey>(); const inputs = new Set<InputRightKey>();
  for (const roleKey of roleKeys) { if (!isKnownRoleKey(roleKey)) continue; const eff = applyRoleOverrides(roleKey, roleDefaultsFor(roleKey), roleRights); for (const m of eff.modules) modules.add(m); for (const i of eff.inputs) inputs.add(i); }
  return { modules, inputs };
}
function applyUserRights(base: { modules: Set<ModuleKey>; inputs: Set<InputRightKey> }, userRights: UserRightRecord[]) {
  const modules = new Set(base.modules); const inputs = new Set(base.inputs);
  for (const o of userRights) {
    if (o.kind === 'module' && isModuleKey(o.rightKey)) {
      if (o.allowed) modules.add(o.rightKey);
      else modules.delete(o.rightKey);
    }
    if (o.kind === 'input' && isInputRightKey(o.rightKey)) {
      if (o.allowed) inputs.add(o.rightKey);
      else inputs.delete(o.rightKey);
    }
  }
  return { modules, inputs };
}
function applyAdminGuard(roleKeys: RoleKey[], modules: Set<ModuleKey>) {
  if (!roleKeys.includes('admin')) return modules;
  const adminModules: ModuleKey[] = ['users', 'system'];
  return new Set(adminModules.filter((m) => modules.has(m)));
}
export function isReadOnly(user: PermissionUser) { return user.roleKeys.includes('auditor'); }
export function getEffectivePermissions(user: PermissionUser, roleRights: RoleRightRecord[] = [], userRights: UserRightRecord[] = [], auditorInvite?: { visibleModules: ModuleKey[] } | null): EffectivePermissions {
  const knownRoles = user.roleKeys.filter(isKnownRoleKey);
  const withUserRights = applyUserRights(unionRolePermissions(knownRoles, roleRights), userRights);
  let modules = applyAdminGuard(knownRoles, withUserRights.modules);
  let inputs = new Set(withUserRights.inputs);
  if (isReadOnly(user)) inputs = new Set();
  if (auditorInvite?.visibleModules?.length) { const allowed = new Set(auditorInvite.visibleModules); modules = new Set([...modules].filter((m) => allowed.has(m))); }
  return { modules, inputs, readOnly: isReadOnly(user) };
}
export function canSeeModule(perm: EffectivePermissions, moduleKey: ModuleKey) { return perm.modules.has(moduleKey); }
export function hasInputRight(perm: EffectivePermissions, inputKey: InputRightKey) { return !perm.readOnly && perm.inputs.has(inputKey); }
export function assertInputRight(perm: EffectivePermissions, inputKey: InputRightKey) { if (!hasInputRight(perm, inputKey)) throw new PermissionForbiddenError(); }
export function canAssignRole(actor: PermissionUser, roleKey: RoleKey) { if (roleKey === 'rp' || roleKey === 'deputyRp') return actor.roleKeys.includes('gl'); return actor.roleKeys.some((r) => ROLE_DEFAULTS[r].inputs.includes('manageUsers')); }
export function hasManageUsers(perm: EffectivePermissions) { return hasInputRight(perm, 'manageUsers'); }
export function assertManageUsers(perm: EffectivePermissions) { assertInputRight(perm, 'manageUsers'); }
export function auditorDefaultVisibleModules(): ModuleKey[] { return [...ROLE_DEFAULTS.auditor.modules]; }

const AUDIT_VIEW_ROLES: RoleKey[] = ['gl', 'rp', 'qmb', 'auditor'];

export function canViewAuditTrail(user: PermissionUser): boolean {
  return user.roleKeys.some((role) => AUDIT_VIEW_ROLES.includes(role));
}
