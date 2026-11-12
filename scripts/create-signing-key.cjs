// Creates a local development identity. Existing private keys are never overwritten.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {KJUR}=require('jsrsasign');
const root=path.resolve(__dirname,'../sign');fs.mkdirSync(root,{recursive:true});
if(fs.existsSync(path.join(root,'private.pem'))){console.log('Existing local signing identity retained.');process.exit(0)}
const keys=crypto.generateKeyPairSync('rsa',{modulusLength:2048,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});
function utc(d){return d.toISOString().replace(/[-:T]/g,'').slice(2,14)+'Z'}
const certificate=KJUR.asn1.x509.X509Util.newCertPEM({serial:{int:crypto.randomInt(1,2147483647)},sigalg:'SHA256withRSA',issuer:{str:'/CN=HFUT Campus Card Development'},subject:{str:'/CN=HFUT Campus Card Development'},notbefore:{str:utc(new Date(Date.now()-86400000))},notafter:{str:utc(new Date(Date.now()+3650*86400000))},sbjpubkey:keys.publicKey,cakey:keys.privateKey});
const parsed=new crypto.X509Certificate(certificate);if(!parsed.verify(crypto.createPublicKey(keys.publicKey)))throw new Error('Certificate verification failed');
fs.writeFileSync(path.join(root,'private.pem'),keys.privateKey,{mode:0o600});fs.writeFileSync(path.join(root,'certificate.pem'),certificate);console.log('Created local signing identity; SHA-256: '+parsed.fingerprint256);
