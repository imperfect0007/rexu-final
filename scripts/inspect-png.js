const fs = require('fs');
const zlib = require('zlib');

function inspectPng(filePath) {
  const buffer = fs.readFileSync(filePath);
  
  if (buffer.readUInt32BE(0) !== 0x89504E47 || buffer.readUInt32BE(4) !== 0x0D0A1A0A) {
    console.log('Not a valid PNG file');
    return;
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  let idatBuffers = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    
    if (type === 'IHDR') {
      width = buffer.readUInt32BE(offset + 8);
      height = buffer.readUInt32BE(offset + 12);
      colorType = buffer.readUInt8(offset + 17);
    } else if (type === 'IDAT') {
      idatBuffers.push(buffer.subarray(offset + 8, offset + 8 + length));
    }
    
    offset += 12 + length;
  }

  const idatBuffer = Buffer.concat(idatBuffers);
  try {
    const inflated = zlib.inflateSync(idatBuffer);
    console.log(`Inflated IDAT length: ${inflated.length}`);
    
    // For colorType 6, each scanline has 1 filter byte + width * 4 bytes
    const bytesPerPixel = 4;
    const scanlineLength = 1 + width * bytesPerPixel;
    
    let transparentCount = 0;
    let opaqueCount = 0;
    let nonOpaqueNonTransparentCount = 0;
    
    // Read alpha values
    for (let y = 0; y < height; y++) {
      const scanlineStart = y * scanlineLength;
      const filterType = inflated[scanlineStart];
      
      // Let's check a few alpha values. The raw bytes might be filtered, but if the alpha channel is always 255, 
      // even after filtering, the reconstructed alpha values will be 255. 
      // If we just check the raw alpha bytes at the index scanlineStart + 1 + x * 4 + 3,
      // wait, the filter is applied. Let's do a simple check: is the inflated buffer filled with 255 for alphas?
      // Since filter type 0 means no filter, we can check easily. But if it's filtered, we should reconstruct.
      // Reconstructing the image scanlines is very simple:
      // Filter types: 0=None, 1=Sub, 2=Up, 3=Average, 4=Paeth
    }
    
    // Let's do a full reconstruction of the RGBA values to be 100% correct!
    const reconstructed = Buffer.alloc(width * height * bytesPerPixel);
    
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
          
          if (filterType === 1) { // Sub
            reconVal = (rawVal + leftVal) & 0xFF;
          } else if (filterType === 2) { // Up
            reconVal = (rawVal + upVal) & 0xFF;
          } else if (filterType === 3) { // Average
            reconVal = (rawVal + Math.floor((leftVal + upVal) / 2)) & 0xFF;
          } else if (filterType === 4) { // Paeth
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
        
        const alpha = reconstructed[destOffset + 3];
        if (alpha === 0) {
          transparentCount++;
        } else if (alpha === 255) {
          opaqueCount++;
        } else {
          nonOpaqueNonTransparentCount++;
        }
      }
    }
    
    console.log(`Transparency Check:`);
    console.log(`- Transparent Pixels (Alpha 0): ${transparentCount}`);
    console.log(`- Opaque Pixels (Alpha 255): ${opaqueCount}`);
    console.log(`- Semi-Transparent Pixels (Alpha 1-254): ${nonOpaqueNonTransparentCount}`);
    
    // Print colors of corner pixels
    console.log(`Corner pixel colors:`);
    console.log(`- Top-Left (0,0): R=${reconstructed[0]} G=${reconstructed[1]} B=${reconstructed[2]} A=${reconstructed[3]}`);
    console.log(`- Top-Right (w-1,0): R=${reconstructed[(width-1)*4]} G=${reconstructed[(width-1)*4+1]} B=${reconstructed[(width-1)*4+2]} A=${reconstructed[(width-1)*4+3]}`);
  } catch (e) {
    console.error('Error parsing IDAT:', e);
  }
}

inspectPng(process.argv[2]);
