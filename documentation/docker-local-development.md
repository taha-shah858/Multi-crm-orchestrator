# Local Docker workspace

This setup gives every developer an isolated copy of the application and PostgreSQL database. It is for local development and test CRM workspaces, not a shared or public deployment.

## Start a fresh workspace

1. Install Docker Desktop, make sure it is running, and clone the repository.
2. Copy `.env.docker.example` to `.env.docker`.
3. In `.env.docker`, set a unique PostgreSQL password in both `POSTGRES_PASSWORD` and `DATABASE_URL` (which uses `db:5432` internally). Generate a unique `INTEGRATION_ENCRYPTION_KEY` with `openssl rand -base64 32`; keep it stable for stored tokens. Set a separate private session-secret value if using that configuration.
4. Start the services with `docker compose up --build`.
5. Open `http://localhost:3000`, select **Admin / Manager**, and create a workspace.
6. If SMTP/Resend is configured, the verification code is sent through that provider. Otherwise `EMAIL_DEV_LOG=true` prints it in that developer's local container logs; read it with `docker compose logs app`.

The database starts empty. The `postgres_data` Docker volume persists that developer's records across restarts; it never contains another developer's records.

No separate PostgreSQL installation or pgAdmin setup is needed. Compose creates the user/database and applies migrations automatically. For optional pgAdmin inspection, connect to `localhost:5433` with your `.env.docker` database name, user and password. Existing non-Docker accounts are stored in a different database and are not automatically copied.

## Connect a personal test CRM account

Each developer creates OAuth applications in the provider's developer portal or uses an approved shared test application. They put only their development application's client ID and secret in their untracked `.env.docker` file, then register the matching redirect URL shown in that file.

After starting the app, they sign in, add their own client account and choose **Connect** for the provider. OAuth authorizes the CRM account they sign in to during the provider's consent screen. Tokens are encrypted in that developer's PostgreSQL database with their local encryption key. They are never committed to Git.

HubSpot is the agency CRM, Zoho is the selected client CRM, and ClickUp is the signed-in agent's tracker. Test with separate provider workspaces and do not connect a production CRM account.

## Receive project updates

Run:

```sh
git pull
docker compose up --build
```

Application code and dependencies come from the rebuilt image. Run `docker compose up --build` after pulling changes or editing source files; Docker reuses unchanged build steps. Dependencies and the generated Prisma client are updated together, without a dependency volume retaining old packages. New migrations run automatically before the app starts. The PostgreSQL volume retains existing accounts and records. A pull does not copy another developer's database, OAuth tokens, or CRM records.

Existing installations using the former `app_node_modules` volume can use the same command. Compose recreates the app container without that mount. The old unused dependency volume may remain on disk, but it is no longer used. No database volume deletion is required.

## Reset only your local test database

Stop the stack and remove its volumes:

```sh
docker compose down -v
```

The next `docker compose up --build` creates an empty PostgreSQL database. This permanently removes only the Docker data for the local Compose project, so export anything needed first.

## Before sharing the repository

Never commit `.env.docker`, `.env.local`, database dumps, OAuth client secrets, refresh tokens, or API keys. Existing OAuth client secrets that were previously committed or shared should be rotated in their provider portals before sharing the repository.
