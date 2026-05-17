const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname);
const ext = ['.html', '.js'];

function walkAndReplace(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        // Skip node_modules, .git, and any unnecessary folders to search
        if (file === 'node_modules' || file === '.git' || file === 'backend') continue;
        
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            walkAndReplace(filePath);
        } else if (ext.includes(path.extname(filePath))) {
            let content = fs.readFileSync(filePath, 'utf8');
            
            let newContent = content
                .replace(/Life Style/g, 'Life Style')
                .replace(/Life Style/g, 'Life Style')
                .replace(/lifestyle/gi, 'lifestyle')
                .replace(/Life Style/g, 'Life Style')
                .replace(/lifestyle/gi, 'lifestyle')
                .replace(/lifestyle/g, 'LIFE STYLE')
                .replace(/LS-/g, 'LS-');
                
            if (content !== newContent) {
                fs.writeFileSync(filePath, newContent);
                console.log(`Updated ${filePath}`);
            }
        }
    }
}

walkAndReplace(directoryPath);
