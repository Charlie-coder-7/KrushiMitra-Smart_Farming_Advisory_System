const imageSignatures = {
  "image/png": (b) =>
    b.length >= 8 &&
    b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  "image/jpeg": (b) =>
    b.length >= 3 && b[0] === 255 && b[1] === 216 && b[2] === 255,
  "image/webp": (b) =>
    b.length >= 12 &&
    b.toString("ascii", 0, 4) === "RIFF" &&
    b.toString("ascii", 8, 12) === "WEBP",
};

export function validateDiagnosis({ crop, file }) {
  if (typeof crop !== "string" || !crop.trim() || crop.trim().length > 100)
    return "Enter a crop name (up to 100 characters).";
  if (!file || !file.buffer?.length) return "Choose a crop image to continue.";
  if (file.size > 8 * 1024 * 1024) return "Choose an image smaller than 8 MB.";
  if (!imageSignatures[file.mimetype])
    return "Upload a JPEG, PNG, or WebP crop image.";
  if (!imageSignatures[file.mimetype](file.buffer))
    return "The file contents do not match a supported image format.";
  return null;
}

export function cleanLocation(...parts) {
  return parts.map((v) =>
    typeof v === "string" ? v.trim().slice(0, 100) : "",
  );
}
