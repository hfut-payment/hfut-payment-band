// Build a portable RPK from this checkout. npm ci is a separate, unprivileged step.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { X509Certificate } = require('node:crypto');
const { verifyRpk } = require('./verify-rpk.cjs');
const JSZip = require('jszip');
const root = path.resolve(__dirname, '..');

async function main() {
  const [mode, destination, expectedVersion] = process.argv.slice(2);
  if (!['debug', 'release'].includes(mode) || !destination) {
    throw new Error('Usage: node scripts/package-rpk.cjs debug|release OUTPUT_DIRECTORY [EXPECTED_VERSION]');
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'src/manifest.json'), 'utf8'));
  if (!/^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/.test(manifest.versionName) ||
      !/^[a-zA-Z0-9.]+$/.test(manifest.package) ||
      (expectedVersion && manifest.versionName !== expectedVersion)) {
    throw new Error('RPK manifest does not match the requested version');
  }
  const signed = mode === 'release';
  const fingerprint = fs.readFileSync(path.join(__dirname, 'release-certificate.sha256'), 'utf8').trim();
  const env = { ...process.env };
  for (const key of ['CAMPUS_RELEASE_VERSION', 'CAMPUS_RELEASE_VERSION_CODE', 'CAMPUS_BAND_NODE_MODULES',
    'CAMPUS_BETA_SIGN_DIR', 'HFUT_SIGNING_P12_B64', 'CAMPUS_SIGNING_PASSWORD']) delete env[key];

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hfut-rpk-'));
  try {
    if (signed) {
      const input = path.join(tmp, 'release.p12');
      const key = path.join(tmp, 'private.pem');
      const cert = path.join(tmp, 'certificate.pem');
      if (!process.env.HFUT_SIGNING_P12_B64 || !process.env.CAMPUS_SIGNING_PASSWORD) {
        throw new Error('Official RPK packaging requires HFUT_SIGNING_P12_B64 and CAMPUS_SIGNING_PASSWORD');
      }
      fs.writeFileSync(input, Buffer.from(process.env.HFUT_SIGNING_P12_B64, 'base64'), { mode: 0o600 });
      const openssl = (...args) => execFileSync('openssl', args, {
        env: { ...env, CAMPUS_SIGNING_PASSWORD: process.env.CAMPUS_SIGNING_PASSWORD }, stdio: ['pipe', 'pipe', 'pipe']
      });
      const pkcs12 = (...args) => openssl('pkcs12', '-in', input, '-passin', 'env:CAMPUS_SIGNING_PASSWORD', ...args);
      const rawCert = pkcs12('-clcerts', '-nokeys').toString('utf8');
      const pem = rawCert.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/)?.[0];
      if (!pem || new X509Certificate(pem).fingerprint256.replaceAll(':', '').toLowerCase() !== fingerprint) {
        throw new Error('The release certificate does not match the installed RPK identity');
      }
      fs.writeFileSync(cert, pem + '\n', { mode: 0o600 });
      const rawKey = pkcs12('-nocerts', '-nodes').toString('utf8');
      const pemKey = rawKey.match(/-----BEGIN (?:RSA )?PRIVATE KEY-----[\s\S]+?-----END (?:RSA )?PRIVATE KEY-----/)?.[0];
      if (!pemKey) throw new Error('PKCS#12 does not contain a private key');
      fs.writeFileSync(key, pemKey + '\n', { mode: 0o600 });
      fs.unlinkSync(input);
      env.CAMPUS_BETA_SIGN_DIR = tmp;
    } else {
      // An empty, unique directory prevents a local release key from being picked up for debug builds.
      env.CAMPUS_BETA_SIGN_DIR = tmp;
    }
    const rpk = path.join(root, 'dist', manifest.package + '.' + mode + '.' + manifest.versionName + '.rpk');
    fs.rmSync(rpk, { force: true });
    execFileSync(process.execPath, [path.join(__dirname, 'build.cjs'), ...(signed ? ['--release'] : [])],
      { cwd: root, env, stdio: 'inherit' });
    const bytes = fs.readFileSync(rpk);
    const zip = await JSZip.loadAsync(bytes);
    const packed = JSON.parse(await zip.file('manifest.json').async('string'));
    if (packed.package !== manifest.package || packed.versionName !== manifest.versionName ||
        packed.versionCode !== manifest.versionCode) throw new Error('Unexpected packaged RPK manifest');
    if (signed) {
      const signature = await verifyRpk(bytes);
      if (signature.fingerprint.replaceAll(':', '').toLowerCase() !== fingerprint) throw new Error('RPK signer mismatch');
    }
    fs.mkdirSync(destination, { recursive: true });
    const file = path.join(destination, 'HFUT-Campus-Band-' + manifest.versionName + (signed ? '' : '-debug') + '.rpk');
    fs.writeFileSync(file, bytes);
    console.log(file);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
main().catch(error => {
  // Do not print subprocess output: OpenSSL processes private key material.
  console.error(error.message);
  process.exitCode = 1;
});
