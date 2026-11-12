import interconnect from '@system.interconnect'

let link = null
let connection = null
let receiver = null
let connectionRevision = 0

function reportConnection(ready) {
  connectionRevision++
  if (connection) connection(ready)
}

function channel() {
  if (link) return link
  try {
    link = interconnect.instance()
    link.onmessage = event => {
      const data = event && event.data !== undefined ? event.data : event
      if (data === 'start') {
        send({type: 'ready'})
        reportConnection(true)
        return
      }
      let frame
      try { frame = typeof data === 'string' ? JSON.parse(data) : data } catch (e) { return }
      if (receiver && frame && frame.v === 2) receiver(frame)
    }
    link.onopen = () => { send({type: 'ready'}); reportConnection(true) }
    link.onclose = link.onerror = () => reportConnection(false)
  } catch (e) { link = null }
  return link
}

export function send(data, failed) {
  try { channel().send({data, fail: () => { if (failed) failed() }}) }
  catch (e) { if (failed) failed() }
}

export function watch(onConnection, onFrame) {
  connectionRevision++
  connection = onConnection
  receiver = onFrame
  if (onConnection) probe()
}

export function probe() {
  const revision = ++connectionRevision
  const report = ready => { if (revision === connectionRevision) reportConnection(ready) }
  try { channel().getReadyState({success: state => report(state.status === 1), fail: () => report(false)}) }
  catch (e) { report(false) }
}
