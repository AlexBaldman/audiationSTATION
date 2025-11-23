import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
import { defineConfig } from 'vite';
import { glob } from 'glob';

// Find all HTML files in the html directory
const htmlFiles = glob.sync('html/**/*.html').reduce((acc, file) => {
    const name = file.replace('html/', '').replace('.html', '');
    acc[name] = resolve(__dirname, file);
    return acc;
}, {});

export default defineConfig({
  root: 'html',
  base: '/audiationSTATION/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'html/index.html'),
        ...htmlFiles,
      },
    },
    outDir: '../dist',
  },
});
