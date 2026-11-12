import brightness from '@system.brightness'

// Midpoint of the Vela brightness scale for the first scanner retest.
const SCAN_BRIGHTNESS = 128

// One session across page/application teardown. Native calls run once per entry,
// never on the QR refresh timer. Serialize writes so exit also restores a late boost.
export function createScreenSession(api){
  let wanted=false,running=false,saved=null
  function call(name,args){
    return new Promise(resolve=>{
      let done=false
      function finish(ok,data){if(!done){done=true;resolve({ok,data})}}
      try{api[name](Object.assign({},args,{success:data=>finish(true,data),fail:()=>finish(false)}))}
      catch(e){finish(false)}
    })
  }
  function keep(on){
    call('setKeepScreenOn',{keepScreenOn:on}).then(result=>{
      // A completion from an older page must not leave the screen awake after exit.
      if(result.ok&&wanted!==on)keep(wanted)
    })
  }
  function restore(original){
    // In automatic mode getValue may report zero rather than a manual setting.
    // Never write that zero back. Submit restoration before page teardown, not
    // from a second awaited callback that the framework may already have dropped.
    return original.mode===1?call('setMode',{mode:1}):Promise.all([
      call('setValue',{value:original.value}),call('setMode',{mode:0})
    ])
  }
  async function reconcile(){
    if(running)return
    running=true
    try{
      while(true){
        if(!wanted&&saved){
          const original=saved
          await restore(original)
          saved=null
        }else if(wanted&&!saved){
          const mode=await call('getMode',{})
          if(!wanted)break
          if(!mode.ok||!mode.data||(mode.data.mode!==0&&mode.data.mode!==1))break
          const value=await call('getValue',{})
          if(!wanted)break
          if(!value.ok||!value.data||!Number.isInteger(value.data.value)||value.data.value<0||value.data.value>255)break
          if(mode.data.mode===0&&value.data.value===0)break
          saved={mode:mode.data.mode,value:value.data.value}
          const manual=await call('setMode',{mode:0})
          if(manual.ok&&wanted)await call('setValue',{value:SCAN_BRIGHTNESS})
          if(wanted)break
        }else break
      }
    }finally{running=false}
  }
  return {
    enter(){if(wanted)return;wanted=true;keep(true);reconcile()},
    leave(){if(!wanted)return;wanted=false;keep(false);if(running&&saved)restore(saved);reconcile()}
  }
}
export const screenSession=createScreenSession(brightness)
