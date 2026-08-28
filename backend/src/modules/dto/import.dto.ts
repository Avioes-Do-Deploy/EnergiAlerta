import { z } from 'zod'

export const bandeiraSchema = z.enum(['VERDE', 'AMARELA', 'VERMELHA_1', 'VERMELHA_2'])

// Linha do CSV (colunas: periodo,leitura_kwh,bandeira). Valores chegam como string.
export const linhaCSVSchema = z
  .object({
    periodo: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'periodo deve estar no formato AAAA-MM-DD')
      .refine(
        (p) => {
          const [y, m, d] = p.split('-').map(Number)
          const dt = new Date(Date.UTC(y, m - 1, d))
          return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
        },
        { message: 'periodo não é uma data válida' },
      ),
    leitura_kwh: z.preprocess(
      (v) => (typeof v === 'string' && v.trim() === '' ? NaN : v),
      z.coerce.number().finite().nonnegative('leitura_kwh deve ser um número ≥ 0'),
    ),
    bandeira: bandeiraSchema,
  })
  .strict()

export const importQuerySchema = z
  .object({
    preview: z.enum(['true', 'false']).optional(),
  })
  .strict()

export type LinhaCSV = z.infer<typeof linhaCSVSchema>