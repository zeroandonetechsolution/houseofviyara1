const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, 'app.js');
let appJsContent = fs.readFileSync(appJsPath, 'utf8');

// Replace the API_URL with the one from Vercel's environment variables (or local .env)
// Note: Vercel injects environment variables during the build process
const apiUrl = process.env.API_URL || 'http://localhost:3000';

appJsContent = appJsContent.replace(
    /const API_URL = '.*?';/, 
    `const API_URL = '${apiUrl}';`
);

fs.writeFileSync(appJsPath, appJsContent);
console.log(`Build complete. API_URL successfully set to: ${apiUrl}`);
