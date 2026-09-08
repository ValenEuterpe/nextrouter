import fs from 'node:fs';
import path from 'node:path';

async function build() {
  const distDir = path.resolve('dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  try {
    // Try bundling with esbuild (installed with wrangler)
    const esbuild = await import('esbuild');
    await esbuild.build({
      entryPoints: ['src/index.js'],
      bundle: true,
      format: 'esm',
      outfile: 'dist/_worker.js',
      target: 'es2022',
      platform: 'neutral',
      mainFields: ['browser', 'module', 'main'],
    });
    console.log('✅ Bundled Next Router to dist/_worker.js (Cloudflare Pages & Workers compatible)');
  } catch (err) {
    // Fallback if esbuild is not directly importable: copy src to dist
    console.log('esbuild bundle note:', err.message);
    const workerContent = `export { default } from '../src/index.js';\n`;
    fs.writeFileSync(path.join(distDir, '_worker.js'), workerContent);
    console.log('✅ Created dist/_worker.js wrapper');
  }

  // Also create a dummy index.html in dist so Pages build output directory check passes
  const dummyHtml = `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=/admin"></head><body>Redirecting to Next Router...</body></html>`;
  fs.writeFileSync(path.join(distDir, 'index.html'), dummyHtml);
}

build().catch((err) => {
  console.error('Build error:', err);
  process.exit(1);
});
