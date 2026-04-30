# Sistema de Controle de Defeitos — Grupo Gobbi
**Data:** 2026-04-30  
**Status:** Aprovado pelo usuário  
**Stack:** Next.js + Supabase + Vercel

---

## 1. Visão Geral

Aplicação web para controle do fluxo de peças com defeito das lojas do Grupo Gobbi. Substitui planilhas manuais. Objetivo principal: garantir que todos os créditos de indenização das marcas sejam recebidos, rastreando cada defeito desde o recebimento até o reembolso à loja.

Acesso exclusivo por navegador em PC. Sem versão mobile neste momento.

---

## 2. Empresas / CNPJs

O sistema opera com 6 empresas distintas:

MPB, BY, RRPB, GOBBI, LA LUNA, GS

Cada empresa é uma entidade separada no sistema. Um defeito sempre pertence a uma empresa específica.

---

## 3. Perfis de Usuário

### Admin
Paloma, Rodolfo, Rodrigo.

Acesso completo: registrar e editar defeitos, mover cards em todas as etapas (incluindo 5 e 6), acessar painel gerencial, gerenciar cadastros (marcas, usuários, mensagens WhatsApp).

### Caixa
Angela, Ilair, Cleonice.

Podem:
- Registrar novo defeito (etapas 1 a 4)
- Adicionar novos tipos de defeito e novas marcas
- Ver cards em todas as etapas, incluindo valores da etapa 5
- Enviar mensagens WhatsApp nas etapas 1, 4 e 5

Não podem:
- Mover card para etapas 5 ou 6
- Acessar painel gerencial
- Gerenciar cadastros (exceto tipos de defeito)
- Editar ou excluir defeitos já registrados

---

## 4. Fluxo Kanban

### Etapas lineares

```
[1. Recebido] → [2. Processo Iniciado] → [3. Fotos Anexadas]
     → [4. Aguardando Indenização] → [5. Pago ao Cliente]
     → [6. Indenizado à Loja]
```

### Desfechos alternativos (a partir da etapa 4)

Quando a marca responde com recusa ou situação especial, o admin encerra o card com um dos desfechos:

- **Improcedente** — marca recusou o defeito
- **Doação** — produto doado ao cliente
- **Não enviado** — não foi encaminhado à marca

Ao escolher um desfecho alternativo, um campo de observação livre é obrigatório para registrar o que foi decidido.

### Campos obrigatórios por etapa

| Etapa | Campos obrigatórios ao avançar |
|---|---|
| 1 → Recebido | Empresa, marca, produto, referência, cor, tamanho, NF, cod use, tipo de defeito, cliente (nome + telefone), recebido por, data de recebimento |
| 2 → Processo Iniciado | Canal de comunicação com a marca (sistema próprio / e-mail / WhatsApp) + protocolo/número |
| 3 → Fotos Anexadas | Upload de 1 foto |
| 4 → Aguardando Indenização | *(confirmação simples)* |
| 5 → Pago ao Cliente | Valor pago ao cliente + data |
| 6 → Indenizado à Loja | Valor recebido da marca + data + forma (conta corrente ou nota fiscal) |

### Alertas visuais de prazo

- **Amarelo:** defeito com mais de 15 dias sem chegar na etapa 6
- **Vermelho:** defeito com mais de 30 dias sem chegar na etapa 6

### Histórico

Cada movimentação de etapa é registrada com: quem moveu, data/hora e observações opcionais.

---

## 5. Banco de Dados

### Tabelas principais

**users**
- id, name, email, role (admin | cashier), created_at

**companies** (empresas/CNPJs)
- id, name, slug (mpb | by | rrpb | gobbi | la_luna | gs), active

**brands** (marcas)
- id, name, active, created_at

**defect_types** (tipos de defeito)
- id, name, active, created_at, created_by

**defects** (registro principal)
- id, company_id, brand_id, product_name, reference, color, size, nf_number, cod_use, defect_type_id
- client_name, client_phone
- received_by (user_id), received_at
- current_stage (1–6 | improcedente | doacao | nao_enviado)
- communication_channel (system | email | whatsapp), protocol_number (texto livre — pode ser número ou "email")
- photo_url
- client_amount_paid, client_paid_at
- brand_reimbursement_amount, brand_reimbursed_at, reimbursement_method (bank_transfer | invoice)
- resolution_notes (preenchido em desfechos alternativos)
- created_at, updated_at

**defect_history** (histórico de movimentações)
- id, defect_id, from_stage, to_stage, changed_by (user_id), changed_at, notes

**whatsapp_templates** (mensagens padrão)
- id, stage (1 | 4 | 5), message_template, updated_by, updated_at

---

## 6. Comunicação WhatsApp

Botão "Enviar mensagem ao cliente" disponível nas etapas 1, 4 e 5.

Ao clicar, abre WhatsApp Web com mensagem pré-preenchida. O usuário revisa e envia manualmente.

Variáveis automáticas nos templates: `[Nome]`, `[Produto]`, `[Marca]`, `[Loja]`, `[Data]`, `[Protocolo]`.

O sistema registra data e hora de cada envio no histórico do defeito.

**Templates padrão sugeridos:**

- **Etapa 1:** "Olá, [Nome]! Seu produto [Produto] da marca [Marca] foi recebido pela [Loja] em [Data]. Protocolo: [Protocolo]. Em até 30 dias retornaremos com uma solução."
- **Etapa 4:** "Olá, [Nome]! Seu defeito já foi encaminhado à marca [Marca] e estamos aguardando o retorno deles. Em breve te avisamos!"
- **Etapa 5:** "Olá, [Nome]! O reembolso referente ao seu produto [Produto] foi efetuado. Qualquer dúvida, estamos à disposição!"

Os textos são editáveis pelos admins na área de cadastros.

---

## 7. Painel Gerencial

Acesso exclusivo para admins.

### Filtros

- Período (de/até — mínimo 1 ano de histórico)
- Empresa/CNPJ
- Marca
- Cliente
- Situação (Em andamento = etapas 1 a 4 / Procedente finalizado = etapa 6 concluída / Improcedente / Doação / Não enviado)
- Operador (quem registrou)

### Indicadores (cards de resumo)

| Indicador | Descrição |
|---|---|
| Total de defeitos | Quantidade no período filtrado |
| Por empresa | Defeitos por CNPJ |
| Por marca | Ranking — marcas com mais defeitos |
| Por cliente | Clientes com mais ocorrências |
| Por situação | Quantidade em cada desfecho |
| Reembolsado ao cliente | Soma dos valores pagos |
| Recebido das marcas | Soma dos reembolsos por marca |
| Saldo em aberto | Valor pago a clientes ainda não recuperado das marcas |
| Improcedentes por marca | Valor e quantidade de recusas por marca |

### Tabela de defeitos

Abaixo dos cards: lista de todos os defeitos do filtro ativo, com exportação para Excel (.xlsx).

---

## 8. Navegação

```
[Kanban]  [Painel Gerencial*]  [Cadastros*]
                                  *somente admins
```

### Área de Cadastros (admin)

- **Marcas** — adicionar (também disponível para caixas), editar, desativar
- **Tipos de defeito** — adicionar (também disponível para caixas), editar, desativar
- **Usuários** — criar, editar perfil (admin/caixa), desativar
- **Mensagens WhatsApp** — editar templates das etapas 1, 4 e 5

### Tela do Kanban

- 6 colunas (etapas) + coluna de encerrados (desfechos alternativos)
- Cada card exibe: empresa, marca, produto, cliente, dias na etapa atual
- Alerta visual: amarelo > 15 dias, vermelho > 30 dias

### Tela do defeito (clicando no card)

- Todos os campos do registro
- Histórico de movimentações
- Botão WhatsApp (etapas 1, 4 e 5)
- Upload de foto
- Botão para avançar etapa (respeitando permissões)

---

## 9. Arquitetura Técnica

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 14 (App Router) + TailwindCSS |
| Backend | Next.js API Routes |
| Banco de dados | Supabase (PostgreSQL) |
| Autenticação | Supabase Auth (e-mail + senha) |
| Armazenamento de fotos | Supabase Storage |
| Hospedagem | Vercel (frontend + API) |

**Custo estimado:** R$ 0 no plano gratuito de ambos para o volume inicial previsto.

---

## 10. Fora do Escopo (v1)

- App mobile
- Integração direta com sistemas das marcas
- Disparo automático de mensagens WhatsApp
- Múltiplas fotos por defeito
