# Figurinhas — MVP

Aplicação React + TypeScript + Supabase para gestão de álbuns e coleções.

## 1. Supabase
1. Crie um projeto no Supabase.
2. Abra SQL Editor e execute `supabase/schema.sql`.
3. Em Authentication > Providers, ative Email e Google.
4. Configure a URL de redirecionamento para o domínio do GitHub Pages.
5. Crie um utilizador e promova-o a admin executando: `update public.profiles set role='admin' where id='UUID_DO_USUARIO';`

## 2. Local
```bash
npm install
cp .env.example .env.local
# preencher VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm run dev
```

## 3. GitHub Pages
Configure GitHub Actions para instalar dependências e executar `npm run build`; publique a pasta `dist`. Para uma SPA no GitHub Pages, use um domínio personalizado ou configure fallback/roteamento conforme a estratégia de deploy escolhida.

## Próximos módulos
- CRUD completo de álbuns
- CRUD de figurinhas
- importação CSV
- Supabase Storage para capas/fotos
- adicionar/remover álbum da coleção pessoal
- filtros por seleção/escuderia/tipo
- dashboard com progresso
- trocas entre utilizadores
