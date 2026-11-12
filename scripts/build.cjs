// Invoke the official builder directly; do not initialize a simulator or touch ~/.vela.
const path=require('node:path');
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');

const root=path.resolve(__dirname,'..');
const dependencies=path.resolve(process.env.CAMPUS_BAND_NODE_MODULES || path.join(root,'node_modules'));
const Builder=require(path.join(dependencies,'aiot-toolkit/lib/builder/VelaUxBuilder')).default;
const JSZip=require(require.resolve('jszip',{paths:[dependencies]}));
const source=path.join(root,'src');
const manifest=JSON.parse(fs.readFileSync(path.join(source,'manifest.json'),'utf8'));
const releaseVersion=process.env.CAMPUS_RELEASE_VERSION;
const releaseCode=process.env.CAMPUS_RELEASE_VERSION_CODE;
if(releaseVersion!==undefined||releaseCode!==undefined){
  if(!/^[0-9]+\.[0-9]+\.[0-9]+(?:-[a-z0-9.-]+)?$/.test(releaseVersion||'')||
      !/^[1-9][0-9]*$/.test(releaseCode||'')||Number(releaseCode)>2100000000){
    throw new Error('Set a valid CAMPUS_RELEASE_VERSION and CAMPUS_RELEASE_VERSION_CODE together');
  }
  manifest.versionName=releaseVersion;
  manifest.versionCode=Number(releaseCode);
}
// The official UX collector scans the entire project, including vendor/legacy JS.
// Compile an isolated source-only project so archived code cannot add features.
const local=path.join(root,'.local');fs.mkdirSync(local,{recursive:true});
const staging=fs.mkdtempSync(path.join(local,'band-project-'));
fs.cpSync(source,path.join(staging,'src'),{recursive:true});
fs.writeFileSync(path.join(staging,'src','manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const buildPackage=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
// Node uses ESM for renderer tests. Vela's Babel output uses CommonJS module
// bindings, which the bundler must resolve inside the RPK.
delete buildPackage.type;
fs.writeFileSync(path.join(staging,'package.json'),JSON.stringify(buildPackage));
fs.symlinkSync(dependencies,path.join(staging,'node_modules'),process.platform==='win32'?'junction':'dir');
const options={mode:process.argv.includes('--release')?'production':'development',watch:false,enableJsc:false,enableProtobuf:false,dropConsole:true};
const sign=path.resolve(process.env.CAMPUS_BETA_SIGN_DIR || path.join(root,'sign'));
if(fs.existsSync(path.join(sign,'private.pem'))&&fs.existsSync(path.join(sign,'certificate.pem'))){options.signRequest=async()=>({privatekey:fs.readFileSync(path.join(sign,'private.pem')),certificate:fs.readFileSync(path.join(sign,'certificate.pem'))})}
else if(process.argv.includes('--release'))throw new Error('Create a local signing identity: node scripts/create-signing-key.cjs');
const builder=new Builder({onBuildError:error=>{console.error(error);process.exitCode=1},onBuildSuccess:data=>{if(!data.info||!data.info.rpk){process.exitCode=1}}});
async function verifyBootstrap(file){
  const archive=await JSZip.loadAsync(fs.readFileSync(file));
  for(const name of ['app.js','Card/index.js']){
    const source=await archive.file(name).async('string');
    const load=vm.runInNewContext('('+source.replace(/^export default /,'').trim()+')',
      {$app_require$:()=>({})},{filename:name});
    const moduleExports={};
    load({}, {}, {}, moduleExports, {});
    if(name==='app.js')assert.equal(typeof moduleExports.default.onDestroy,'function');
    else{
      const page={};
      moduleExports.entry(page);
      assert.equal(typeof page.default.onInit,'function');
    }
  }
}
async function build(){
  try{
    await builder.build(staging,options);
    if(process.exitCode)throw new Error('Official builder failed');
    const name=manifest.package+(options.mode==='production'?'.release.':'.debug.')+manifest.versionName+'.rpk';
    const rpk=path.join(staging,'dist',name);
    await verifyBootstrap(rpk);
    fs.mkdirSync(path.join(root,'dist'),{recursive:true});
    fs.copyFileSync(rpk,path.join(root,'dist',name));
  }finally{
    await builder.dispose();
    // Only remove the uniquely created source staging directory; never follow junctions.
    if(!staging.startsWith(path.resolve(local)+path.sep))throw new Error('Invalid build cleanup path');
    function unlinkJunctions(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,item.name);if(fs.lstatSync(full).isSymbolicLink())fs.unlinkSync(full);else if(item.isDirectory())unlinkJunctions(full)}}
    unlinkJunctions(staging);fs.rmSync(staging,{recursive:true});
  }
}
build().catch(error=>{console.error(error.message||error);process.exitCode=1});
