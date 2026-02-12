# Docker & PostgreSQL Setup Guide

Since this project uses Docker to run the PostgreSQL database, you need to install Docker Desktop first.

## 1. Install Docker Desktop

1. Download **Docker Desktop for Windows** from: [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)
2. Run the installer.
3. Follow the on-screen instructions (you may need to restart your computer).
4. **Start Docker Desktop** from the Start Menu after installation.

## 2. Verify Installation

Open a new terminal (Powershell or Command Prompt) and run:

```bash
docker --version
```
You should see something like `Docker version 24.0.x`.

## 3. Run the Database

Once Docker is running, you can start the database for this project:

```bash
npm run db:up
```

This command will:
1. Download the PostgreSQL image.
2. Initialize the database with `init_db.sql`.
3. Start the server on port `5432`.

## 4. Troubleshooting

- **"Docker not found"**: Restart your terminal or computer after installing Docker.
- **"Port 5432 already allocated"**: Stop any other Postgres instances running on your machine.
