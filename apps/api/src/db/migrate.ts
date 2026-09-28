import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { createConnection, type RowDataPacket } from 'mysql2/promise';

import { env } from '../config/env';

type SchemaMigrationRow = RowDataPacket & {
  id: string;
};

const migrationsDir = join(process.cwd(), 'src', 'db', 'migrations');

async function ensureSchemaMigrationsTable() {
  const connection = await createConnection({
    ...env.mysql,
    multipleStatements: true
  });

  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id VARCHAR(255) NOT NULL PRIMARY KEY,
      executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  return connection;
}

async function runMigrations() {
  const connection = await ensureSchemaMigrationsTable();

  try {
    const [appliedRows] = await connection.query<SchemaMigrationRow[]>(
      'SELECT id FROM schema_migrations'
    );

    const appliedMigrationIds = new Set(appliedRows.map((row) => row.id));
    const migrationFiles = (await readdir(migrationsDir))
      .filter((file) => file.endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b));

    for (const migrationFile of migrationFiles) {
      if (appliedMigrationIds.has(migrationFile)) {
        continue;
      }

      const sql = await readFile(join(migrationsDir, migrationFile), 'utf8');

      await connection.query(sql);
      await connection.query(
        'INSERT INTO schema_migrations (id) VALUES (?)',
        [migrationFile]
      );

      console.log(`Applied migration: ${migrationFile}`);
    }

    if (migrationFiles.every((file) => appliedMigrationIds.has(file))) {
      console.log('No pending migrations.');
    }
  } finally {
    await connection.end();
  }
}

runMigrations().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
