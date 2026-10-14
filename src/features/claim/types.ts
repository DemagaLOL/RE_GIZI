/** State form klaim untuk `useActionState`. */
export type ClaimFormState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; pickupCode: string; quantity: number }
