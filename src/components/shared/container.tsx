import * as React from "react"
import { cn } from "@/lib/utils"

/** Pembungkus lebar halaman standar: maks. 6xl, gutter 16px di mobile dan 24px mulai `md`. */
function Container({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mx-auto w-full max-w-6xl px-4 md:px-6", className)}
      {...props}
    />
  )
}

export { Container }
