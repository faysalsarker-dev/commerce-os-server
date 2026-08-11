import { deleteImageFromCLoudinary } from "../config/cloudinary.config";

/**
 * =========================================================================================
 * IMAGE UTILITY MODULE
 * =========================================================================================
 *
 * WHY THIS MODULE WAS CREATED:
 * ----------------------------
 * When updating or deleting database records that store image URLs (such as Product Color
 * images, Category images, User avatars, Vendor logos, etc.), old images that are no longer
 * referenced by the application can become "orphaned" in Cloudinary cloud storage, consuming
 * storage space and bandwidth.
 *
 * HOW IT WORKS (THE CORE PROCESS):
 * --------------------------------
 * 1. EXTRACT & NORMALIZE: Extracts image URL(s) from existing database records and incoming
 *    update payloads, normalizing strings, string arrays, or JSON-stringified arrays.
 * 2. DIFFERENCE DETECTION: Compares the old image URLs against the new image URLs to find any
 *    URL present in the old data that is MISSING from the new data.
 * 3. CLOUDINARY CLEANUP: Asynchronously deletes those removed image URLs from Cloudinary
 *    without blocking or breaking database transactions if Cloudinary calls fail.
 *
 * MAIN USE CASES:
 * ---------------
 * - Multi-image update (e.g., updating ProductColor images where some images are kept & new ones added).
 * - Single-image update (e.g., replacing or removing a User avatar, Category image, or Logo).
 * - Record deletion (e.g., deleting a ProductColor or Category record and purging all attached images).
 * =========================================================================================
 */

export type ImageFieldName =
  | "images"
  | "image"
  | "avatar"
  | "profile"
  | "logo"
  | "banner"
  | string;

/**
 * -----------------------------------------------------------------------------------------
 * HELPER FUNCTION: normalizeImageUrls
 * -----------------------------------------------------------------------------------------
 * WHY WRITE THIS:
 * Database fields and request payloads can supply images in different formats:
 *   - Single URL string: "https://res.cloudinary.com/.../img1.jpg"
 *   - Array of URL strings: ["https://res.cloudinary.com/.../img1.jpg", "https://.../img2.jpg"]
 *   - JSON stringified array: '["https://.../img1.jpg", "https://.../img2.jpg"]'
 *   - Null / Undefined
 *
 * HOW IT WORKS:
 * Converts any of the above input types into a standardized array of clean URL strings (`string[]`).
 *
 * USE CASE:
 * Internal helper used before comparing sets of URLs.
 */
export const normalizeImageUrls = (input: unknown): string[] => {
  if (input === null || input === undefined) return [];

  // Case 1: Single string URL or stringified JSON array
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return [];

    // Support stringified JSON arrays sent from HTML multipart forms (e.g., '["url1", "url2"]')
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed
            .flatMap((item) => normalizeImageUrls(item))
            .filter(Boolean);
        }
      } catch {
        // If JSON parsing fails, fall back to treating it as a standard single string URL
      }
    }
    return [trimmed];
  }

  // Case 2: Array of items (strings or nested arrays)
  if (Array.isArray(input)) {
    return input
      .flatMap((item) => normalizeImageUrls(item))
      .filter(Boolean);
  }

  return [];
};

/**
 * -----------------------------------------------------------------------------------------
 * MAIN FUNCTION: handleImageUpdate
 * -----------------------------------------------------------------------------------------
 * WHY WRITE THIS:
 * To automate comparing old database images with new payload images during an UPDATE operation,
 * ensuring any removed images are deleted from Cloudinary automatically.
 *
 * HOW IT WORKS:
 * 1. Checks if the incoming update payload actually includes an image field. If the user is only
 *    updating non-image fields (e.g. updating product price/name via PATCH), it exits safely
 *    without deleting any images.
 * 2. Extracts `oldUrls` from `oldData` and `newUrls` from `newData`.
 * 3. Identifies removed URLs: `removedUrls = oldUrls.filter(url => !newUrlSet.has(url))`.
 * 4. Calls `deleteImageFromCLoudinary(url)` concurrently for each removed URL using `Promise.allSettled`.
 *
 * USE CASES & EXAMPLES:
 * ---------------------
 * Example 1: Multi-image update (Product Color)
 *   await handleImageUpdate(existingColor, payload, "images");
 *   - Old: ["url1", "url2", "url3"]
 *   - New: ["url1", "url3", "url4"]  (User kept url1 & url3, deleted url2, uploaded url4)
 *   - Result: "url2" is deleted from Cloudinary!
 *
 * Example 2: Single-image update (Category / User profile)
 *   await handleImageUpdate(existingCategory, payload, "image");
 *   - Old: "old-banner.jpg"
 *   - New: "new-banner.jpg"
 *   - Result: "old-banner.jpg" is deleted from Cloudinary!
 *
 * Example 3: Auto-detection (Omitting field name)
 *   await handleImageUpdate(existingUser, payload);
 *   - Auto-searches for standard keys: ["images", "image", "avatar", "profile", "logo", "banner"]
 *
 * @param oldData Existing DB record object or raw old image URL(s)
 * @param newData Incoming update payload object or raw new image URL(s)
 * @param fieldName Optional target field name (defaults to auto-detecting common image keys)
 */
export const handleImageUpdate = async (
  oldData: any,
  newData: any,
  fieldName?: ImageFieldName | ImageFieldName[]
): Promise<void> => {
  if (oldData === null || oldData === undefined) return;

  const candidateFields = fieldName
    ? Array.isArray(fieldName)
      ? fieldName
      : [fieldName]
    : ["images", "image", "avatar", "profile", "logo", "banner"];

  let oldRaw: any = undefined;
  let newRaw: any = undefined;
  let isObjectPayload = false;
  let fieldFoundInNewData = false;

  // Step 1: Extract values if inputs are objects (e.g., DB record & express body payload)
  if (typeof oldData === "object" && !Array.isArray(oldData)) {
    const targetField =
      candidateFields.find((f) =>
        Object.prototype.hasOwnProperty.call(oldData, f)
      ) ?? candidateFields[0];
    oldRaw = oldData[targetField];

    if (newData && typeof newData === "object" && !Array.isArray(newData)) {
      isObjectPayload = true;
      if (Object.prototype.hasOwnProperty.call(newData, targetField)) {
        fieldFoundInNewData = true;
        newRaw = newData[targetField];
      }
    } else {
      newRaw = newData;
      fieldFoundInNewData = newData !== undefined;
    }
  } else {
    // Direct raw image values passed (e.g., handleImageUpdate(existing.images, payload.images))
    oldRaw = oldData;
    newRaw = newData;
    fieldFoundInNewData = true;
  }

  // Step 2: Safety Check — If payload is an object but didn't supply the image field (e.g. PATCH request for other fields),
  // do NOT delete any existing images.
  if (isObjectPayload && !fieldFoundInNewData) {
    return;
  }

  // Step 3: Normalize both old and new values into arrays of strings
  const oldUrls = normalizeImageUrls(oldRaw);
  const newUrls = normalizeImageUrls(newRaw);

  // Step 4: Find old URLs that are no longer present in the new URLs list
  const newUrlSet = new Set(newUrls);
  const removedUrls = oldUrls.filter((url) => !newUrlSet.has(url));

  if (removedUrls.length === 0) return;

  // Step 5: Delete removed images from Cloudinary concurrently
  await Promise.allSettled(
    removedUrls.map(async (url) => {
      try {
        await deleteImageFromCLoudinary(url);
      } catch (error) {
        console.error(
          `[handleImageUpdate] Failed to delete image (${url}) from Cloudinary:`,
          error
        );
      }
    })
  );
};

/**
 * -----------------------------------------------------------------------------------------
 * MAIN FUNCTION: deleteEntityImages
 * -----------------------------------------------------------------------------------------
 * WHY WRITE THIS:
 * When a database record (e.g., a Product Color, Category, or User) is deleted permanently
 * from the database, all images linked to that record should also be purged from Cloudinary.
 *
 * HOW IT WORKS:
 * 1. Takes the record being deleted (or direct image URLs).
 * 2. Extracts all image URLs linked to the record using candidate field names.
 * 3. Calls `deleteImageFromCLoudinary(url)` for every URL in parallel using `Promise.allSettled`.
 *
 * USE CASE & EXAMPLE:
 * -------------------
 * Example: Deleting a Product Color record
 *   const color = await prisma.productColor.findUnique({ where: { id: colorId } });
 *   await deleteEntityImages(color, "images"); // Purges all images from Cloudinary
 *   await prisma.productColor.delete({ where: { id: colorId } });
 *
 * @param record DB record object or raw image URL string/array
 * @param fieldName Optional target field name(s)
 */
export const deleteEntityImages = async (
  record: any,
  fieldName?: ImageFieldName | ImageFieldName[]
): Promise<void> => {
  if (record === null || record === undefined) return;

  const candidateFields = fieldName
    ? Array.isArray(fieldName)
      ? fieldName
      : [fieldName]
    : ["images", "image", "avatar", "profile", "logo", "banner"];

  let urlsToDelete: string[] = [];

  // Step 1: Extract all URLs from string/array or record object
  if (typeof record === "string" || Array.isArray(record)) {
    urlsToDelete = normalizeImageUrls(record);
  } else if (typeof record === "object") {
    for (const f of candidateFields) {
      if (Object.prototype.hasOwnProperty.call(record, f) && record[f]) {
        urlsToDelete.push(...normalizeImageUrls(record[f]));
      }
    }
  }

  if (urlsToDelete.length === 0) return;

  // Step 2: Delete all extracted URLs from Cloudinary concurrently
  await Promise.allSettled(
    urlsToDelete.map(async (url) => {
      try {
        await deleteImageFromCLoudinary(url);
      } catch (error) {
        console.error(
          `[deleteEntityImages] Failed to delete image (${url}) from Cloudinary:`,
          error
        );
      }
    })
  );
};
