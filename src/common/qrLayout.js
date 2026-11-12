// Resized originals report their guaranteed white margin in pixels.
// Legacy four-module PNGs keep their original conservative corner layout.
export function layoutForQr(side,quietModules=4,quietPixels,maxSide=196){
  const renderSide=Math.min(side,maxSide)
  let quiet=0
  if(quietModules===1){
    if(Number.isInteger(quietPixels)&&quietPixels>=1&&quietPixels<=32&&quietPixels<=side/4)quiet=quietPixels*renderSide/side
  }else{
    let minimumScale=Infinity
    for(let scale=2;scale<=7;scale++){
      const modules=side/scale
      if(Number.isInteger(modules)&&modules>=29&&modules<=185&&(modules-29)%4===0)minimumScale=Math.min(minimumScale,scale)
    }
    if(minimumScale!==Infinity)quiet=4*minimumScale*renderSide/side
  }
  const cornerRadius=quietModules===1?(quiet>=2?Math.min(9,Math.floor(quiet)):0):(quiet>=12?12:quiet>=6?6:0)
  return {renderSide,cardSide:renderSide,cornerRadius}
}
