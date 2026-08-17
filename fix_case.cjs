const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // We need to change New_Amoreja_ to new_amoreja_ inside .from('...')
  // Regex looks for .from('New_Amoreja_something') and replaces with new_amoreja_something
  const fromRegex = /\.from\(['"]New_Amoreja_([^'"]+)['"]\)/g;
  content = content.replace(fromRegex, ".from('new_amoreja_$1')");

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

walkDir(path.join(__dirname, 'src'));
