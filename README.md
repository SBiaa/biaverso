# biaVerso

Central de gestão pessoal: rotina do dia, cardápio, finanças, negócios e clientes,
avaliações semanais, biblioteca e a Central de Visão.

Next.js 16 (App Router) · React 19 · Prisma 7 sobre Postgres (Neon) · Tailwind 4.

## Rodando localmente

```bash
npm install
```

Copie `.env.example` para `.env` e preencha o `DATABASE_URL`. Depois aplique as
migrations e suba o servidor:

```bash
npx prisma migrate deploy
```

```bash
npm run dev
```

O app abre em [http://localhost:3000](http://localhost:3000).

> Não existe seed: o banco guarda só dados reais, nenhum dado de exemplo é criado.

## Senha de acesso

O app inteiro — páginas e API — fica atrás de Basic Auth (`middleware.ts`).
Defina `APP_PASSWORD` no `.env` para ligar; `APP_USER` é opcional e o padrão é
`bia`. Sem a variável, o app roda em desenvolvimento mas **responde 503 em
produção**, para não subir aberto por esquecimento.

## Convenção de datas

Toda data-calendário (dia, vencimento, prazo) é gravada como **meia-noite UTC**
do dia correspondente em `America/Sao_Paulo` — o mesmo referencial que
`<input type="date">` produz. Filtrar ou formatar essas datas em fuso local
mostraria o dia errado, então os helpers de `lib/utils.ts` usam UTC e é por eles
que tudo deve passar (`todayUtc`, `getMonthRange`, `parseDateOnly`,
`formatDateBR`). `todayUtc()` não depende do fuso do servidor, então o
comportamento é o mesmo em máquina local e na Vercel.

## Camada de API

- `lib/api.ts` — `route()` embrulha todo handler e traduz exceção em status
  (P2002 → 409, P2025 → 404), sem vazar stack no corpo da resposta.
- `lib/schemas.ts` — validação Zod de toda entrada, com os enums importados do
  client gerado pelo Prisma.
- `lib/client-api.ts` — `api.get/post/patch/delete` no cliente; erro vira exceção
  com a mensagem do servidor, para o componente reverter o estado otimista.

## Google Calendar

A agenda do app sincroniza nos dois sentidos com o Google Calendar: o que você
cria aqui aparece lá, e o que está lá aparece aqui.

### 1. Criar as credenciais (feito uma vez, na mão)

No [Google Cloud Console](https://console.cloud.google.com):

1. **Criar um projeto** — menu de projetos no topo → _Novo projeto_ → dê um nome
   (ex.: `biaVerso`) e crie.
2. **Ativar a Google Calendar API** — _APIs e serviços_ → _Biblioteca_ → busque
   por **Google Calendar API** → _Ativar_.
3. **Configurar a tela de consentimento** — _APIs e serviços_ → _Tela de permissão
   OAuth_ → tipo **Externo** → preencha nome do app e e-mail de contato. Em
   seguida clique em **Publicar app**, para o status sair de _Teste_ e ir para
   _Em produção_ (veja o porquê logo abaixo).
4. **Criar as credenciais OAuth 2.0** — _APIs e serviços_ → _Credenciais_ →
   _Criar credenciais_ → _ID do cliente OAuth_ → tipo **Aplicativo da Web**.
5. **Adicionar os URIs de redirecionamento autorizados**:
   - `http://localhost:3000/api/auth/callback/google` (desenvolvimento)
   - `https://SEU-DOMINIO/api/auth/callback/google` (produção)
6. **Copiar o Client ID e o Client Secret** para o `.env`.

#### Por que publicar em vez de deixar em "Teste"

Com a tela de consentimento em **Teste**, o Google emite refresh tokens que
**expiram em 7 dias**. Na prática a sincronização pararia toda semana e você
teria que reconectar. (O app não quebra quando isso acontece: o refresh falha,
a conexão é apagada e a tela de Configurações volta a mostrar
_Conectar Google Calendar_ — mas é chato refazer isso a cada 7 dias.)

Publicando em produção o token deixa de expirar. Em compensação, como os escopos
de Calendar são classificados pelo Google como **sensíveis**, na hora de conectar
aparece uma tela dizendo que o app não foi verificado: clique em **Avançado** →
**Acessar biaVerso (não seguro)**. Esse "não seguro" só quer dizer que o Google
não auditou o app — que é seu, roda na sua máquina e acessa só a sua conta.

Mandar o app para verificação só faria sentido se outras pessoas fossem usá-lo.
Sem verificação, o limite é de 100 usuários.

### 2. Variáveis de ambiente

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google
```

Em produção, `GOOGLE_REDIRECT_URI` precisa ser exatamente o mesmo URI cadastrado
no passo 5 — o Google compara caractere por caractere.

> A autenticação é feita direto com `googleapis`, sem NextAuth, então
> `NEXTAUTH_SECRET` e `NEXTAUTH_URL` não são usados.

### 3. Escopos pedidos

```
https://www.googleapis.com/auth/calendar
https://www.googleapis.com/auth/calendar.events
```

### 4. Conectar

Abra **Configurações** no app e clique em _Conectar Google Calendar_. Depois de
autorizar, a mesma tela mostra a conta conectada, a data da última sincronização
e o resultado dela.

### Como a sincronização funciona

- **Automática** a cada 5 minutos enquanto o app está aberto, mais o botão
  _Sincronizar agora_ (na Agenda e em Configurações).
- **Todos os calendários** da conta são lidos. Eventos criados no app vão para o
  calendário principal.
- **Janela sincronizada**: de 1 mês atrás até 6 meses à frente.
- **Em caso de conflito o app prevalece**: se o mesmo evento foi editado nos dois
  lados, a versão do app sobrescreve a do Google.
- **Ícones na agenda**: ✓ sincronizado, ⏱ aguardando envio, ! erro na última
  tentativa. Um evento com erro não impede os outros de sincronizarem.
- Excluir um evento no app também o exclui no Google. Excluir direto no Google
  não remove do app.
