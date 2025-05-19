#!/usr/bin/env node

const fs = require('fs-extra'); // Usando fs-extra para cópia recursiva fácil
const path = require('path');

const sourceMigrationsDir = path.join(__dirname, '..', 'migrations'); // Caminho para as migrações na sua biblioteca
const defaultTargetDir = 'migrations'; // Diretório padrão no projeto do usuário

// O primeiro argumento após o nome do script pode ser o diretório de destino
const targetDirArg = process.argv[2];
const targetMigrationsDir = path.resolve(process.cwd(), targetDirArg || defaultTargetDir);

async function copyMigrations() {
  try {
    if (!fs.existsSync(sourceMigrationsDir)) {
      console.error(`Diretório de origem das migrações não encontrado: ${sourceMigrationsDir}`);
      process.exit(1);
    }

    await fs.ensureDir(targetMigrationsDir); // Garante que o diretório de destino exista
    await fs.copy(sourceMigrationsDir, targetMigrationsDir, { overwrite: false }); // overwrite: false para não sobrescrever por padrão

    console.log(`Migrações copiadas de ${sourceMigrationsDir} para ${targetMigrationsDir}`);
    console.log(`Lembre-se de configurar sua ferramenta de migração (ex: Sequelize CLI) para usar o diretório: ${targetMigrationsDir}`);
  } catch (error) {
    console.error('Erro ao copiar migrações:', error);
    process.exit(1);
  }
}

copyMigrations();
