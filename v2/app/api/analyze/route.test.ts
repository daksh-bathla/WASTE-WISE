import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";

const url = (qs = "") => new NextRequest(`http://localhost:3000/api/analyze${qs}`);

const formRequest = (form: FormData) =>
  new NextRequest("http://localhost:3000/api/analyze", { method: "POST", body: form });

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/analyze — dev fixture preview", () => {
  it("lists the available demo cases when no id is given", async () => {
    const res = await GET(url());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.cases)).toBe(true);
    expect(body.cases.length).toBeGreaterThan(0);
    expect(body.cases[0]).toHaveProperty("id");
    expect(body.cases[0]).toHaveProperty("trap");
  });

  it("runs the real pipeline for a known case and tags it as fixture-sourced", async () => {
    const res = await GET(url("?demo=trap-lithium-battery"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.identification.category).toBe("battery");
    expect(body.degraded).toContain("fixture_identification");
    const blocked = body.safety.flatMap((s: { blocked_actions: string[] }) => s.blocked_actions);
    expect(blocked.join(" ")).toContain("puncture");
  });

  it("404s on an unknown case id", async () => {
    const res = await GET(url("?demo=no-such-case"));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toMatch(/unknown demo case/);
  });

  it("404s entirely in production so the fixture path never ships", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const res = await GET(url("?demo=trap-lithium-battery"));
    expect(res.status).toBe(404);
  });
});

describe("POST /api/analyze — request validation", () => {
  it("400s when no image field is present", async () => {
    const res = await POST(formRequest(new FormData()));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/image file is required/);
  });

  it("400s when the image field is not a file", async () => {
    const form = new FormData();
    form.append("image", "just-a-string");
    const res = await POST(formRequest(form));
    expect(res.status).toBe(400);
  });

  it("413s when the image exceeds the size cap", async () => {
    const form = new FormData();
    const tooBig = new Blob([new Uint8Array(8 * 1024 * 1024 + 1)], { type: "image/jpeg" });
    form.append("image", tooBig, "big.jpg");
    const res = await POST(formRequest(form));
    expect(res.status).toBe(413);
    expect((await res.json()).error).toMatch(/too large/);
  });

  it("500s with a JSON error rather than throwing when the body is unparseable", async () => {
    const bad = new NextRequest("http://localhost:3000/api/analyze", {
      method: "POST",
      headers: { "content-type": "multipart/form-data; boundary=broken" },
      body: "not actually multipart",
    });
    const res = await POST(bad);
    expect(res.status).toBe(500);
    expect(await res.json()).toHaveProperty("error");
  });
});
