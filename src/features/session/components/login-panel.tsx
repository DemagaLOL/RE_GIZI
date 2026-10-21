import { DEMO_PASSWORD, getDemoAccounts } from "@/lib/data"
import { LoginForm } from "./login-form"

/**
 * Form masuk beserta akun contoh dari data layer (hanya dalam mode demo; di luar itu
 * daftar kosong dan kata sandi contoh tidak dikirim ke browser). Render di dalam `<Suspense>`.
 */
export async function LoginPanel() {
  const demoAccounts = await getDemoAccounts()
  return (
    <LoginForm
      demoAccounts={demoAccounts}
      demoPassword={demoAccounts.length > 0 ? DEMO_PASSWORD : ""}
    />
  )
}
