/** State form panel simulasi waktu untuk `useActionState`. */
export type ClockFormState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; message: string }
