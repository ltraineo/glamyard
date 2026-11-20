import { lookup } from "dns/promises";
import { isIP } from "net";

export type EventDraft = {
  name: string;
  start: string | null;
  end: string | null;
  city: string;
};

// ---- Safe fetching: members are vetted, but the server should still never be
// pointed at private network addresses.

function isPrivate(ip: string) {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    if (v === "::1" || v === "::") return true;
    if (v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80")) return true;
    const mapped = v.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return mapped ? isPrivate(mapped[1]) : false;
  }
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

export function normalizeUrl(raw: string): URL | null {
  let s = raw.trim();
  if (!s) return null;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(s) && !/^https?:\/\//i.test(s)) return null;
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname.includes(".") && !u.hostname.startsWith("[")) return null;
    if (u.username || u.password) return null;
    u.hash = "";
    return u;
  } catch {
    return null;
  }
}

async function assertPublic(u: URL) {
  const host = u.hostname.replace(/^\[|\]$/g, "");
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (!addrs.length || addrs.some((a) => isPrivate(a.address))) {
    throw new Error("blocked");
  }
}

export async function fetchPage(start: URL): Promise<string> {
  let url = start;
  for (let hop = 0; hop < 4; hop++) {
    await assertPublic(url);
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; GlamyardBot/1.0)", Accept: "text/html" },
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = new URL(res.headers.get("location")!, url);
      continue;
    }
    if (!res.ok || !res.body) throw new Error(`status ${res.status}`);
    // Read at most 2 MB.
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (size < 2_000_000) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      size += value.length;
    }
    reader.cancel().catch(() => {});
    return new TextDecoder().decode(Buffer.concat(chunks));
  }
  throw new Error("too many redirects");
}

// ---- Extraction: schema.org Event data first, then page metadata.

function decode(s: string) {
  return s
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ").trim();
}

function isoDate(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function findEvents(node: any, out: any[] = []): any[] {
  if (!node || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    node.forEach((n) => findEvents(n, out));
    return out;
  }
  const t = node["@type"];
  const types = Array.isArray(t) ? t : [t];
  if (types.some((x) => typeof x === "string" && /Event$/.test(x))) out.push(node);
  for (const k of ["@graph", "mainEntity", "subEvent", "itemListElement", "item"]) {
    if (node[k]) findEvents(node[k], out);
  }
  return out;
}

function cityFrom(loc: any): string {
  const l = Array.isArray(loc) ? loc[0] : loc;
  if (!l) return "";
  if (typeof l === "string") return l;
  const a = l.address;
  if (a && typeof a === "object") {
    const city = a.addressLocality || a.addressRegion || "";
    if (city) return String(city);
  }
  if (typeof a === "string") return a.split(",").slice(-3, -1).join(",").trim() || a;
  return l.name ? String(l.name) : "";
}

function meta(html: string, key: string): string {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${key}["']`,
    "i"
  );
  const m = html.match(re);
  return m ? decode(m[1] ?? m[2] ?? "") : "";
}

export function extractEvent(html: string): EventDraft {
  const draft: EventDraft = { name: "", start: null, end: null, city: "" };

  const blocks = html.match(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const block of blocks) {
    const body = block.replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, "");
    try {
      const ev = findEvents(JSON.parse(body))[0];
      if (ev) {
        draft.name = decode(String(ev.name || ""));
        draft.start = isoDate(ev.startDate);
        draft.end = isoDate(ev.endDate) || draft.start;
        draft.city = decode(cityFrom(ev.location));
        break;
      }
    } catch {
      // Malformed JSON-LD is common; skip it.
    }
  }

  if (!draft.name) {
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "";
    draft.name = meta(html, "og:title") || decode(title);
    // "Event Name | Organizer" -> "Event Name"
    draft.name = draft.name.split(/\s[|–—-]\s/)[0].trim();
  }
  if (!draft.start) {
    draft.start = isoDate(meta(html, "event:start_time")) || isoDate(meta(html, "startDate"));
    draft.end = isoDate(meta(html, "event:end_time")) || draft.start;
  }
  draft.name = draft.name.slice(0, 120);
  draft.city = draft.city.slice(0, 80);
  return draft;
}
