import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const runBackup = () => {
  return new Promise((resolve, reject) => {
    const rootDir = path.resolve(__dirname);
    const backupDir = path.join(rootDir, 'backups');

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const date = new Date();
    const timestamp = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}-${date.getMinutes().toString().padStart(2, '0')}`;
    const fileName = `chifoneszuzu_${timestamp}.zip`;
    const outputPath = path.join(backupDir, fileName);
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      resolve({ fileName, size: (archive.pointer() / 1024 / 1024).toFixed(2) });
    });

    archive.on('warning', (err) => { 
      if (err.code === 'ENOENT') console.warn(err); 
      else reject(err); 
    });
    archive.on('error', (err) => { reject(err); });

    archive.pipe(output);

    archive.glob('**/*', {
      cwd: rootDir,
      ignore: [
        'node_modules/**',
        '**/node_modules/**',
        'frontend/dist/**',
        'frontend/build/**',
        'backups/**',
        '.git/**',
        '.env*',
        '*.zip'
      ]
    });

    archive.finalize();
  });
};

// Permitir ejecución directa desde terminal
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runBackup()
    .then(res => console.log(`✔ Backup completado: ${res.fileName}`))
    .catch(err => console.error(err));
}