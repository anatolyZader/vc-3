# Database Initialization Scripts

This directory contains SQL scripts that automatically run when the PostgreSQL Docker container is first created.

## How It Works

Scripts in this directory are mounted to `/docker-entrypoint-initdb.d/` in the PostgreSQL container. PostgreSQL executes these scripts in alphabetical order during the first initialization.

## Naming Convention

Use numbered prefixes to control execution order:
- `01-init-extensions.sql` - Install PostgreSQL extensions
- `02-init-schema.sql` - Create tables, indexes, etc.
- `03-seed-data.sql` - Insert initial data

## Important Notes

1. **One-Time Execution**: These scripts only run when the container is created for the first time
2. **Order Matters**: Scripts execute in alphabetical order
3. **Errors Stop Initialization**: If a script fails, the container initialization fails
4. **To Re-run**: Delete the Docker volume and recreate the container:
   ```powershell
   docker-compose down -v
   docker-compose up -d postgres
   ```

## Adding Your Schema

Create `02-init-schema.sql` with your table definitions:

```sql
-- Example:
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
```

## Migration Strategy

For production-like migrations, consider using:
- **Knex.js** - Schema builder and migration tool
- **Sequelize** - ORM with migrations
- **TypeORM** - TypeScript ORM with migrations
- **Prisma** - Modern ORM with migrations
- **node-pg-migrate** - PostgreSQL-specific migrations

These tools provide versioning, rollback, and better control than init scripts.
