import { z } from 'zod'

export const segmentoSchema = z.enum(['COMERCIO', 'ENSINO', 'INSTITUICAO'])

export const createUnitSchema = z.object({
  nome: z.string().min(1).max(120),
  segmento: segmentoSchema,
  areaM2: z.number().positive().optional(),
  horarioFuncionamento: z.string().max(200).optional(),
  faixaConsumo: z.string().max(50).optional(),
}).strict()

export const updateAnomalyStatusSchema = z.object({
  status: z.enum(['RESOLVIDA', 'FALSO_POSITIVO']),
}).strict()

export const unitIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export const anomalyIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export type CreateUnitDTO = z.infer<typeof createUnitSchema>
export type UpdateAnomalyStatusDTO = z.infer<typeof updateAnomalyStatusSchema>