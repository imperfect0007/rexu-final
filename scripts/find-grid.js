const fs = require('fs');
const zlib = require('zlib');

function findGrid(filePath) {
  const buffer = fs.readFileSync(filePath);
  let offset = 8;
  let width = 0;
  let height = 0;
  let idatBuffers = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);

    if (type === 'IHDR') {
      width = buffer.readUInt32BE(offset + 8);
      height = buffer.readUInt32BE(offset + 12);
    } else if (type === 'IDAT') {
      idatBuffers.push(buffer.subarray(offset + 8, offset + 8 + length));
    }
    offset += 12 + length;
  }

  const inflated = zlib.inflateSync(Buffer.concat(idatBuffers));
  const scanlineLength = 1 + width * 4;
  const reconstructed = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y++) {
    const scanlineStart = y * scanlineLength;
    const filterType = inflated[scanlineStart];

    for (let x = 0; x < width; x++) {
      const destOffset = (y * width + x) * 4;
      const srcOffset = scanlineStart + 1 + x * 4;

      for (let c = 0; c < 4; c++) {
        const rawVal = inflated[srcOffset + c];
        let reconVal = rawVal;

        const leftVal = x > 0 ? reconstructed[destOffset - 4 + c] : 0;
        const upVal = y > 0 ? reconstructed[destOffset - width * 4 + c] : 0;
        const leftUpVal = (x > 0 && y > 0) ? reconstructed[destOffset - width * 4 - 4 + c] : 0;

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

  // Print the first 100 pixels of the first row
  console.log('First 100 pixels in row 0 (R, G, B):');
  for (let x = 0; x < 100; x++) {
    const idx = x * 4;
    console.log(`x=${x}: R=${reconstructed[idx]} G=${reconstructed[idx + 1]} B=${reconstructed[idx + 2]}`);
  }
}

findGrid(process.argv[2]);
