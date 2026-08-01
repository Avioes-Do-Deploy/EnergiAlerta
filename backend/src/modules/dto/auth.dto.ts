import { z } from 'zod'

export const signupSchema = z.object({
  name: z.string().min(3),
  email: z.email(),
  password: z
    .string()
    .min(8)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%&*^?.;])/),
}).strict()

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
}).strict()

export type SignupDTO = z.infer<typeof signupSchema>
export type LoginDTO = z.infer<typeof loginSchema>
