// Seed do dataset demo: 3 personas (Marcos/Célia/Carlos), ~200 unidades,
// leituras diárias de 12 meses (gerador sintético) e anomalias injetadas rotuladas.
// Re-executável: limpa as tabelas antes de inserir (banco demo).
import 'dotenv/config'
import bcrypt from 'bcrypt'
import { gerarSerie, type Segmento } from './generator.js'
import { calcularBaselines, explicarAnomalia } from '../modules/detection.module.js'
import { severidadePara } from '../config/detection.js'

process.env.DATABASE_URL ??= 'file:./src/generated/example.db'
const { default: db } = await import('../database/prisma.js')

const SENHA_DEMO = 'Demo123!'

const PERSONAS = [
  { email: 'marcos@energialerta.dev', nome: 'Marcos (Comércio)', segmento: 'COMERCIO', unidades: 70 },
  { email: 'celia@energialerta.dev', nome: 'Célia (Ensino)', segmento: 'ENSINO', unidades: 70 },
  { email: 'carlos@energialerta.dev', nome: 'Carlos (Instituição)', segmento: 'INSTITUICAO', unidades: 60 },
] as const

const NOMES: Record<Segmento, string[]> = {
  COMERCIO: ['Padaria', 'Mercado', 'Restaurante', 'Farmácia', 'Barbearia', 'Cafeteria', 'Adega', 'Pet Shop', 'Boutique', 'Açougue'],
  ENSINO: ['Escola', 'Colégio', 'Creche', 'Escola Técnica', 'Centro de Idiomas', 'Instituto', 'Cursinho', 'Biblioteca Escolar'],
  INSTITUICAO: ['Prefeitura', 'UBS', 'Biblioteca', 'Centro Cultural', 'Ginásio', 'Secretaria de Saúde', 'CRAS', 'Mercado Municipal'],
}

const BAIRROS = ['Centro', 'Vila Nova', 'Jardim América', 'Santa Clara', 'Boa Vista', 'São José', 'Alto da Glória', 'Parque das Árvores', 'Nova Esperança', 'Cidade Alta']

const HORARIO: Record<Segmento, string> = {
  COMERCIO: 'Seg–Sáb 08h–20h',
  ENSINO: 'Seg–Sex 07h–22h',
  INSTITUICAO: 'Seg–Sex 08h–18h',
}

const FAIXA_CONSUMO: Record<Segmento, string> = {
  COMERCIO: '500–1000 kWh/mês',
  ENSINO: '800–1500 kWh/mês',
  INSTITUICAO: '1000–3000 kWh/mês',
}

function nomeUnidade(index: number, segmento: Segmento) {
  return `${NOMES[segmento][index % NOMES[segmento].length]} ${BAIRROS[index % BAIRROS.length]}`
}

async function main() {
  console.log('Resetando banco demo...')
  await db.anomalies.deleteMany()
  await db.consumption_readings.deleteMany()
  await db.units.deleteMany()
  await db.tariff_tables.deleteMany()
  await db.emission_factors.deleteMany()
  await db.users.deleteMany()

  await db.tariff_tables.create({
    data: {
      vigencia: new Date('2025-01-01T00:00:00Z'),
      te_preco_kwh: 0.3,
      tusd_preco_kwh: 0.2,
      bandeira_verde_preco_mwh: 0,
      bandeira_amarela_preco_mwh: 18.8,
      bandeira_vermelha1_preco_mwh: 44.63,
      bandeira_vermelha2_preco_mwh: 94.92,
      fonte: 'ANEEL — referência Grupo B para o MVP',
    },
  })
  await db.emission_factors.create({
    data: {
      fator_tco2_mwh: 0.09,
      fonte: 'MME — fator médio do SIN (2024)',
      data_vigencia: new Date('2024-01-01T00:00:00Z'),
    },
  })

  const senhaHash = await bcrypt.hash(SENHA_DEMO, 10)
  let unidadeIndex = 0
  let totalLeituras = 0
  let totalAnomalias = 0

  for (const persona of PERSONAS) {
    const user = await db.users.create({
      data: { name: persona.nome, email: persona.email, password: senhaHash },
    })
    for (let i = 0; i < persona.unidades; i++) {
      const { leituras, injetadas } = gerarSerie({ seed: 1000 + unidadeIndex, segmento: persona.segmento })
      const unit = await db.units.create({
        data: {
          nome: nomeUnidade(unidadeIndex, persona.segmento),
          segmento: persona.segmento,
          area_m2: 50 + ((unidadeIndex * 37) % 250),
          horario_funcionamento: HORARIO[persona.segmento],
          faixa_consumo: FAIXA_CONSUMO[persona.segmento],
          user_id: user.id,
        },
      })
      await db.consumption_readings.createMany({
        data: leituras.map((l) => ({
          unit_id: unit.id,
          periodo: new Date(l.periodo + 'T00:00:00Z'),
          leitura_kwh: l.leituraKwh,
          bandeira: l.bandeira,
        })),
      })
      totalLeituras += leituras.length

      const comBaseline = calcularBaselines(leituras.map((l) => ({ periodo: l.periodo, leituraKwh: l.leituraKwh })))
      for (const inj of injetadas) {
        const dias = comBaseline.filter((c) => c.periodo >= inj.inicio && c.periodo <= inj.fim)
        const desvio = dias.length ? dias.reduce((soma, c) => soma + c.desvio, 0) / dias.length : 0
        const base = comBaseline.find((c) => c.periodo === inj.inicio)?.baseline ?? 0
        await db.anomalies.create({
          data: {
            unit_id: unit.id,
            tipo: inj.tipo,
            severidade: severidadePara(desvio),
            desvio,
            janela_inicio: new Date(inj.inicio + 'T00:00:00Z'),
            janela_fim: new Date(inj.fim + 'T00:00:00Z'),
            status: 'DETECTADA',
            explicacao: explicarAnomalia(inj.tipo, desvio, dias.length, inj.inicio, inj.fim, base),
            rotulo_injetado: true,
          },
        })
        totalAnomalias++
      }
      unidadeIndex++
    }
    console.log(`  ${persona.email} → ${persona.unidades} unidades (${persona.segmento})`)
  }

  console.log('\nSeed concluído:')
  console.log(`  usuários:         3`)
  console.log(`  unidades:         ${unidadeIndex}`)
  console.log(`  leituras:         ${totalLeituras}`)
  console.log(`  anomalias rotuladas: ${totalAnomalias}`)
  console.log(`  tabela tarifária: 1 (vigência 2025-01-01)`)
  console.log(`  fator de emissão: 1 (0,09 tCO₂/MWh, MME 2024)`)
  console.log(`\nLogin demo: marcos@energialerta.dev / ${SENHA_DEMO} (também celia@ e carlos@)`)
}

main()
  .catch((err) => {
    console.error('Erro no seed:', err)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())