// Vela scales design px by the physical screen width / manifest designWidth.
const DESIGN_WIDTH = 212
const BAR_PIXELS_WIDE = 96
const BAR_CARD_PADDING = 8

export function layoutForScreen(info) {
  const width = Number(info && info.screenWidth)
  const height = Number(info && info.screenHeight)
  const hasSize = width > 0 && height > 0 && isFinite(width) && isFinite(height)
  const scale = hasSize ? width / DESIGN_WIDTH : 1
  const screenHeight = hasSize ? Math.floor(height / scale) : DESIGN_WIDTH
  const shape = info && info.screenShape
  const tall = shape === 'pill-shaped' || screenHeight >= 400
  const round = shape === 'circle' || (!shape && screenHeight <= 225)
  const captionHeight = tall ? 28 : 20
  const gap = tall ? 26 : 8
  const radius = Math.min(DESIGN_WIDTH, screenHeight) / 2 - 8
  const qrSide = Math.min(196, screenHeight - 2 * (captionHeight + gap + 8),
    round ? Math.floor(radius * Math.SQRT2) - 14 : 196)
  const captionOffset = qrSide / 2 + gap + captionHeight
  const captionWidth = round
    ? Math.floor(2 * Math.sqrt(Math.max(0, radius * radius - captionOffset * captionOffset)))
    : 188
  const barcodeWidth = Math.ceil(BAR_PIXELS_WIDE / scale)
  const halfBarcodeCardWidth = (barcodeWidth + BAR_CARD_PADDING) / 2
  const maxBarHeight = round
    ? Math.floor(2 * Math.sqrt(Math.max(0, radius * radius - halfBarcodeCardWidth * halfBarcodeCardWidth)))
    : screenHeight - (tall ? 28 : 16)

  return {
    scale, qrSide, captionHeight, captionWidth, gap,
    barcodeWidth, maxBarPixels: Math.max(0, Math.min(484, Math.floor((maxBarHeight - BAR_CARD_PADDING) * scale))),
    balanceFont: tall ? 22 : 18
  }
}
