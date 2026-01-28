const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());
// by KED - https://github.com/keddn/TikTok-USER-WebAloghrim
const STD_B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const CUSTOM_B64 = 'Dkdpgh4ZKsQB80/Mfvw36XI1R25-WUAlEi7NLboqYTOPuzmFjJnryx9HVGcaStCe';

const ENC_MAP = (() => {
    const m = new Map();
    for (let i = 0; i < STD_B64.length; i++) m.set(STD_B64[i], CUSTOM_B64[i]);
    return m;
})();

function customB64(buf) {
    const b64 = buf.toString('base64');
    let out = '';
    for (const ch of b64) out += ENC_MAP.get(ch) ?? ch;
    return out;
}

const md5 = data => crypto.createHash('md5').update(data).digest();

function rc4(key, pt) {
    const s = new Uint8Array(256);
    for (let i = 0; i < 256; i++) s[i] = i;
    let j = 0;
    const kl = key.length;
    for (let i = 0; i < 256; i++) {
        j = (j + s[i] + key[i % kl]) & 0xff;
        [s[i], s[j]] = [s[j], s[i]];
    }
    const out = Buffer.allocUnsafe(pt.length);
    let i = 0;
    j = 0;
    for (let n = 0; n < pt.length; n++) {
        i = (i + 1) & 0xff;
        j = (j + s[i]) & 0xff;
        [s[i], s[j]] = [s[j], s[i]];
        const k = s[(s[i] + s[j]) & 0xff];
        out[n] = pt[n] ^ k;
    }
    return out;
}

const xor = buf => buf.reduce((acc, b) => acc ^ b, 0);

function xbogus(p, d, ua, ts) {
    const uk = Buffer.from([0x00, 0x01, 0x0e]);
    const lk = Buffer.from([0xff]);
    const fv = 0x4a41279f;
    const mp = md5(md5(Buffer.from(p, 'utf8')));
    const md = md5(md5(Buffer.from(d, 'utf8')));
    const urc = rc4(uk, Buffer.from(ua, 'utf8'));
    const ub64 = Buffer.from(urc).toString('base64');
    const mu = md5(Buffer.from(ub64, 'ascii'));
    const parts = [
        Buffer.from([0x40]),
        uk,
        mp.subarray(14, 16),
        md.subarray(14, 16),
        mu.subarray(14, 16),
        (() => { const b = Buffer.allocUnsafe(4); b.writeUInt32BE(ts >>> 0); return b; })(),
        (() => { const b = Buffer.allocUnsafe(4); b.writeUInt32BE(fv); return b; })(),
    ];
    let buf = Buffer.concat(parts);
    const cs = xor(buf);
    buf = Buffer.concat([buf, Buffer.from([cs])]);
    const enc = Buffer.concat([Buffer.from([0x02]), lk, rc4(lk, buf)]);
    return customB64(enc);
}

const aa = [
    0xFFFFFFFF, 138, 1498001188, 211147047, 253, null, 203, 288, 9,
    1196819126, 3212677781, 135, 263, 193, 58, 18, 244, 2931180889, 240, 173,
    268, 2157053261, 261, 175, 14, 5, 171, 270, 156, 258, 13, 15, 3732962506,
    185, 169, 2, 6, 132, 162, 200, 3, 160, 217618912, 62, 2517678443, 44, 164,
    4, 96, 183, 2903579748, 3863347763, 119, 181, 10, 190, 8, 2654435769, 259,
    104, 230, 128, 2633865432, 225, 1, 257, 143, 179, 16, 600974999, 185100057,
    32, 188, 53, 2718276124, 177, 196, 4294967296, 147, 117, 17, 49, 7, 28, 12,
    266, 216, 11, 0, 45, 166, 247, 1451689750,
];
const ot = [aa[9], aa[69], aa[51], aa[92]];

function initPrng() {
    const now = Date.now();
    return [
        aa[44], aa[74], aa[10], aa[62], aa[42], aa[17], aa[2], aa[21],
        aa[3], aa[70], aa[50], aa[32],
        aa[0] & now,
        crypto.randomInt(aa[77]),
        crypto.randomInt(aa[77]),
        crypto.randomInt(aa[77]),
    ];
}

let kt = initPrng();
let st = aa[88];

const u32 = x => (x >>> 0);
const rotl = (x, n) => u32((x << n) | (x >>> (32 - n)));

function qr(s, a, b, c, d) {
    s[a] = u32(s[a] + s[b]); s[d] = rotl(s[d] ^ s[a], 16);
    s[c] = u32(s[c] + s[d]); s[b] = rotl(s[b] ^ s[c], 12);
    s[a] = u32(s[a] + s[b]); s[d] = rotl(s[d] ^ s[a], 8);
    s[c] = u32(s[c] + s[d]); s[b] = rotl(s[b] ^ s[c], 7);
}

function chacha(st, r) {
    const w = st.slice();
    for (let i = 0; i < r;) {
        qr(w, 0, 4, 8, 12); qr(w, 1, 5, 9, 13);
        qr(w, 2, 6, 10, 14); qr(w, 3, 7, 11, 15);
        if (++i >= r) break;
        qr(w, 0, 5, 10, 15); qr(w, 1, 6, 11, 12);
        qr(w, 2, 7, 12, 13); qr(w, 3, 4, 13, 14);
        ++i;
    }
    for (let i = 0; i < 16; i++) w[i] = u32(w[i] + st[i]);
    return w;
}

const bump = s => { s[12] = u32(s[12] + 1); };

function rand() {
    const e = chacha(kt, 8);
    const t = e[st];
    const r = (e[st + 8] & 0xFFFFFFF0) >>> 11;
    if (st === 7) { bump(kt); st = 0; } else { ++st; }
    return (t + 4294967296 * r) / 2 ** 53;
}

const nb = v => v < 255 * 255 ? [(v >> 8) & 0xFF, v & 0xFF] : [(v >> 24) & 0xFF, (v >> 16) & 0xFF, (v >> 8) & 0xFF, v & 0xFF];

const beInt = s => {
    const b = Buffer.from(s, 'utf8').subarray(0, 4);
    let a = 0;
    for (const x of b) a = (a << 8) | x;
    return a >>> 0;
};

function encCha(kw, r, by) {
    const nf = Math.floor(by.length / 4);
    const lo = by.length % 4;
    const w = new Uint32Array(Math.ceil(by.length / 4));
    for (let i = 0; i < nf; i++) {
        const j = 4 * i;
        w[i] = by[j] | (by[j + 1] << 8) | (by[j + 2] << 16) | (by[j + 3] << 24);
    }
    if (lo) {
        let v = 0, b = 4 * nf;
        for (let c = 0; c < lo; c++) v |= by[b + c] << (8 * c);
        w[nf] = v;
    }
    let o = 0;
    const s = kw.slice();
    while (o + 16 < w.length) {
        const sm = chacha(s, r);
        bump(s);
        for (let k = 0; k < 16; k++) w[o + k] ^= sm[k];
        o += 16;
    }
    const rm = w.length - o;
    const sm = chacha(s, r);
    for (let k = 0; k < rm; k++) w[o + k] ^= sm[k];
    for (let i = 0; i < nf; i++) {
        const x = w[i];
        const j = 4 * i;
        by[j] = x & 0xFF;
        by[j + 1] = (x >> 8) & 0xFF;
        by[j + 2] = (x >> 16) & 0xFF;
        by[j + 3] = (x >> 24) & 0xFF;
    }
    if (lo) {
        const x = w[nf];
        const b = 4 * nf;
        for (let c = 0; c < lo; c++) by[b + c] = (x >> (8 * c)) & 0xFF;
    }
}

function ab22(k12, r, s) {
    const st = ot.concat(k12);
    const d = Array.from(s, ch => ch.charCodeAt(0));
    encCha(st, r, d);
    return String.fromCharCode(...d);
}

function xgnarly(q, b, ua, ec = 0, v = '5.1.1', ts = Date.now()) {
    kt = initPrng();
    st = aa[88];
    const obj = new Map();
    obj.set(1, 1);
    obj.set(2, ec);
    obj.set(3, crypto.createHash('md5').update(q).digest('hex'));
    obj.set(4, crypto.createHash('md5').update(b).digest('hex'));
    obj.set(5, crypto.createHash('md5').update(ua).digest('hex'));
    obj.set(6, Math.floor(ts / 1000));
    obj.set(7, 1508145731);
    obj.set(8, (ts * 1000) % 2147483648);
    obj.set(9, v);
    if (v === '5.1.1') {
        obj.set(10, '1.0.0.314');
        obj.set(11, 1);
        let v12 = 0;
        for (let i = 1; i <= 11; i++) {
            const val = obj.get(i);
            const tx = typeof val === 'number' ? val : beInt(val);
            v12 ^= tx;
        }
        obj.set(12, v12 >>> 0);
    } else if (v !== '5.1.0') {
        throw new Error(`Unsupported version: ${v}`);
    }
    let v0 = 0;
    for (let i = 1; i <= obj.size; i++) {
        const val = obj.get(i);
        if (typeof val === 'number') v0 ^= val;
    }
    obj.set(0, v0 >>> 0);
    const pl = [];
    pl.push(obj.size);
    for (const [k, val] of obj) {
        pl.push(k);
        const vb = typeof val === 'number' ? nb(val) : Array.from(Buffer.from(val, 'utf8'));
        pl.push(...nb(vb.length));
        pl.push(...vb);
    }
    const bs = String.fromCharCode(...pl);
    const kw = [];
    const kb = [];
    let ra = 0;
    for (let i = 0; i < 12; i++) {
        const rn = rand();
        const wd = (rn * 4294967296) >>> 0;
        kw.push(wd);
        ra = (ra + (wd & 15)) & 15;
        kb.push(wd & 0xFF, (wd >>> 8) & 0xFF, (wd >>> 16) & 0xFF, (wd >>> 24) & 0xFF);
    }
    const rds = ra + 5;
    const enc = ab22(kw, rds, bs);
    let ip = 0;
    for (const x of kb) ip = (ip + x) % (enc.length + 1);
    for (const ch of enc) ip = (ip + ch.charCodeAt(0)) % (enc.length + 1);
    const kbs = String.fromCharCode(...kb);
    const fs = String.fromCharCode(((1 << 6) ^ (1 << 3) ^ 3) & 0xFF) + enc.slice(0, ip) + kbs + enc.slice(ip);
    const alph = 'u09tbS3UvgDEe6r-ZVMXzLpsAohTn7mdINQlW412GqBjfYiyk8JORCF5/xKHwacP=';
    const out = [];
    const fl = Math.floor(fs.length / 3) * 3;
    for (let i = 0; i < fl; i += 3) {
        const blk = (fs.charCodeAt(i) << 16) | (fs.charCodeAt(i + 1) << 8) | fs.charCodeAt(i + 2);
        out.push(alph[(blk >> 18) & 63], alph[(blk >> 12) & 63], alph[(blk >> 6) & 63], alph[blk & 63]);
    }
    return out.join('');
}

app.post('/sign', (req, res) => {
    try {
        const { query, body, includeBogus, version } = req.body;
        if (!query || typeof query !== 'string') {
            return res.status(400).json({ error: 'Missing or invalid query parameter' });
        }
        const b = body || "";
        const ua = req.headers['user-agent'] || 'Mozilla/5.0';
        const v = version || '5.1.1';
        const ts = Math.floor(Date.now() / 1000);
        const xg = xgnarly(query, b, ua, 0, v);
        const resp = { xGnarly: xg, xGorgon: xg };
        if (includeBogus) {
            resp.xBogus = xbogus(query, b, ua, ts);
        }
        res.status(200).json(resp);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

app.get('/', (req, res) => {
    res.json({
        name: 'TikTok Signature API',
        version: '2.0.0',
        endpoints: {
            '/sign': {
                method: 'POST',
                body: {
                    query: 'string (required)',
                    body: 'string (optional)',
                    includeBogus: 'boolean (optional)',
                    version: 'string (optional, default: 5.1.1)'
                }
            }
        }
    });
});

const PORT = process.env.PORT || 8002;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});