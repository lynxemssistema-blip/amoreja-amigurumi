const fs = require('fs');
const path = require('path');

const tables = [
  'profiles',
  'products',
  'orders',
  'order_items',
  'instagram_posts',
  'settings'
];

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // For schema.sql: public.table_name
  tables.forEach(table => {
    const publicRegex = new RegExp(`public\\.${table}\\b`, 'g');
    content = content.replace(publicRegex, `public.New_Amoreja_${table}`);
  });

  // For schema.sql: ON table_name (triggers) or table_name.id
  tables.forEach(table => {
    // Only in SQL context where we might refer without public. (like WHERE profiles.id)
    if (filePath.endsWith('.sql')) {
        const refRegex = new RegExp(`\\b${table}\\.id\\b`, 'g');
        content = content.replace(refRegex, `New_Amoreja_${table}.id`);
        
        const fromRegex = new RegExp(`\\bFROM ${table}\\b`, 'g');
        content = content.replace(fromRegex, `FROM New_Amoreja_${table}`);

        const insertRegex = new RegExp(`\\bINTO ${table}\\b`, 'g');
        content = content.replace(insertRegex, `INTO New_Amoreja_${table}`);
    }
  });

  // For React components: .from('table_name')
  tables.forEach(table => {
    // Avoid re-replacing if it already has New_Amoreja_
    if (!content.includes(`New_Amoreja_${table}`)) {
      const fromRegex = new RegExp(`\\.from\\(['"]${table}['"]\\)`, 'g');
      content = content.replace(fromRegex, `.from('New_Amoreja_${table}')`);
    } else {
      // Just in case there are some left over
      const fromRegex = new RegExp(`\\.from\\(['"]${table}['"]\\)`, 'g');
      content = content.replace(fromRegex, `.from('New_Amoreja_${table}')`);
    }
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

function walkDir(dir) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath);
    } else if (f.endsWith('.js') || f.endsWith('.jsx')) {
      replaceInFile(dirPath);
    }
  });
}

replaceInFile(path.join(__dirname, 'schema.sql'));
walkDir(path.join(__dirname, 'src'));
