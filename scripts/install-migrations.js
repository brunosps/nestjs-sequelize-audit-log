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
  console.log('  npx audit-log-install-migrations <diretorio-destino>');
  console.log('');
  console.log('📝 Exemplos:');
  console.log('  npx audit-log-install-migrations migrations');
  console.log('  npx audit-log-install-migrations database/migrations');
  console.log('  npx audit-log-install-migrations src/migrations');
  console.log('');
  process.exit(1);
}

const targetMigrationsDir = path.resolve(process.cwd(), targetDirArg);

function fileExistsWithoutTimestamp(targetDir, fileName) {
  try {
    const targetFiles = fs.readdirSync(targetDir);

    // Remove extensão para comparação mais precisa
    const fileNameWithoutExt = path.parse(fileName).name;

    // Verifica se existe algum arquivo que termina com o mesmo nome (ignorando timestamp)
    return targetFiles.some(existingFile => {
      const existingFileWithoutExt = path.parse(existingFile).name;
      // Remove timestamp (formato YYYYMMDDHHMMSS-) do início se existir
      const existingFileClean = existingFileWithoutExt.replace(/^\d{14}-/, '');
      return existingFileClean === fileNameWithoutExt;
    });
  } catch (error) {
    // Se o diretório não existir, retorna false
    return false;
  }
}

async function copyMigrations() {
  try {
    if (!fs.existsSync(sourceMigrationsDir)) {
      console.error(`Diretório de origem das migrações não encontrado: ${sourceMigrationsDir}`);
      process.exit(1);
    }

    await fs.ensureDir(targetMigrationsDir); // Garante que o diretório de destino exista

    const files = await fs.readdir(sourceMigrationsDir);
    let copiedCount = 0;
    let skippedCount = 0;

    console.log(`🔍 Verificando ${files.length} arquivo(s) de migração...`);
    console.log('');

    for (const file of files) {
      const sourceFilePath = path.join(sourceMigrationsDir, file);
      const stats = await fs.stat(sourceFilePath);

      if (stats.isFile()) {
        // Verifica se o arquivo já existe (ignorando timestamp)
        if (fileExistsWithoutTimestamp(targetMigrationsDir, file)) {
          console.log(`⚠️  Pulando ${file} - já existe no destino`);
          skippedCount++;
          continue;
        }

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
        console.log(`✅ Arquivo de migração copiado: ${newFileName}`);
        copiedCount++;
      }
    }

    console.log('');
    console.log(`📊 Resumo da operação:`);
    console.log(`   ✅ Arquivos copiados: ${copiedCount}`);
    console.log(`   ⚠️  Arquivos pulados: ${skippedCount}`);
    console.log(`   📁 Diretório destino: ${targetMigrationsDir}`);

    if (copiedCount > 0) {
      console.log('');
      console.log(`🎉 Migrações copiadas com sucesso!`);
      console.log(`💡 Lembre-se de configurar sua ferramenta de migração (ex: Sequelize CLI) para usar o diretório: ${targetMigrationsDir}`);
    } else {
      console.log('');
      console.log(`ℹ️  Nenhuma migração nova foi copiada. Todas já existem no destino.`);
    }
  } catch (error) {
    console.error('❌ Erro ao copiar migrações:', error);
    process.exit(1);
  }
}

copyMigrations();
