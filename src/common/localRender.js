import {qrcodegen} from './qrcodegen.js'
import {code128Patterns} from './code128Patterns.js'

const QR_SIDE = 196
const PROFILE = 'zxing-3.5.3-m-utf8'
let crcTable

function crc32(bytes) {
  if (!crcTable) {
    crcTable = new Uint32Array(256)
    for (let i = 0; i < crcTable.length; i++) {
      let value = i
      for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ (-(value & 1) & 0xedb88320)
      crcTable[i] = value
    }
  }
  let crc = -1
  for (let i = 0; i < bytes.length; i++) crc = (crc >>> 8) ^ crcTable[(crc ^ bytes[i]) & 255]
  return ~crc
}

// Match the proven grayscale/8-bit PNG format. These bytes only reach the local
// cache. A stored DEFLATE block avoids shipping a compression runtime.
function png(width, height, rowKey, fillRow) {
  const length = (width + 1) * height
  const bytes = new Uint8Array(length + 68)
  const view = new DataView(bytes.buffer)
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10])
  let pos = 8
  function chunk(name, size, write) {
    view.setUint32(pos, size)
    pos += 4
    const start = pos
    for (let i = 0; i < name.length; i++) bytes[pos++] = name.charCodeAt(i)
    write()
    view.setUint32(pos, crc32(bytes.subarray(start, pos)))
    pos += 4
  }
  chunk('IHDR', 13, () => {
    view.setUint32(pos, width)
    view.setUint32(pos + 4, height)
    bytes[pos + 8] = 8
    pos += 13
  })
  chunk('IDAT', length + 11, () => {
    bytes.set([0x78, 0x01, 1, length & 255, length >>> 8, ~length & 255, (~length >>> 8) & 255], pos)
    pos += 7
    const row = new Uint8Array(width + 1) // Leading PNG filter byte stays zero.
    let a = 1, b = 0
    let previousKey, sum = 0, weighted = 0
    for (let y = 0; y < height; y++) {
      const key = rowKey(y)
      if (key !== previousKey) {
        fillRow(row, key)
        sum = 0
        weighted = 0
        for (let x = 1; x < row.length; x++) {
          sum += row[x]
          weighted += sum
        }
        previousKey = key
      }
      bytes.set(row, pos)
      pos += row.length
      // Apply Adler-32 once per row using its byte sum and prefix sums.
      b = (b + row.length * a + weighted) % 65521
      a = (a + sum) % 65521
    }
    view.setUint32(pos, (b << 16) | a)
    pos += 4
  })
  chunk('IEND', 0, () => {})
  return bytes.buffer
}

export function renderQr(frame) {
  const {code, version, mask, mode, profile} = frame
  if (profile !== PROFILE || typeof code !== 'string' || !code || code.length > 2048 ||
      !Number.isInteger(version) || version < 1 || version > 40 ||
      !Number.isInteger(mask) || mask < 0 || mask > 7) throw new Error('二维码参数无效')
  const size = 17 + version * 4
  if ((size + 2) * 2 > QR_SIDE) throw new Error('二维码超出手环显示密度')
  const S = qrcodegen.QrSegment
  let segments
  if (mode === 'NUMERIC') segments = [S.makeNumeric(code)]
  else if (mode === 'ALPHANUMERIC') segments = [S.makeAlphanumeric(code)]
  else if (mode === 'BYTE') segments = [S.makeEci(26), S.makeBytes(S.toUtf8ByteArray(code))]
  else throw new Error('二维码编码模式不支持')
  const qr = qrcodegen.QrCode.encodeSegments(segments, qrcodegen.QrCode.Ecc.MEDIUM,
    version, version, mask, false)
  const module = pixel => Math.floor((pixel + 0.5) * (size + 2) / QR_SIDE) - 1
  const columns = []
  for (let x = 0; x < QR_SIDE; x++) columns.push(module(x))
  return {
    width: QR_SIDE, height: QR_SIDE, side: QR_SIDE,
    quietPixels: Math.floor(QR_SIDE / (size + 2)),
    buffer: png(QR_SIDE, QR_SIDE, module, (row, y) => {
      for (let x = 0; x < QR_SIDE; x++) row[x + 1] = qr.getModule(columns[x], y) ? 0 : 255
    })
  }
}

// Printable ASCII subset of ZXing 3.5.3 Code128Writer (Apache-2.0).
// The production encoder rejects controls and FNC characters before this point.
export function renderBarcode(code, maxHeight = 484) {
  if (typeof code !== 'string' || !/^[\x20-\x7e]{1,80}$/.test(code)) return null
  const symbols = []
  let codeSet = 0
  for (let i = 0; i < code.length;) {
    let run = 0
    while (/^[0-9]$/.test(code.charAt(i + run))) run++
    const next = run >= 2 && (codeSet !== 100 || (run >= 4 && run % 2 === 0)) ? 99 : 100
    if (codeSet !== next) {
      symbols.push(codeSet ? next : next === 99 ? 105 : 104)
      codeSet = next
    }
    if (codeSet === 99) { symbols.push(Number(code.slice(i, i + 2))); i += 2 }
    else { symbols.push(code.charCodeAt(i) - 32); i++ }
  }
  let check = symbols[0]
  for (let i = 1; i < symbols.length; i++) check += symbols[i] * i
  symbols.push(check % 103, 106)
  const modules = new Array(10).fill(false)
  for (const symbol of symbols) {
    const widths = code128Patterns[symbol]
    for (let i = 0; i < widths.length; i++) {
      for (let x = 0; x < Number(widths[i]); x++) modules.push(i % 2 === 0)
    }
  }
  modules.push(...new Array(10).fill(false))
  const scale = Math.floor(Math.min(484, maxHeight) / modules.length)
  if (scale < 2) return null
  const width = 96, height = scale * modules.length
  return {width, height, buffer: png(width, height, y => modules[Math.floor(y / scale)],
    (row, black) => { row.fill(black ? 0 : 255, 1) })}
}
