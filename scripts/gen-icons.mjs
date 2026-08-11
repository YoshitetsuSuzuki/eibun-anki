// アプリアイコンを生成する。外部ライブラリを足さずに済むよう PNG は自前で書き出す。
// 図案: 夜の紙に重なった 2 枚の暗記カード。手前の琥珀色の札に 3 本の行。
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

const BG = [0x12, 0x14, 0x1a]
const AMBER = [0xe3, 0xa7, 0x5b]
const SAGE = [0x7f, 0xbf, 0xa3]
const INK = [0x1a, 0x12, 0x06]

/** 中心・回転を持つ座標系。カード内の要素はこの中で位置を決める。 */
function frame(cx, cy, deg) {
  const rad = (deg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return (x, y) => {
    const dx = x - cx
    const dy = y - cy
    return [dx * cos + dy * sin, -dx * sin + dy * cos]
  }
}

function roundedRectHit(lx, ly, w, h, r) {
  const dx = Math.max(Math.abs(lx) - (w / 2 - r), 0)
  const dy = Math.max(Math.abs(ly) - (h / 2 - r), 0)
  return dx * dx + dy * dy <= r * r
}

function buildShapes(size, inset) {
  const s = size
  const c = s / 2
  // maskable 用に内側へ寄せられるよう、図案全体の縮尺を渡せるようにしてある。
  const k = inset

  const back = frame(c - 0.045 * s, c + 0.028 * s, -13)
  const front = frame(c + 0.035 * s, c - 0.016 * s, 7)

  const backCard = { w: 0.36 * s * k, h: 0.48 * s * k, r: 0.05 * s * k }
  const frontCard = { w: 0.39 * s * k, h: 0.51 * s * k, r: 0.05 * s * k }
  const lineH = 0.036 * s * k
  const lines = [
    { w: 0.24 * s * k, y: -0.075 * s * k },
    { w: 0.27 * s * k, y: 0.005 * s * k },
    { w: 0.15 * s * k, y: 0.085 * s * k },
  ]

  return (x, y) => {
    let color = BG

    // 上方向からの淡い灯り
    const gx = (x - c) / s
    const gy = (y - 0.05 * s) / s
    const glow = Math.max(0, 1 - Math.hypot(gx, gy) / 0.62) ** 2 * 0.16
    color = mix(color, AMBER, glow)

    const [bx, by] = back(x, y)
    if (roundedRectHit(bx, by, backCard.w, backCard.h, backCard.r)) {
      color = mix(color, SAGE, 0.62)
    }

    const [fx, fy] = front(x, y)
    if (roundedRectHit(fx, fy, frontCard.w, frontCard.h, frontCard.r)) {
      color = AMBER
      for (const line of lines) {
        if (roundedRectHit(fx, fy - line.y, line.w, lineH, lineH / 2)) {
          color = mix(AMBER, INK, 0.88)
        }
      }
    }

    return color
  }
}

function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ]
}

const SAMPLES = 4

function render(size, inset) {
  const shade = buildShapes(size, inset)
  const raw = Buffer.alloc(size * (size * 3 + 1))
  let p = 0

  for (let y = 0; y < size; y += 1) {
    raw[p] = 0 // フィルタなし
    p += 1
    for (let x = 0; x < size; x += 1) {
      let r = 0
      let g = 0
      let b = 0
      for (let sy = 0; sy < SAMPLES; sy += 1) {
        for (let sx = 0; sx < SAMPLES; sx += 1) {
          const c = shade(x + (sx + 0.5) / SAMPLES, y + (sy + 0.5) / SAMPLES)
          r += c[0]
          g += c[1]
          b += c[2]
        }
      }
      const n = SAMPLES * SAMPLES
      raw[p] = Math.round(r / n)
      raw[p + 1] = Math.round(g / n)
      raw[p + 2] = Math.round(b / n)
      p += 3
    }
  }
  return raw
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

function png(size, raw) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // truecolor
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const TARGETS = [
  { file: 'icon-512.png', size: 512, inset: 1 },
  { file: 'icon-192.png', size: 192, inset: 1 },
  { file: 'apple-touch-icon.png', size: 180, inset: 1 },
  { file: 'icon-maskable-512.png', size: 512, inset: 0.78 },
]

mkdirSync(OUT_DIR, { recursive: true })
for (const target of TARGETS) {
  const buffer = png(target.size, render(target.size, target.inset))
  writeFileSync(join(OUT_DIR, target.file), buffer)
  console.log(`${target.file}  ${target.size}px  ${(buffer.length / 1024).toFixed(1)} KB`)
}
