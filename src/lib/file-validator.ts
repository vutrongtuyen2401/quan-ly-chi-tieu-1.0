/**
 * Module kiểm tra tính hợp lệ của tệp ảnh upload phục vụ Production Hardening:
 * 1. Kiểm tra Magic Bytes nhị phân thực tế (True MIME Type Detection)
 * 2. Kiểm tra dung lượng byte thực tế (Tối đa 5MB)
 * 3. Kiểm tra kích thước và tỷ lệ ảnh (Aspect ratio & Dimensions)
 * 4. Trả về thông báo lỗi tiếng Việt thân thiện, rõ ràng
 */

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
  mimeType?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  cleanBase64?: string;
}

/**
 * Phân tích header nhị phân để phát hiện định dạng thực tế và kích thước ảnh
 */
export function inspectImageBuffer(buffer: Buffer): {
  mimeType: string | null;
  width?: number;
  height?: number;
} {
  if (!buffer || buffer.length < 16) {
    return { mimeType: null };
  }

  // 1. Kiểm tra PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    let width: number | undefined;
    let height: number | undefined;

    if (buffer.length >= 24) {
      width = buffer.readUInt32BE(16);
      height = buffer.readUInt32BE(20);
    }
    return { mimeType: "image/png", width, height };
  }

  // 2. Kiểm tra JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    let width: number | undefined;
    let height: number | undefined;
    let offset = 2;

    while (offset < buffer.length - 8) {
      if (buffer[offset] !== 0xff) {
        offset++;
        continue;
      }

      const marker = buffer[offset + 1];
      // Các marker chứa thông tin kích thước khung ảnh (SOF0, SOF1, SOF2)
      if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
        height = buffer.readUInt16BE(offset + 5);
        width = buffer.readUInt16BE(offset + 7);
        break;
      }

      // Nhảy qua marker SOS (Start of Scan) vì sau đó là dữ liệu nén
      if (marker === 0xda || marker === 0xd9) break;

      const length = buffer.readUInt16BE(offset + 2);
      offset += 2 + length;
    }

    return { mimeType: "image/jpeg", width, height };
  }

  // 3. Kiểm tra WebP: "RIFF" .... "WEBP"
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer.length >= 16 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    let width: number | undefined;
    let height: number | undefined;

    // VP8X (Extended WebP)
    if (buffer[12] === 0x56 && buffer[13] === 0x50 && buffer[14] === 0x38 && buffer[15] === 0x58 && buffer.length >= 30) {
      width = 1 + buffer.readUIntLE(24, 3);
      height = 1 + buffer.readUIntLE(27, 3);
    }

    return { mimeType: "image/webp", width, height };
  }

  return { mimeType: null };
}

/**
 * Kiểm tra toàn diện chuỗi ảnh base64 nhận từ client
 */
export function validateReceiptImage(
  imageBase64: string,
  maxSizeBytes: number = MAX_IMAGE_SIZE_BYTES
): ImageValidationResult {
  if (!imageBase64 || typeof imageBase64 !== "string" || imageBase64.trim().length === 0) {
    return {
      valid: false,
      error: "Vui lòng chọn hoặc chụp ảnh hóa đơn",
    };
  }

  // Loại bỏ data URI scheme prefix nếu có
  const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, "").trim();

  let buffer: Buffer;
  try {
    buffer = Buffer.from(cleanBase64, "base64");
  } catch {
    return {
      valid: false,
      error: "Dữ liệu mã hóa hình ảnh không đúng định dạng Base64 hợp lệ",
    };
  }

  // 1. Kiểm tra kích thước tệp
  const sizeBytes = buffer.length;
  if (sizeBytes === 0) {
    return {
      valid: false,
      error: "Tệp ảnh rỗng, không chứa dữ liệu",
    };
  }

  if (sizeBytes > maxSizeBytes) {
    const maxMb = (maxSizeBytes / (1024 * 1024)).toFixed(0);
    const actualMb = (sizeBytes / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      sizeBytes,
      error: `Dung lượng ảnh (${actualMb}MB) vượt quá giới hạn cho phép tối đa ${maxMb}MB. Vui lòng chọn ảnh nhẹ hơn.`,
    };
  }

  // 2. Kiểm tra Magic Bytes nhị phân (MIME thật)
  const inspection = inspectImageBuffer(buffer);
  if (!inspection.mimeType) {
    return {
      valid: false,
      sizeBytes,
      error: "Định dạng tệp không được hỗ trợ. Hệ thống chỉ chấp nhận định dạng ảnh JPG/JPEG, PNG hoặc WebP.",
    };
  }

  // 3. Kiểm tra kích thước tối thiểu và tỷ lệ ảnh
  const { width, height, mimeType } = inspection;
  if (width !== undefined && height !== undefined) {
    // Không chấp nhận ảnh 1x1 tracking pixel hoặc quá nhỏ
    if (width < 50 || height < 50) {
      return {
        valid: false,
        sizeBytes,
        mimeType,
        width,
        height,
        error: "Kích thước ảnh quá nhỏ (dưới 50x50px), không đủ độ nét để AI có thể nhận diện thông tin hóa đơn.",
      };
    }

    // Tỷ lệ ảnh bất thường (ví dụ dải ảnh 1x50000)
    const aspectRatio = width / height;
    if (aspectRatio < 0.05 || aspectRatio > 20.0) {
      return {
        valid: false,
        sizeBytes,
        mimeType,
        width,
        height,
        error: "Tỷ lệ hình ảnh không phù hợp để nhận diện hóa đơn. Vui lòng chụp thẳng góc hóa đơn.",
      };
    }
  }

  return {
    valid: true,
    mimeType,
    sizeBytes,
    width,
    height,
    cleanBase64,
  };
}
