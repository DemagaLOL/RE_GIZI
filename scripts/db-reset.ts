import { DATABASE_PATH, openDatabase } from "../src/lib/data/db/client"
import { resetDatabase } from "../src/lib/data/seed"

/**
 * Kosongkan database lokal lalu isi ulang data seed (akun demo, tanpa sisa makanan).
 * Bisa dijalankan saat `npm run dev` menyala — file tidak dihapus, hanya isinya.
 */
const db = openDatabase()
resetDatabase(db, Date.now())
db.$client.close()
console.log(`Database dikosongkan & diisi ulang dengan akun demo: ${DATABASE_PATH}`)
