# WQ Solar - ERP Operacional & Financeiro Premium

Sistema modular SaaS-ready completo para gestão operacional de instalações de energia solar, focado em controle financeiro real de obras, diárias de instaladores, rateio societário 50/50 com reembolso prioritário de despesas e interface móvel otimizada via comandos naturais do WhatsApp.

---

## 🚀 Como Rodar o Projeto Localmente

### Pré-requisitos
* Node.js v18 ou superior instalado.
* PostgreSQL rodando localmente (ou uma URL de conexão externa).

---

### 1. Configurando e Iniciando o Backend

1. Abra a pasta do backend:
   ```bash
   cd backend
   ```
2. Instale as dependências (já instaladas nesta máquina):
   ```bash
   npm install
   ```
3. Ajuste a URL do seu PostgreSQL no arquivo `.env`:
   ```env
   DATABASE_URL="postgresql://postgres:senha@localhost:5432/wqsolardb?schema=public"
   ```
4. Execute as migrações do banco de dados para criar as tabelas:
   ```bash
   npx prisma migrate dev --name init
   ```
5. Popule o banco de dados com os sócios (Rafael & Wilson) e instaladores padrão (Victor & Carlos):
   ```bash
   npm run prisma:seed
   ```
6. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
   *O backend estará rodando na porta `3001` (http://localhost:3001).*

---

### 2. Configurando e Iniciando o Frontend (Next.js)

1. Abra uma nova janela de terminal na pasta do frontend:
   ```bash
   cd frontend
   ```
2. Instale as dependências (já instaladas nesta máquina):
   ```bash
   npm install
   ```
3. Inicie o servidor do Next.js:
   ```bash
   npm run dev
   ```
   *O frontend estará disponível em http://localhost:3000.*

---

## 📱 Guia de Comandos do WhatsApp

Você (sócio **Rafael**) pode gerenciar a empresa enviando mensagens simples do seu celular cadastrado (`21959416126`):

| Comando Exemplo | O que faz no Sistema |
| :--- | :--- |
| `Nova obra João valor 34000` | Cria a obra "João", valor R$ 34.000, status Em Andamento |
| `Recebido obra João 5000` | Registra uma entrada financeira parcial de R$ 5.000 no caixa da obra |
| `Uber obra João 130` | Registra despesa de Uber de R$ 130 paga por você (Gera reembolso pendente) |
| `Diária Victor obra João 150` | Registra diária de R$ 150 para o Victor associada à obra, paga por você |
| `Material obra João 890` | Registra despesa de material de R$ 890 paga por você |
| `Hoje obra João com Victor e Carlos` | Marca presença de Victor e Carlos no calendário operacional hoje na obra João |
| `Resumo obra João` | Retorna um resumo financeiro e operacional consolidado completo da obra |
| `Relatório semanal` | Retorna o balanço de faturamento, caixa, obras e reembolsos da semana |
| `Relatório mensal` | Retorna o balanço de faturamento, caixa, obras e reembolsos do mês |

---

## 🐳 Deploy em Produção (VPS com EasyPanel)

1. Faça o push desta pasta `/crm` para o seu repositório Git privado (ex: GitHub).
2. Siga as etapas de vinculação detalhadas no arquivo **`C:\Users\Rafael\.gemini\antigravity\brain\778ef9d7-5022-49b3-93be-b8172bdc5897\walkthrough.md`** para importar o n8n e criar os Apps Next.js e Fastify no seu painel **`easypanel.wqsolar.site`**.
3. **Credenciais Padrão de Login**:
   * E-mail: `rafael@wqsolar.com`
   * Senha: `admin123`
