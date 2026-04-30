# Próximos Passos — Sistema Defeitos Gobbi

O código está pronto. Siga estes passos para colocar o sistema no ar.

---

## Passo 1 — Criar conta no Supabase (banco de dados)

1. Acesse https://supabase.com e crie uma conta gratuita
2. Crie um novo projeto com o nome `defeitos-gobbi`
3. Aguarde ~2 minutos para o projeto ser provisionado
4. Vá em **Settings → API** e copie:
   - **Project URL** (algo como `https://xxxx.supabase.co`)
   - **anon key** (começa com `eyJ...`)
   - **service_role key** (começa com `eyJ...`) — guarde com segurança!

---

## Passo 2 — Criar o banco de dados

1. No painel do Supabase, clique em **SQL Editor → New query**
2. Abra o arquivo `supabase/schema.sql` deste projeto
3. Cole TODO o conteúdo e clique em **Run**
4. Aguarde a confirmação de sucesso

---

## Passo 3 — Configurar autenticação no Supabase

1. Vá em **Authentication → Providers → Email**
2. Desative a opção **"Confirm email"** (para simplificar)
3. Clique em **Save**

---

## Passo 4 — Criar o bucket de fotos

1. Vá em **Storage → New bucket**
2. Nome: `defect-photos`
3. Ative a opção **Public** (para as fotos serem acessíveis)
4. Clique em **Save**

---

## Passo 5 — Criar conta no Vercel (hospedagem)

1. Acesse https://vercel.com e crie uma conta gratuita
2. Crie um repositório no GitHub: https://github.com/new
   - Nome: `defeitos-gobbi` (privado)
3. No terminal (PowerShell), dentro da pasta do projeto, execute:
   ```powershell
   git remote add origin https://github.com/SEU-USUARIO/defeitos-gobbi.git
   git push -u origin master
   ```

---

## Passo 6 — Fazer o deploy

1. No Vercel: **Add New Project → Import from GitHub → defeitos-gobbi**
2. Na seção **Environment Variables**, adicione as 3 variáveis:
   ```
   NEXT_PUBLIC_SUPABASE_URL       = (URL do passo 1)
   NEXT_PUBLIC_SUPABASE_ANON_KEY  = (anon key do passo 1)
   SUPABASE_SERVICE_ROLE_KEY      = (service_role key do passo 1)
   ```
3. Clique em **Deploy** e aguarde ~2 minutos
4. O Vercel vai gerar uma URL do tipo `https://defeitos-gobbi.vercel.app`

---

## Passo 7 — Configurar a URL no Supabase

1. Volte ao Supabase → **Authentication → URL Configuration**
2. Em **Site URL**, coloque: `https://defeitos-gobbi.vercel.app`
3. Em **Redirect URLs**, adicione a mesma URL
4. Clique em **Save**

---

## Passo 8 — Criar os usuários

Acesse `https://defeitos-gobbi.vercel.app/cadastros/usuarios` com sua conta de admin.

Crie os usuários:

| Nome | Perfil |
|---|---|
| Paloma | Admin |
| Rodolfo | Admin |
| Rodrigo | Admin |
| Angela | Caixa |
| Ilair | Caixa |
| Cleonice | Caixa |

**Para criar o primeiro usuário (Paloma/admin):** Como ainda não há ninguém logado, vá direto ao Supabase → Authentication → Users → Add user → insira o e-mail e senha. Depois vá em SQL Editor e execute:
```sql
insert into profiles (id, name, role)
values ('<ID-DO-USUARIO-CRIADO>', 'Paloma', 'admin');
```
(O ID aparece na lista de usuários do Supabase)

Após fazer login como Paloma, os demais usuários podem ser criados pela tela `/cadastros/usuarios`.

---

## Passo 9 — Testar

1. Acesse a URL do Vercel e faça login
2. Crie um defeito de teste: clique em **+ Novo Defeito**
3. Preencha os campos e salve
4. O card deve aparecer no Kanban na coluna "Recebido"
5. Avance as etapas e teste o botão WhatsApp
6. Acesse o Painel Gerencial e verifique os indicadores

---

## Resumo do que foi construído

| Funcionalidade | Status |
|---|---|
| Login com e-mail e senha | ✅ |
| Proteção de rotas (auth middleware) | ✅ |
| Permissões admin vs caixa | ✅ |
| Kanban com 6 colunas + alertas 15/30 dias | ✅ |
| Formulário de novo defeito (etapa 1) | ✅ |
| Tela de detalhe do defeito | ✅ |
| Avançar etapas (2→3→4→5→6) com campos específicos | ✅ |
| Encerrar como Improcedente / Doação / Não enviado | ✅ |
| Botão WhatsApp com mensagem pré-preenchida | ✅ |
| Upload de foto | ✅ |
| Histórico de movimentações | ✅ |
| Painel gerencial com 8 indicadores | ✅ |
| Filtros por período, empresa, marca, situação, operador | ✅ |
| Exportação para Excel | ✅ |
| Cadastro de marcas (admin + caixa podem adicionar) | ✅ |
| Cadastro de tipos de defeito (admin + caixa podem adicionar) | ✅ |
| Cadastro de usuários (admin) | ✅ |
| Editor de mensagens WhatsApp (admin) | ✅ |

---

## Dúvidas?

Retorne ao Claude Code e pergunte — o histórico da conversa está salvo.
