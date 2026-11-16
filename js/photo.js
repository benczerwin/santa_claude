// Shrinks photos on the phone so they fit in Firestore docs (no Firebase Storage / billing needed).

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Couldn't read that image. Try a JPG or PNG.")); };
    img.src = url;
  });
}

function encode(img, maxDim, quality, maxChars, square = false) {
  let { naturalWidth: w, naturalHeight: h } = img;
  let sx = 0, sy = 0, sw = w, sh = h;
  if (square) {
    const s = Math.min(w, h);
    sx = (w - s) / 2; sy = (h - s) / 2; sw = sh = s;
    w = h = s;
  }
  const scale = Math.min(1, maxDim / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  let q = quality, out = canvas.toDataURL('image/jpeg', q);
  while (out.length > maxChars && q > 0.3) {
    q -= 0.1;
    out = canvas.toDataURL('image/jpeg', q);
  }
  return out;
}

/** -> { thumb, full } as JPEG data URLs. thumb is a small square crop for list rows. */
export async function processPhoto(file) {
  const img = await loadImage(file);
  return {
    thumb: encode(img, 200, 0.7, 25_000, true),
    full: encode(img, 1280, 0.75, 850_000),
  };
}
