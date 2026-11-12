// Xiaomi interconnect_image_demo cache pattern (Apache-2.0). Local bytes only.
import file from '@system.file'

export function createImageCache() {
  let sequence = 0
  const stamp = Date.now()
  const owned = new Set()
  const remove = uri => new Promise(resolve => {
    try { file.delete({uri, success: resolve, fail: resolve}) } catch (e) { resolve() }
  })
  // Clean images left after a killed process, including files from 1.0.x.
  const initialized = new Promise(resolve => {
    try { file.list({uri:'internal://cache', success: result => resolve(result.fileList || []), fail: () => resolve([])}) }
    catch (e) { resolve([]) }
  }).then(entries => Promise.all(entries.map(entry => {
    const name = String(entry.uri || '').split('/').pop()
    if (/^hfut-(card|bar|frame)-[0-9]+-[0-9]+\.png$/.test(name)) return remove('internal://cache/' + name)
  })))
  return {
    async store(image) {
      await initialized
      const uri = 'internal://cache/hfut-frame-' + stamp + '-' + (++sequence) + '.png'
      owned.add(uri)
      try {
        await new Promise((resolve, reject) => {
          try { file.writeArrayBuffer({uri, buffer:image.buffer, append:false, success:resolve, fail:reject}) }
          catch (e) { reject(e) }
        })
        return uri
      } catch (e) {
        owned.delete(uri)
        await remove(uri)
        throw e
      }
    },
    release(uri) { if (owned.delete(uri)) return remove(uri) }
  }
}
