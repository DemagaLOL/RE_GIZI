/** State form dasbor untuk `useActionState`. */
export type DashboardFormState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; message: string }
