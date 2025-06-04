#!/usr/bin/env node

const fs = require('fs-extra'); // Usando fs-extra para cópia recursiva fácil
const path = require('path');

const sourceMigrationsDir = path.join(__dirname, '..', 'migrations'); // Caminho para as migrações na sua biblioteca

// O primeiro argumento após o nome do script é obrigatório - diretório de destino
const targetDirArg = process.argv[2];

if (!targetDirArg) {
  console.error('❌ Erro: Diretório de destino é obrigatório!');
  console.log('');
  console.log('📚 Uso correto:');
  console.log('  npx audit-log-copy-migrations <diretorio-destino>');
  console.log('');
  console.log('📝 Exemplos:');
  console.log('  npx audit-log-copy-migrations migrations');
  console.log('  npx audit-log-copy-migrations database/migrations');
  console.log('  npx audit-log-copy-migrations src/migrations');
  console.log('');
  process.exit(1);
}

const targetMigrationsDir = path.resolve(process.cwd(), targetDirArg);

async function copyMigrations() {
  try {
    if (!fs.existsSync(sourceMigrationsDir)) {
      console.error(`Diretório de origem das migrações não encontrado: ${sourceMigrationsDir}`);
      process.exit(1);
    }

    await fs.ensureDir(targetMigrationsDir); // Garante que o diretório de destino exista

    const files = await fs.readdir(sourceMigrationsDir);

    for (const file of files) {
      const sourceFilePath = path.join(sourceMigrationsDir, file);
      const stats = await fs.stat(sourceFilePath);

      if (stats.isFile()) {
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        const timestamp = `${year}${month}${day}${hours}${minutes}${seconds}`;

        const newFileName = `${timestamp}-${file}`;
        const targetFilePath = path.join(targetMigrationsDir, newFileName);

        await fs.copy(sourceFilePath, targetFilePath, { overwrite: false });
        console.log(`Arquivo de migração copiado para: ${targetFilePath}`);
      }
    }

    console.log(`Todas as migrações foram copiadas de ${sourceMigrationsDir} para ${targetMigrationsDir} com timestamp.`);
    console.log(`Lembre-se de configurar sua ferramenta de migração (ex: Sequelize CLI) para usar o diretório: ${targetMigrationsDir}`);
  } catch (error) {
    console.error('Erro ao copiar migrações:', error);
    process.exit(1);
  }
}

copyMigrations();
