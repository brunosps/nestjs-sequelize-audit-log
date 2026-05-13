#!/usr/bin/env node
const zlib = require('zlib');

const payload = process.argv[2];

if (!payload) {
    console.error('Uso: node decode-payload.js [payload]');
    process.exit(1);
}

const data = payload.startsWith('GZ:') ? payload.slice(3) : payload;
const buffer = Buffer.from(data, 'base64');
const result = zlib.gunzipSync(buffer).toString('utf-8');

try {
    console.log(JSON.stringify(JSON.parse(result), null, 2));
} catch {
    console.log(result);
}
