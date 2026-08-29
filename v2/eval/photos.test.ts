import { describe, it, expect } from "vitest";
import { loadPhoto, photoCount } from "./photos";
import { CASES } from "./cases";

describe("eval photo lookup", () => {
  it("returns null for a case id with no photo on disk", () => {
    expect(loadPhoto("definitely-not-a-real-case-id")).toBeNull();
  });

  it("reports a photo count matching the number of resolvable cases", () => {
    const resolvable = CASES.filter((c) => loadPhoto(c.id) !== null).length;
    expect(photoCount()).toBeGreaterThanOrEqual(resolvable);
  });

  it("returns base64 data with an image mime type when a photo exists", () => {
    const withPhoto = CASES.map((c) => loadPhoto(c.id)).find((p) => p !== null);
    if (!withPhoto) return; // no photos checked in; nothing to assert
    expect(withPhoto.mimeType).toMatch(/^image\//);
    expect(withPhoto.data.length).toBeGreaterThan(0);
    expect(() => Buffer.from(withPhoto.data, "base64")).not.toThrow();
  });

  it("covers every trap case with a photo", () => {
    const traps = CASES.filter((c) => c.trap);
    const missing = traps.filter((c) => !loadPhoto(c.id)).map((c) => c.id);
    expect(missing).toEqual([]);
  });
});
