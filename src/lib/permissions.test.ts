import { describe, expect, it } from 'vitest';
import { assertInputRight, canAssignRole, canSeeModule, getEffectivePermissions, hasInputRight, INPUT_RIGHT_KEYS, isReadOnly, MODULE_KEYS, PermissionForbiddenError, ROLE_DEFAULTS, ROLE_KEYS, type ModuleKey, type RoleKey } from './permissions';

const permFor = (roleKeys: RoleKey[], roleRights: Parameters<typeof getEffectivePermissions>[1] = [], userRights: Parameters<typeof getEffectivePermissions>[2] = [], invite?: Parameters<typeof getEffectivePermissions>[3]) => getEffectivePermissions({ roleKeys }, roleRights, userRights, invite);
const mods = (p: ReturnType<typeof getEffectivePermissions>) => MODULE_KEYS.filter((m) => p.modules.has(m));
const ins = (p: ReturnType<typeof getEffectivePermissions>) => INPUT_RIGHT_KEYS.filter((i) => p.inputs.has(i));

describe('ROLE_DEFAULTS matrix snapshot (R-001)', () => {
  const expectedModules: Record<RoleKey, ModuleKey[]> = { gl:[...MODULE_KEYS], rp:[...MODULE_KEYS], qmb:MODULE_KEYS.filter(m=>m!=='system'), deputyRp:MODULE_KEYS.filter(m=>m!=='users'&&m!=='system'), deputyQmb:MODULE_KEYS.filter(m=>m!=='users'&&m!=='system'), warehouse:['cockpit','tasks','documents','suppliers','serviceProviders','inventory','temperature','trainings','capa'], service:['cockpit','tasks','documents','suppliers','serviceProviders','trainings','capa'], external:['tasks','documents','trainings'], auditor:MODULE_KEYS.filter(m=>m!=='users'&&m!=='system'), admin:['users','system'] };
  const expectedInputs: Record<RoleKey, string[]> = { gl:INPUT_RIGHT_KEYS.filter(i=>i!=='signReports'), rp:[...INPUT_RIGHT_KEYS], qmb:INPUT_RIGHT_KEYS.filter(i=>i!=='manageSystem'&&i!=='signReports'), deputyRp:['createAssignTasks','reviewApproveDocuments','approveSuppliersInventory','recordCapa','closeCapa','signReports'], deputyQmb:['createAssignTasks','reviewApproveDocuments','approveSuppliersInventory','recordCapa','closeCapa','manageTrainings'], warehouse:['recordCapa'], service:['recordCapa'], external:[], auditor:[], admin:['manageUsers','manageSystem'] };
  for (const roleKey of ROLE_KEYS) {
    it(`role ${roleKey} modules`, () => expect([...ROLE_DEFAULTS[roleKey].modules].sort()).toEqual([...expectedModules[roleKey]].sort()));
    it(`role ${roleKey} inputs`, () => expect([...ROLE_DEFAULTS[roleKey].inputs].sort()).toEqual([...expectedInputs[roleKey]].sort()));
  }
  it('unknown role => 0', () => { const p = permFor(['unknown' as RoleKey]); expect(p.modules.size).toBe(0); expect(p.inputs.size).toBe(0); });
  it('empty roles => 0', () => { const p = permFor([]); expect(p.modules.size).toBe(0); expect(p.inputs.size).toBe(0); });
});
describe('multi-role union', () => {
  it('Lena rp+qmb', () => { const p = permFor(['rp','qmb']); expect(mods(p)).toHaveLength(13); expect(ins(p)).toHaveLength(9); });
  it('Sara deputyRp+deputyQmb', () => { const p = permFor(['deputyRp','deputyQmb']); expect(mods(p)).toHaveLength(11); expect(ins(p).sort()).toEqual(['createAssignTasks','reviewApproveDocuments','approveSuppliersInventory','recordCapa','closeCapa','manageTrainings','signReports'].sort()); });
  it('Jana warehouse', () => { const p = permFor(['warehouse']); expect(mods(p)).toHaveLength(9); expect(ins(p)).toEqual(['recordCapa']); });
  it('external', () => { const p = permFor(['external']); expect(mods(p).sort()).toEqual(['documents','tasks','trainings']); expect(ins(p)).toHaveLength(0); });
  it('auditor', () => { const p = permFor(['auditor']); expect(mods(p)).toHaveLength(11); expect(p.readOnly).toBe(true); });
  it('admin', () => { const p = permFor(['admin']); expect(mods(p).sort()).toEqual(['system','users']); expect(ins(p).sort()).toEqual(['manageSystem','manageUsers']); });
});
describe('overrides', () => {
  it('RoleRight warehouse kpi', () => expect(canSeeModule(permFor(['warehouse'],[{roleKey:'warehouse',kind:'module',rightKey:'kpi',allowed:true}]),'kpi')).toBe(true));
  it('UserRight beats RoleRight', () => expect(canSeeModule(permFor(['warehouse'],[{roleKey:'warehouse',kind:'module',rightKey:'kpi',allowed:true}],[{kind:'module',rightKey:'kpi',allowed:false}]),'kpi')).toBe(false));
  it('auditor invite intersection', () => expect(mods(permFor(['auditor'],[],[],{visibleModules:['documents','suppliers']})).sort()).toEqual(['documents','suppliers']));
});
describe('hard guards', () => {
  it('auditor readOnly override', () => { const p = permFor(['auditor'],[{roleKey:'auditor',kind:'input',rightKey:'manageUsers',allowed:true}]); expect(isReadOnly({roleKeys:['auditor']})).toBe(true); expect(hasInputRight(p,'manageUsers')).toBe(false); expect(()=>assertInputRight(p,'manageUsers')).toThrow(PermissionForbiddenError); });
  it('admin no QM override', () => expect(canSeeModule(permFor(['admin'],[{roleKey:'admin',kind:'module',rightKey:'cockpit',allowed:true}]),'cockpit')).toBe(false));
  it('assertInputRight 403', () => expect(()=>assertInputRight(permFor(['external']),'manageUsers')).toThrow(PermissionForbiddenError));
});
describe('canAssignRole', () => {
  it('GL rp', () => expect(canAssignRole({roleKeys:['gl']},'rp')).toBe(true));
  it('QMB warehouse not rp', () => { expect(canAssignRole({roleKeys:['qmb']},'warehouse')).toBe(true); expect(canAssignRole({roleKeys:['qmb']},'rp')).toBe(false); });
});
