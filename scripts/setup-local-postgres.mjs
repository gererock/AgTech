import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const env = { ...process.env };
const databaseName = env.POSTGRES_DB || 'agro_operativo';
const appUser = env.POSTGRES_USER || 'agro';
const appPassword = env.POSTGRES_PASSWORD || 'agro';
const requestedPort = env.POSTGRES_PORT || '5434';
const superUser = env.POSTGRES_SUPERUSER || appUser;
const superPassword = env.POSTGRES_SUPER_PASSWORD || appPassword;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: 'pipe',
    ...options,
  });

  if (result.status !== 0) {
    const details = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    throw new Error(`Command failed: ${command} ${args.join(' ')}${details ? `\n${details}` : ''}`);
  }

  return result;
}

function runAndCapture(command, args, options = {}) {
  const result = run(command, args, options);
  return (result.stdout || '').trim();
}

function commandExists(command) {
  const result = spawnSync(command, ['--version'], {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: 'pipe',
  });

  return result.status === 0 || result.error === undefined;
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });

    server.listen(port, '127.0.0.1');
  });
}

async function getAvailablePort(startPort) {
  let candidate = Number(startPort);

  while (candidate <= 65535) {
    if (await isPortAvailable(candidate)) {
      return String(candidate);
    }
    candidate += 1;
  }

  throw new Error('Could not find an available local port for PostgreSQL.');
}

async function waitForDockerPostgres() {
  const attempts = 30;
  const delayMs = 2000;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const result = run('docker', ['compose', 'exec', '-T', 'db', 'pg_isready', '-U', appUser, '-d', databaseName], {
        env: { ...env, PGPASSWORD: superPassword },
      });
      if (result.status === 0) {
        return;
      }
    } catch {
      // keep trying until the container is ready
    }

    if (attempt < attempts) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error('Timed out waiting for PostgreSQL inside Docker to become ready.');
}

async function ensureDockerPostgres() {
  if (!commandExists('docker')) {
    throw new Error('Docker is not available. Install Docker or configure a local PostgreSQL instance and set DATABASE_URL manually.');
  }

  const composeVersion = spawnSync('docker', ['compose', 'version'], {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: 'pipe',
  });

  if (composeVersion.status !== 0) {
    throw new Error('Docker Compose is not available.');
  }

  const composeFileExists = existsSync(path.join(projectRoot, 'docker-compose.yml'));
  if (!composeFileExists) {
    throw new Error('docker-compose.yml was not found in the project root.');
  }

  const hostPort = requestedPort;
  env.POSTGRES_PORT = hostPort;
  env.POSTGRES_DB = databaseName;
  env.POSTGRES_USER = appUser;
  env.POSTGRES_PASSWORD = appPassword;

  run('docker', ['compose', 'up', '-d', '--wait', 'db'], {
    env: { ...process.env, ...env, POSTGRES_PORT: hostPort },
  });
  console.log(`Started PostgreSQL container with Docker Compose on port ${hostPort}.`);
  return hostPort;
}

function createRoleAndDatabase(port) {
  const sql = `
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${appUser}') THEN
        CREATE ROLE "${appUser}" WITH LOGIN CREATEDB PASSWORD '${appPassword}';
      ELSE
        ALTER ROLE "${appUser}" WITH LOGIN CREATEDB PASSWORD '${appPassword}';
      END IF;
    END
    $$;
  `;

  run('docker', ['compose', 'exec', '-T', 'db', 'psql', '-U', superUser, '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', sql], {
    env: { ...env, PGPASSWORD: superPassword, POSTGRES_PORT: port },
  });

  const databaseExists = runAndCapture('docker', ['compose', 'exec', '-T', 'db', 'psql', '-U', superUser, '-d', 'postgres', '-tAc', `SELECT 1 FROM pg_database WHERE datname = '${databaseName}';`], {
    env: { ...env, PGPASSWORD: superPassword, POSTGRES_PORT: port },
  });

  if (databaseExists !== '1') {
    run('docker', ['compose', 'exec', '-T', 'db', 'psql', '-U', superUser, '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', `CREATE DATABASE "${databaseName}" OWNER "${appUser}";`], {
      env: { ...env, PGPASSWORD: superPassword, POSTGRES_PORT: port },
    });
  } else {
    run('docker', ['compose', 'exec', '-T', 'db', 'psql', '-U', superUser, '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', `ALTER DATABASE "${databaseName}" OWNER TO "${appUser}";`], {
      env: { ...env, PGPASSWORD: superPassword, POSTGRES_PORT: port },
    });
  }

  run('docker', ['compose', 'exec', '-T', 'db', 'psql', '-U', superUser, '-d', databaseName, '-v', 'ON_ERROR_STOP=1', '-c', `ALTER SCHEMA public OWNER TO "${appUser}";`], {
    env: { ...env, PGPASSWORD: superPassword, POSTGRES_PORT: port },
  });
  run('docker', ['compose', 'exec', '-T', 'db', 'psql', '-U', superUser, '-d', databaseName, '-v', 'ON_ERROR_STOP=1', '-c', `GRANT ALL PRIVILEGES ON SCHEMA public TO "${appUser}";`], {
    env: { ...env, PGPASSWORD: superPassword, POSTGRES_PORT: port },
  });
}

function writeEnvFile(port) {
  const localEnvPath = path.join(projectRoot, '.env');
  const databaseUrl = `DATABASE_URL="postgresql://${appUser}:${appPassword}@localhost:${port}/${databaseName}?schema=public"\nDASHBOARD_DATA_SOURCE="database"\n`;

  if (existsSync(localEnvPath)) {
    const current = readFileSync(localEnvPath, 'utf8');
    if (current.includes('DATABASE_URL=')) {
      return;
    }
  }

  writeFileSync(localEnvPath, databaseUrl, 'utf8');
}

function runPrismaMigrate(port) {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const prismaEnv = {
    ...env,
    PGPASSWORD: appPassword,
    DATABASE_URL: `postgresql://${appUser}:${appPassword}@localhost:${port}/${databaseName}?schema=public`,
  };

  run(npmCommand, ['exec', '--', 'prisma', 'migrate', 'deploy'], { env: prismaEnv, stdio: 'inherit' });
}

async function main() {
  console.log('Preparing local PostgreSQL for this project...');
  const port = await ensureDockerPostgres();
  await waitForDockerPostgres();
  createRoleAndDatabase(port);
  writeEnvFile(port);
  runPrismaMigrate(port);
  console.log(`Local database is ready: ${databaseName}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
