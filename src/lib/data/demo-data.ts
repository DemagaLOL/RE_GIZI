import { eq, inArray, like } from "drizzle-orm"
import type { Tx } from "./db/client"
import { fromBatch, fromCategoryEvent, fromClaim, fromDisposal } from "./db/mappers"
import * as schema from "./db/schema"
import { convertQuantity } from "./degradation"
import { recipientClaimCap } from "./claim-rules"
import { DEMO_HISTORY_DAYS, SAFE_WINDOW_HOURS } from "./constants"
import { startOfWibDay, wibDate } from "./report-core"
import type {
  CategoryEvent,
  Claim,
  DataResult,
  Disposal,
  QuantityUnit,
  SurplusBatch,
  SurplusCategory,
} from "./types"

/**
 * Riwayat contoh untuk menguji statistik, grafik, dan laporan: beberapa hari ke belakang
 * dari jam aplikasi, sampai kemarin agar tidak ada data di masa depan. Semua batch sudah
 * berstatus akhir (selesai atau diangkut), jadi degradasi otomatis tidak mengubahnya. Isinya
 * tetap (bukan acak) dan semua ID berawalan `demo-`, sehingga bisa diisi ulang atau dihapus
 * tanpa menyentuh data lain.
 */

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
const ID_PREFIX = "demo-"
/** Hari Minggu dilewati: dapur MBG tidak memasak, jadi grafik punya hari kosong yang wajar. */
const SUNDAY = 0
const RECIPIENTS = ["rcp-umkm", "rcp-warga", "rcp-peternak", "rcp-petani", "rcp-komposter"]
const TPS_ID = "tps-01"

const MENUS_A = [
  "Nasi, ayam suwir kecap, tumis buncis",
  "Nasi, telur balado, sayur sop",
  "Nasi, tempe orek, capcay",
  "Nasi, ikan goreng, tumis kangkung",
]
const MENUS_B = ["Sisa nasi dan sayur", "Sisa lauk dan nasi", "Kulit dan potongan sayur"]
const MENUS_C = ["Sisa sayur dan buah", "Kulit buah dan ampas sayur"]
const MENUS_D = ["Sisa makanan basi", "Sisa kuah dan makanan rusak"]

/** Seluruh baris riwayat contoh. */
export type DemoHistory = {
  batches: SurplusBatch[]
  claims: Claim[]
  events: CategoryEvent[]
  disposals: Disposal[]
}

const iso = (ms: number) => new Date(ms).toISOString()

/** Klaim yang sudah diambil pada `pickedUpAt`; diklaim 30 menit sebelumnya. */
function pickedUpClaim(
  id: string,
  batch: Pick<SurplusBatch, "id">,
  recipientId: string,
  category: SurplusCategory,
  unit: QuantityUnit,
  quantity: number,
  pickedUpAt: number
): Claim {
  return {
    id,
    batchId: batch.id,
    recipientId,
    category,
    unit,
    quantity,
    status: "picked_up",
    pickupCode: `${id}-code`,
    claimedAt: iso(pickedUpAt - HOUR / 2),
    pickupDeadline: iso(pickedUpAt + HOUR / 2),
    pickedUpAt: iso(pickedUpAt),
  }
}

/** Bangun riwayat contoh yang berakhir kemarin menurut jam aplikasi `now`. */
export function buildDemoHistory(sppgId: string, now: number): DemoHistory {
  const history: DemoHistory = { batches: [], claims: [], events: [], disposals: [] }
  const today = startOfWibDay(wibDate(now))

  /** Batch berstatus akhir dengan sisa 0. */
  const addBatch = (
    id: string,
    category: SurplusCategory,
    unit: QuantityUnit,
    quantity: number,
    menu: string,
    cookedAt: number,
    createdAt: number
  ): SurplusBatch => {
    const batch: SurplusBatch = {
      id,
      sppgId,
      menu,
      category,
      unit,
      quantity,
      remainingQuantity: 0,
      foodType: "cooked",
      cookedAt: iso(cookedAt),
      safeUntil: iso(category === "D" ? cookedAt : cookedAt + SAFE_WINDOW_HOURS[category] * HOUR),
      status: category === "D" ? "collected" : "completed",
      createdAt: iso(createdAt),
    }
    history.batches.push(batch)
    return batch
  }

  for (let offset = DEMO_HISTORY_DAYS; offset >= 1; offset -= 1) {
    const day = today - offset * DAY
    if (new Date(Date.parse(`${wibDate(day)}T00:00:00Z`)).getUTCDay() === SUNDAY) continue
    const at = (hour: number) => day + hour * HOUR
    const n = DEMO_HISTORY_DAYS - offset
    const key = `${ID_PREFIX}${offset}`
    const portions = 60 + (n * 17) % 50
    const menuA = MENUS_A[n % MENUS_A.length]

    if (n % 3 === 2) {
      // Sebagian diambil saat kategori A, sisanya turun ke B lalu diambil peternak.
      const cooked = at(10)
      const picked = Math.floor(portions * 0.4)
      const left = portions - picked
      const kg = convertQuantity(left, "porsi", "kg")
      const batch = addBatch(`${key}-a`, "B", "kg", kg, menuA, cooked, at(11))
      history.claims.push(
        pickedUpClaim(`${key}-a1`, batch, "rcp-umkm", "A", "porsi", picked, at(12)),
        pickedUpClaim(`${key}-a2`, batch, "rcp-peternak", "B", "kg", kg, at(16))
      )
      history.events.push({
        id: `${key}-ev`,
        batchId: batch.id,
        fromCategory: "A",
        toCategory: "B",
        quantityBefore: left,
        unitBefore: "porsi",
        quantityAfter: kg,
        unitAfter: "kg",
        reason: "auto",
        occurredAt: iso(cooked + SAFE_WINDOW_HOURS.A * HOUR),
      })
    } else {
      const batch = addBatch(`${key}-a`, "A", "porsi", portions, menuA, at(10), at(11))
      const first = recipientClaimCap("A", portions)
      history.claims.push(
        pickedUpClaim(`${key}-a1`, batch, "rcp-umkm", "A", "porsi", first, at(12)),
        pickedUpClaim(`${key}-a2`, batch, "rcp-warga", "A", "porsi", portions - first, at(13))
      )
    }

    const kgB = 6 + ((n * 7) % 13) / 2
    const batchB = addBatch(`${key}-b`, "B", "kg", kgB, MENUS_B[n % MENUS_B.length], at(6), at(12))
    history.claims.push(pickedUpClaim(`${key}-b1`, batchB, "rcp-peternak", "B", "kg", kgB, at(14)))

    if (n % 2 === 0) {
      const kgC = 4 + ((n * 5) % 9) / 2
      const menu = MENUS_C[(n / 2) % MENUS_C.length]
      const batchC = addBatch(`${key}-c`, "C", "kg", kgC, menu, at(-18), at(9))
      const recipient = n % 4 === 0 ? "rcp-petani" : "rcp-komposter"
      history.claims.push(pickedUpClaim(`${key}-c1`, batchC, recipient, "C", "kg", kgC, at(15)))
    }

    if (n % 3 === 0) {
      const kgD = 1.5 + n % 5
      const batchD = addBatch(`${key}-d`, "D", "kg", kgD, MENUS_D[n % MENUS_D.length], at(-20), at(13))
      history.disposals.push({
        id: `${key}-d1`,
        batchId: batchD.id,
        tpsId: TPS_ID,
        quantity: kgD,
        collectedAt: iso(at(17)),
        note: "Contoh pengangkutan",
      })
    }
  }
  return history
}

/** Hapus riwayat contoh, di dalam transaksi `tx`. Data lain tidak tersentuh. */
export function removeDemoHistory(tx: Tx): void {
  const batchIds = tx
    .select({ id: schema.batches.id })
    .from(schema.batches)
    .where(like(schema.batches.id, `${ID_PREFIX}%`))
    .all()
    .map((b) => b.id)
  if (batchIds.length === 0) return
  // Urutan mengikuti foreign key: anak dulu, induk belakangan.
  tx.delete(schema.batchCategoryEvents).where(inArray(schema.batchCategoryEvents.batchId, batchIds)).run()
  tx.delete(schema.disposals).where(inArray(schema.disposals.batchId, batchIds)).run()
  tx.delete(schema.claims).where(inArray(schema.claims.batchId, batchIds)).run()
  tx.delete(schema.batches).where(inArray(schema.batches.id, batchIds)).run()
}

/**
 * Ganti riwayat contoh dengan yang baru, di dalam transaksi `tx`. Membutuhkan akun contoh
 * (penerima dan TPS) dari seed.
 * @param now Epoch ms waktu aplikasi; riwayat berakhir sehari sebelumnya.
 * @returns Jumlah batch yang dibuat.
 */
export function applyDemoHistory(tx: Tx, sppgId: string, now: number): DataResult<number> {
  const recipients = tx
    .select({ id: schema.recipients.id })
    .from(schema.recipients)
    .where(inArray(schema.recipients.id, RECIPIENTS))
    .all()
  const tps = tx.select({ id: schema.tps.id }).from(schema.tps).where(eq(schema.tps.id, TPS_ID)).get()
  if (recipients.length < RECIPIENTS.length || !tps) {
    return { ok: false, error: "Akun contoh tidak lengkap. Reset data demo terlebih dahulu." }
  }

  removeDemoHistory(tx)
  const { batches, claims, events, disposals } = buildDemoHistory(sppgId, now)
  tx.insert(schema.batches).values(batches.map(fromBatch)).run()
  tx.insert(schema.claims).values(claims.map(fromClaim)).run()
  if (events.length > 0) {
    tx.insert(schema.batchCategoryEvents).values(events.map(fromCategoryEvent)).run()
  }
  if (disposals.length > 0) tx.insert(schema.disposals).values(disposals.map(fromDisposal)).run()
  return { ok: true, data: batches.length }
}
