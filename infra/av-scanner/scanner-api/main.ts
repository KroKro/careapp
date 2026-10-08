// Duenner HTTP-Wrapper um clamd (ClamAV-Daemon): nimmt Datei-Bytes per POST
// /scan entgegen, reicht sie per INSTREAM-Protokoll an clamd weiter und gibt
// { clean, signature } zurueck. Laeuft auf einer kleinen, selbst betriebenen
// EU-VM (siehe README) -- bewusst kein Cloud-AV-API-Drittanbieter, damit
// rohe Gesundheitsdokumente keinen weiteren externen Auftragsverarbeiter
// durchlaufen.

const CLAMD_HOST = Deno.env.get('CLAMD_HOST') ?? 'clamav';
const CLAMD_PORT = Number(Deno.env.get('CLAMD_PORT') ?? '3310');
const SHARED_SECRET = Deno.env.get('SCANNER_SHARED_SECRET');
const MAX_BYTES = Number(Deno.env.get('SCANNER_MAX_BYTES') ?? String(20 * 1024 * 1024));

if (!SHARED_SECRET) {
  console.error('SCANNER_SHARED_SECRET env var ist erforderlich.');
  Deno.exit(1);
}

interface ScanResult {
  clean: boolean;
  signature: string | null;
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

async function readUntilNull(conn: Deno.TcpConn): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  const buf = new Uint8Array(4096);
  while (true) {
    const n = await conn.read(buf);
    if (n === null) break;
    const slice = buf.slice(0, n);
    chunks.push(slice);
    if (slice.includes(0)) break;
  }
  return concat(chunks);
}

async function scanWithClamd(bytes: Uint8Array): Promise<ScanResult> {
  const conn = await Deno.connect({ hostname: CLAMD_HOST, port: CLAMD_PORT });
  try {
    await conn.write(new TextEncoder().encode('zINSTREAM\0'));

    const chunkSize = 8192;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      const chunk = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length));
      const header = new Uint8Array(4);
      new DataView(header.buffer).setUint32(0, chunk.length, false);
      await conn.write(header);
      await conn.write(chunk);
    }
    // Chunk der Laenge 0 signalisiert clamd das Streamende.
    await conn.write(new Uint8Array(4));

    const responseBytes = await readUntilNull(conn);
    const response = new TextDecoder().decode(responseBytes);

    if (response.includes('FOUND')) {
      const match = response.match(/stream:\s*(.*?)\s*FOUND/);
      return { clean: false, signature: match?.[1] ?? 'unknown' };
    }
    return { clean: true, signature: null };
  } finally {
    conn.close();
  }
}

Deno.serve({ port: 8080 }, async (req) => {
  const url = new URL(req.url);
  if (req.method !== 'POST' || url.pathname !== '/scan') {
    return new Response('Not found', { status: 404 });
  }
  if (req.headers.get('X-Scanner-Secret') !== SHARED_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  const bytes = new Uint8Array(await req.arrayBuffer());
  if (bytes.length === 0) {
    return new Response(JSON.stringify({ error: 'Leerer Request-Body.' }), { status: 400 });
  }
  if (bytes.length > MAX_BYTES) {
    return new Response(JSON.stringify({ error: 'Datei zu gross.' }), { status: 413 });
  }

  try {
    const result = await scanWithClamd(bytes);
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Scan fehlgeschlagen:', err);
    return new Response(JSON.stringify({ error: 'Scan fehlgeschlagen.' }), { status: 502 });
  }
});
