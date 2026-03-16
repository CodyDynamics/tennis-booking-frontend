"use client";

import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/lib/auth-store";
import { useRolesList, usePermissionsSchema, useUpdateRolePermissions } from "@/lib/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";
import type { PermissionSchemaItem } from "@/lib/api/endpoints/roles";

function parsePermissions(permissions: string | null | undefined): string[] {
  if (!permissions || typeof permissions !== "string") return [];
  return permissions
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
}

function can(permissions: string[] | undefined, permission: string, role: string) {
  return role === "admin" || (permissions?.includes(permission) ?? false);
}

export default function AdminRolesPage() {
  const { user } = useAuth();
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const { data: roles = [], isLoading: rolesLoading } = useRolesList();
  const { data: schema = [], isLoading: schemaLoading } = usePermissionsSchema();
  const updatePermissions = useUpdateRolePermissions();

  const canUpdate = can(user?.permissions, "roles:update", user?.role ?? "");

  const selectedRole = useMemo(
    () => roles.find((r) => r.id === selectedRoleId),
    [roles, selectedRoleId]
  );

  const currentPerms = useMemo(() => {
    if (!selectedRole) return new Set<string>();
    return new Set(parsePermissions(selectedRole.permissions ?? undefined));
  }, [selectedRole]);

  const [localPerms, setLocalPerms] = useState<Set<string>>(new Set());
  const [saveFeedbackUntil, setSaveFeedbackUntil] = useState<number>(0);

  // Sync localPerms only when user switches role — do NOT sync when refetch updates selectedRole.permissions
  // (that would overwrite local unsaved changes after a save and make the Save button incorrectly disabled)
  useEffect(() => {
    setLocalPerms(new Set(currentPerms));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoleId]);

  const isDirty = useMemo(() => {
    if (currentPerms.size !== localPerms.size) return true;
    const curr = Array.from(currentPerms);
    for (const p of curr) {
      if (!localPerms.has(p)) return true;
    }
    const loc = Array.from(localPerms);
    for (const p of loc) {
      if (!currentPerms.has(p)) return true;
    }
    return false;
  }, [currentPerms, localPerms]);

  const handleSelectRole = (roleId: string) => {
    const role = roles.find((r) => r.id === roleId);
    setSelectedRoleId(roleId);
    setLocalPerms(
      role ? new Set(parsePermissions(role.permissions ?? undefined)) : new Set()
    );
  };

  const togglePermission = (code: string) => {
    setLocalPerms((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedRoleId) return;
    const minLoadingMs = 400;
    const start = Date.now();
    try {
      await updatePermissions.mutateAsync({
        roleId: selectedRoleId,
        permissions: Array.from(localPerms),
      });
      setSaveFeedbackUntil(Date.now() + minLoadingMs);
    } finally {
      const elapsed = Date.now() - start;
      if (elapsed >= minLoadingMs) {
        setSaveFeedbackUntil(0);
      } else {
        setTimeout(() => setSaveFeedbackUntil(0), minLoadingMs - elapsed);
      }
    }
  };

  const showSaveLoading = updatePermissions.isPending || Date.now() < saveFeedbackUntil;

  const allActions = useMemo(() => {
    const set = new Set<string>();
    schema.forEach((s) => s.actions.forEach((a) => set.add(a)));
    return Array.from(set);
  }, [schema]);

  const hasAction = (item: PermissionSchemaItem, action: string) =>
    item.actions.includes(action as typeof item.actions[number]);

  const isLoading = rolesLoading || schemaLoading;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Roles & Permissions</h1>
      <p className="text-muted-foreground">
        Assign permissions to each role. Permissions control which pages and actions (view, create, update, delete) each role can access.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Select role</CardTitle>
          <CardDescription>Choose a role to edit its permissions (RBAC)</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedRoleId} onValueChange={handleSelectRole}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : selectedRoleId && schema.length > 0 ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Permissions for {selectedRole?.name ?? "role"}</CardTitle>
              <CardDescription>
                Check the actions this role can perform per resource (page).
              </CardDescription>
            </div>
            {canUpdate && (
              <Button
                onClick={handleSave}
                disabled={!isDirty || showSaveLoading}
                aria-busy={showSaveLoading}
              >
                {showSaveLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </>
                )}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">Resource (Page)</th>
                    {allActions.map((action) => (
                      <th key={action} className="text-left py-3 px-2 font-medium capitalize">
                        {action}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {schema.map((item: PermissionSchemaItem) => (
                    <tr key={item.resource} className="border-b last:border-0">
                      <td className="py-3 px-2 font-medium">{item.label}</td>
                      {allActions.map((action) => {
                        if (!hasAction(item, action)) {
                          return <td key={`${item.resource}-${action}`} className="py-3 px-2 text-muted-foreground">—</td>;
                        }
                        const code = `${item.resource}:${action}`;
                        const checked = localPerms.has(code);
                        return (
                          <td key={code} className="py-3 px-2">
                            <Checkbox
                              checked={checked}
                              disabled={!canUpdate}
                              onCheckedChange={() => canUpdate && togglePermission(code)}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : selectedRoleId && schema.length === 0 ? (
        <p className="text-muted-foreground">No permission schema available.</p>
      ) : null}
    </div>
  );
}
