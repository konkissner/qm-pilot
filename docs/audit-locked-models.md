# Audit-pflichtige Modelle — kein generisches CRUD

ZenStack-Mutationen (`create` / `update` / `delete`) sind für die folgenden Modelle **nicht** freigeschaltet. Änderungen laufen ausschließlich über auditierte Service-Endpoints in derselben DB-Transaktion mit `AuditEvent`.

| Modell | Service | Audit-Aktionen |
|--------|---------|----------------|
| `User` | `src/lib/services/users.ts` | `user.created`, `user.updated`, `user.retired`, `user.roleAssigned`, `user.roleRemoved` |
| `RoleRight` | `src/lib/services/users.ts` | `role.rightChanged` |
| `UserRight` | `src/lib/services/users.ts` | `user.rightChanged` |
| `TenantConfig` | `src/lib/services/tenant-config.ts` | `tenantConfig.changed` |
| `AuditorInvite` | `src/lib/services/auditor-invites.ts` | `auditorInvite.created` |
| `Signature` | `src/lib/audit/signature.ts` | `signature.created`, `signature.reAuthFailed` |

`AuditEvent` selbst ist append-only (DB-GRANTs + Trigger). Lesen über `src/lib/audit/query.ts` mit Rollenprüfung (`canViewAuditTrail`).
