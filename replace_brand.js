const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname);

function walkAndReplace(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);

        if (stats.isDirectory()) {
            if (file !== 'node_modules' && file !== '.git') {
                walkAndReplace(filePath);
            }
        } else {
            const ext = path.extname(filePath);
            if (['.html', '.js', '.css', '.json'].includes(ext)) {
                let content = fs.readFileSync(filePath, 'utf8');
                let newContent = content.replace(/Life Style/g, 'Life Style');
                if (content !== newContent) {
                    fs.writeFileSync(filePath, newContent, 'utf8');
                    console.log(`Updated: ${filePath}`);
                }
            }
        }
    });
}

console.log('Starting brand replacement in demo...');
walkAndReplace(directoryPath);
console.log('Brand replacement in demo completed.');
