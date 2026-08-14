# Figurinhas App V1

React + TypeScript + Supabase. Esta versão inclui login por e-mail, Google OAuth, sessão persistente, perfil, navegação, dashboard, coleção e estrutura inicial de admin.

## Configuração
1. Copie `.env.example` para `.env`.
2. Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` com os dados de Project Settings > API.
3. Execute `supabase/schema.sql` no SQL Editor do Supabase se as tabelas ainda não estiverem criadas.
4. Google: Authentication > Providers > Google. Use a Callback URL mostrada pelo Supabase no Google Cloud.
5. `npm install` e `npm run dev`.

Nunca publique `service_role` nem segredos privados no frontend.
