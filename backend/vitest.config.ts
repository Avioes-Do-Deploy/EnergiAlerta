import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    server: {
      deps: {
        // @fastify/autoload faz import() dinâmico de arquivos .ts em runtime;
        // inline faz esses imports passarem pelo module runner do Vitest.
        inline: [/@fastify\/autoload/],
      },
    },
  },
})