const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'dist');
const destDir = path.join(__dirname, 'Amoreja_Pronto_Para_Hostinger');

// 1. Limpar pasta de assets antiga para garantir que nenhum bundle antigo permaneça
const destAssetsDir = path.join(destDir, 'assets');
if (fs.existsSync(destAssetsDir)) {
  console.log('--- LIMPANDO ASSETS ANTIGOS EM Amoreja_Pronto_Para_Hostinger/assets ---');
  fs.rmSync(destAssetsDir, { recursive: true, force: true });
}

function copyRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied: ${entry.name}`);
    }
  }
}

console.log('--- SINCRONIZANDO DIST PARA PASTA DE PUBLICAÇÃO ---');
copyRecursive(srcDir, destDir);

// Garantir que a pasta api/ possui os endpoints essenciais
const srcApiDir = path.join(srcDir, 'api');
const destApiDir = path.join(destDir, 'api');
if (fs.existsSync(srcApiDir)) {
  copyRecursive(srcApiDir, destApiDir);
}

console.log('✅ Sincronização concluída com sucesso!');
