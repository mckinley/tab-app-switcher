#!/usr/bin/env node

/**
 * Generates all app icons from source images
 *
 * Source images:
 *   - resources/images/Rounded.png - Rounded corners, transparent background (default)
 *   - resources/images/Full.png - Full bleed, no rounding
 *
 * Generated icons:
 *   - native/build/icon.icns - macOS app icon
 *   - native/build/icon.ico - Windows app icon
 *   - native/build/icon.png - Linux/general app icon (512x512)
 *   - native/resources/icon.png - Electron in-app icon (512x512)
 *   - extension/public/icon/*.png - Extension icons (16, 32, 48, 96, 128)
 *   - site/public/favicon.ico - Website favicon
 *   - site/public/favicon.png - Website favicon PNG (32x32)
 *   - site/public/apple-touch-icon.png - iOS home screen (180x180)
 *   - site/public/icon-192x192.png - PWA icon
 *   - site/public/icon-512x512.png - PWA icon
 */

import sharp from "sharp"
import png2icons from "png2icons"
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, "..")

const SOURCE_IMAGE = join(rootDir, "resources/images/Rounded.png")

const ICONS = [
  // Native app - build directory (used by electron-builder)
  { output: "native/build/icon.png", size: 512 },
  { output: "native/build/icon.icns", format: "icns" },
  { output: "native/build/icon.ico", format: "ico" },

  // Native app - resources (used at runtime)
  { output: "native/resources/icon.png", size: 512 },

  // Extension icons
  { output: "extension/public/icon/16.png", size: 16 },
  { output: "extension/public/icon/32.png", size: 32 },
  { output: "extension/public/icon/48.png", size: 48 },
  { output: "extension/public/icon/96.png", size: 96 },
  { output: "extension/public/icon/128.png", size: 128 },

  // Website icons
  { output: "site/public/favicon.ico", format: "ico" },
  { output: "site/public/favicon.png", size: 32 },
  { output: "site/public/favicon-16x16.png", size: 16 },
  { output: "site/public/favicon-32x32.png", size: 32 },
  { output: "site/public/apple-touch-icon.png", size: 180 },
  { output: "site/public/apple-touch-icon-152x152.png", size: 152 },
  { output: "site/public/icon-192x192.png", size: 192 },
  { output: "site/public/icon-512x512.png", size: 512 },
]

async function generatePng(sourceBuffer, outputPath, size) {
  const outputDir = dirname(outputPath)
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }

  await sharp(sourceBuffer)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(outputPath)

  console.log(`  ✓ ${outputPath} (${size}x${size})`)
}

async function generateIcns(sourceBuffer, outputPath) {
  const outputDir = dirname(outputPath)
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }

  // png2icons needs raw PNG buffer
  const icns = png2icons.createICNS(sourceBuffer, png2icons.BICUBIC2, 0)
  if (icns) {
    writeFileSync(outputPath, icns)
    console.log(`  ✓ ${outputPath} (icns)`)
  } else {
    console.error(`  ✗ Failed to generate ${outputPath}`)
  }
}

async function generateIco(sourceBuffer, outputPath) {
  const outputDir = dirname(outputPath)
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }

  // png2icons needs raw PNG buffer
  const ico = png2icons.createICO(sourceBuffer, png2icons.BICUBIC2, 0, true)
  if (ico) {
    writeFileSync(outputPath, ico)
    console.log(`  ✓ ${outputPath} (ico)`)
  } else {
    console.error(`  ✗ Failed to generate ${outputPath}`)
  }
}

async function main() {
  console.log("\n🎨 Generating icons from:", SOURCE_IMAGE)
  console.log("")

  // Read source image
  const sourceBuffer = readFileSync(SOURCE_IMAGE)

  // Get source image dimensions
  const metadata = await sharp(sourceBuffer).metadata()
  console.log(`   Source: ${metadata.width}x${metadata.height}\n`)

  for (const icon of ICONS) {
    const outputPath = join(rootDir, icon.output)

    if (icon.format === "icns") {
      await generateIcns(sourceBuffer, outputPath)
    } else if (icon.format === "ico") {
      await generateIco(sourceBuffer, outputPath)
    } else {
      await generatePng(sourceBuffer, outputPath, icon.size)
    }
  }

  console.log("\n✅ All icons generated!")
}

main().catch((error) => {
  console.error("\n❌ Icon generation failed:", error.message)
  process.exit(1)
})
