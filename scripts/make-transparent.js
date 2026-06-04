const fs = require('fs');
const zlib = require('zlib');

function crc32(buf) {
  let c = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = crcTable[(c ^ buf[n]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) {
      c = 0xedb88320 ^ (c >>> 1);
    } else {
      c = c >>> 1;
    }
  }
  crcTable[n] = c;
}

function writeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  
  const crcBuf = Buffer.alloc(4);
  const crcInput = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function processImage(inputPath, outputPath) {
  const buffer = fs.readFileSync(inputPath);
  
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 8;
  let colorType = 6;
  let idatBuffers = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const chunkData = buffer.subarray(offset + 8, offset + 8 + length);
    
    if (type === 'IHDR') {
      width = buffer.readUInt32BE(offset + 8);
      height = buffer.readUInt32BE(offset + 12);
      bitDepth = buffer.readUInt8(offset + 16);
      colorType = buffer.readUInt8(offset + 17);
    } else if (type === 'IDAT') {
      idatBuffers.push(chunkData);
    }
    offset += 12 + length;
  }

  const inflated = zlib.inflateSync(Buffer.concat(idatBuffers));
  const bytesPerPixel = 4;
  const scanlineLength = 1 + width * bytesPerPixel;
  const reconstructed = Buffer.alloc(width * height * bytesPerPixel);

  // Reconstruct pixels
  for (let y = 0; y < height; y++) {
    const scanlineStart = y * scanlineLength;
    const filterType = inflated[scanlineStart];
    
    for (let x = 0; x < width; x++) {
      const destOffset = (y * width + x) * bytesPerPixel;
      const srcOffset = scanlineStart + 1 + x * bytesPerPixel;
      
      for (let c = 0; c < bytesPerPixel; c++) {
        const rawVal = inflated[srcOffset + c];
        let reconVal = rawVal;
        
        const leftVal = x > 0 ? reconstructed[destOffset - bytesPerPixel + c] : 0;
        const upVal = y > 0 ? reconstructed[destOffset - width * bytesPerPixel + c] : 0;
        const leftUpVal = (x > 0 && y > 0) ? reconstructed[destOffset - width * bytesPerPixel - bytesPerPixel + c] : 0;
        
        if (filterType === 1) {
          reconVal = (rawVal + leftVal) & 0xFF;
        } else if (filterType === 2) {
          reconVal = (rawVal + upVal) & 0xFF;
        } else if (filterType === 3) {
          reconVal = (rawVal + Math.floor((leftVal + upVal) / 2)) & 0xFF;
        } else if (filterType === 4) {
          const p = leftVal + upVal - leftUpVal;
          const pa = Math.abs(p - leftVal);
          const pb = Math.abs(p - upVal);
          const pc = Math.abs(p - leftUpVal);
          let pEst = leftVal;
          if (pb < pa && pb < pc) pEst = upVal;
          else if (pc < pa) pEst = leftUpVal;
          reconVal = (rawVal + pEst) & 0xFF;
        }
        reconstructed[destOffset + c] = reconVal;
      }
    }
  }

  // Create new scanlines with filter type 0 (None)
  const outputScanlines = Buffer.alloc(height * scanlineLength);
  
  for (let y = 0; y < height; y++) {
    const scanlineStart = y * scanlineLength;
    outputScanlines[scanlineStart] = 0; // Filter type: None
    
    for (let x = 0; x < width; x++) {
      const srcOffset = (y * width + x) * bytesPerPixel;
      const destOffset = scanlineStart + 1 + x * bytesPerPixel;
      
      const r = reconstructed[srcOffset];
      const g = reconstructed[srcOffset+1];
      const b = reconstructed[srcOffset+2];
      
      // Calculate distance to grey and white background colors
      // Sampled grey: 196-199, Sampled white: 247-251
      const distGrey = Math.sqrt((r - 197)**2 + (g - 197)**2 + (b - 197)**2);
      const distWhite = Math.sqrt((r - 249)**2 + (g - 249)**2 + (b - 249)**2);
      const dist = Math.min(distGrey, distWhite);
      
      let alpha = 255;
      let outR = r;
      let outG = g;
      let outB = b;
      
      if (dist < 20) {
        alpha = 0;
      } else if (dist < 60) {
        // Semi-transparent edge pixel
        alpha = Math.floor(((dist - 20) / (60 - 20)) * 255);
        if (alpha > 255) alpha = 255;
        if (alpha < 0) alpha = 0;
        
        // Clean up boundary colors (to prevent grey/white background fringes)
        const isGreen = g > r + 10 && g > b + 40;
        if (isGreen) {
          outR = 182;
          outG = 213;
          outB = 94;
        } else {
          outR = 0;
          outG = 0;
          outB = 0;
        }
      } else {
        // Fully opaque foreground
        alpha = 255;
        // Clean up foreground slightly to remove noise
        const isGreen = g > r + 10 && g > b + 40;
        if (isGreen) {
          // Keep green as is or normalize
          outR = r;
          outG = g;
          outB = b;
        } else {
          // Normalize black text (make sure very dark pixels are true black)
          if (r < 110 && g < 110 && b < 110) {
            outR = 0;
            outG = 0;
            outB = 0;
          }
        }
      }
      
      outputScanlines[destOffset] = outR;
      outputScanlines[destOffset+1] = outG;
      outputScanlines[destOffset+2] = outB;
      outputScanlines[destOffset+3] = alpha;
    }
  }

  // Compress new scanlines
  const deflated = zlib.deflateSync(outputScanlines, { level: 9 });
  
  // Construct PNG file
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // Write IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(bitDepth, 8);
  ihdrData.writeUInt8(colorType, 9);
  ihdrData.writeUInt8(0, 10);
  ihdrData.writeUInt8(0, 11);
  ihdrData.writeUInt8(0, 12);
  
  const ihdrChunk = writeChunk('IHDR', ihdrData);
  const idatChunk = writeChunk('IDAT', deflated);
  const iendChunk = writeChunk('IEND', Buffer.alloc(0));
  
  const outputPng = Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
  fs.writeFileSync(outputPath, outputPng);
  console.log(`Successfully wrote transparent PNG to ${outputPath}`);
}

processImage(process.argv[2], process.argv[3]);
