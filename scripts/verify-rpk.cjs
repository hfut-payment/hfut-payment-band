// Read-only verification of Vela's two RPK signature layers and resource hashes.
const fs=require('node:fs');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const JSZip=require(require.resolve('jszip',{paths:[process.env.CAMPUS_BAND_NODE_MODULES || __dirname]}));
const sha=b=>crypto.createHash('sha256').update(b).digest();
const u32=(b,o)=>b.readUInt32LE(o);
const lp=(b,o)=>b.subarray(o+4,o+4+u32(b,o));
function verifySignature(b){
  const end=b.lastIndexOf(Buffer.from('504b0506','hex'));
  assert(end>=0,'Missing ZIP end record');
  const cd=u32(b,end+16);
  assert.equal(b.subarray(cd-16,cd).toString(),'RPK Sig Block 42','Missing RPK signature');
  const size=Number(b.readBigUInt64LE(cd-24));
  const start=cd-size-8;
  assert(start>=0&&b.readBigUInt64LE(start)===BigInt(size),'Invalid signature block size');
  let signing=null,files=null;
  for(let p=start+8;p<cd-24;){
    const len=Number(b.readBigUInt64LE(p)),id=u32(b,p+8);
    const value=b.subarray(p+12,p+8+len);
    if(id===0x01000101)signing=value;
    if(id===0x01000201)files=value;
    p+=8+len;
  }
  assert(signing&&files,'Missing signatures');
  const signer=lp(signing,4),data=lp(signer,0);
  const signatures=lp(signer,4+data.length);
  assert.equal(u32(signatures,4),0x0103,'Unexpected signature algorithm');
  const signature=lp(signatures,8);
  const publicDer=lp(signer,8+data.length+signatures.length);
  const key=crypto.createPublicKey({key:publicDer,format:'der',type:'spki'});
  assert(crypto.verify('RSA-SHA256',data,key,signature),'Invalid RSA signature');
  const digests=lp(data,0),digest=lp(lp(digests,0),4);
  const certificates=lp(data,4+digests.length);
  const certificate=new crypto.X509Certificate(lp(certificates,0));
  assert(certificate.publicKey.export({type:'spki',format:'der'}).equals(publicDer),'Certificate/public-key mismatch');
  const footer=Buffer.from(b.subarray(end));footer.writeUInt32LE(start,16);
  const chunks=[b.subarray(0,start),b.subarray(cd,end),footer].map(chunk=>{
    const header=Buffer.alloc(5);header[0]=0xa5;header.writeUInt32LE(chunk.length,1);
    return sha(Buffer.concat([header,chunk]));
  });
  assert(sha(Buffer.concat([Buffer.from([0x5a,3,0,0,0]),...chunks])).equals(digest),'Signed package digest mismatch');
  const fileData=lp(files,4),fileSignature=lp(files,8+fileData.length);
  assert.equal(u32(fileSignature,0),0x0103);
  assert(crypto.verify('RSA-SHA256',fileData,key,lp(fileSignature,4)),'Invalid file-list RSA signature');
  return {fingerprint:certificate.fingerprint256,validFrom:certificate.validFrom,validTo:certificate.validTo};
}
async function verifyRpk(b){
  const outer=verifySignature(b),zip=await JSZip.loadAsync(b);
  const cert=await zip.file('META-INF/CERT').async('nodebuffer');
  const inner=verifySignature(cert);
  assert.equal(inner.fingerprint,outer.fingerprint);
  const meta=await JSZip.loadAsync(cert);
  const hashes=JSON.parse(await meta.file('hash.json').async('string'));
  assert.equal(hashes.algorithm,'SHA-256');
  for(const [name,hash] of Object.entries(hashes.digests)){
    assert(zip.file(name),'Missing resource: '+name);
    assert.equal(sha(await zip.file(name).async('nodebuffer')).toString('hex'),hash,'Resource hash mismatch: '+name);
  }
  const names=Object.values(zip.files).filter(f=>!f.dir&&f.name!=='META-INF/CERT').map(f=>f.name).sort();
  assert.deepEqual(names,Object.keys(hashes.digests).sort(),'Unsigned or missing resources');
  return {...outer,resources:names.length};
}
module.exports={verifyRpk};
if(require.main===module)verifyRpk(fs.readFileSync(process.argv[2])).then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e.message);process.exitCode=1});
