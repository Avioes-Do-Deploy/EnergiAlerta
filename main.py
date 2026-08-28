import streamlit as st
import pandas as pd
import numpy as np

logo = "/home/aluno/analise/Image 1.png"

# 1. Configuração da página DEVE ser o primeiro comando Streamlit
st.set_page_config(page_title="Validação - EnergiAlerta", layout="wide", page_icon=logo)

# 2. Injeção de CSS para o Dark Mode
# O filtro 'brightness(0) invert(1)' transforma a imagem em branco puro quando o SO está no modo escuro
st.markdown("""
    <style>
        @media (prefers-color-scheme: dark) {
            [data-testid="stSidebar"] img {
                filter: brightness(0) invert(1);
            }
        }
    </style>
""", unsafe_allow_html=True)

# Agora a imagem é renderizada com a regra do CSS já aplicada
st.sidebar.image(logo)

st.title("⚡ EnergiAlerta: Validação de Mercado e Impacto")

st.divider()

# 1. KPIs de Mercado
st.subheader("O Tamanho do Problema (Dados Reais)")
col1, col2, col3 = st.columns(3)

with col1:
    st.metric(label="Impacto no Faturamento (Sebrae)", value="Até 10%", delta="Setores: Alimentação, Escolas, Varejo", delta_color="off")
with col2:
    st.metric(label="Custo Operacional (Sebrae)", value="~20%", delta="Sem visibilidade de desperdício", delta_color="inverse")
with col3:
    st.metric(label="Desperdício Nacional (ABESCO)", value="R$ 61,7 Bi", delta="Em 3 anos por ineficiência no Brasil", delta_color="inverse")

st.divider()

# 2. Simulação de Impacto na Persona (Seu Marcos / Dona Célia)
st.subheader("Cenário Simulado: Padaria / Escola Comunitária")
st.markdown("Com base na premissa de que a gestão ativa pode reduzir o desperdício, veja a projeção anual de custos com e sem os alertas do EnergiAlerta.")

# Gerando dados simulados para 12 meses
meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
np.random.seed(42) # Para consistência na demo
custo_base = np.random.uniform(2500, 3500, 12) # Custo médio R$ 3.000/mês
bandeira_vermelha = np.array([0, 0, 0, 0, 0, 500, 600, 700, 800, 800, 400, 0]) # Acréscimo nos meses de seca
custo_real = custo_base + bandeira_vermelha

# Aplicação do EnergiAlerta (Simulação de redução de 20% cortando anomalias e picos)
custo_otimizado = custo_real * 0.80

df_simulacao = pd.DataFrame({
    "Mês": meses,
    "Sem EnergiAlerta (R$)": custo_real,
    "Com EnergiAlerta (R$)": custo_otimizado
}).set_index("Mês")

# Gráfico financeiro
st.line_chart(df_simulacao, color=["#FF4B4B", "#00CC96"])

# 3. Tradução em tCO2e (Impacto Ambiental)
st.subheader("🌱 Impacto Ambiental (tCO₂e) Evitado")
st.markdown("Reduzir o consumo em bandeira vermelha evita diretamente o despacho de usinas termelétricas, melhorando o perfil ESG do estabelecimento.")

# Fator SIN aproximado para a simulação (tCO2/MWh)
fator_sin = 0.08 
consumo_mensal_mwh = (custo_real / 0.85) / 1000 # Assumindo tarifa média de R$ 0.85/kWh
emissao_base = consumo_mensal_mwh * fator_sin
emissao_otimizada = emissao_base * 0.80

df_emissoes = pd.DataFrame({
    "Mês": meses,
    "Emissão Atual (tCO₂e)": emissao_base,
    "Emissão Pós-Alertas (tCO₂e)": emissao_otimizada
}).set_index("Mês")

# Gráfico de emissões
st.bar_chart(df_emissoes, color=["#A9A9A9", "#00CC96"])

# Conclusão para a banca
st.success("**KPI do Produto:** O EnergiAlerta ataca uma dor financeira urgente com ROI imediato para o cliente, enquanto gera dados climáticos auditáveis automaticamente.")