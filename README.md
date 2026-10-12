# Multi-CRM Orchestrator

A sales workspace combining the agency's HubSpot lead directory, client-specific Zoho handoffs, and each agent's ClickUp sales tracking. The application also includes communications, interaction history, lead analysis, scripts, calendars, proposals, commissions, and time reports.

## Run with Docker

Install and start Docker Desktop with Linux containers, then copy `.env.docker.example` to the private `.env.docker` file and configure it for your own test accounts:

```powershell
Copy-Item .env.docker.example .env.docker
docker compose up --build
```

Open [localhost:3000](http://localhost:3000). Docker creates a separate PostgreSQL database and applies migrations automatically. Create an admin workspace; configured SMTP/Resend delivers its signup code, or local development email logging provides the code when no delivery provider is configured. Each developer connects their own test CRM accounts.

After pulling or editing code, run `docker compose up --build` again. PostgreSQL records persist across container recreation. See [Docker setup and updates](documentation/docker-local-development.md) for configuration, OAuth callbacks, optional database access, and reset instructions.

## Run without Docker

Install Node.js 22 and PostgreSQL, copy `.env.example` to `.env.local`, and configure your database URL, encryption key, and optional providers. Then run:

```sh
npm ci
npx prisma generate
npx prisma migrate deploy
npm run dev
```

This uses the database in `.env.local`; it is independent of Docker's database unless deliberately configured otherwise. Keep real secrets and database backups out of Git.

## Documentation

Start with the [documentation index](documentation/README.md), [current architecture](documentation/architecture.md), [project requirements](documentation/PROJECT_REQUIREMENTS.md), and [implementation status and remaining gaps](documentation/PROJECT_ALIGNMENT_AUDIT.md).

Implemented provider paths do not establish live-provider acceptance. Feature guides explain available workflows, recovery behavior, and verification limits.
