-- CreateTable
CREATE TABLE "units" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "segmento" TEXT NOT NULL,
    "area_m2" REAL,
    "horario_funcionamento" TEXT,
    "faixa_consumo" TEXT,
    "user_id" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "units_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "consumption_readings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "unit_id" INTEGER NOT NULL,
    "periodo" DATETIME NOT NULL,
    "leitura_kwh" REAL NOT NULL,
    "bandeira" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "consumption_readings_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tariff_tables" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "vigencia" DATETIME NOT NULL,
    "te_preco_kwh" REAL NOT NULL,
    "tusd_preco_kwh" REAL NOT NULL,
    "te_preco_ponta_kwh" REAL,
    "tusd_preco_ponta_kwh" REAL,
    "te_preco_fora_ponta_kwh" REAL,
    "tusd_preco_fora_ponta_kwh" REAL,
    "bandeira_verde_preco_mwh" REAL NOT NULL,
    "bandeira_amarela_preco_mwh" REAL NOT NULL,
    "bandeira_vermelha1_preco_mwh" REAL NOT NULL,
    "bandeira_vermelha2_preco_mwh" REAL NOT NULL,
    "fonte" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "emission_factors" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fator_tco2_mwh" REAL NOT NULL,
    "fonte" TEXT NOT NULL,
    "data_vigencia" DATETIME NOT NULL,
    "data_fim_vigencia" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "anomalies" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "unit_id" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "severidade" TEXT NOT NULL,
    "desvio" REAL NOT NULL,
    "janela_inicio" DATETIME NOT NULL,
    "janela_fim" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DETECTADA',
    "explicacao" TEXT,
    "rotulo_injetado" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "anomalies_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "units_user_id_idx" ON "units"("user_id");

-- CreateIndex
CREATE INDEX "consumption_readings_unit_id_periodo_idx" ON "consumption_readings"("unit_id", "periodo");

-- CreateIndex
CREATE UNIQUE INDEX "consumption_readings_unit_id_periodo_key" ON "consumption_readings"("unit_id", "periodo");

-- CreateIndex
CREATE INDEX "anomalies_unit_id_status_idx" ON "anomalies"("unit_id", "status");
