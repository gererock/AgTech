export const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Administrador" },
  { value: "DRIVER", label: "Conductor" },
  { value: "MACHINE_OPERATOR", label: "Operador de maquina" }
] as const;

const roleLabels = Object.fromEntries(
  ROLE_OPTIONS.map((option) => [option.value, option.label])
) as Record<string, string>;

export function getRoleLabel(role: string | null | undefined) {
  if (!role) {
    return "Sin rol";
  }

  return roleLabels[role] ?? role;
}
