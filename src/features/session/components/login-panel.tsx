import { DEMO_PASSWORD, getDemoAccounts } from "@/lib/data"
import { LoginForm } from "./login-form"

/** Form masuk beserta akun contoh dari data layer. Render di dalam `<Suspense>`. */
export async function LoginPanel() {
  const demoAccounts = await getDemoAccounts()
  return <LoginForm demoAccounts={demoAccounts} demoPassword={DEMO_PASSWORD} />
}
