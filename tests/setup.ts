import "@testing-library/jest-dom/vitest";

if (typeof window !== "undefined") {
  window.alert = window.alert || (() => {});
  window.scrollTo = window.scrollTo || (() => {});
}

if (!globalThis.fetch) {
  // @ts-ignore
  globalThis.fetch = () => Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true, status: "DELIVERED" })
  });
}
