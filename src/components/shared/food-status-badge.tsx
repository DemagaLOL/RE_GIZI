import * as React from "react"
import { Beef, Sprout, Trash2, Utensils, type LucideIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { CATEGORY_LABEL } from "@/lib/data/constants"
import type { SurplusCategory } from "@/lib/data/types"

const CATEGORY_STYLE: Record<
  SurplusCategory,
  { icon: LucideIcon; variant: "rescue" | "feed" | "compost" | "discard" }
> = {
  A: { icon: Utensils, variant: "rescue" },
  B: { icon: Beef, variant: "feed" },
  C: { icon: Sprout, variant: "compost" },
  D: { icon: Trash2, variant: "discard" },
}

/** Badge kategori sisa makanan (A Layak/B Pakan/C Kompos/D Dibuang) dengan ikon dan warna token. */
function FoodStatusBadge({
  category,
  ...props
}: Omit<React.ComponentProps<typeof Badge>, "variant" | "children"> & {
  category: SurplusCategory
}) {
  const { icon: Icon, variant } = CATEGORY_STYLE[category]

  return (
    <Badge variant={variant} {...props}>
      <Icon data-icon="inline-start" aria-hidden />
      {category} · {CATEGORY_LABEL[category]}
    </Badge>
  )
}

export { FoodStatusBadge }
