# Vibrato Motos

Sistema de gestão da locadora **Vibrato Motos** — frota, locações, checklist de
pagamentos, finanças, manutenções, clientes, usuários/permissões e dashboard.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Prisma 7 · PostgreSQL ·
TailwindCSS · storage S3-compatível (MinIO local / Supabase Storage em produção).

---

## Desenvolvimento local

Pré-requisitos: Node 20+, Docker.

```bash
# 1. Subir Postgres + MinIO (storage)
docker compose up -d

# 2. Instalar dependências
npm install

# 3. Configurar variáveis
cp .env.example .env        # os valores locais já vêm prontos

# 4. Aplicar as migrations no banco local
npx prisma migrate dev

# 5. Rodar
npm run dev
```

Acesse http://localhost:3000 — no primeiro acesso a tela **/setup** cria a
locadora e o usuário administrador.

- Banco: `localhost:5433` · Storage (MinIO): console em `localhost:9001`
- Variáveis: veja `.env.example`.

---

## Publicação (Vercel + Supabase)

### 1. Banco de dados (Supabase → Postgres)
- Crie um projeto no Supabase.
- Em **Settings → Database**, copie a *Connection string* (prefira o **pooler**,
  porta `6543`, com `?sslmode=require`) → será a `DATABASE_URL`.
- Aplique as migrations na base de produção:
  ```bash
  DATABASE_URL="<connection string do Supabase>" npm run db:deploy
  ```

### 2. Storage (Supabase → Storage)
- Crie um **bucket** (ex.: `vibrato`), **privado**.
- Em **Storage → S3 Connection**, ative *S3 protocol connection* e gere uma
  **Access key** (Access key ID + Secret access key).
- Guarde: Endpoint (`https://<ref>.storage.supabase.co/storage/v1/s3`), Region
  (ex.: `sa-east-1`), o nome do bucket e as chaves.

### 3. Deploy (Vercel)
- Suba o repositório no GitHub e importe na Vercel.
- Configure as **Environment Variables** (veja `.env.example`):
  - `DATABASE_URL` (Supabase, pooler 6543)
  - `SESSION_SECRET` (gere: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`)
  - `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`,
    `S3_SECRET_ACCESS_KEY`, `S3_FORCE_PATH_STYLE=true`
- O build já roda `prisma generate` automaticamente.
- Após o deploy, acesse o app e faça o **/setup** inicial.

### 4. Domínio
- A landing page continua na Hostinger em `vibratomotos.com.br`.
- Aponte um subdomínio (ex.: `app.vibratomotos.com.br`) para a Vercel via DNS
  (CNAME) e adicione-o em **Vercel → Domains**.

---

## Papéis de acesso
- **admin / equipe:** acesso total.
- **investidor:** vê apenas as motos vinculadas a ele e apenas as telas
  liberadas (configurável em **Usuários**); pode anexar documentos, editar
  dados limitados da própria moto e o próprio perfil.
