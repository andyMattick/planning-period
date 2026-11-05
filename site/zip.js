// A tiny store-only ZIP writer (no compression), for the order page.
// Works in the browser (window.PPZip) and in Node (globalThis.PPZip after import).
// Format: local file header + data for each file, then the central directory, then the end record.
(function (root) {
  'use strict';

  var CRC_TABLE = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(bytes) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function utf8(str) { return new TextEncoder().encode(str); }

  function dosTime(d) {
    var time = ((d.getHours() & 31) << 11) | ((d.getMinutes() & 63) << 5) | ((d.getSeconds() / 2) & 31);
    var year = Math.max(1980, d.getFullYear());
    var date = (((year - 1980) & 127) << 9) | (((d.getMonth() + 1) & 15) << 5) | (d.getDate() & 31);
    return { time: time, date: date };
  }

  function toBytes(data) {
    if (typeof data === 'string') return utf8(data);
    if (data instanceof Uint8Array) return data;
    if (data instanceof ArrayBuffer) return new Uint8Array(data);
    if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    throw new Error('zip: file data must be a string, Uint8Array or ArrayBuffer');
  }

  // files: [{ name: 'folder/file.txt', data: string | Uint8Array | ArrayBuffer, date?: Date }]
  // Returns a Uint8Array holding the whole .zip.
  function makeZip(files, opts) {
    opts = opts || {};
    var now = opts.date || new Date();
    var locals = [], centrals = [], offset = 0, total = 0;
    var seen = Object.create(null);

    files.forEach(function (f) {
      var name = String(f.name).replace(/\\/g, '/').replace(/^\/+/, '');
      if (!name) throw new Error('zip: empty file name');
      if (seen[name]) throw new Error('zip: duplicate file name ' + name);
      seen[name] = true;
      var nameBytes = utf8(name);
      var data = toBytes(f.data);
      if (data.length > 0xFFFFFFFE || offset > 0xFFFFFFFE) throw new Error('zip: file too large for a basic zip');
      var crc = crc32(data);
      var dt = dosTime(f.date || now);

      var lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true);   // local file header signature
      lh.setUint16(4, 20, true);           // version needed (2.0)
      lh.setUint16(6, 0x0800, true);       // flags: names are UTF-8
      lh.setUint16(8, 0, true);            // method: store
      lh.setUint16(10, dt.time, true);
      lh.setUint16(12, dt.date, true);
      lh.setUint32(14, crc, true);
      lh.setUint32(18, data.length, true); // compressed size
      lh.setUint32(22, data.length, true); // uncompressed size
      lh.setUint16(26, nameBytes.length, true);
      lh.setUint16(28, 0, true);           // extra length

      var ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true);   // central directory signature
      ch.setUint16(4, 20, true);           // version made by
      ch.setUint16(6, 20, true);           // version needed
      ch.setUint16(8, 0x0800, true);
      ch.setUint16(10, 0, true);
      ch.setUint16(12, dt.time, true);
      ch.setUint16(14, dt.date, true);
      ch.setUint32(16, crc, true);
      ch.setUint32(20, data.length, true);
      ch.setUint32(24, data.length, true);
      ch.setUint16(28, nameBytes.length, true);
      ch.setUint16(30, 0, true);           // extra
      ch.setUint16(32, 0, true);           // comment
      ch.setUint16(34, 0, true);           // disk number
      ch.setUint16(36, 0, true);           // internal attributes
      ch.setUint32(38, 0, true);           // external attributes
      ch.setUint32(42, offset, true);      // offset of local header

      locals.push(new Uint8Array(lh.buffer), nameBytes, data);
      centrals.push(new Uint8Array(ch.buffer), nameBytes);
      offset += 30 + nameBytes.length + data.length;
    });

    if (files.length > 0xFFFF) throw new Error('zip: too many files');
    var cdSize = centrals.reduce(function (s, b) { return s + b.length; }, 0);
    var end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(4, 0, true);
    end.setUint16(6, 0, true);
    end.setUint16(8, files.length, true);
    end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true);
    end.setUint32(16, offset, true);
    end.setUint16(20, 0, true);

    var parts = locals.concat(centrals, [new Uint8Array(end.buffer)]);
    total = parts.reduce(function (s, b) { return s + b.length; }, 0);
    var out = new Uint8Array(total), pos = 0;
    parts.forEach(function (b) { out.set(b, pos); pos += b.length; });
    return out;
  }

  root.PPZip = { makeZip: makeZip, crc32: crc32 };
})(typeof window !== 'undefined' ? window : globalThis);
