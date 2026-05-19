const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const publicDir = path.join(rootDir, 'public');

// 1. Create public directory if it doesn't exist
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
}

// 2. Read app.js and inject API_URL
const appJsPath = path.join(rootDir, 'app.js');
let appJsContent = fs.readFileSync(appJsPath, 'utf8');

const apiUrl = process.env.API_URL || 'https://life-style-production.up.railway.app';
appJsContent = appJsContent.replace(
    /const API_URL = '.*?';/, 
    `const API_URL = '${apiUrl}';`
);

// 3. Write the modified app.js to public folder
fs.writeFileSync(path.join(publicDir, 'app.js'), appJsContent);
console.log(`Build complete. API_URL successfully set to: ${apiUrl}`);

// 4. Copy all necessary frontend files to public folder
const filesToCopy = fs.readdirSync(rootDir);
const allowedExtensions = ['.html', '.css'];

filesToCopy.forEach(file => {
    const srcPath = path.join(rootDir, file);
    const destPath = path.join(publicDir, file);

    const stat = fs.statSync(srcPath);

    // Copy HTML and CSS files
    if (stat.isFile() && allowedExtensions.includes(path.extname(file))) {
        fs.copyFileSync(srcPath, destPath);
    } 
    // Copy assets folder
    else if (stat.isDirectory() && file === 'assets') {
        copyFolderSync(srcPath, destPath);
    }
});

// Helper function to recursively copy folders
function copyFolderSync(from, to) {
    if (!fs.existsSync(to)) {
        fs.mkdirSync(to);
    }
    fs.readdirSync(from).forEach(element => {
        const stat = fs.statSync(path.join(from, element));
        if (stat.isFile()) {
            fs.copyFileSync(path.join(from, element), path.join(to, element));
        } else if (stat.isDirectory()) {
            copyFolderSync(path.join(from, element), path.join(to, element));
        }
    });
}
