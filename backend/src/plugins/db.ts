import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
// =========== DESCOMENTE PARA POSTRGRESQL ===========
// import { Pool } from "pg";

// const pool = new Pool({ connectionString: process.env.DATABASE_URL })
// const adapter = new PrismaPg(pool)
// =========== DESCOMENTE PARA POSTRGRESQL ===========

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! })
const db = new PrismaClient({ adapter })

export default db
