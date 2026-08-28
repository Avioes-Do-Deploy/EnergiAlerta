// Patch pós-geração do prisma-zod-generator (quirk conhecido — ver PLAN.md):
// os schemas findMany/findFirst/findFirstOrThrow importam
// objects/<Model>CountOutputTypeArgs.schema com a 1ª letra em MINÚSCULO (tanto no
// path quanto no símbolo <model>CountOutputTypeArgsObjectSchema), mas o gerador
// emite o arquivo e o símbolo com MAIÚSCULA. Em FS case-sensitive (Linux) isso
// quebra o `tsc`. Este script normaliza importações/símbolos para maiúscula.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const schemasDir = 'src/generated/zod/schemas'

if (!existsSync(schemasDir)) process.exit(0)

const reImportPath = /(\.\/objects\/)([a-z][A-Za-z]*CountOutputTypeArgs\.schema)/g
const reSymbol = /([a-z][A-Za-z]*CountOutputTypeArgsObjectSchema)/g

let patched = 0
for (const file of readdirSync(schemasDir)) {
  if (!file.endsWith('.schema.ts')) continue
  const p = join(schemasDir, file)
  const src = readFileSync(p, 'utf8')
  const next = src
    .replace(reImportPath, (_m, prefix, name) => prefix + name.charAt(0).toUpperCase() + name.slice(1))
    .replace(reSymbol, (m) => m.charAt(0).toUpperCase() + m.slice(1))
  if (next !== src) {
    writeFileSync(p, next)
    patched++
  }
}
console.log(`patched zod files: ${patched}`)