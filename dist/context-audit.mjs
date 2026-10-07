#!/usr/bin/env node
import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/model.js
function item(fields) {
  const it = { ...fields };
  it.id = `${it.harness}:${it.kind}:${it.scope}:${it.name}@${it.path}`;
  return it;
}
function redact(obj) {
  if (Array.isArray(obj)) return obj.map(redact);
  if (!obj || typeof obj !== "object") return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (["env", "headers", "environment", "http_headers", "env_http_headers"].includes(k) && v && typeof v === "object") {
      out[k] = Object.fromEntries(Object.keys(v).map((kk) => [kk, "<redacted>"]));
    } else if (SECRET_KEY.test(k) && typeof v === "string") {
      out[k] = "<redacted>";
    } else {
      out[k] = redact(v);
    }
  }
  return out;
}
var SCHEMA_VERSION, SECRET_KEY;
var init_model = __esm({
  "src/model.js"() {
    SCHEMA_VERSION = 1;
    SECRET_KEY = /(token|secret|key|password|authorization|cookie|bearer|credential)/i;
  }
});

// node_modules/smol-toml/dist/error.js
function getLineColFromPtr(string, ptr) {
  let lines = string.slice(0, ptr).split(/\r?\n/);
  return [lines.length, lines.pop().length + 1];
}
function makeCodeBlock(string, line, column) {
  let lines = string.split(/\r?\n/);
  let codeblock = "";
  let numberLen = (Math.log10(line + 1) | 0) + 1;
  for (let i = line - 1; i <= line + 1; i++) {
    let l = lines[i - 1];
    if (!l)
      continue;
    codeblock += i.toString().padEnd(numberLen, " ");
    codeblock += ":  ";
    codeblock += l;
    codeblock += "\n";
    if (i === line) {
      codeblock += " ".repeat(numberLen + column + 2);
      codeblock += "^\n";
    }
  }
  return codeblock;
}
var TomlError;
var init_error = __esm({
  "node_modules/smol-toml/dist/error.js"() {
    TomlError = class _TomlError extends Error {
      line;
      column;
      codeblock;
      constructor(message, options) {
        const [line, column] = getLineColFromPtr(options.toml, options.ptr);
        const codeblock = makeCodeBlock(options.toml, line, column);
        super(`Invalid TOML document: ${message}

${codeblock}`, options);
        this.line = line;
        this.column = column;
        this.codeblock = codeblock;
      }
      /** @internal */
      static x(message, ctx, ptr) {
        throw new _TomlError(message, { toml: ctx.s, ptr: ptr ?? ctx.p });
      }
    };
  }
});

// node_modules/smol-toml/dist/primitive.js
function parseString(ctx) {
  let startPtr = ctx.p;
  let c = ctx.s.charCodeAt(ctx.p++);
  let first = c;
  let isLiteral = c === 39;
  let isMultiline = c === ctx.s.charCodeAt(ctx.p) && c === ctx.s.charCodeAt(ctx.p + 1);
  if (isMultiline) {
    if ((c = ctx.s.charCodeAt(ctx.p += 2)) === 10)
      ctx.p++;
    else if (c === 13 && ctx.s.charCodeAt(ctx.p + 1) === 10)
      ctx.p += 2;
  }
  let parsed = "";
  let sliceStart = ctx.p;
  let state = 0;
  for (; ctx.p < ctx.s.length; ctx.p++) {
    c = ctx.s.charCodeAt(ctx.p);
    if (isMultiline && (c === 10 || c === 13 && ctx.s.charCodeAt(ctx.p + 1) === 10)) {
      state = state && 3;
    } else if (c < 32 && c !== 9 || c === 127) {
      TomlError.x("control characters are not allowed in strings", ctx);
    } else if ((!state || state === 3) && c === first && (!isMultiline || ctx.s.charCodeAt(ctx.p + 1) === first && ctx.s.charCodeAt(ctx.p + 2) === first)) {
      if (isMultiline) {
        if (ctx.s.charCodeAt(ctx.p + 3) === first)
          ctx.p++;
        if (ctx.s.charCodeAt(ctx.p + 3) === first)
          ctx.p++;
      }
      if (!state) {
        let s = ctx.s.slice(sliceStart, ctx.p);
        parsed = parsed ? parsed + s : s;
      }
      ctx.p += isMultiline ? 3 : 1;
      return parsed;
    } else if (!state) {
      if (!isLiteral && c === 92) {
        parsed += ctx.s.slice(sliceStart, sliceStart = ctx.p);
        state = 1;
      }
    } else if (state === 1) {
      if (c === 120 || c === 117 || c === 85) {
        let errPtr = ctx.p++ - 1;
        let value = 0;
        let len = c === 120 ? 2 : c === 117 ? 4 : 8;
        for (let j = 0; j < len; j++, ctx.p++) {
          let hex = ctx.s.charCodeAt(ctx.p);
          let digit = (
            /* 0-9 */
            hex >= 48 && hex <= 57 ? hex - 48 : (
              /* A-F */
              hex >= 65 && hex <= 70 ? hex - 65 + 10 : (
                /* a-f */
                hex >= 97 && hex <= 102 ? hex - 97 + 10 : -1
              )
            )
          );
          if (digit < 0)
            TomlError.x("invalid non-hex character in unicode escape", ctx);
          value = value << 4 | digit;
        }
        if (value < 0 || value > 1114111 || value >= 55296 && value <= 57343) {
          TomlError.x("invalid unicode escape", ctx, errPtr);
        }
        parsed += String.fromCodePoint(value);
        sliceStart = ctx.p--;
        state = 0;
      } else if (isMultiline && (c === 32 || c === 9)) {
        state = 2;
      } else {
        if (c === 98)
          parsed += "\b";
        else if (c === 116)
          parsed += "	";
        else if (c === 110)
          parsed += "\n";
        else if (c === 102)
          parsed += "\f";
        else if (c === 114)
          parsed += "\r";
        else if (c === 101)
          parsed += "\x1B";
        else if (c === 34)
          parsed += '"';
        else if (c === 92)
          parsed += "\\";
        else
          TomlError.x("unrecognised escape sequence", ctx);
        sliceStart = ctx.p + 1;
        state = 0;
      }
    } else if (c !== 32 && c !== 9) {
      if (state === 2)
        TomlError.x("invalid escape: only line-ending whitespace may be escaped", ctx, sliceStart);
      state = !isLiteral && c === 92 ? 1 : 0;
      sliceStart = ctx.p;
    }
  }
  TomlError.x("unfinished string", ctx, startPtr);
}
var init_primitive = __esm({
  "node_modules/smol-toml/dist/primitive.js"() {
    init_error();
  }
});

// node_modules/smol-toml/dist/date.js
var DATE_TIME_RE, TomlDate;
var init_date = __esm({
  "node_modules/smol-toml/dist/date.js"() {
    DATE_TIME_RE = /^(\d{4}-\d{2}-\d{2})?[Tt ]?(?:(\d{2}):\d{2}(?::\d{2}(?:\.\d+)?)?)?(Z|z|[-+]\d{2}:\d{2})?$/i;
    TomlDate = class _TomlDate extends Date {
      #hasDate = false;
      #hasTime = false;
      #offset = null;
      constructor(date, fasttype, unsafeDelim) {
        let hasDate = true;
        let hasTime = true;
        let offset = "Z";
        let c;
        if (typeof date === "string") {
          if (fasttype)
            prep: {
              if (fasttype < 3) {
                if (+date.slice(11, 13) > 23) {
                  date = "";
                  break prep;
                }
                if (fasttype === 2) {
                  offset = null;
                  date += "Z";
                } else if ((c = date.charCodeAt(date.length - 1)) !== 90 && c !== 122) {
                  offset = date.slice(date.length - 6);
                }
                if (unsafeDelim)
                  date = date.slice(0, 10) + "T" + date.slice(11);
              } else if (fasttype === 4) {
                date = +date.slice(0, 2) > 23 ? "" : `0000-01-01T${date}Z`;
              }
              hasDate = fasttype !== 4;
              hasTime = fasttype !== 3;
            }
          else {
            let match = date.match(DATE_TIME_RE);
            if (match) {
              if (!match[1]) {
                hasDate = false;
                date = `0000-01-01T${date}`;
              }
              hasTime = !!match[2];
              hasTime && date[10] === " " && (date = date.replace(" ", "T"));
              if (match[2] && +match[2] > 23) {
                date = "";
              } else {
                offset = match[3] || null;
                if (!offset && hasTime)
                  date += "Z";
              }
            } else {
              date = "";
            }
          }
        }
        super(date);
        if (!isNaN(this.getTime())) {
          this.#hasDate = hasDate;
          this.#hasTime = hasTime;
          this.#offset = offset;
        }
      }
      isDateTime() {
        return this.#hasDate && this.#hasTime;
      }
      isLocal() {
        return !this.#hasDate || !this.#hasTime || !this.#offset;
      }
      isDate() {
        return this.#hasDate && !this.#hasTime;
      }
      isTime() {
        return this.#hasTime && !this.#hasDate;
      }
      isValid() {
        return this.#hasDate || this.#hasTime;
      }
      toISOString() {
        let iso = super.toISOString();
        if (this.isDate())
          return iso.slice(0, 10);
        if (this.isTime())
          return iso.slice(11, 23);
        if (this.#offset === null)
          return iso.slice(0, -1);
        if (this.#offset === "Z" || this.#offset === "z")
          return iso;
        let offset = +this.#offset.slice(1, 3) * 60 + +this.#offset.slice(4, 6);
        offset = this.#offset[0] === "-" ? offset : -offset;
        let offsetDate = new Date(this.getTime() - offset * 6e4);
        return offsetDate.toISOString().slice(0, -1) + this.#offset;
      }
      static wrapAsOffsetDateTime(jsDate, offset = "Z") {
        let date = new _TomlDate(jsDate);
        date.#offset = offset;
        return date;
      }
      static wrapAsLocalDateTime(jsDate) {
        let date = new _TomlDate(jsDate);
        date.#offset = null;
        return date;
      }
      static wrapAsLocalDate(jsDate) {
        let date = new _TomlDate(jsDate);
        date.#hasTime = false;
        date.#offset = null;
        return date;
      }
      static wrapAsLocalTime(jsDate) {
        let date = new _TomlDate(jsDate);
        date.#hasDate = false;
        date.#offset = null;
        return date;
      }
    };
  }
});

// node_modules/smol-toml/dist/extract.js
function isDigit(char, base = 10) {
  return base === 16 ? char > 47 && char < 58 || char > 64 && char < 71 || char > 96 && char < 103 : char > 47 && char < 48 + base;
}
function isEndOfValue(char, delim) {
  return char === 32 || char === 9 || char === 10 || char === 13 || // Structure end or next value delimiter
  delim && (char === delim || char === 44) || // Comment
  char === 35;
}
function extractValue(ctx, end) {
  let errPtr = ctx.p;
  let c = ctx.s.charCodeAt(ctx.p);
  if (c === 91 || c === 123) {
    ctx.d-- || TomlError.x("document contains excessively nested structures. aborting.", ctx);
    let value = c === 91 ? parseArray(ctx) : parseInlineTable(ctx);
    ctx.d++;
    return value;
  }
  if (c === 34 || c === 39) {
    return parseString(ctx);
  }
  if (c === 116) {
    if (ctx.s.charCodeAt(++ctx.p) !== 114 || ctx.s.charCodeAt(++ctx.p) !== 117 || ctx.s.charCodeAt(++ctx.p) !== 101)
      TomlError.x("invalid value", ctx, errPtr);
    return ctx.p++, true;
  }
  if (c === 102) {
    if (ctx.s.charCodeAt(++ctx.p) !== 97 || ctx.s.charCodeAt(++ctx.p) !== 108 || ctx.s.charCodeAt(++ctx.p) !== 115 || ctx.s.charCodeAt(++ctx.p) !== 101)
      TomlError.x("invalid value", ctx, errPtr);
    return ctx.p++, false;
  }
  if (c === 43 || c === 45) {
    return parseNumber(ctx, ctx.p, ctx.s.charCodeAt(++ctx.p), 44 - c, end);
  }
  if (ctx.s.charCodeAt(ctx.p + 4) === 45 && ctx.s.charCodeAt(ctx.p + 7) === 45) {
    return parseDate(ctx, c, end);
  }
  if (ctx.s.charCodeAt(ctx.p + 2) === 58) {
    return parseTime(ctx, c, end);
  }
  return parseNumber(ctx, ctx.p, c, 0, end);
}
function parseNumber(ctx, startPtr, startChr, sign, endChr) {
  let c = startChr;
  let state = 0;
  let hasUnderscores = false;
  if (c === 105) {
    if (ctx.s.charCodeAt(++ctx.p) !== 110 || ctx.s.charCodeAt(++ctx.p) !== 102)
      TomlError.x("invalid value", ctx, startPtr);
    return ctx.p++, (sign || 1) / 0;
  }
  if (c === 110) {
    if (ctx.s.charCodeAt(++ctx.p) !== 97 || ctx.s.charCodeAt(++ctx.p) !== 110)
      TomlError.x("invalid value", ctx, startPtr);
    return ctx.p++, NaN;
  }
  if (c === 48) {
    if (++ctx.p >= ctx.s.length || isEndOfValue(c = ctx.s.charCodeAt(ctx.p), endChr))
      return ctx.bi === true ? 0n : 0;
    if (!sign) {
      if (c === 120)
        return parseIntegerBaseN(ctx, startPtr, 16, endChr);
      else if (c === 98)
        return parseIntegerBaseN(ctx, startPtr, 2, endChr);
      else if (c === 111)
        return parseIntegerBaseN(ctx, startPtr, 8, endChr);
    }
    if (c === 46)
      state = 2;
    else if (c === 101 || c === 69)
      state = 4;
    else
      TomlError.x("illegal leading zero", ctx, startPtr);
  } else if (!isDigit(c))
    TomlError.x("invalid value", ctx, startPtr);
  while (++ctx.p < ctx.s.length && (c = ctx.s.charCodeAt(ctx.p), !isEndOfValue(c, endChr))) {
    if (!state)
      state = 1;
    if (c === 95) {
      if (!(state & 1))
        TomlError.x("illegal underscore", ctx);
      state += 11;
      hasUnderscores = true;
    } else if (state === 1 && c === 46)
      state = 2;
    else if ((state === 1 || state === 3) && (c === 101 || c === 69))
      state = 4;
    else if (state === 4 && (c === 43 || c === 45)) {
    } else if (!isDigit(c))
      TomlError.x(`illegal character in numeric literal`, ctx);
    else if (state > 9)
      state -= 11;
    else if (!(state & 1))
      state++;
  }
  if (!state) {
    let val = (startChr - 48) * (sign || 1);
    return ctx.bi === true ? BigInt(val) : val;
  }
  if (!(state & 1))
    TomlError.x("unfinished numeric value", ctx, startPtr);
  let str = ctx.s.slice(startPtr, ctx.p);
  if (hasUnderscores)
    str = str.replaceAll("_", "");
  return state > 1 ? parseFloat(str) : parseInteger(ctx, str, 10, startPtr);
}
function parseIntegerBaseN(ctx, startPtr, base, endChr) {
  let c, underscore = 1;
  while (++ctx.p < ctx.s.length && (c = ctx.s.charCodeAt(ctx.p), !isEndOfValue(c, endChr))) {
    if (c === 95) {
      if (underscore & 1)
        TomlError.x("illegal underscore", ctx);
      underscore = 3;
    } else if (!isDigit(c, base))
      TomlError.x(`illegal character in numeric literal`, ctx);
    else if (underscore & 1)
      underscore--;
  }
  if (underscore & 1)
    TomlError.x("unfinished numeric value", ctx);
  let str = ctx.s.slice(startPtr + 2, ctx.p);
  if (underscore)
    str = str.replaceAll("_", "");
  return parseInteger(ctx, str, base, startPtr);
}
function parseInteger(ctx, str, base, startPtr) {
  if (ctx.bi !== true)
    int: {
      let val = parseInt(str, base);
      if (!Number.isSafeInteger(val)) {
        if (ctx.bi)
          break int;
        TomlError.x("integer value cannot be represented losslessly", ctx, startPtr);
      }
      return val;
    }
  return base === 10 ? BigInt(str) : BigInt((base === 2 ? "0b" : base === 8 ? "0o" : "0x") + str);
}
function parseDate(ctx, c, endChr) {
  let startPtr = ctx.p++, unsafeSeparator;
  if (!isDigit(c) || !isDigit(ctx.s.charCodeAt(ctx.p++)) || !isDigit(ctx.s.charCodeAt(ctx.p++)) || !isDigit(ctx.s.charCodeAt(ctx.p++))) {
    return parseNumber(ctx, ctx.p = startPtr, c, 0, endChr);
  }
  ctx.p += 5;
  if (!isDigit(ctx.s.charCodeAt(ctx.p++)))
    TomlError.x("invalid date-time: date part is malformed", ctx, startPtr);
  if (ctx.p >= ctx.s.length || ((c = ctx.s.charCodeAt(ctx.p)) !== 32 || (unsafeSeparator = true, !isDigit(ctx.s.charCodeAt(ctx.p + 1)))) && c !== 84 && c !== 116) {
    let t2 = ctx.s.slice(startPtr, ctx.p);
    return readDate(ctx, t2, 3, false, startPtr);
  }
  if (ctx.s.charCodeAt(ctx.p += 3) !== 58)
    TomlError.x("invalid date-time: time part is malformed", ctx, startPtr);
  if (ctx.s.charCodeAt(ctx.p += 3) === 58)
    ctx.p += 3;
  if (ctx.s.charCodeAt(ctx.p) === 46)
    while (isDigit(ctx.s.charCodeAt(++ctx.p)))
      ;
  if (c = ctx.s.charCodeAt(ctx.p)) {
    if (c === 90 || c === 122) {
      let t2 = ctx.s.slice(startPtr, ++ctx.p);
      return readDate(ctx, t2, 1, unsafeSeparator, startPtr, "[+00:00]");
    }
    if (c === 43 || c === 45) {
      let t2 = ctx.s.slice(startPtr, ctx.p += 6);
      return readDate(ctx, t2, 1, unsafeSeparator, startPtr, !ctx.ld && "[" + ctx.s.slice(ctx.p - 6, ctx.p) + "]");
    }
  }
  let t = ctx.s.slice(startPtr, ctx.p);
  return readDate(ctx, t, 2, unsafeSeparator, startPtr);
}
function parseTime(ctx, c, endChr) {
  let start = ctx.p;
  if (!isDigit(c) || !isDigit(ctx.s.charCodeAt(++ctx.p))) {
    return parseNumber(ctx, --ctx.p, c, 0, endChr);
  }
  if (ctx.s.charCodeAt(ctx.p += 4) === 58)
    ctx.p += 3;
  if (ctx.s.charCodeAt(ctx.p) === 46)
    while (isDigit(ctx.s.charCodeAt(++ctx.p)))
      ;
  let t = ctx.s.slice(start, ctx.p);
  return readDate(ctx, t, 4, false, start);
}
function readDate(ctx, str, type, unsafeDelim, errPtr, temporalSuffix) {
  if (ctx.ld) {
    let date = new TomlDate(str, type, unsafeDelim);
    if (!date.isValid())
      TomlError.x("invalid date", ctx, errPtr);
    return date;
  }
  try {
    if (temporalSuffix)
      str += temporalSuffix;
    switch (type) {
      case 1:
        return Temporal.ZonedDateTime.from(str);
      case 2:
        return Temporal.PlainDateTime.from(str);
      case 3:
        return Temporal.PlainDate.from(str);
      case 4:
        return Temporal.PlainTime.from(str);
    }
  } catch (e) {
    TomlError.x(e instanceof Error ? e.message : "" + e, ctx, errPtr);
  }
}
var init_extract = __esm({
  "node_modules/smol-toml/dist/extract.js"() {
    init_primitive();
    init_struct();
    init_error();
    init_date();
  }
});

// node_modules/smol-toml/dist/util.js
function skipComment(ctx) {
  for (; ctx.p < ctx.s.length; ctx.p++) {
    let c = ctx.s.charCodeAt(ctx.p);
    if (c === 10)
      break;
    if (c === 13 && ctx.s.charCodeAt(ctx.p + 1) === 10) {
      ctx.p++;
      break;
    }
    if (c < 32 && c !== 9 || c === 127) {
      TomlError.x("control characters are not allowed in comments", ctx);
    }
  }
}
function skipVoid(ctx, banNewLines, banComments) {
  let c;
  while (ctx.p < ctx.s.length) {
    while (ctx.p < ctx.s.length && ((c = ctx.s.charCodeAt(ctx.p)) === 32 || c === 9 || !banNewLines && (c === 10 || c === 13 && ctx.s.charCodeAt(ctx.p + 1) === 10)))
      ctx.p++;
    if (banComments || c !== 35)
      break;
    skipComment(ctx);
  }
}
var init_util = __esm({
  "node_modules/smol-toml/dist/util.js"() {
    init_error();
  }
});

// node_modules/smol-toml/dist/struct.js
function parseKey(ctx, end = 61) {
  let startPtr;
  let state = 0;
  let parsed = [];
  let sliceStart;
  let c = ctx.s.charCodeAt(startPtr = ctx.p);
  do {
    if (c === end) {
      if (!state)
        TomlError.x("unexpected end of key", ctx);
      if (state === 1)
        parsed.push(ctx.s.slice(sliceStart, ctx.p));
      return ctx.p++, parsed;
    } else if (c === 46) {
      if (!state)
        TomlError.x("illegal empty bare key", ctx);
      if (state === 1)
        parsed.push(ctx.s.slice(sliceStart, ctx.p));
      state = 0;
    } else if (!state && (c === 34 || c === 39)) {
      if (c === ctx.s.charCodeAt(ctx.p + 1) && c === ctx.s.charCodeAt(ctx.p + 2))
        TomlError.x("illegal quoted key: multiline strings are not allowed", ctx);
      parsed.push(parseString(ctx));
      state = 2;
      ctx.p--;
    } else if (c === 32 || c === 9) {
      if (state === 1) {
        parsed.push(ctx.s.slice(sliceStart, ctx.p));
        state = 2;
      }
    } else if (state === 2 || c < 48 && c !== 45 || c > 57 && c < 65 || c > 90 && c < 97 && c !== 95 || c > 122) {
      TomlError.x("illegal character in key", ctx);
    } else if (!state) {
      state = 1;
      sliceStart = ctx.p;
    }
  } while (c = ctx.s.charCodeAt(++ctx.p));
  TomlError.x("incomplete key-value: cannot find end of key", ctx, startPtr);
}
function parseInlineTable(ctx) {
  let startPtr = ctx.p++;
  let res = /* @__PURE__ */ Object.create(null);
  let seen = /* @__PURE__ */ new Set();
  let c;
  while (ctx.p < ctx.s.length) {
    skipVoid(ctx);
    if ((c = ctx.s.charCodeAt(ctx.p)) === 125) {
      ctx.p++;
      return res;
    }
    let k;
    let t = res;
    let hasOwn = false;
    let errPtr = ctx.p;
    let key = parseKey(ctx);
    for (let i = 0; i < key.length; i++) {
      if (i)
        t = hasOwn ? t[k] : t[k] = /* @__PURE__ */ Object.create(null);
      k = key[i];
      if ((hasOwn = Object.hasOwn(t, k)) && (typeof t[k] !== "object" || seen.has(t[k]))) {
        TomlError.x("trying to redefine an already defined value", ctx, errPtr);
      }
      let unsafe = k === "__proto__";
      if (ctx.uk && (unsafe || k === "constructor")) {
        t = ctx.uk !== 1 && TomlError.x("document contains an unsafe property", ctx, errPtr);
        break;
      }
      if (!hasOwn && unsafe) {
        Object.defineProperty(t, k, { enumerable: true, configurable: true, writable: true });
      }
    }
    if (hasOwn) {
      TomlError.x("trying to redefine an already defined value", ctx, errPtr);
    }
    skipVoid(ctx, true, true);
    let value = extractValue(
      ctx,
      125
      /* } */
    );
    if (t && typeof (t[k] = value) === "object")
      seen.add(value);
    skipVoid(ctx);
    if ((c = ctx.s.charCodeAt(ctx.p++)) === 125) {
      return res;
    }
    if (c !== 44)
      TomlError.x("expected comma or end of structure", ctx, ctx.p - 1);
  }
  TomlError.x("unfinished table", ctx, startPtr);
}
function parseArray(ctx) {
  let startPtr = ctx.p++;
  let res = [];
  let c;
  while (ctx.p < ctx.s.length) {
    skipVoid(ctx);
    if ((c = ctx.s.charCodeAt(ctx.p)) === 93) {
      ctx.p++;
      return res;
    }
    res.push(extractValue(
      ctx,
      93
      /* ] */
    ));
    skipVoid(ctx);
    if ((c = ctx.s.charCodeAt(ctx.p++)) === 93) {
      return res;
    }
    if (c !== 44)
      TomlError.x("expected comma or end of structure", ctx, ctx.p - 1);
  }
  TomlError.x("unfinished array", ctx, startPtr);
}
var init_struct = __esm({
  "node_modules/smol-toml/dist/struct.js"() {
    init_primitive();
    init_extract();
    init_util();
    init_error();
  }
});

// node_modules/smol-toml/dist/parse.js
function peekTable(ctx, key, table, meta, type) {
  let t = table;
  let m = meta;
  let k;
  let hasOwn = false;
  let state;
  for (let i = 0; i < key.length; i++) {
    if (i) {
      t = hasOwn ? t[k] : t[k] = /* @__PURE__ */ Object.create(null);
      m = (state = m[k]).c;
      if (type === 0 && (state.t === 1 || state.t === 2)) {
        return null;
      }
      if (state.t === 2) {
        let l = t.length - 1;
        t = t[l];
        m = m[l].c;
      }
    }
    k = key[i];
    if ((hasOwn = Object.hasOwn(t, k)) && m[k]?.t === 0 && m[k]?.d) {
      return null;
    }
    if (!hasOwn) {
      let unsafe = k === "__proto__";
      if (ctx.uk && (unsafe || k === "constructor"))
        return false;
      if (unsafe) {
        Object.defineProperty(t, k, { enumerable: true, configurable: true, writable: true });
        Object.defineProperty(m, k, { enumerable: true, configurable: true, writable: true });
      }
      m[k] = {
        t: i < key.length - 1 && type === 2 ? 3 : type,
        d: false,
        i: 0,
        c: /* @__PURE__ */ Object.create(null)
      };
    }
  }
  state = m[k];
  if (state.t !== type && !(type === 1 && state.t === 3)) {
    return null;
  }
  if (type === 2) {
    if (!state.d) {
      state.d = true;
      t[k] = [];
    }
    t[k].push(t = /* @__PURE__ */ Object.create(null));
    state.c[state.i++] = state = { t: 1, d: false, i: 0, c: /* @__PURE__ */ Object.create(null) };
  }
  if (state.d) {
    return null;
  }
  state.d = true;
  if (type === 1) {
    t = hasOwn ? t[k] : t[k] = /* @__PURE__ */ Object.create(null);
  } else if (type === 0 && hasOwn) {
    return null;
  }
  return [k, t, state.c];
}
function validateTablePeek(ctx, peek, ptr) {
  if (peek === null || ctx.uk === 2)
    TomlError.x(peek === null ? "trying to redefine an already defined table or value" : "document contains an unsafe property", ctx, ptr);
}
function parse(toml, options = {}) {
  let ctx = {
    s: toml,
    p: 0,
    d: options.maxDepth ?? 1e3,
    bi: options.integersAsBigInt ?? false,
    ld: options.useLegacyDate ?? true,
    uk: options.unsafeKeyBehaviour === "throw" ? 2 : options.unsafeKeyBehaviour === "drop" ? 1 : 0
  };
  let res = /* @__PURE__ */ Object.create(null);
  let meta = /* @__PURE__ */ Object.create(null);
  let tmp;
  let skipping = false;
  let tbl = res;
  let m = meta;
  if (toml.charCodeAt(0) === 65279)
    ctx.p++;
  skipVoid(ctx);
  while (ctx.p < toml.length) {
    if (toml.charCodeAt(ctx.p) === 91) {
      let isTableArray = toml.charCodeAt(++ctx.p) === 91;
      tmp = ctx.p += +isTableArray;
      skipping = false;
      let k = parseKey(
        ctx,
        93
        /* ] */
      );
      if (isTableArray) {
        if (toml.charCodeAt(ctx.p) !== 93) {
          TomlError.x("expected end of table array declaration", ctx);
        }
        ctx.p++;
      }
      let p = peekTable(
        ctx,
        k,
        res,
        meta,
        isTableArray ? 2 : 1
        /* Type.EXPLICIT */
      );
      if (!p) {
        validateTablePeek(ctx, p, tmp);
        skipping = true;
      } else {
        m = p[2];
        tbl = p[1];
      }
    } else {
      tmp = ctx.p;
      let k = parseKey(ctx);
      let p = peekTable(
        ctx,
        k,
        tbl,
        m,
        0
        /* Type.DOTTED */
      );
      if (!p && !skipping)
        validateTablePeek(ctx, p, tmp);
      skipVoid(ctx, true, true);
      let v = extractValue(ctx, void 0);
      if (p && !skipping)
        p[1][p[0]] = v;
    }
    skipVoid(ctx, true);
    if (ctx.p < toml.length && (tmp = toml.charCodeAt(ctx.p)) !== 10 && (tmp !== 13 || toml.charCodeAt(ctx.p + 1) !== 10)) {
      TomlError.x("each key-value declaration must be followed by an end-of-line", ctx);
    }
    skipVoid(ctx);
  }
  return res;
}
var init_parse = __esm({
  "node_modules/smol-toml/dist/parse.js"() {
    init_struct();
    init_extract();
    init_util();
    init_error();
  }
});

// node_modules/smol-toml/dist/stringify.js
var HAS_WELLFORMED;
var init_stringify = __esm({
  "node_modules/smol-toml/dist/stringify.js"() {
    HAS_WELLFORMED = !!"".isWellFormed;
  }
});

// node_modules/smol-toml/dist/index.js
var init_dist = __esm({
  "node_modules/smol-toml/dist/index.js"() {
    init_parse();
    init_stringify();
    init_date();
    init_error();
  }
});

// node_modules/jsonc-parser/lib/esm/impl/scanner.js
function createScanner(text, ignoreTrivia = false) {
  const len = text.length;
  let pos = 0, value = "", tokenOffset = 0, token = 16, lineNumber = 0, lineStartOffset = 0, tokenLineStartOffset = 0, prevTokenLineStartOffset = 0, scanError = 0;
  function scanHexDigits(count, exact) {
    let digits = 0;
    let value2 = 0;
    while (digits < count || !exact) {
      let ch = text.charCodeAt(pos);
      if (ch >= 48 && ch <= 57) {
        value2 = value2 * 16 + ch - 48;
      } else if (ch >= 65 && ch <= 70) {
        value2 = value2 * 16 + ch - 65 + 10;
      } else if (ch >= 97 && ch <= 102) {
        value2 = value2 * 16 + ch - 97 + 10;
      } else {
        break;
      }
      pos++;
      digits++;
    }
    if (digits < count) {
      value2 = -1;
    }
    return value2;
  }
  function setPosition(newPosition) {
    pos = newPosition;
    value = "";
    tokenOffset = 0;
    token = 16;
    scanError = 0;
  }
  function scanNumber() {
    let start = pos;
    if (text.charCodeAt(pos) === 48) {
      pos++;
    } else {
      pos++;
      while (pos < text.length && isDigit2(text.charCodeAt(pos))) {
        pos++;
      }
    }
    if (pos < text.length && text.charCodeAt(pos) === 46) {
      pos++;
      if (pos < text.length && isDigit2(text.charCodeAt(pos))) {
        pos++;
        while (pos < text.length && isDigit2(text.charCodeAt(pos))) {
          pos++;
        }
      } else {
        scanError = 3;
        return text.substring(start, pos);
      }
    }
    let end = pos;
    if (pos < text.length && (text.charCodeAt(pos) === 69 || text.charCodeAt(pos) === 101)) {
      pos++;
      if (pos < text.length && text.charCodeAt(pos) === 43 || text.charCodeAt(pos) === 45) {
        pos++;
      }
      if (pos < text.length && isDigit2(text.charCodeAt(pos))) {
        pos++;
        while (pos < text.length && isDigit2(text.charCodeAt(pos))) {
          pos++;
        }
        end = pos;
      } else {
        scanError = 3;
      }
    }
    return text.substring(start, end);
  }
  function scanString() {
    let result = "", start = pos;
    while (true) {
      if (pos >= len) {
        result += text.substring(start, pos);
        scanError = 2;
        break;
      }
      const ch = text.charCodeAt(pos);
      if (ch === 34) {
        result += text.substring(start, pos);
        pos++;
        break;
      }
      if (ch === 92) {
        result += text.substring(start, pos);
        pos++;
        if (pos >= len) {
          scanError = 2;
          break;
        }
        const ch2 = text.charCodeAt(pos++);
        switch (ch2) {
          case 34:
            result += '"';
            break;
          case 92:
            result += "\\";
            break;
          case 47:
            result += "/";
            break;
          case 98:
            result += "\b";
            break;
          case 102:
            result += "\f";
            break;
          case 110:
            result += "\n";
            break;
          case 114:
            result += "\r";
            break;
          case 116:
            result += "	";
            break;
          case 117:
            const ch3 = scanHexDigits(4, true);
            if (ch3 >= 0) {
              result += String.fromCharCode(ch3);
            } else {
              scanError = 4;
            }
            break;
          default:
            scanError = 5;
        }
        start = pos;
        continue;
      }
      if (ch >= 0 && ch <= 31) {
        if (isLineBreak(ch)) {
          result += text.substring(start, pos);
          scanError = 2;
          break;
        } else {
          scanError = 6;
        }
      }
      pos++;
    }
    return result;
  }
  function scanNext() {
    value = "";
    scanError = 0;
    tokenOffset = pos;
    lineStartOffset = lineNumber;
    prevTokenLineStartOffset = tokenLineStartOffset;
    if (pos >= len) {
      tokenOffset = len;
      return token = 17;
    }
    let code = text.charCodeAt(pos);
    if (isWhiteSpace(code)) {
      do {
        pos++;
        value += String.fromCharCode(code);
        code = text.charCodeAt(pos);
      } while (isWhiteSpace(code));
      return token = 15;
    }
    if (isLineBreak(code)) {
      pos++;
      value += String.fromCharCode(code);
      if (code === 13 && text.charCodeAt(pos) === 10) {
        pos++;
        value += "\n";
      }
      lineNumber++;
      tokenLineStartOffset = pos;
      return token = 14;
    }
    switch (code) {
      // tokens: []{}:,
      case 123:
        pos++;
        return token = 1;
      case 125:
        pos++;
        return token = 2;
      case 91:
        pos++;
        return token = 3;
      case 93:
        pos++;
        return token = 4;
      case 58:
        pos++;
        return token = 6;
      case 44:
        pos++;
        return token = 5;
      // strings
      case 34:
        pos++;
        value = scanString();
        return token = 10;
      // comments
      case 47:
        const start = pos - 1;
        if (text.charCodeAt(pos + 1) === 47) {
          pos += 2;
          while (pos < len) {
            if (isLineBreak(text.charCodeAt(pos))) {
              break;
            }
            pos++;
          }
          value = text.substring(start, pos);
          return token = 12;
        }
        if (text.charCodeAt(pos + 1) === 42) {
          pos += 2;
          const safeLength = len - 1;
          let commentClosed = false;
          while (pos < safeLength) {
            const ch = text.charCodeAt(pos);
            if (ch === 42 && text.charCodeAt(pos + 1) === 47) {
              pos += 2;
              commentClosed = true;
              break;
            }
            pos++;
            if (isLineBreak(ch)) {
              if (ch === 13 && text.charCodeAt(pos) === 10) {
                pos++;
              }
              lineNumber++;
              tokenLineStartOffset = pos;
            }
          }
          if (!commentClosed) {
            pos++;
            scanError = 1;
          }
          value = text.substring(start, pos);
          return token = 13;
        }
        value += String.fromCharCode(code);
        pos++;
        return token = 16;
      // numbers
      case 45:
        value += String.fromCharCode(code);
        pos++;
        if (pos === len || !isDigit2(text.charCodeAt(pos))) {
          return token = 16;
        }
      // found a minus, followed by a number so
      // we fall through to proceed with scanning
      // numbers
      case 48:
      case 49:
      case 50:
      case 51:
      case 52:
      case 53:
      case 54:
      case 55:
      case 56:
      case 57:
        value += scanNumber();
        return token = 11;
      // literals and unknown symbols
      default:
        while (pos < len && isUnknownContentCharacter(code)) {
          pos++;
          code = text.charCodeAt(pos);
        }
        if (tokenOffset !== pos) {
          value = text.substring(tokenOffset, pos);
          switch (value) {
            case "true":
              return token = 8;
            case "false":
              return token = 9;
            case "null":
              return token = 7;
          }
          return token = 16;
        }
        value += String.fromCharCode(code);
        pos++;
        return token = 16;
    }
  }
  function isUnknownContentCharacter(code) {
    if (isWhiteSpace(code) || isLineBreak(code)) {
      return false;
    }
    switch (code) {
      case 125:
      case 93:
      case 123:
      case 91:
      case 34:
      case 58:
      case 44:
      case 47:
        return false;
    }
    return true;
  }
  function scanNextNonTrivia() {
    let result;
    do {
      result = scanNext();
    } while (result >= 12 && result <= 15);
    return result;
  }
  return {
    setPosition,
    getPosition: () => pos,
    scan: ignoreTrivia ? scanNextNonTrivia : scanNext,
    getToken: () => token,
    getTokenValue: () => value,
    getTokenOffset: () => tokenOffset,
    getTokenLength: () => pos - tokenOffset,
    getTokenStartLine: () => lineStartOffset,
    getTokenStartCharacter: () => tokenOffset - prevTokenLineStartOffset,
    getTokenError: () => scanError
  };
}
function isWhiteSpace(ch) {
  return ch === 32 || ch === 9;
}
function isLineBreak(ch) {
  return ch === 10 || ch === 13;
}
function isDigit2(ch) {
  return ch >= 48 && ch <= 57;
}
var CharacterCodes;
var init_scanner = __esm({
  "node_modules/jsonc-parser/lib/esm/impl/scanner.js"() {
    "use strict";
    (function(CharacterCodes2) {
      CharacterCodes2[CharacterCodes2["lineFeed"] = 10] = "lineFeed";
      CharacterCodes2[CharacterCodes2["carriageReturn"] = 13] = "carriageReturn";
      CharacterCodes2[CharacterCodes2["space"] = 32] = "space";
      CharacterCodes2[CharacterCodes2["_0"] = 48] = "_0";
      CharacterCodes2[CharacterCodes2["_1"] = 49] = "_1";
      CharacterCodes2[CharacterCodes2["_2"] = 50] = "_2";
      CharacterCodes2[CharacterCodes2["_3"] = 51] = "_3";
      CharacterCodes2[CharacterCodes2["_4"] = 52] = "_4";
      CharacterCodes2[CharacterCodes2["_5"] = 53] = "_5";
      CharacterCodes2[CharacterCodes2["_6"] = 54] = "_6";
      CharacterCodes2[CharacterCodes2["_7"] = 55] = "_7";
      CharacterCodes2[CharacterCodes2["_8"] = 56] = "_8";
      CharacterCodes2[CharacterCodes2["_9"] = 57] = "_9";
      CharacterCodes2[CharacterCodes2["a"] = 97] = "a";
      CharacterCodes2[CharacterCodes2["b"] = 98] = "b";
      CharacterCodes2[CharacterCodes2["c"] = 99] = "c";
      CharacterCodes2[CharacterCodes2["d"] = 100] = "d";
      CharacterCodes2[CharacterCodes2["e"] = 101] = "e";
      CharacterCodes2[CharacterCodes2["f"] = 102] = "f";
      CharacterCodes2[CharacterCodes2["g"] = 103] = "g";
      CharacterCodes2[CharacterCodes2["h"] = 104] = "h";
      CharacterCodes2[CharacterCodes2["i"] = 105] = "i";
      CharacterCodes2[CharacterCodes2["j"] = 106] = "j";
      CharacterCodes2[CharacterCodes2["k"] = 107] = "k";
      CharacterCodes2[CharacterCodes2["l"] = 108] = "l";
      CharacterCodes2[CharacterCodes2["m"] = 109] = "m";
      CharacterCodes2[CharacterCodes2["n"] = 110] = "n";
      CharacterCodes2[CharacterCodes2["o"] = 111] = "o";
      CharacterCodes2[CharacterCodes2["p"] = 112] = "p";
      CharacterCodes2[CharacterCodes2["q"] = 113] = "q";
      CharacterCodes2[CharacterCodes2["r"] = 114] = "r";
      CharacterCodes2[CharacterCodes2["s"] = 115] = "s";
      CharacterCodes2[CharacterCodes2["t"] = 116] = "t";
      CharacterCodes2[CharacterCodes2["u"] = 117] = "u";
      CharacterCodes2[CharacterCodes2["v"] = 118] = "v";
      CharacterCodes2[CharacterCodes2["w"] = 119] = "w";
      CharacterCodes2[CharacterCodes2["x"] = 120] = "x";
      CharacterCodes2[CharacterCodes2["y"] = 121] = "y";
      CharacterCodes2[CharacterCodes2["z"] = 122] = "z";
      CharacterCodes2[CharacterCodes2["A"] = 65] = "A";
      CharacterCodes2[CharacterCodes2["B"] = 66] = "B";
      CharacterCodes2[CharacterCodes2["C"] = 67] = "C";
      CharacterCodes2[CharacterCodes2["D"] = 68] = "D";
      CharacterCodes2[CharacterCodes2["E"] = 69] = "E";
      CharacterCodes2[CharacterCodes2["F"] = 70] = "F";
      CharacterCodes2[CharacterCodes2["G"] = 71] = "G";
      CharacterCodes2[CharacterCodes2["H"] = 72] = "H";
      CharacterCodes2[CharacterCodes2["I"] = 73] = "I";
      CharacterCodes2[CharacterCodes2["J"] = 74] = "J";
      CharacterCodes2[CharacterCodes2["K"] = 75] = "K";
      CharacterCodes2[CharacterCodes2["L"] = 76] = "L";
      CharacterCodes2[CharacterCodes2["M"] = 77] = "M";
      CharacterCodes2[CharacterCodes2["N"] = 78] = "N";
      CharacterCodes2[CharacterCodes2["O"] = 79] = "O";
      CharacterCodes2[CharacterCodes2["P"] = 80] = "P";
      CharacterCodes2[CharacterCodes2["Q"] = 81] = "Q";
      CharacterCodes2[CharacterCodes2["R"] = 82] = "R";
      CharacterCodes2[CharacterCodes2["S"] = 83] = "S";
      CharacterCodes2[CharacterCodes2["T"] = 84] = "T";
      CharacterCodes2[CharacterCodes2["U"] = 85] = "U";
      CharacterCodes2[CharacterCodes2["V"] = 86] = "V";
      CharacterCodes2[CharacterCodes2["W"] = 87] = "W";
      CharacterCodes2[CharacterCodes2["X"] = 88] = "X";
      CharacterCodes2[CharacterCodes2["Y"] = 89] = "Y";
      CharacterCodes2[CharacterCodes2["Z"] = 90] = "Z";
      CharacterCodes2[CharacterCodes2["asterisk"] = 42] = "asterisk";
      CharacterCodes2[CharacterCodes2["backslash"] = 92] = "backslash";
      CharacterCodes2[CharacterCodes2["closeBrace"] = 125] = "closeBrace";
      CharacterCodes2[CharacterCodes2["closeBracket"] = 93] = "closeBracket";
      CharacterCodes2[CharacterCodes2["colon"] = 58] = "colon";
      CharacterCodes2[CharacterCodes2["comma"] = 44] = "comma";
      CharacterCodes2[CharacterCodes2["dot"] = 46] = "dot";
      CharacterCodes2[CharacterCodes2["doubleQuote"] = 34] = "doubleQuote";
      CharacterCodes2[CharacterCodes2["minus"] = 45] = "minus";
      CharacterCodes2[CharacterCodes2["openBrace"] = 123] = "openBrace";
      CharacterCodes2[CharacterCodes2["openBracket"] = 91] = "openBracket";
      CharacterCodes2[CharacterCodes2["plus"] = 43] = "plus";
      CharacterCodes2[CharacterCodes2["slash"] = 47] = "slash";
      CharacterCodes2[CharacterCodes2["formFeed"] = 12] = "formFeed";
      CharacterCodes2[CharacterCodes2["tab"] = 9] = "tab";
    })(CharacterCodes || (CharacterCodes = {}));
  }
});

// node_modules/jsonc-parser/lib/esm/impl/string-intern.js
var cachedSpaces, maxCachedValues, cachedBreakLinesWithSpaces;
var init_string_intern = __esm({
  "node_modules/jsonc-parser/lib/esm/impl/string-intern.js"() {
    cachedSpaces = new Array(20).fill(0).map((_, index) => {
      return " ".repeat(index);
    });
    maxCachedValues = 200;
    cachedBreakLinesWithSpaces = {
      " ": {
        "\n": new Array(maxCachedValues).fill(0).map((_, index) => {
          return "\n" + " ".repeat(index);
        }),
        "\r": new Array(maxCachedValues).fill(0).map((_, index) => {
          return "\r" + " ".repeat(index);
        }),
        "\r\n": new Array(maxCachedValues).fill(0).map((_, index) => {
          return "\r\n" + " ".repeat(index);
        })
      },
      "	": {
        "\n": new Array(maxCachedValues).fill(0).map((_, index) => {
          return "\n" + "	".repeat(index);
        }),
        "\r": new Array(maxCachedValues).fill(0).map((_, index) => {
          return "\r" + "	".repeat(index);
        }),
        "\r\n": new Array(maxCachedValues).fill(0).map((_, index) => {
          return "\r\n" + "	".repeat(index);
        })
      }
    };
  }
});

// node_modules/jsonc-parser/lib/esm/impl/format.js
var init_format = __esm({
  "node_modules/jsonc-parser/lib/esm/impl/format.js"() {
    "use strict";
    init_scanner();
    init_string_intern();
  }
});

// node_modules/jsonc-parser/lib/esm/impl/parser.js
function parse2(text, errors = [], options = ParseOptions.DEFAULT) {
  let currentProperty = null;
  let currentParent = [];
  const previousParents = [];
  function onValue(value) {
    if (Array.isArray(currentParent)) {
      currentParent.push(value);
    } else if (currentProperty !== null) {
      currentParent[currentProperty] = value;
    }
  }
  const visitor = {
    onObjectBegin: () => {
      const object = {};
      onValue(object);
      previousParents.push(currentParent);
      currentParent = object;
      currentProperty = null;
    },
    onObjectProperty: (name) => {
      currentProperty = name;
    },
    onObjectEnd: () => {
      currentParent = previousParents.pop();
    },
    onArrayBegin: () => {
      const array = [];
      onValue(array);
      previousParents.push(currentParent);
      currentParent = array;
      currentProperty = null;
    },
    onArrayEnd: () => {
      currentParent = previousParents.pop();
    },
    onLiteralValue: onValue,
    onError: (error, offset, length) => {
      errors.push({ error, offset, length });
    }
  };
  visit(text, visitor, options);
  return currentParent[0];
}
function visit(text, visitor, options = ParseOptions.DEFAULT) {
  const _scanner = createScanner(text, false);
  const _jsonPath = [];
  let suppressedCallbacks = 0;
  function toNoArgVisit(visitFunction) {
    return visitFunction ? () => suppressedCallbacks === 0 && visitFunction(_scanner.getTokenOffset(), _scanner.getTokenLength(), _scanner.getTokenStartLine(), _scanner.getTokenStartCharacter()) : () => true;
  }
  function toOneArgVisit(visitFunction) {
    return visitFunction ? (arg) => suppressedCallbacks === 0 && visitFunction(arg, _scanner.getTokenOffset(), _scanner.getTokenLength(), _scanner.getTokenStartLine(), _scanner.getTokenStartCharacter()) : () => true;
  }
  function toOneArgVisitWithPath(visitFunction) {
    return visitFunction ? (arg) => suppressedCallbacks === 0 && visitFunction(arg, _scanner.getTokenOffset(), _scanner.getTokenLength(), _scanner.getTokenStartLine(), _scanner.getTokenStartCharacter(), () => _jsonPath.slice()) : () => true;
  }
  function toBeginVisit(visitFunction) {
    return visitFunction ? () => {
      if (suppressedCallbacks > 0) {
        suppressedCallbacks++;
      } else {
        let cbReturn = visitFunction(_scanner.getTokenOffset(), _scanner.getTokenLength(), _scanner.getTokenStartLine(), _scanner.getTokenStartCharacter(), () => _jsonPath.slice());
        if (cbReturn === false) {
          suppressedCallbacks = 1;
        }
      }
    } : () => true;
  }
  function toEndVisit(visitFunction) {
    return visitFunction ? () => {
      if (suppressedCallbacks > 0) {
        suppressedCallbacks--;
      }
      if (suppressedCallbacks === 0) {
        visitFunction(_scanner.getTokenOffset(), _scanner.getTokenLength(), _scanner.getTokenStartLine(), _scanner.getTokenStartCharacter());
      }
    } : () => true;
  }
  const onObjectBegin = toBeginVisit(visitor.onObjectBegin), onObjectProperty = toOneArgVisitWithPath(visitor.onObjectProperty), onObjectEnd = toEndVisit(visitor.onObjectEnd), onArrayBegin = toBeginVisit(visitor.onArrayBegin), onArrayEnd = toEndVisit(visitor.onArrayEnd), onLiteralValue = toOneArgVisitWithPath(visitor.onLiteralValue), onSeparator = toOneArgVisit(visitor.onSeparator), onComment = toNoArgVisit(visitor.onComment), onError = toOneArgVisit(visitor.onError);
  const disallowComments = options && options.disallowComments;
  const allowTrailingComma = options && options.allowTrailingComma;
  function scanNext() {
    while (true) {
      const token = _scanner.scan();
      switch (_scanner.getTokenError()) {
        case 4:
          handleError(
            14
            /* ParseErrorCode.InvalidUnicode */
          );
          break;
        case 5:
          handleError(
            15
            /* ParseErrorCode.InvalidEscapeCharacter */
          );
          break;
        case 3:
          handleError(
            13
            /* ParseErrorCode.UnexpectedEndOfNumber */
          );
          break;
        case 1:
          if (!disallowComments) {
            handleError(
              11
              /* ParseErrorCode.UnexpectedEndOfComment */
            );
          }
          break;
        case 2:
          handleError(
            12
            /* ParseErrorCode.UnexpectedEndOfString */
          );
          break;
        case 6:
          handleError(
            16
            /* ParseErrorCode.InvalidCharacter */
          );
          break;
      }
      switch (token) {
        case 12:
        case 13:
          if (disallowComments) {
            handleError(
              10
              /* ParseErrorCode.InvalidCommentToken */
            );
          } else {
            onComment();
          }
          break;
        case 16:
          handleError(
            1
            /* ParseErrorCode.InvalidSymbol */
          );
          break;
        case 15:
        case 14:
          break;
        default:
          return token;
      }
    }
  }
  function handleError(error, skipUntilAfter = [], skipUntil = []) {
    onError(error);
    if (skipUntilAfter.length + skipUntil.length > 0) {
      let token = _scanner.getToken();
      while (token !== 17) {
        if (skipUntilAfter.indexOf(token) !== -1) {
          scanNext();
          break;
        } else if (skipUntil.indexOf(token) !== -1) {
          break;
        }
        token = scanNext();
      }
    }
  }
  function parseString2(isValue) {
    const value = _scanner.getTokenValue();
    if (isValue) {
      onLiteralValue(value);
    } else {
      onObjectProperty(value);
      _jsonPath.push(value);
    }
    scanNext();
    return true;
  }
  function parseLiteral() {
    switch (_scanner.getToken()) {
      case 11:
        const tokenValue = _scanner.getTokenValue();
        let value = Number(tokenValue);
        if (isNaN(value)) {
          handleError(
            2
            /* ParseErrorCode.InvalidNumberFormat */
          );
          value = 0;
        }
        onLiteralValue(value);
        break;
      case 7:
        onLiteralValue(null);
        break;
      case 8:
        onLiteralValue(true);
        break;
      case 9:
        onLiteralValue(false);
        break;
      default:
        return false;
    }
    scanNext();
    return true;
  }
  function parseProperty() {
    if (_scanner.getToken() !== 10) {
      handleError(3, [], [
        2,
        5
        /* SyntaxKind.CommaToken */
      ]);
      return false;
    }
    parseString2(false);
    if (_scanner.getToken() === 6) {
      onSeparator(":");
      scanNext();
      if (!parseValue()) {
        handleError(4, [], [
          2,
          5
          /* SyntaxKind.CommaToken */
        ]);
      }
    } else {
      handleError(5, [], [
        2,
        5
        /* SyntaxKind.CommaToken */
      ]);
    }
    _jsonPath.pop();
    return true;
  }
  function parseObject() {
    onObjectBegin();
    scanNext();
    let needsComma = false;
    while (_scanner.getToken() !== 2 && _scanner.getToken() !== 17) {
      if (_scanner.getToken() === 5) {
        if (!needsComma) {
          handleError(4, [], []);
        }
        onSeparator(",");
        scanNext();
        if (_scanner.getToken() === 2 && allowTrailingComma) {
          break;
        }
      } else if (needsComma) {
        handleError(6, [], []);
      }
      if (!parseProperty()) {
        handleError(4, [], [
          2,
          5
          /* SyntaxKind.CommaToken */
        ]);
      }
      needsComma = true;
    }
    onObjectEnd();
    if (_scanner.getToken() !== 2) {
      handleError(7, [
        2
        /* SyntaxKind.CloseBraceToken */
      ], []);
    } else {
      scanNext();
    }
    return true;
  }
  function parseArray2() {
    onArrayBegin();
    scanNext();
    let isFirstElement = true;
    let needsComma = false;
    while (_scanner.getToken() !== 4 && _scanner.getToken() !== 17) {
      if (_scanner.getToken() === 5) {
        if (!needsComma) {
          handleError(4, [], []);
        }
        onSeparator(",");
        scanNext();
        if (_scanner.getToken() === 4 && allowTrailingComma) {
          break;
        }
      } else if (needsComma) {
        handleError(6, [], []);
      }
      if (isFirstElement) {
        _jsonPath.push(0);
        isFirstElement = false;
      } else {
        _jsonPath[_jsonPath.length - 1]++;
      }
      if (!parseValue()) {
        handleError(4, [], [
          4,
          5
          /* SyntaxKind.CommaToken */
        ]);
      }
      needsComma = true;
    }
    onArrayEnd();
    if (!isFirstElement) {
      _jsonPath.pop();
    }
    if (_scanner.getToken() !== 4) {
      handleError(8, [
        4
        /* SyntaxKind.CloseBracketToken */
      ], []);
    } else {
      scanNext();
    }
    return true;
  }
  function parseValue() {
    switch (_scanner.getToken()) {
      case 3:
        return parseArray2();
      case 1:
        return parseObject();
      case 10:
        return parseString2(true);
      default:
        return parseLiteral();
    }
  }
  scanNext();
  if (_scanner.getToken() === 17) {
    if (options.allowEmptyContent) {
      return true;
    }
    handleError(4, [], []);
    return false;
  }
  if (!parseValue()) {
    handleError(4, [], []);
    return false;
  }
  if (_scanner.getToken() !== 17) {
    handleError(9, [], []);
  }
  return true;
}
var ParseOptions;
var init_parser = __esm({
  "node_modules/jsonc-parser/lib/esm/impl/parser.js"() {
    "use strict";
    init_scanner();
    (function(ParseOptions2) {
      ParseOptions2.DEFAULT = {
        allowTrailingComma: false
      };
    })(ParseOptions || (ParseOptions = {}));
  }
});

// node_modules/jsonc-parser/lib/esm/impl/edit.js
var init_edit = __esm({
  "node_modules/jsonc-parser/lib/esm/impl/edit.js"() {
    "use strict";
    init_format();
    init_parser();
  }
});

// node_modules/jsonc-parser/lib/esm/main.js
var ScanError, SyntaxKind, parse3, ParseErrorCode;
var init_main = __esm({
  "node_modules/jsonc-parser/lib/esm/main.js"() {
    "use strict";
    init_format();
    init_edit();
    init_scanner();
    init_parser();
    (function(ScanError2) {
      ScanError2[ScanError2["None"] = 0] = "None";
      ScanError2[ScanError2["UnexpectedEndOfComment"] = 1] = "UnexpectedEndOfComment";
      ScanError2[ScanError2["UnexpectedEndOfString"] = 2] = "UnexpectedEndOfString";
      ScanError2[ScanError2["UnexpectedEndOfNumber"] = 3] = "UnexpectedEndOfNumber";
      ScanError2[ScanError2["InvalidUnicode"] = 4] = "InvalidUnicode";
      ScanError2[ScanError2["InvalidEscapeCharacter"] = 5] = "InvalidEscapeCharacter";
      ScanError2[ScanError2["InvalidCharacter"] = 6] = "InvalidCharacter";
    })(ScanError || (ScanError = {}));
    (function(SyntaxKind2) {
      SyntaxKind2[SyntaxKind2["OpenBraceToken"] = 1] = "OpenBraceToken";
      SyntaxKind2[SyntaxKind2["CloseBraceToken"] = 2] = "CloseBraceToken";
      SyntaxKind2[SyntaxKind2["OpenBracketToken"] = 3] = "OpenBracketToken";
      SyntaxKind2[SyntaxKind2["CloseBracketToken"] = 4] = "CloseBracketToken";
      SyntaxKind2[SyntaxKind2["CommaToken"] = 5] = "CommaToken";
      SyntaxKind2[SyntaxKind2["ColonToken"] = 6] = "ColonToken";
      SyntaxKind2[SyntaxKind2["NullKeyword"] = 7] = "NullKeyword";
      SyntaxKind2[SyntaxKind2["TrueKeyword"] = 8] = "TrueKeyword";
      SyntaxKind2[SyntaxKind2["FalseKeyword"] = 9] = "FalseKeyword";
      SyntaxKind2[SyntaxKind2["StringLiteral"] = 10] = "StringLiteral";
      SyntaxKind2[SyntaxKind2["NumericLiteral"] = 11] = "NumericLiteral";
      SyntaxKind2[SyntaxKind2["LineCommentTrivia"] = 12] = "LineCommentTrivia";
      SyntaxKind2[SyntaxKind2["BlockCommentTrivia"] = 13] = "BlockCommentTrivia";
      SyntaxKind2[SyntaxKind2["LineBreakTrivia"] = 14] = "LineBreakTrivia";
      SyntaxKind2[SyntaxKind2["Trivia"] = 15] = "Trivia";
      SyntaxKind2[SyntaxKind2["Unknown"] = 16] = "Unknown";
      SyntaxKind2[SyntaxKind2["EOF"] = 17] = "EOF";
    })(SyntaxKind || (SyntaxKind = {}));
    parse3 = parse2;
    (function(ParseErrorCode2) {
      ParseErrorCode2[ParseErrorCode2["InvalidSymbol"] = 1] = "InvalidSymbol";
      ParseErrorCode2[ParseErrorCode2["InvalidNumberFormat"] = 2] = "InvalidNumberFormat";
      ParseErrorCode2[ParseErrorCode2["PropertyNameExpected"] = 3] = "PropertyNameExpected";
      ParseErrorCode2[ParseErrorCode2["ValueExpected"] = 4] = "ValueExpected";
      ParseErrorCode2[ParseErrorCode2["ColonExpected"] = 5] = "ColonExpected";
      ParseErrorCode2[ParseErrorCode2["CommaExpected"] = 6] = "CommaExpected";
      ParseErrorCode2[ParseErrorCode2["CloseBraceExpected"] = 7] = "CloseBraceExpected";
      ParseErrorCode2[ParseErrorCode2["CloseBracketExpected"] = 8] = "CloseBracketExpected";
      ParseErrorCode2[ParseErrorCode2["EndOfFileExpected"] = 9] = "EndOfFileExpected";
      ParseErrorCode2[ParseErrorCode2["InvalidCommentToken"] = 10] = "InvalidCommentToken";
      ParseErrorCode2[ParseErrorCode2["UnexpectedEndOfComment"] = 11] = "UnexpectedEndOfComment";
      ParseErrorCode2[ParseErrorCode2["UnexpectedEndOfString"] = 12] = "UnexpectedEndOfString";
      ParseErrorCode2[ParseErrorCode2["UnexpectedEndOfNumber"] = 13] = "UnexpectedEndOfNumber";
      ParseErrorCode2[ParseErrorCode2["InvalidUnicode"] = 14] = "InvalidUnicode";
      ParseErrorCode2[ParseErrorCode2["InvalidEscapeCharacter"] = 15] = "InvalidEscapeCharacter";
      ParseErrorCode2[ParseErrorCode2["InvalidCharacter"] = 16] = "InvalidCharacter";
    })(ParseErrorCode || (ParseErrorCode = {}));
  }
});

// node_modules/yaml/dist/nodes/identity.js
var require_identity = __commonJS({
  "node_modules/yaml/dist/nodes/identity.js"(exports) {
    "use strict";
    var ALIAS = Symbol.for("yaml.alias");
    var DOC = Symbol.for("yaml.document");
    var MAP = Symbol.for("yaml.map");
    var PAIR = Symbol.for("yaml.pair");
    var SCALAR = Symbol.for("yaml.scalar");
    var SEQ = Symbol.for("yaml.seq");
    var NODE_TYPE = Symbol.for("yaml.node.type");
    var isAlias = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === ALIAS;
    var isDocument = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === DOC;
    var isMap = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === MAP;
    var isPair = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === PAIR;
    var isScalar = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SCALAR;
    var isSeq = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SEQ;
    function isCollection(node) {
      if (node && typeof node === "object")
        switch (node[NODE_TYPE]) {
          case MAP:
          case SEQ:
            return true;
        }
      return false;
    }
    function isNode(node) {
      if (node && typeof node === "object")
        switch (node[NODE_TYPE]) {
          case ALIAS:
          case MAP:
          case SCALAR:
          case SEQ:
            return true;
        }
      return false;
    }
    var hasAnchor = (node) => (isScalar(node) || isCollection(node)) && !!node.anchor;
    exports.ALIAS = ALIAS;
    exports.DOC = DOC;
    exports.MAP = MAP;
    exports.NODE_TYPE = NODE_TYPE;
    exports.PAIR = PAIR;
    exports.SCALAR = SCALAR;
    exports.SEQ = SEQ;
    exports.hasAnchor = hasAnchor;
    exports.isAlias = isAlias;
    exports.isCollection = isCollection;
    exports.isDocument = isDocument;
    exports.isMap = isMap;
    exports.isNode = isNode;
    exports.isPair = isPair;
    exports.isScalar = isScalar;
    exports.isSeq = isSeq;
  }
});

// node_modules/yaml/dist/visit.js
var require_visit = __commonJS({
  "node_modules/yaml/dist/visit.js"(exports) {
    "use strict";
    var identity = require_identity();
    var BREAK = Symbol("break visit");
    var SKIP = Symbol("skip children");
    var REMOVE = Symbol("remove node");
    function visit2(node, visitor) {
      const visitor_ = initVisitor(visitor);
      if (identity.isDocument(node)) {
        const cd = visit_(null, node.contents, visitor_, Object.freeze([node]));
        if (cd === REMOVE)
          node.contents = null;
      } else
        visit_(null, node, visitor_, Object.freeze([]));
    }
    visit2.BREAK = BREAK;
    visit2.SKIP = SKIP;
    visit2.REMOVE = REMOVE;
    function visit_(key, node, visitor, path12) {
      const ctrl = callVisitor(key, node, visitor, path12);
      if (identity.isNode(ctrl) || identity.isPair(ctrl)) {
        replaceNode(key, path12, ctrl);
        return visit_(key, ctrl, visitor, path12);
      }
      if (typeof ctrl !== "symbol") {
        if (identity.isCollection(node)) {
          path12 = Object.freeze(path12.concat(node));
          for (let i = 0; i < node.items.length; ++i) {
            const ci = visit_(i, node.items[i], visitor, path12);
            if (typeof ci === "number")
              i = ci - 1;
            else if (ci === BREAK)
              return BREAK;
            else if (ci === REMOVE) {
              node.items.splice(i, 1);
              i -= 1;
            }
          }
        } else if (identity.isPair(node)) {
          path12 = Object.freeze(path12.concat(node));
          const ck = visit_("key", node.key, visitor, path12);
          if (ck === BREAK)
            return BREAK;
          else if (ck === REMOVE)
            node.key = null;
          const cv = visit_("value", node.value, visitor, path12);
          if (cv === BREAK)
            return BREAK;
          else if (cv === REMOVE)
            node.value = null;
        }
      }
      return ctrl;
    }
    async function visitAsync(node, visitor) {
      const visitor_ = initVisitor(visitor);
      if (identity.isDocument(node)) {
        const cd = await visitAsync_(null, node.contents, visitor_, Object.freeze([node]));
        if (cd === REMOVE)
          node.contents = null;
      } else
        await visitAsync_(null, node, visitor_, Object.freeze([]));
    }
    visitAsync.BREAK = BREAK;
    visitAsync.SKIP = SKIP;
    visitAsync.REMOVE = REMOVE;
    async function visitAsync_(key, node, visitor, path12) {
      const ctrl = await callVisitor(key, node, visitor, path12);
      if (identity.isNode(ctrl) || identity.isPair(ctrl)) {
        replaceNode(key, path12, ctrl);
        return visitAsync_(key, ctrl, visitor, path12);
      }
      if (typeof ctrl !== "symbol") {
        if (identity.isCollection(node)) {
          path12 = Object.freeze(path12.concat(node));
          for (let i = 0; i < node.items.length; ++i) {
            const ci = await visitAsync_(i, node.items[i], visitor, path12);
            if (typeof ci === "number")
              i = ci - 1;
            else if (ci === BREAK)
              return BREAK;
            else if (ci === REMOVE) {
              node.items.splice(i, 1);
              i -= 1;
            }
          }
        } else if (identity.isPair(node)) {
          path12 = Object.freeze(path12.concat(node));
          const ck = await visitAsync_("key", node.key, visitor, path12);
          if (ck === BREAK)
            return BREAK;
          else if (ck === REMOVE)
            node.key = null;
          const cv = await visitAsync_("value", node.value, visitor, path12);
          if (cv === BREAK)
            return BREAK;
          else if (cv === REMOVE)
            node.value = null;
        }
      }
      return ctrl;
    }
    function initVisitor(visitor) {
      if (typeof visitor === "object" && (visitor.Collection || visitor.Node || visitor.Value)) {
        return Object.assign({
          Alias: visitor.Node,
          Map: visitor.Node,
          Scalar: visitor.Node,
          Seq: visitor.Node
        }, visitor.Value && {
          Map: visitor.Value,
          Scalar: visitor.Value,
          Seq: visitor.Value
        }, visitor.Collection && {
          Map: visitor.Collection,
          Seq: visitor.Collection
        }, visitor);
      }
      return visitor;
    }
    function callVisitor(key, node, visitor, path12) {
      if (typeof visitor === "function")
        return visitor(key, node, path12);
      if (identity.isMap(node))
        return visitor.Map?.(key, node, path12);
      if (identity.isSeq(node))
        return visitor.Seq?.(key, node, path12);
      if (identity.isPair(node))
        return visitor.Pair?.(key, node, path12);
      if (identity.isScalar(node))
        return visitor.Scalar?.(key, node, path12);
      if (identity.isAlias(node))
        return visitor.Alias?.(key, node, path12);
      return void 0;
    }
    function replaceNode(key, path12, node) {
      const parent = path12[path12.length - 1];
      if (identity.isCollection(parent)) {
        parent.items[key] = node;
      } else if (identity.isPair(parent)) {
        if (key === "key")
          parent.key = node;
        else
          parent.value = node;
      } else if (identity.isDocument(parent)) {
        parent.contents = node;
      } else {
        const pt = identity.isAlias(parent) ? "alias" : "scalar";
        throw new Error(`Cannot replace node with ${pt} parent`);
      }
    }
    exports.visit = visit2;
    exports.visitAsync = visitAsync;
  }
});

// node_modules/yaml/dist/doc/directives.js
var require_directives = __commonJS({
  "node_modules/yaml/dist/doc/directives.js"(exports) {
    "use strict";
    var identity = require_identity();
    var visit2 = require_visit();
    var escapeChars = {
      "!": "%21",
      ",": "%2C",
      "[": "%5B",
      "]": "%5D",
      "{": "%7B",
      "}": "%7D"
    };
    var escapeTagName = (tn) => tn.replace(/[!,[\]{}]/g, (ch) => escapeChars[ch]);
    var Directives = class _Directives {
      constructor(yaml, tags) {
        this.docStart = null;
        this.docEnd = false;
        this.yaml = Object.assign({}, _Directives.defaultYaml, yaml);
        this.tags = Object.assign({}, _Directives.defaultTags, tags);
      }
      clone() {
        const copy = new _Directives(this.yaml, this.tags);
        copy.docStart = this.docStart;
        return copy;
      }
      /**
       * During parsing, get a Directives instance for the current document and
       * update the stream state according to the current version's spec.
       */
      atDocument() {
        const res = new _Directives(this.yaml, this.tags);
        switch (this.yaml.version) {
          case "1.1":
            this.atNextDocument = true;
            break;
          case "1.2":
            this.atNextDocument = false;
            this.yaml = {
              explicit: _Directives.defaultYaml.explicit,
              version: "1.2"
            };
            this.tags = Object.assign({}, _Directives.defaultTags);
            break;
        }
        return res;
      }
      /**
       * @param onError - May be called even if the action was successful
       * @returns `true` on success
       */
      add(line, onError) {
        if (this.atNextDocument) {
          this.yaml = { explicit: _Directives.defaultYaml.explicit, version: "1.1" };
          this.tags = Object.assign({}, _Directives.defaultTags);
          this.atNextDocument = false;
        }
        const parts = line.trim().split(/[ \t]+/);
        const name = parts.shift();
        switch (name) {
          case "%TAG": {
            if (parts.length !== 2) {
              onError(0, "%TAG directive should contain exactly two parts");
              if (parts.length < 2)
                return false;
            }
            const [handle, prefix] = parts;
            this.tags[handle] = prefix;
            return true;
          }
          case "%YAML": {
            this.yaml.explicit = true;
            if (parts.length !== 1) {
              onError(0, "%YAML directive should contain exactly one part");
              return false;
            }
            const [version] = parts;
            if (version === "1.1" || version === "1.2") {
              this.yaml.version = version;
              return true;
            } else {
              const isValid = /^\d+\.\d+$/.test(version);
              onError(6, `Unsupported YAML version ${version}`, isValid);
              return false;
            }
          }
          default:
            onError(0, `Unknown directive ${name}`, true);
            return false;
        }
      }
      /**
       * Resolves a tag, matching handles to those defined in %TAG directives.
       *
       * @returns Resolved tag, which may also be the non-specific tag `'!'` or a
       *   `'!local'` tag, or `null` if unresolvable.
       */
      tagName(source, onError) {
        if (source === "!")
          return "!";
        if (source[0] !== "!") {
          onError(`Not a valid tag: ${source}`);
          return null;
        }
        if (source[1] === "<") {
          const verbatim = source.slice(2, -1);
          if (verbatim === "!" || verbatim === "!!") {
            onError(`Verbatim tags aren't resolved, so ${source} is invalid.`);
            return null;
          }
          if (source[source.length - 1] !== ">")
            onError("Verbatim tags must end with a >");
          return verbatim;
        }
        const [, handle, suffix] = source.match(/^(.*!)([^!]*)$/s);
        if (!suffix)
          onError(`The ${source} tag has no suffix`);
        const prefix = this.tags[handle];
        if (prefix) {
          try {
            return prefix + decodeURIComponent(suffix);
          } catch (error) {
            onError(String(error));
            return null;
          }
        }
        if (handle === "!")
          return source;
        onError(`Could not resolve tag: ${source}`);
        return null;
      }
      /**
       * Given a fully resolved tag, returns its printable string form,
       * taking into account current tag prefixes and defaults.
       */
      tagString(tag) {
        for (const [handle, prefix] of Object.entries(this.tags)) {
          if (tag.startsWith(prefix))
            return handle + escapeTagName(tag.substring(prefix.length));
        }
        return tag[0] === "!" ? tag : `!<${tag}>`;
      }
      toString(doc) {
        const lines = this.yaml.explicit ? [`%YAML ${this.yaml.version || "1.2"}`] : [];
        const tagEntries = Object.entries(this.tags);
        let tagNames;
        if (doc && tagEntries.length > 0 && identity.isNode(doc.contents)) {
          const tags = {};
          visit2.visit(doc.contents, (_key, node) => {
            if (identity.isNode(node) && node.tag)
              tags[node.tag] = true;
          });
          tagNames = Object.keys(tags);
        } else
          tagNames = [];
        for (const [handle, prefix] of tagEntries) {
          if (handle === "!!" && prefix === "tag:yaml.org,2002:")
            continue;
          if (!doc || tagNames.some((tn) => tn.startsWith(prefix)))
            lines.push(`%TAG ${handle} ${prefix}`);
        }
        return lines.join("\n");
      }
    };
    Directives.defaultYaml = { explicit: false, version: "1.2" };
    Directives.defaultTags = { "!!": "tag:yaml.org,2002:" };
    exports.Directives = Directives;
  }
});

// node_modules/yaml/dist/doc/anchors.js
var require_anchors = __commonJS({
  "node_modules/yaml/dist/doc/anchors.js"(exports) {
    "use strict";
    var identity = require_identity();
    var visit2 = require_visit();
    function anchorIsValid(anchor) {
      if (/[\x00-\x19\s,[\]{}]/.test(anchor)) {
        const sa = JSON.stringify(anchor);
        const msg = `Anchor must not contain whitespace or control characters: ${sa}`;
        throw new Error(msg);
      }
      return true;
    }
    function anchorNames(root) {
      const anchors = /* @__PURE__ */ new Set();
      visit2.visit(root, {
        Value(_key, node) {
          if (node.anchor)
            anchors.add(node.anchor);
        }
      });
      return anchors;
    }
    function findNewAnchor(prefix, exclude) {
      for (let i = 1; true; ++i) {
        const name = `${prefix}${i}`;
        if (!exclude.has(name))
          return name;
      }
    }
    function createNodeAnchors(doc, prefix) {
      const aliasObjects = [];
      const sourceObjects = /* @__PURE__ */ new Map();
      let prevAnchors = null;
      return {
        onAnchor: (source) => {
          aliasObjects.push(source);
          prevAnchors ?? (prevAnchors = anchorNames(doc));
          const anchor = findNewAnchor(prefix, prevAnchors);
          prevAnchors.add(anchor);
          return anchor;
        },
        /**
         * With circular references, the source node is only resolved after all
         * of its child nodes are. This is why anchors are set only after all of
         * the nodes have been created.
         */
        setAnchors: () => {
          for (const source of aliasObjects) {
            const ref = sourceObjects.get(source);
            if (typeof ref === "object" && ref.anchor && (identity.isScalar(ref.node) || identity.isCollection(ref.node))) {
              ref.node.anchor = ref.anchor;
            } else {
              const error = new Error("Failed to resolve repeated object (this should not happen)");
              error.source = source;
              throw error;
            }
          }
        },
        sourceObjects
      };
    }
    exports.anchorIsValid = anchorIsValid;
    exports.anchorNames = anchorNames;
    exports.createNodeAnchors = createNodeAnchors;
    exports.findNewAnchor = findNewAnchor;
  }
});

// node_modules/yaml/dist/doc/applyReviver.js
var require_applyReviver = __commonJS({
  "node_modules/yaml/dist/doc/applyReviver.js"(exports) {
    "use strict";
    function applyReviver(reviver, obj, key, val) {
      if (val && typeof val === "object") {
        if (Array.isArray(val)) {
          for (let i = 0, len = val.length; i < len; ++i) {
            const v0 = val[i];
            const v1 = applyReviver(reviver, val, String(i), v0);
            if (v1 === void 0)
              delete val[i];
            else if (v1 !== v0)
              val[i] = v1;
          }
        } else if (val instanceof Map) {
          for (const k of Array.from(val.keys())) {
            const v0 = val.get(k);
            const v1 = applyReviver(reviver, val, k, v0);
            if (v1 === void 0)
              val.delete(k);
            else if (v1 !== v0)
              val.set(k, v1);
          }
        } else if (val instanceof Set) {
          for (const v0 of Array.from(val)) {
            const v1 = applyReviver(reviver, val, v0, v0);
            if (v1 === void 0)
              val.delete(v0);
            else if (v1 !== v0) {
              val.delete(v0);
              val.add(v1);
            }
          }
        } else {
          for (const [k, v0] of Object.entries(val)) {
            const v1 = applyReviver(reviver, val, k, v0);
            if (v1 === void 0)
              delete val[k];
            else if (v1 !== v0)
              val[k] = v1;
          }
        }
      }
      return reviver.call(obj, key, val);
    }
    exports.applyReviver = applyReviver;
  }
});

// node_modules/yaml/dist/nodes/toJS.js
var require_toJS = __commonJS({
  "node_modules/yaml/dist/nodes/toJS.js"(exports) {
    "use strict";
    var identity = require_identity();
    function toJS(value, arg, ctx) {
      if (Array.isArray(value))
        return value.map((v, i) => toJS(v, String(i), ctx));
      if (value && typeof value.toJSON === "function") {
        if (!ctx || !identity.hasAnchor(value))
          return value.toJSON(arg, ctx);
        const data = { aliasCount: 0, count: 1, res: void 0 };
        ctx.anchors.set(value, data);
        ctx.onCreate = (res2) => {
          data.res = res2;
          delete ctx.onCreate;
        };
        const res = value.toJSON(arg, ctx);
        if (ctx.onCreate)
          ctx.onCreate(res);
        return res;
      }
      if (typeof value === "bigint" && !ctx?.keep)
        return Number(value);
      return value;
    }
    exports.toJS = toJS;
  }
});

// node_modules/yaml/dist/nodes/Node.js
var require_Node = __commonJS({
  "node_modules/yaml/dist/nodes/Node.js"(exports) {
    "use strict";
    var applyReviver = require_applyReviver();
    var identity = require_identity();
    var toJS = require_toJS();
    var NodeBase = class {
      constructor(type) {
        Object.defineProperty(this, identity.NODE_TYPE, { value: type });
      }
      /** Create a copy of this node.  */
      clone() {
        const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
        if (this.range)
          copy.range = this.range.slice();
        return copy;
      }
      /** A plain JavaScript representation of this node. */
      toJS(doc, { mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
        if (!identity.isDocument(doc))
          throw new TypeError("A document argument is required");
        const ctx = {
          anchors: /* @__PURE__ */ new Map(),
          doc,
          keep: true,
          mapAsMap: mapAsMap === true,
          mapKeyWarned: false,
          maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
        };
        const res = toJS.toJS(this, "", ctx);
        if (typeof onAnchor === "function")
          for (const { count, res: res2 } of ctx.anchors.values())
            onAnchor(res2, count);
        return typeof reviver === "function" ? applyReviver.applyReviver(reviver, { "": res }, "", res) : res;
      }
    };
    exports.NodeBase = NodeBase;
  }
});

// node_modules/yaml/dist/nodes/Alias.js
var require_Alias = __commonJS({
  "node_modules/yaml/dist/nodes/Alias.js"(exports) {
    "use strict";
    var anchors = require_anchors();
    var visit2 = require_visit();
    var identity = require_identity();
    var Node = require_Node();
    var toJS = require_toJS();
    var Alias = class extends Node.NodeBase {
      constructor(source) {
        super(identity.ALIAS);
        this.source = source;
        Object.defineProperty(this, "tag", {
          set() {
            throw new Error("Alias nodes cannot have tags");
          }
        });
      }
      /**
       * Resolve the value of this alias within `doc`, finding the last
       * instance of the `source` anchor before this node.
       */
      resolve(doc, ctx) {
        if (ctx?.maxAliasCount === 0)
          throw new ReferenceError("Alias resolution is disabled");
        let nodes;
        if (ctx?.aliasResolveCache) {
          nodes = ctx.aliasResolveCache;
        } else {
          nodes = [];
          visit2.visit(doc, {
            Node: (_key, node) => {
              if (identity.isAlias(node) || identity.hasAnchor(node))
                nodes.push(node);
            }
          });
          if (ctx)
            ctx.aliasResolveCache = nodes;
        }
        let found = void 0;
        for (const node of nodes) {
          if (node === this)
            break;
          if (node.anchor === this.source)
            found = node;
        }
        if (found && ctx) {
          const { anchors: anchors2, doc: doc2, maxAliasCount } = ctx;
          let data = anchors2.get(found);
          if (!data) {
            toJS.toJS(found, null, ctx);
            data = anchors2.get(found);
          }
          if (data?.res === void 0) {
            const msg = "This should not happen: Alias anchor was not resolved?";
            throw new ReferenceError(msg);
          }
          if (maxAliasCount >= 0) {
            data.count += 1;
            if (data.aliasCount === 0)
              data.aliasCount = getAliasCount(doc2, found, anchors2);
            if (data.count * data.aliasCount > maxAliasCount) {
              const msg = "Excessive alias count indicates a resource exhaustion attack";
              throw new ReferenceError(msg);
            }
          }
        }
        return found;
      }
      toJSON(_arg, ctx) {
        if (!ctx)
          return { source: this.source };
        const source = this.resolve(ctx.doc, ctx);
        if (!source) {
          const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
          throw new ReferenceError(msg);
        }
        return ctx.anchors.get(source).res;
      }
      toString(ctx, _onComment, _onChompKeep) {
        const src = `*${this.source}`;
        if (ctx) {
          anchors.anchorIsValid(this.source);
          if (ctx.options.verifyAliasOrder && !ctx.anchors.has(this.source)) {
            const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
            throw new Error(msg);
          }
          if (ctx.implicitKey)
            return `${src} `;
        }
        return src;
      }
    };
    function getAliasCount(doc, node, anchors2) {
      if (identity.isAlias(node)) {
        const source = node.resolve(doc);
        const anchor = anchors2 && source && anchors2.get(source);
        return anchor ? anchor.count * anchor.aliasCount : 0;
      } else if (identity.isCollection(node)) {
        let count = 0;
        for (const item2 of node.items) {
          const c = getAliasCount(doc, item2, anchors2);
          if (c > count)
            count = c;
        }
        return count;
      } else if (identity.isPair(node)) {
        const kc = getAliasCount(doc, node.key, anchors2);
        const vc = getAliasCount(doc, node.value, anchors2);
        return Math.max(kc, vc);
      }
      return 1;
    }
    exports.Alias = Alias;
  }
});

// node_modules/yaml/dist/nodes/Scalar.js
var require_Scalar = __commonJS({
  "node_modules/yaml/dist/nodes/Scalar.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Node = require_Node();
    var toJS = require_toJS();
    var isScalarValue = (value) => !value || typeof value !== "function" && typeof value !== "object";
    var Scalar = class extends Node.NodeBase {
      constructor(value) {
        super(identity.SCALAR);
        this.value = value;
      }
      toJSON(arg, ctx) {
        return ctx?.keep ? this.value : toJS.toJS(this.value, arg, ctx);
      }
      toString() {
        return String(this.value);
      }
    };
    Scalar.BLOCK_FOLDED = "BLOCK_FOLDED";
    Scalar.BLOCK_LITERAL = "BLOCK_LITERAL";
    Scalar.PLAIN = "PLAIN";
    Scalar.QUOTE_DOUBLE = "QUOTE_DOUBLE";
    Scalar.QUOTE_SINGLE = "QUOTE_SINGLE";
    exports.Scalar = Scalar;
    exports.isScalarValue = isScalarValue;
  }
});

// node_modules/yaml/dist/doc/createNode.js
var require_createNode = __commonJS({
  "node_modules/yaml/dist/doc/createNode.js"(exports) {
    "use strict";
    var Alias = require_Alias();
    var identity = require_identity();
    var Scalar = require_Scalar();
    var defaultTagPrefix = "tag:yaml.org,2002:";
    function findTagObject(value, tagName, tags) {
      if (tagName) {
        const match = tags.filter((t) => t.tag === tagName);
        const tagObj = match.find((t) => !t.format) ?? match[0];
        if (!tagObj)
          throw new Error(`Tag ${tagName} not found`);
        return tagObj;
      }
      return tags.find((t) => t.identify?.(value) && !t.format);
    }
    function createNode(value, tagName, ctx) {
      if (identity.isDocument(value))
        value = value.contents;
      if (identity.isNode(value))
        return value;
      if (identity.isPair(value)) {
        const map = ctx.schema[identity.MAP].createNode?.(ctx.schema, null, ctx);
        map.items.push(value);
        return map;
      }
      if (value instanceof String || value instanceof Number || value instanceof Boolean || typeof BigInt !== "undefined" && value instanceof BigInt) {
        value = value.valueOf();
      }
      const { aliasDuplicateObjects, onAnchor, onTagObj, schema, sourceObjects } = ctx;
      let ref = void 0;
      if (aliasDuplicateObjects && value && typeof value === "object") {
        ref = sourceObjects.get(value);
        if (ref) {
          ref.anchor ?? (ref.anchor = onAnchor(value));
          return new Alias.Alias(ref.anchor);
        } else {
          ref = { anchor: null, node: null };
          sourceObjects.set(value, ref);
        }
      }
      if (tagName?.startsWith("!!"))
        tagName = defaultTagPrefix + tagName.slice(2);
      let tagObj = findTagObject(value, tagName, schema.tags);
      if (!tagObj) {
        if (value && typeof value.toJSON === "function") {
          value = value.toJSON();
        }
        if (!value || typeof value !== "object") {
          const node2 = new Scalar.Scalar(value);
          if (ref)
            ref.node = node2;
          return node2;
        }
        tagObj = value instanceof Map ? schema[identity.MAP] : Symbol.iterator in Object(value) ? schema[identity.SEQ] : schema[identity.MAP];
      }
      if (onTagObj) {
        onTagObj(tagObj);
        delete ctx.onTagObj;
      }
      const node = tagObj?.createNode ? tagObj.createNode(ctx.schema, value, ctx) : typeof tagObj?.nodeClass?.from === "function" ? tagObj.nodeClass.from(ctx.schema, value, ctx) : new Scalar.Scalar(value);
      if (tagName)
        node.tag = tagName;
      else if (!tagObj.default)
        node.tag = tagObj.tag;
      if (ref)
        ref.node = node;
      return node;
    }
    exports.createNode = createNode;
  }
});

// node_modules/yaml/dist/nodes/Collection.js
var require_Collection = __commonJS({
  "node_modules/yaml/dist/nodes/Collection.js"(exports) {
    "use strict";
    var createNode = require_createNode();
    var identity = require_identity();
    var Node = require_Node();
    function collectionFromPath(schema, path12, value) {
      let v = value;
      for (let i = path12.length - 1; i >= 0; --i) {
        const k = path12[i];
        if (typeof k === "number" && Number.isInteger(k) && k >= 0) {
          const a = [];
          a[k] = v;
          v = a;
        } else {
          v = /* @__PURE__ */ new Map([[k, v]]);
        }
      }
      return createNode.createNode(v, void 0, {
        aliasDuplicateObjects: false,
        keepUndefined: false,
        onAnchor: () => {
          throw new Error("This should not happen, please report a bug.");
        },
        schema,
        sourceObjects: /* @__PURE__ */ new Map()
      });
    }
    var isEmptyPath = (path12) => path12 == null || typeof path12 === "object" && !!path12[Symbol.iterator]().next().done;
    var Collection = class extends Node.NodeBase {
      constructor(type, schema) {
        super(type);
        Object.defineProperty(this, "schema", {
          value: schema,
          configurable: true,
          enumerable: false,
          writable: true
        });
      }
      /**
       * Create a copy of this collection.
       *
       * @param schema - If defined, overwrites the original's schema
       */
      clone(schema) {
        const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
        if (schema)
          copy.schema = schema;
        copy.items = copy.items.map((it) => identity.isNode(it) || identity.isPair(it) ? it.clone(schema) : it);
        if (this.range)
          copy.range = this.range.slice();
        return copy;
      }
      /**
       * Adds a value to the collection. For `!!map` and `!!omap` the value must
       * be a Pair instance or a `{ key, value }` object, which may not have a key
       * that already exists in the map.
       */
      addIn(path12, value) {
        if (isEmptyPath(path12))
          this.add(value);
        else {
          const [key, ...rest] = path12;
          const node = this.get(key, true);
          if (identity.isCollection(node))
            node.addIn(rest, value);
          else if (node === void 0 && this.schema)
            this.set(key, collectionFromPath(this.schema, rest, value));
          else
            throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
        }
      }
      /**
       * Removes a value from the collection.
       * @returns `true` if the item was found and removed.
       */
      deleteIn(path12) {
        const [key, ...rest] = path12;
        if (rest.length === 0)
          return this.delete(key);
        const node = this.get(key, true);
        if (identity.isCollection(node))
          return node.deleteIn(rest);
        else
          throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
      }
      /**
       * Returns item at `key`, or `undefined` if not found. By default unwraps
       * scalar values from their surrounding node; to disable set `keepScalar` to
       * `true` (collections are always returned intact).
       */
      getIn(path12, keepScalar) {
        const [key, ...rest] = path12;
        const node = this.get(key, true);
        if (rest.length === 0)
          return !keepScalar && identity.isScalar(node) ? node.value : node;
        else
          return identity.isCollection(node) ? node.getIn(rest, keepScalar) : void 0;
      }
      hasAllNullValues(allowScalar) {
        return this.items.every((node) => {
          if (!identity.isPair(node))
            return false;
          const n = node.value;
          return n == null || allowScalar && identity.isScalar(n) && n.value == null && !n.commentBefore && !n.comment && !n.tag;
        });
      }
      /**
       * Checks if the collection includes a value with the key `key`.
       */
      hasIn(path12) {
        const [key, ...rest] = path12;
        if (rest.length === 0)
          return this.has(key);
        const node = this.get(key, true);
        return identity.isCollection(node) ? node.hasIn(rest) : false;
      }
      /**
       * Sets a value in this collection. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       */
      setIn(path12, value) {
        const [key, ...rest] = path12;
        if (rest.length === 0) {
          this.set(key, value);
        } else {
          const node = this.get(key, true);
          if (identity.isCollection(node))
            node.setIn(rest, value);
          else if (node === void 0 && this.schema)
            this.set(key, collectionFromPath(this.schema, rest, value));
          else
            throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
        }
      }
    };
    exports.Collection = Collection;
    exports.collectionFromPath = collectionFromPath;
    exports.isEmptyPath = isEmptyPath;
  }
});

// node_modules/yaml/dist/stringify/stringifyComment.js
var require_stringifyComment = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyComment.js"(exports) {
    "use strict";
    var stringifyComment = (str) => str.replace(/^(?!$)(?: $)?/gm, "#");
    function indentComment(comment, indent) {
      if (/^\n+$/.test(comment))
        return comment.substring(1);
      return indent ? comment.replace(/^(?! *$)/gm, indent) : comment;
    }
    var lineComment = (str, indent, comment) => str.endsWith("\n") ? indentComment(comment, indent) : comment.includes("\n") ? "\n" + indentComment(comment, indent) : (str.endsWith(" ") ? "" : " ") + comment;
    exports.indentComment = indentComment;
    exports.lineComment = lineComment;
    exports.stringifyComment = stringifyComment;
  }
});

// node_modules/yaml/dist/stringify/foldFlowLines.js
var require_foldFlowLines = __commonJS({
  "node_modules/yaml/dist/stringify/foldFlowLines.js"(exports) {
    "use strict";
    var FOLD_FLOW = "flow";
    var FOLD_BLOCK = "block";
    var FOLD_QUOTED = "quoted";
    function foldFlowLines(text, indent, mode = "flow", { indentAtStart, lineWidth = 80, minContentWidth = 20, onFold, onOverflow } = {}) {
      if (!lineWidth || lineWidth < 0)
        return text;
      if (lineWidth < minContentWidth)
        minContentWidth = 0;
      const endStep = Math.max(1 + minContentWidth, 1 + lineWidth - indent.length);
      if (text.length <= endStep)
        return text;
      const folds = [];
      const escapedFolds = {};
      let end = lineWidth - indent.length;
      if (typeof indentAtStart === "number") {
        if (indentAtStart > lineWidth - Math.max(2, minContentWidth))
          folds.push(0);
        else
          end = lineWidth - indentAtStart;
      }
      let split = void 0;
      let prev = void 0;
      let overflow = false;
      let i = -1;
      let escStart = -1;
      let escEnd = -1;
      if (mode === FOLD_BLOCK) {
        i = consumeMoreIndentedLines(text, i, indent.length);
        if (i !== -1)
          end = i + endStep;
      }
      for (let ch; ch = text[i += 1]; ) {
        if (mode === FOLD_QUOTED && ch === "\\") {
          escStart = i;
          switch (text[i + 1]) {
            case "x":
              i += 3;
              break;
            case "u":
              i += 5;
              break;
            case "U":
              i += 9;
              break;
            default:
              i += 1;
          }
          escEnd = i;
        }
        if (ch === "\n") {
          if (mode === FOLD_BLOCK)
            i = consumeMoreIndentedLines(text, i, indent.length);
          end = i + indent.length + endStep;
          split = void 0;
        } else {
          if (ch === " " && prev && prev !== " " && prev !== "\n" && prev !== "	") {
            const next = text[i + 1];
            if (next && next !== " " && next !== "\n" && next !== "	")
              split = i;
          }
          if (i >= end) {
            if (split) {
              folds.push(split);
              end = split + endStep;
              split = void 0;
            } else if (mode === FOLD_QUOTED) {
              while (prev === " " || prev === "	") {
                prev = ch;
                ch = text[i += 1];
                overflow = true;
              }
              const j = i > escEnd + 1 ? i - 2 : escStart - 1;
              if (escapedFolds[j])
                return text;
              folds.push(j);
              escapedFolds[j] = true;
              end = j + endStep;
              split = void 0;
            } else {
              overflow = true;
            }
          }
        }
        prev = ch;
      }
      if (overflow && onOverflow)
        onOverflow();
      if (folds.length === 0)
        return text;
      if (onFold)
        onFold();
      let res = text.slice(0, folds[0]);
      for (let i2 = 0; i2 < folds.length; ++i2) {
        const fold = folds[i2];
        const end2 = folds[i2 + 1] || text.length;
        if (fold === 0)
          res = `
${indent}${text.slice(0, end2)}`;
        else {
          if (mode === FOLD_QUOTED && escapedFolds[fold])
            res += `${text[fold]}\\`;
          res += `
${indent}${text.slice(fold + 1, end2)}`;
        }
      }
      return res;
    }
    function consumeMoreIndentedLines(text, i, indent) {
      let end = i;
      let start = i + 1;
      let ch = text[start];
      while (ch === " " || ch === "	") {
        if (i < start + indent) {
          ch = text[++i];
        } else {
          do {
            ch = text[++i];
          } while (ch && ch !== "\n");
          end = i;
          start = i + 1;
          ch = text[start];
        }
      }
      return end;
    }
    exports.FOLD_BLOCK = FOLD_BLOCK;
    exports.FOLD_FLOW = FOLD_FLOW;
    exports.FOLD_QUOTED = FOLD_QUOTED;
    exports.foldFlowLines = foldFlowLines;
  }
});

// node_modules/yaml/dist/stringify/stringifyString.js
var require_stringifyString = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyString.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var foldFlowLines = require_foldFlowLines();
    var getFoldOptions = (ctx, isBlock) => ({
      indentAtStart: isBlock ? ctx.indent.length : ctx.indentAtStart,
      lineWidth: ctx.options.lineWidth,
      minContentWidth: ctx.options.minContentWidth
    });
    var containsDocumentMarker = (str) => /^(%|---|\.\.\.)/m.test(str);
    function lineLengthOverLimit(str, lineWidth, indentLength) {
      if (!lineWidth || lineWidth < 0)
        return false;
      const limit = lineWidth - indentLength;
      const strLen = str.length;
      if (strLen <= limit)
        return false;
      for (let i = 0, start = 0; i < strLen; ++i) {
        if (str[i] === "\n") {
          if (i - start > limit)
            return true;
          start = i + 1;
          if (strLen - start <= limit)
            return false;
        }
      }
      return true;
    }
    function doubleQuotedString(value, ctx) {
      const json = JSON.stringify(value);
      if (ctx.options.doubleQuotedAsJSON)
        return json;
      const { implicitKey } = ctx;
      const minMultiLineLength = ctx.options.doubleQuotedMinMultiLineLength;
      const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
      let str = "";
      let start = 0;
      for (let i = 0, ch = json[i]; ch; ch = json[++i]) {
        if (ch === " " && json[i + 1] === "\\" && json[i + 2] === "n") {
          str += json.slice(start, i) + "\\ ";
          i += 1;
          start = i;
          ch = "\\";
        }
        if (ch === "\\")
          switch (json[i + 1]) {
            case "u":
              {
                str += json.slice(start, i);
                const code = json.substr(i + 2, 4);
                switch (code) {
                  case "0000":
                    str += "\\0";
                    break;
                  case "0007":
                    str += "\\a";
                    break;
                  case "000b":
                    str += "\\v";
                    break;
                  case "001b":
                    str += "\\e";
                    break;
                  case "0085":
                    str += "\\N";
                    break;
                  case "00a0":
                    str += "\\_";
                    break;
                  case "2028":
                    str += "\\L";
                    break;
                  case "2029":
                    str += "\\P";
                    break;
                  default:
                    if (code.substr(0, 2) === "00")
                      str += "\\x" + code.substr(2);
                    else
                      str += json.substr(i, 6);
                }
                i += 5;
                start = i + 1;
              }
              break;
            case "n":
              if (implicitKey || json[i + 2] === '"' || json.length < minMultiLineLength) {
                i += 1;
              } else {
                str += json.slice(start, i) + "\n\n";
                while (json[i + 2] === "\\" && json[i + 3] === "n" && json[i + 4] !== '"') {
                  str += "\n";
                  i += 2;
                }
                str += indent;
                if (json[i + 2] === " ")
                  str += "\\";
                i += 1;
                start = i + 1;
              }
              break;
            default:
              i += 1;
          }
      }
      str = start ? str + json.slice(start) : json;
      return implicitKey ? str : foldFlowLines.foldFlowLines(str, indent, foldFlowLines.FOLD_QUOTED, getFoldOptions(ctx, false));
    }
    function singleQuotedString(value, ctx) {
      if (ctx.options.singleQuote === false || ctx.implicitKey && value.includes("\n") || /[ \t]\n|\n[ \t]/.test(value))
        return doubleQuotedString(value, ctx);
      const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
      const res = "'" + value.replace(/'/g, "''").replace(/\n+/g, `$&
${indent}`) + "'";
      return ctx.implicitKey ? res : foldFlowLines.foldFlowLines(res, indent, foldFlowLines.FOLD_FLOW, getFoldOptions(ctx, false));
    }
    function quotedString(value, ctx) {
      const { singleQuote } = ctx.options;
      let qs;
      if (singleQuote === false)
        qs = doubleQuotedString;
      else {
        const hasDouble = value.includes('"');
        const hasSingle = value.includes("'");
        if (hasDouble && !hasSingle)
          qs = singleQuotedString;
        else if (hasSingle && !hasDouble)
          qs = doubleQuotedString;
        else
          qs = singleQuote ? singleQuotedString : doubleQuotedString;
      }
      return qs(value, ctx);
    }
    var blockEndNewlines;
    try {
      blockEndNewlines = new RegExp("(^|(?<!\n))\n+(?!\n|$)", "g");
    } catch {
      blockEndNewlines = /\n+(?!\n|$)/g;
    }
    function blockString({ comment, type, value }, ctx, onComment, onChompKeep) {
      const { blockQuote, commentString, lineWidth } = ctx.options;
      if (!blockQuote || /\n[\t ]+$/.test(value)) {
        return quotedString(value, ctx);
      }
      const indent = ctx.indent || (ctx.forceBlockIndent || containsDocumentMarker(value) ? "  " : "");
      const literal = blockQuote === "literal" ? true : blockQuote === "folded" || type === Scalar.Scalar.BLOCK_FOLDED ? false : type === Scalar.Scalar.BLOCK_LITERAL ? true : !lineLengthOverLimit(value, lineWidth, indent.length);
      if (!value)
        return literal ? "|\n" : ">\n";
      let chomp;
      let endStart;
      for (endStart = value.length; endStart > 0; --endStart) {
        const ch = value[endStart - 1];
        if (ch !== "\n" && ch !== "	" && ch !== " ")
          break;
      }
      let end = value.substring(endStart);
      const endNlPos = end.indexOf("\n");
      if (endNlPos === -1) {
        chomp = "-";
      } else if (value === end || endNlPos !== end.length - 1) {
        chomp = "+";
        if (onChompKeep)
          onChompKeep();
      } else {
        chomp = "";
      }
      if (end) {
        value = value.slice(0, -end.length);
        if (end[end.length - 1] === "\n")
          end = end.slice(0, -1);
        end = end.replace(blockEndNewlines, `$&${indent}`);
      }
      let startWithSpace = false;
      let startEnd;
      let startNlPos = -1;
      for (startEnd = 0; startEnd < value.length; ++startEnd) {
        const ch = value[startEnd];
        if (ch === " ")
          startWithSpace = true;
        else if (ch === "\n")
          startNlPos = startEnd;
        else
          break;
      }
      let start = value.substring(0, startNlPos < startEnd ? startNlPos + 1 : startEnd);
      if (start) {
        value = value.substring(start.length);
        start = start.replace(/\n+/g, `$&${indent}`);
      }
      const indentSize = indent ? "2" : "1";
      let header = (startWithSpace ? indentSize : "") + chomp;
      if (comment) {
        header += " " + commentString(comment.replace(/ ?[\r\n]+/g, " "));
        if (onComment)
          onComment();
      }
      if (!literal) {
        const foldedValue = value.replace(/\n+/g, "\n$&").replace(/(?:^|\n)([\t ].*)(?:([\n\t ]*)\n(?![\n\t ]))?/g, "$1$2").replace(/\n+/g, `$&${indent}`);
        let literalFallback = false;
        const foldOptions = getFoldOptions(ctx, true);
        if (blockQuote !== "folded" && type !== Scalar.Scalar.BLOCK_FOLDED) {
          foldOptions.onOverflow = () => {
            literalFallback = true;
          };
        }
        const body = foldFlowLines.foldFlowLines(`${start}${foldedValue}${end}`, indent, foldFlowLines.FOLD_BLOCK, foldOptions);
        if (!literalFallback)
          return `>${header}
${indent}${body}`;
      }
      value = value.replace(/\n+/g, `$&${indent}`);
      return `|${header}
${indent}${start}${value}${end}`;
    }
    function plainString(item2, ctx, onComment, onChompKeep) {
      const { type, value } = item2;
      const { actualString, implicitKey, indent, indentStep, inFlow } = ctx;
      if (implicitKey && value.includes("\n") || inFlow && /[[\]{},]/.test(value)) {
        return quotedString(value, ctx);
      }
      if (/^[\n\t ,[\]{}#&*!|>'"%@`]|^[?-]$|^[?-][ \t]|[\n:][ \t]|[ \t]\n|[\n\t ]#|[\n\t :]$/.test(value)) {
        return implicitKey || inFlow || !value.includes("\n") ? quotedString(value, ctx) : blockString(item2, ctx, onComment, onChompKeep);
      }
      if (!implicitKey && !inFlow && type !== Scalar.Scalar.PLAIN && value.includes("\n")) {
        return blockString(item2, ctx, onComment, onChompKeep);
      }
      if (containsDocumentMarker(value)) {
        if (indent === "") {
          ctx.forceBlockIndent = true;
          return blockString(item2, ctx, onComment, onChompKeep);
        } else if (implicitKey && indent === indentStep) {
          return quotedString(value, ctx);
        }
      }
      const str = value.replace(/\n+/g, `$&
${indent}`);
      if (actualString) {
        const test = (tag) => tag.default && tag.tag !== "tag:yaml.org,2002:str" && tag.test?.test(str);
        const { compat, tags } = ctx.doc.schema;
        if (tags.some(test) || compat?.some(test))
          return quotedString(value, ctx);
      }
      return implicitKey ? str : foldFlowLines.foldFlowLines(str, indent, foldFlowLines.FOLD_FLOW, getFoldOptions(ctx, false));
    }
    function stringifyString(item2, ctx, onComment, onChompKeep) {
      const { implicitKey, inFlow } = ctx;
      const ss = typeof item2.value === "string" ? item2 : Object.assign({}, item2, { value: String(item2.value) });
      let { type } = item2;
      if (type !== Scalar.Scalar.QUOTE_DOUBLE) {
        if (/[\x00-\x08\x0b-\x1f\x7f-\x9f\u{D800}-\u{DFFF}]/u.test(ss.value))
          type = Scalar.Scalar.QUOTE_DOUBLE;
      }
      const _stringify = (_type) => {
        switch (_type) {
          case Scalar.Scalar.BLOCK_FOLDED:
          case Scalar.Scalar.BLOCK_LITERAL:
            return implicitKey || inFlow ? quotedString(ss.value, ctx) : blockString(ss, ctx, onComment, onChompKeep);
          case Scalar.Scalar.QUOTE_DOUBLE:
            return doubleQuotedString(ss.value, ctx);
          case Scalar.Scalar.QUOTE_SINGLE:
            return singleQuotedString(ss.value, ctx);
          case Scalar.Scalar.PLAIN:
            return plainString(ss, ctx, onComment, onChompKeep);
          default:
            return null;
        }
      };
      let res = _stringify(type);
      if (res === null) {
        const { defaultKeyType, defaultStringType } = ctx.options;
        const t = implicitKey && defaultKeyType || defaultStringType;
        res = _stringify(t);
        if (res === null)
          throw new Error(`Unsupported default string type ${t}`);
      }
      return res;
    }
    exports.stringifyString = stringifyString;
  }
});

// node_modules/yaml/dist/stringify/stringify.js
var require_stringify = __commonJS({
  "node_modules/yaml/dist/stringify/stringify.js"(exports) {
    "use strict";
    var anchors = require_anchors();
    var identity = require_identity();
    var stringifyComment = require_stringifyComment();
    var stringifyString = require_stringifyString();
    function createStringifyContext(doc, options) {
      const opt = Object.assign({
        blockQuote: true,
        commentString: stringifyComment.stringifyComment,
        defaultKeyType: null,
        defaultStringType: "PLAIN",
        directives: null,
        doubleQuotedAsJSON: false,
        doubleQuotedMinMultiLineLength: 40,
        falseStr: "false",
        flowCollectionPadding: true,
        indentSeq: true,
        lineWidth: 80,
        minContentWidth: 20,
        nullStr: "null",
        simpleKeys: false,
        singleQuote: null,
        trailingComma: false,
        trueStr: "true",
        verifyAliasOrder: true
      }, doc.schema.toStringOptions, options);
      let inFlow;
      switch (opt.collectionStyle) {
        case "block":
          inFlow = false;
          break;
        case "flow":
          inFlow = true;
          break;
        default:
          inFlow = null;
      }
      return {
        anchors: /* @__PURE__ */ new Set(),
        doc,
        flowCollectionPadding: opt.flowCollectionPadding ? " " : "",
        indent: "",
        indentStep: typeof opt.indent === "number" ? " ".repeat(opt.indent) : "  ",
        inFlow,
        options: opt
      };
    }
    function getTagObject(tags, item2) {
      if (item2.tag) {
        const match = tags.filter((t) => t.tag === item2.tag);
        if (match.length > 0)
          return match.find((t) => t.format === item2.format) ?? match[0];
      }
      let tagObj = void 0;
      let obj;
      if (identity.isScalar(item2)) {
        obj = item2.value;
        let match = tags.filter((t) => t.identify?.(obj));
        if (match.length > 1) {
          const testMatch = match.filter((t) => t.test);
          if (testMatch.length > 0)
            match = testMatch;
        }
        tagObj = match.find((t) => t.format === item2.format) ?? match.find((t) => !t.format);
      } else {
        obj = item2;
        tagObj = tags.find((t) => t.nodeClass && obj instanceof t.nodeClass);
      }
      if (!tagObj) {
        const name = obj?.constructor?.name ?? (obj === null ? "null" : typeof obj);
        throw new Error(`Tag not resolved for ${name} value`);
      }
      return tagObj;
    }
    function stringifyProps(node, tagObj, { anchors: anchors$1, doc }) {
      if (!doc.directives)
        return "";
      const props = [];
      const anchor = (identity.isScalar(node) || identity.isCollection(node)) && node.anchor;
      if (anchor && anchors.anchorIsValid(anchor)) {
        anchors$1.add(anchor);
        props.push(`&${anchor}`);
      }
      const tag = node.tag ?? (tagObj.default ? null : tagObj.tag);
      if (tag)
        props.push(doc.directives.tagString(tag));
      return props.join(" ");
    }
    function stringify2(item2, ctx, onComment, onChompKeep) {
      if (identity.isPair(item2))
        return item2.toString(ctx, onComment, onChompKeep);
      if (identity.isAlias(item2)) {
        if (ctx.doc.directives)
          return item2.toString(ctx);
        if (ctx.resolvedAliases?.has(item2)) {
          throw new TypeError(`Cannot stringify circular structure without alias nodes`);
        } else {
          if (ctx.resolvedAliases)
            ctx.resolvedAliases.add(item2);
          else
            ctx.resolvedAliases = /* @__PURE__ */ new Set([item2]);
          item2 = item2.resolve(ctx.doc);
        }
      }
      let tagObj = void 0;
      const node = identity.isNode(item2) ? item2 : ctx.doc.createNode(item2, { onTagObj: (o) => tagObj = o });
      tagObj ?? (tagObj = getTagObject(ctx.doc.schema.tags, node));
      const props = stringifyProps(node, tagObj, ctx);
      if (props.length > 0)
        ctx.indentAtStart = (ctx.indentAtStart ?? 0) + props.length + 1;
      const str = typeof tagObj.stringify === "function" ? tagObj.stringify(node, ctx, onComment, onChompKeep) : identity.isScalar(node) ? stringifyString.stringifyString(node, ctx, onComment, onChompKeep) : node.toString(ctx, onComment, onChompKeep);
      if (!props)
        return str;
      return identity.isScalar(node) || str[0] === "{" || str[0] === "[" ? `${props} ${str}` : `${props}
${ctx.indent}${str}`;
    }
    exports.createStringifyContext = createStringifyContext;
    exports.stringify = stringify2;
  }
});

// node_modules/yaml/dist/stringify/stringifyPair.js
var require_stringifyPair = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyPair.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var stringify2 = require_stringify();
    var stringifyComment = require_stringifyComment();
    function stringifyPair({ key, value }, ctx, onComment, onChompKeep) {
      const { allNullValues, doc, indent, indentStep, options: { commentString, indentSeq, simpleKeys } } = ctx;
      let keyComment = identity.isNode(key) && key.comment || null;
      if (simpleKeys) {
        if (keyComment) {
          throw new Error("With simple keys, key nodes cannot have comments");
        }
        if (identity.isCollection(key) || !identity.isNode(key) && typeof key === "object") {
          const msg = "With simple keys, collection cannot be used as a key value";
          throw new Error(msg);
        }
      }
      let explicitKey = !simpleKeys && (!key || keyComment && value == null && !ctx.inFlow || identity.isCollection(key) || (identity.isScalar(key) ? key.type === Scalar.Scalar.BLOCK_FOLDED || key.type === Scalar.Scalar.BLOCK_LITERAL : typeof key === "object"));
      ctx = Object.assign({}, ctx, {
        allNullValues: false,
        implicitKey: !explicitKey && (simpleKeys || !allNullValues),
        indent: indent + indentStep
      });
      let keyCommentDone = false;
      let chompKeep = false;
      let str = stringify2.stringify(key, ctx, () => keyCommentDone = true, () => chompKeep = true);
      if (!explicitKey && !ctx.inFlow && str.length > 1024) {
        if (simpleKeys)
          throw new Error("With simple keys, single line scalar must not span more than 1024 characters");
        explicitKey = true;
      }
      if (ctx.inFlow) {
        if (allNullValues || value == null) {
          if (keyCommentDone && onComment)
            onComment();
          return str === "" ? "?" : explicitKey ? `? ${str}` : str;
        }
      } else if (allNullValues && !simpleKeys || value == null && explicitKey) {
        str = `? ${str}`;
        if (keyComment && !keyCommentDone) {
          str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
        } else if (chompKeep && onChompKeep)
          onChompKeep();
        return str;
      }
      if (keyCommentDone)
        keyComment = null;
      if (explicitKey) {
        if (keyComment)
          str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
        str = `? ${str}
${indent}:`;
      } else {
        str = `${str}:`;
        if (keyComment)
          str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
      }
      let vsb, vcb, valueComment;
      if (identity.isNode(value)) {
        vsb = !!value.spaceBefore;
        vcb = value.commentBefore;
        valueComment = value.comment;
      } else {
        vsb = false;
        vcb = null;
        valueComment = null;
        if (value && typeof value === "object")
          value = doc.createNode(value);
      }
      ctx.implicitKey = false;
      if (!explicitKey && !keyComment && identity.isScalar(value))
        ctx.indentAtStart = str.length + 1;
      chompKeep = false;
      if (!indentSeq && indentStep.length >= 2 && !ctx.inFlow && !explicitKey && identity.isSeq(value) && !value.flow && !value.tag && !value.anchor) {
        ctx.indent = ctx.indent.substring(2);
      }
      let valueCommentDone = false;
      const valueStr = stringify2.stringify(value, ctx, () => valueCommentDone = true, () => chompKeep = true);
      let ws = " ";
      if (keyComment || vsb || vcb) {
        ws = vsb ? "\n" : "";
        if (vcb) {
          const cs = commentString(vcb);
          ws += `
${stringifyComment.indentComment(cs, ctx.indent)}`;
        }
        if (valueStr === "" && !ctx.inFlow) {
          if (ws === "\n" && valueComment)
            ws = "\n\n";
        } else {
          ws += `
${ctx.indent}`;
        }
      } else if (!explicitKey && identity.isCollection(value)) {
        const vs0 = valueStr[0];
        const nl0 = valueStr.indexOf("\n");
        const hasNewline = nl0 !== -1;
        const flow = ctx.inFlow ?? value.flow ?? value.items.length === 0;
        if (hasNewline || !flow) {
          let hasPropsLine = false;
          if (hasNewline && (vs0 === "&" || vs0 === "!")) {
            let sp0 = valueStr.indexOf(" ");
            if (vs0 === "&" && sp0 !== -1 && sp0 < nl0 && valueStr[sp0 + 1] === "!") {
              sp0 = valueStr.indexOf(" ", sp0 + 1);
            }
            if (sp0 === -1 || nl0 < sp0)
              hasPropsLine = true;
          }
          if (!hasPropsLine)
            ws = `
${ctx.indent}`;
        }
      } else if (valueStr === "" || valueStr[0] === "\n") {
        ws = "";
      }
      str += ws + valueStr;
      if (ctx.inFlow) {
        if (valueCommentDone && onComment)
          onComment();
      } else if (valueComment && !valueCommentDone) {
        str += stringifyComment.lineComment(str, ctx.indent, commentString(valueComment));
      } else if (chompKeep && onChompKeep) {
        onChompKeep();
      }
      return str;
    }
    exports.stringifyPair = stringifyPair;
  }
});

// node_modules/yaml/dist/log.js
var require_log = __commonJS({
  "node_modules/yaml/dist/log.js"(exports) {
    "use strict";
    var node_process = __require("process");
    function debug(logLevel, ...messages) {
      if (logLevel === "debug")
        console.log(...messages);
    }
    function warn(logLevel, warning) {
      if (logLevel === "debug" || logLevel === "warn") {
        if (typeof node_process.emitWarning === "function")
          node_process.emitWarning(warning);
        else
          console.warn(warning);
      }
    }
    exports.debug = debug;
    exports.warn = warn;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/merge.js
var require_merge = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/merge.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var MERGE_KEY = "<<";
    var merge = {
      identify: (value) => value === MERGE_KEY || typeof value === "symbol" && value.description === MERGE_KEY,
      default: "key",
      tag: "tag:yaml.org,2002:merge",
      test: /^<<$/,
      resolve: () => Object.assign(new Scalar.Scalar(Symbol(MERGE_KEY)), {
        addToJSMap: addMergeToJSMap
      }),
      stringify: () => MERGE_KEY
    };
    var isMergeKey = (ctx, key) => (merge.identify(key) || identity.isScalar(key) && (!key.type || key.type === Scalar.Scalar.PLAIN) && merge.identify(key.value)) && ctx?.doc.schema.tags.some((tag) => tag.tag === merge.tag && tag.default);
    function addMergeToJSMap(ctx, map, value) {
      const source = resolveAliasValue(ctx, value);
      if (identity.isSeq(source))
        for (const it of source.items)
          mergeValue(ctx, map, it);
      else if (Array.isArray(source))
        for (const it of source)
          mergeValue(ctx, map, it);
      else
        mergeValue(ctx, map, source);
    }
    function mergeValue(ctx, map, value) {
      const source = resolveAliasValue(ctx, value);
      if (!identity.isMap(source))
        throw new Error("Merge sources must be maps or map aliases");
      const srcMap = source.toJSON(null, ctx, Map);
      for (const [key, value2] of srcMap) {
        if (map instanceof Map) {
          if (!map.has(key))
            map.set(key, value2);
        } else if (map instanceof Set) {
          map.add(key);
        } else if (!Object.prototype.hasOwnProperty.call(map, key)) {
          Object.defineProperty(map, key, {
            value: value2,
            writable: true,
            enumerable: true,
            configurable: true
          });
        }
      }
      return map;
    }
    function resolveAliasValue(ctx, value) {
      return ctx && identity.isAlias(value) ? value.resolve(ctx.doc, ctx) : value;
    }
    exports.addMergeToJSMap = addMergeToJSMap;
    exports.isMergeKey = isMergeKey;
    exports.merge = merge;
  }
});

// node_modules/yaml/dist/nodes/addPairToJSMap.js
var require_addPairToJSMap = __commonJS({
  "node_modules/yaml/dist/nodes/addPairToJSMap.js"(exports) {
    "use strict";
    var log = require_log();
    var merge = require_merge();
    var stringify2 = require_stringify();
    var identity = require_identity();
    var toJS = require_toJS();
    function addPairToJSMap(ctx, map, { key, value }) {
      if (identity.isNode(key) && key.addToJSMap)
        key.addToJSMap(ctx, map, value);
      else if (merge.isMergeKey(ctx, key))
        merge.addMergeToJSMap(ctx, map, value);
      else {
        const jsKey = toJS.toJS(key, "", ctx);
        if (map instanceof Map) {
          map.set(jsKey, toJS.toJS(value, jsKey, ctx));
        } else if (map instanceof Set) {
          map.add(jsKey);
        } else {
          const stringKey = stringifyKey(key, jsKey, ctx);
          const jsValue = toJS.toJS(value, stringKey, ctx);
          if (stringKey in map)
            Object.defineProperty(map, stringKey, {
              value: jsValue,
              writable: true,
              enumerable: true,
              configurable: true
            });
          else
            map[stringKey] = jsValue;
        }
      }
      return map;
    }
    function stringifyKey(key, jsKey, ctx) {
      if (jsKey === null)
        return "";
      if (typeof jsKey !== "object")
        return String(jsKey);
      if (identity.isNode(key) && ctx?.doc) {
        const strCtx = stringify2.createStringifyContext(ctx.doc, {});
        strCtx.anchors = /* @__PURE__ */ new Set();
        for (const node of ctx.anchors.keys())
          strCtx.anchors.add(node.anchor);
        strCtx.inFlow = true;
        strCtx.inStringifyKey = true;
        const strKey = key.toString(strCtx);
        if (!ctx.mapKeyWarned) {
          let jsonStr = JSON.stringify(strKey);
          if (jsonStr.length > 40)
            jsonStr = jsonStr.substring(0, 36) + '..."';
          log.warn(ctx.doc.options.logLevel, `Keys with collection values will be stringified due to JS Object restrictions: ${jsonStr}. Set mapAsMap: true to use object keys.`);
          ctx.mapKeyWarned = true;
        }
        return strKey;
      }
      return JSON.stringify(jsKey);
    }
    exports.addPairToJSMap = addPairToJSMap;
  }
});

// node_modules/yaml/dist/nodes/Pair.js
var require_Pair = __commonJS({
  "node_modules/yaml/dist/nodes/Pair.js"(exports) {
    "use strict";
    var createNode = require_createNode();
    var stringifyPair = require_stringifyPair();
    var addPairToJSMap = require_addPairToJSMap();
    var identity = require_identity();
    function createPair(key, value, ctx) {
      const k = createNode.createNode(key, void 0, ctx);
      const v = createNode.createNode(value, void 0, ctx);
      return new Pair(k, v);
    }
    var Pair = class _Pair {
      constructor(key, value = null) {
        Object.defineProperty(this, identity.NODE_TYPE, { value: identity.PAIR });
        this.key = key;
        this.value = value;
      }
      clone(schema) {
        let { key, value } = this;
        if (identity.isNode(key))
          key = key.clone(schema);
        if (identity.isNode(value))
          value = value.clone(schema);
        return new _Pair(key, value);
      }
      toJSON(_, ctx) {
        const pair = ctx?.mapAsMap ? /* @__PURE__ */ new Map() : {};
        return addPairToJSMap.addPairToJSMap(ctx, pair, this);
      }
      toString(ctx, onComment, onChompKeep) {
        return ctx?.doc ? stringifyPair.stringifyPair(this, ctx, onComment, onChompKeep) : JSON.stringify(this);
      }
    };
    exports.Pair = Pair;
    exports.createPair = createPair;
  }
});

// node_modules/yaml/dist/stringify/stringifyCollection.js
var require_stringifyCollection = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyCollection.js"(exports) {
    "use strict";
    var identity = require_identity();
    var stringify2 = require_stringify();
    var stringifyComment = require_stringifyComment();
    function stringifyCollection(collection, ctx, options) {
      const flow = ctx.inFlow ?? collection.flow;
      const stringify3 = flow ? stringifyFlowCollection : stringifyBlockCollection;
      return stringify3(collection, ctx, options);
    }
    function stringifyBlockCollection({ comment, items }, ctx, { blockItemPrefix, flowChars, itemIndent, onChompKeep, onComment }) {
      const { indent, options: { commentString } } = ctx;
      const itemCtx = Object.assign({}, ctx, { indent: itemIndent, type: null });
      let chompKeep = false;
      const lines = [];
      for (let i = 0; i < items.length; ++i) {
        const item2 = items[i];
        let comment2 = null;
        if (identity.isNode(item2)) {
          if (!chompKeep && item2.spaceBefore)
            lines.push("");
          addCommentBefore(ctx, lines, item2.commentBefore, chompKeep);
          if (item2.comment)
            comment2 = item2.comment;
        } else if (identity.isPair(item2)) {
          const ik = identity.isNode(item2.key) ? item2.key : null;
          if (ik) {
            if (!chompKeep && ik.spaceBefore)
              lines.push("");
            addCommentBefore(ctx, lines, ik.commentBefore, chompKeep);
          }
        }
        chompKeep = false;
        let str2 = stringify2.stringify(item2, itemCtx, () => comment2 = null, () => chompKeep = true);
        if (comment2)
          str2 += stringifyComment.lineComment(str2, itemIndent, commentString(comment2));
        if (chompKeep && comment2)
          chompKeep = false;
        lines.push(blockItemPrefix + str2);
      }
      let str;
      if (lines.length === 0) {
        str = flowChars.start + flowChars.end;
      } else {
        str = lines[0];
        for (let i = 1; i < lines.length; ++i) {
          const line = lines[i];
          str += line ? `
${indent}${line}` : "\n";
        }
      }
      if (comment) {
        str += "\n" + stringifyComment.indentComment(commentString(comment), indent);
        if (onComment)
          onComment();
      } else if (chompKeep && onChompKeep)
        onChompKeep();
      return str;
    }
    function stringifyFlowCollection({ items }, ctx, { flowChars, itemIndent }) {
      const { indent, indentStep, flowCollectionPadding: fcPadding, options: { commentString } } = ctx;
      itemIndent += indentStep;
      const itemCtx = Object.assign({}, ctx, {
        indent: itemIndent,
        inFlow: true,
        type: null
      });
      let reqNewline = false;
      let linesAtValue = 0;
      const lines = [];
      for (let i = 0; i < items.length; ++i) {
        const item2 = items[i];
        let comment = null;
        if (identity.isNode(item2)) {
          if (item2.spaceBefore)
            lines.push("");
          addCommentBefore(ctx, lines, item2.commentBefore, false);
          if (item2.comment)
            comment = item2.comment;
        } else if (identity.isPair(item2)) {
          const ik = identity.isNode(item2.key) ? item2.key : null;
          if (ik) {
            if (ik.spaceBefore)
              lines.push("");
            addCommentBefore(ctx, lines, ik.commentBefore, false);
            if (ik.comment)
              reqNewline = true;
          }
          const iv = identity.isNode(item2.value) ? item2.value : null;
          if (iv) {
            if (iv.comment)
              comment = iv.comment;
            if (iv.commentBefore)
              reqNewline = true;
          } else if (item2.value == null && ik?.comment) {
            comment = ik.comment;
          }
        }
        if (comment)
          reqNewline = true;
        let str = stringify2.stringify(item2, itemCtx, () => comment = null);
        reqNewline || (reqNewline = lines.length > linesAtValue || str.includes("\n"));
        if (i < items.length - 1) {
          str += ",";
        } else if (ctx.options.trailingComma) {
          if (ctx.options.lineWidth > 0) {
            reqNewline || (reqNewline = lines.reduce((sum, line) => sum + line.length + 2, 2) + (str.length + 2) > ctx.options.lineWidth);
          }
          if (reqNewline) {
            str += ",";
          }
        }
        if (comment)
          str += stringifyComment.lineComment(str, itemIndent, commentString(comment));
        lines.push(str);
        linesAtValue = lines.length;
      }
      const { start, end } = flowChars;
      if (lines.length === 0) {
        return start + end;
      } else {
        if (!reqNewline) {
          const len = lines.reduce((sum, line) => sum + line.length + 2, 2);
          reqNewline = ctx.options.lineWidth > 0 && len > ctx.options.lineWidth;
        }
        if (reqNewline) {
          let str = start;
          for (const line of lines)
            str += line ? `
${indentStep}${indent}${line}` : "\n";
          return `${str}
${indent}${end}`;
        } else {
          return `${start}${fcPadding}${lines.join(" ")}${fcPadding}${end}`;
        }
      }
    }
    function addCommentBefore({ indent, options: { commentString } }, lines, comment, chompKeep) {
      if (comment && chompKeep)
        comment = comment.replace(/^\n+/, "");
      if (comment) {
        const ic = stringifyComment.indentComment(commentString(comment), indent);
        lines.push(ic.trimStart());
      }
    }
    exports.stringifyCollection = stringifyCollection;
  }
});

// node_modules/yaml/dist/nodes/YAMLMap.js
var require_YAMLMap = __commonJS({
  "node_modules/yaml/dist/nodes/YAMLMap.js"(exports) {
    "use strict";
    var stringifyCollection = require_stringifyCollection();
    var addPairToJSMap = require_addPairToJSMap();
    var Collection = require_Collection();
    var identity = require_identity();
    var Pair = require_Pair();
    var Scalar = require_Scalar();
    function findPair(items, key) {
      const k = identity.isScalar(key) ? key.value : key;
      for (const it of items) {
        if (identity.isPair(it)) {
          if (it.key === key || it.key === k)
            return it;
          if (identity.isScalar(it.key) && it.key.value === k)
            return it;
        }
      }
      return void 0;
    }
    var YAMLMap = class extends Collection.Collection {
      static get tagName() {
        return "tag:yaml.org,2002:map";
      }
      constructor(schema) {
        super(identity.MAP, schema);
        this.items = [];
      }
      /**
       * A generic collection parsing method that can be extended
       * to other node classes that inherit from YAMLMap
       */
      static from(schema, obj, ctx) {
        const { keepUndefined, replacer } = ctx;
        const map = new this(schema);
        const add = (key, value) => {
          if (typeof replacer === "function")
            value = replacer.call(obj, key, value);
          else if (Array.isArray(replacer) && !replacer.includes(key))
            return;
          if (value !== void 0 || keepUndefined)
            map.items.push(Pair.createPair(key, value, ctx));
        };
        if (obj instanceof Map) {
          for (const [key, value] of obj)
            add(key, value);
        } else if (obj && typeof obj === "object") {
          for (const key of Object.keys(obj))
            add(key, obj[key]);
        }
        if (typeof schema.sortMapEntries === "function") {
          map.items.sort(schema.sortMapEntries);
        }
        return map;
      }
      /**
       * Adds a value to the collection.
       *
       * @param overwrite - If not set `true`, using a key that is already in the
       *   collection will throw. Otherwise, overwrites the previous value.
       */
      add(pair, overwrite) {
        let _pair;
        if (identity.isPair(pair))
          _pair = pair;
        else if (!pair || typeof pair !== "object" || !("key" in pair)) {
          _pair = new Pair.Pair(pair, pair?.value);
        } else
          _pair = new Pair.Pair(pair.key, pair.value);
        const prev = findPair(this.items, _pair.key);
        const sortEntries = this.schema?.sortMapEntries;
        if (prev) {
          if (!overwrite)
            throw new Error(`Key ${_pair.key} already set`);
          if (identity.isScalar(prev.value) && Scalar.isScalarValue(_pair.value))
            prev.value.value = _pair.value;
          else
            prev.value = _pair.value;
        } else if (sortEntries) {
          const i = this.items.findIndex((item2) => sortEntries(_pair, item2) < 0);
          if (i === -1)
            this.items.push(_pair);
          else
            this.items.splice(i, 0, _pair);
        } else {
          this.items.push(_pair);
        }
      }
      delete(key) {
        const it = findPair(this.items, key);
        if (!it)
          return false;
        const del = this.items.splice(this.items.indexOf(it), 1);
        return del.length > 0;
      }
      get(key, keepScalar) {
        const it = findPair(this.items, key);
        const node = it?.value;
        return (!keepScalar && identity.isScalar(node) ? node.value : node) ?? void 0;
      }
      has(key) {
        return !!findPair(this.items, key);
      }
      set(key, value) {
        this.add(new Pair.Pair(key, value), true);
      }
      /**
       * @param ctx - Conversion context, originally set in Document#toJS()
       * @param {Class} Type - If set, forces the returned collection type
       * @returns Instance of Type, Map, or Object
       */
      toJSON(_, ctx, Type) {
        const map = Type ? new Type() : ctx?.mapAsMap ? /* @__PURE__ */ new Map() : {};
        if (ctx?.onCreate)
          ctx.onCreate(map);
        for (const item2 of this.items)
          addPairToJSMap.addPairToJSMap(ctx, map, item2);
        return map;
      }
      toString(ctx, onComment, onChompKeep) {
        if (!ctx)
          return JSON.stringify(this);
        for (const item2 of this.items) {
          if (!identity.isPair(item2))
            throw new Error(`Map items must all be pairs; found ${JSON.stringify(item2)} instead`);
        }
        if (!ctx.allNullValues && this.hasAllNullValues(false))
          ctx = Object.assign({}, ctx, { allNullValues: true });
        return stringifyCollection.stringifyCollection(this, ctx, {
          blockItemPrefix: "",
          flowChars: { start: "{", end: "}" },
          itemIndent: ctx.indent || "",
          onChompKeep,
          onComment
        });
      }
    };
    exports.YAMLMap = YAMLMap;
    exports.findPair = findPair;
  }
});

// node_modules/yaml/dist/schema/common/map.js
var require_map = __commonJS({
  "node_modules/yaml/dist/schema/common/map.js"(exports) {
    "use strict";
    var identity = require_identity();
    var YAMLMap = require_YAMLMap();
    var map = {
      collection: "map",
      default: true,
      nodeClass: YAMLMap.YAMLMap,
      tag: "tag:yaml.org,2002:map",
      resolve(map2, onError) {
        if (!identity.isMap(map2))
          onError("Expected a mapping for this tag");
        return map2;
      },
      createNode: (schema, obj, ctx) => YAMLMap.YAMLMap.from(schema, obj, ctx)
    };
    exports.map = map;
  }
});

// node_modules/yaml/dist/nodes/YAMLSeq.js
var require_YAMLSeq = __commonJS({
  "node_modules/yaml/dist/nodes/YAMLSeq.js"(exports) {
    "use strict";
    var createNode = require_createNode();
    var stringifyCollection = require_stringifyCollection();
    var Collection = require_Collection();
    var identity = require_identity();
    var Scalar = require_Scalar();
    var toJS = require_toJS();
    var YAMLSeq = class extends Collection.Collection {
      static get tagName() {
        return "tag:yaml.org,2002:seq";
      }
      constructor(schema) {
        super(identity.SEQ, schema);
        this.items = [];
      }
      add(value) {
        this.items.push(value);
      }
      /**
       * Removes a value from the collection.
       *
       * `key` must contain a representation of an integer for this to succeed.
       * It may be wrapped in a `Scalar`.
       *
       * @returns `true` if the item was found and removed.
       */
      delete(key) {
        const idx = asItemIndex(key);
        if (typeof idx !== "number")
          return false;
        const del = this.items.splice(idx, 1);
        return del.length > 0;
      }
      get(key, keepScalar) {
        const idx = asItemIndex(key);
        if (typeof idx !== "number")
          return void 0;
        const it = this.items[idx];
        return !keepScalar && identity.isScalar(it) ? it.value : it;
      }
      /**
       * Checks if the collection includes a value with the key `key`.
       *
       * `key` must contain a representation of an integer for this to succeed.
       * It may be wrapped in a `Scalar`.
       */
      has(key) {
        const idx = asItemIndex(key);
        return typeof idx === "number" && idx < this.items.length;
      }
      /**
       * Sets a value in this collection. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       *
       * If `key` does not contain a representation of an integer, this will throw.
       * It may be wrapped in a `Scalar`.
       */
      set(key, value) {
        const idx = asItemIndex(key);
        if (typeof idx !== "number")
          throw new Error(`Expected a valid index, not ${key}.`);
        const prev = this.items[idx];
        if (identity.isScalar(prev) && Scalar.isScalarValue(value))
          prev.value = value;
        else
          this.items[idx] = value;
      }
      toJSON(_, ctx) {
        const seq = [];
        if (ctx?.onCreate)
          ctx.onCreate(seq);
        let i = 0;
        for (const item2 of this.items)
          seq.push(toJS.toJS(item2, String(i++), ctx));
        return seq;
      }
      toString(ctx, onComment, onChompKeep) {
        if (!ctx)
          return JSON.stringify(this);
        return stringifyCollection.stringifyCollection(this, ctx, {
          blockItemPrefix: "- ",
          flowChars: { start: "[", end: "]" },
          itemIndent: (ctx.indent || "") + "  ",
          onChompKeep,
          onComment
        });
      }
      static from(schema, obj, ctx) {
        const { replacer } = ctx;
        const seq = new this(schema);
        if (obj && Symbol.iterator in Object(obj)) {
          let i = 0;
          for (let it of obj) {
            if (typeof replacer === "function") {
              const key = obj instanceof Set ? it : String(i++);
              it = replacer.call(obj, key, it);
            }
            seq.items.push(createNode.createNode(it, void 0, ctx));
          }
        }
        return seq;
      }
    };
    function asItemIndex(key) {
      let idx = identity.isScalar(key) ? key.value : key;
      if (idx && typeof idx === "string")
        idx = Number(idx);
      return typeof idx === "number" && Number.isInteger(idx) && idx >= 0 ? idx : null;
    }
    exports.YAMLSeq = YAMLSeq;
  }
});

// node_modules/yaml/dist/schema/common/seq.js
var require_seq = __commonJS({
  "node_modules/yaml/dist/schema/common/seq.js"(exports) {
    "use strict";
    var identity = require_identity();
    var YAMLSeq = require_YAMLSeq();
    var seq = {
      collection: "seq",
      default: true,
      nodeClass: YAMLSeq.YAMLSeq,
      tag: "tag:yaml.org,2002:seq",
      resolve(seq2, onError) {
        if (!identity.isSeq(seq2))
          onError("Expected a sequence for this tag");
        return seq2;
      },
      createNode: (schema, obj, ctx) => YAMLSeq.YAMLSeq.from(schema, obj, ctx)
    };
    exports.seq = seq;
  }
});

// node_modules/yaml/dist/schema/common/string.js
var require_string = __commonJS({
  "node_modules/yaml/dist/schema/common/string.js"(exports) {
    "use strict";
    var stringifyString = require_stringifyString();
    var string = {
      identify: (value) => typeof value === "string",
      default: true,
      tag: "tag:yaml.org,2002:str",
      resolve: (str) => str,
      stringify(item2, ctx, onComment, onChompKeep) {
        ctx = Object.assign({ actualString: true }, ctx);
        return stringifyString.stringifyString(item2, ctx, onComment, onChompKeep);
      }
    };
    exports.string = string;
  }
});

// node_modules/yaml/dist/schema/common/null.js
var require_null = __commonJS({
  "node_modules/yaml/dist/schema/common/null.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var nullTag = {
      identify: (value) => value == null,
      createNode: () => new Scalar.Scalar(null),
      default: true,
      tag: "tag:yaml.org,2002:null",
      test: /^(?:~|[Nn]ull|NULL)?$/,
      resolve: () => new Scalar.Scalar(null),
      stringify: ({ source }, ctx) => typeof source === "string" && nullTag.test.test(source) ? source : ctx.options.nullStr
    };
    exports.nullTag = nullTag;
  }
});

// node_modules/yaml/dist/schema/core/bool.js
var require_bool = __commonJS({
  "node_modules/yaml/dist/schema/core/bool.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var boolTag = {
      identify: (value) => typeof value === "boolean",
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^(?:[Tt]rue|TRUE|[Ff]alse|FALSE)$/,
      resolve: (str) => new Scalar.Scalar(str[0] === "t" || str[0] === "T"),
      stringify({ source, value }, ctx) {
        if (source && boolTag.test.test(source)) {
          const sv = source[0] === "t" || source[0] === "T";
          if (value === sv)
            return source;
        }
        return value ? ctx.options.trueStr : ctx.options.falseStr;
      }
    };
    exports.boolTag = boolTag;
  }
});

// node_modules/yaml/dist/stringify/stringifyNumber.js
var require_stringifyNumber = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyNumber.js"(exports) {
    "use strict";
    function stringifyNumber({ format: format2, minFractionDigits, tag, value }) {
      if (typeof value === "bigint")
        return String(value);
      const num = typeof value === "number" ? value : Number(value);
      if (!isFinite(num))
        return isNaN(num) ? ".nan" : num < 0 ? "-.inf" : ".inf";
      let n = Object.is(value, -0) ? "-0" : JSON.stringify(value);
      if (!format2 && minFractionDigits && (!tag || tag === "tag:yaml.org,2002:float") && /^-?\d/.test(n) && !n.includes("e")) {
        let i = n.indexOf(".");
        if (i < 0) {
          i = n.length;
          n += ".";
        }
        let d = minFractionDigits - (n.length - i - 1);
        while (d-- > 0)
          n += "0";
      }
      return n;
    }
    exports.stringifyNumber = stringifyNumber;
  }
});

// node_modules/yaml/dist/schema/core/float.js
var require_float = __commonJS({
  "node_modules/yaml/dist/schema/core/float.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var stringifyNumber = require_stringifyNumber();
    var floatNaN = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
      resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
      stringify: stringifyNumber.stringifyNumber
    };
    var floatExp = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      format: "EXP",
      test: /^[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)[eE][-+]?[0-9]+$/,
      resolve: (str) => parseFloat(str),
      stringify(node) {
        const num = Number(node.value);
        return isFinite(num) ? num.toExponential() : stringifyNumber.stringifyNumber(node);
      }
    };
    var float = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^[-+]?(?:\.[0-9]+|[0-9]+\.[0-9]*)$/,
      resolve(str) {
        const node = new Scalar.Scalar(parseFloat(str));
        const dot = str.indexOf(".");
        if (dot !== -1 && str[str.length - 1] === "0")
          node.minFractionDigits = str.length - dot - 1;
        return node;
      },
      stringify: stringifyNumber.stringifyNumber
    };
    exports.float = float;
    exports.floatExp = floatExp;
    exports.floatNaN = floatNaN;
  }
});

// node_modules/yaml/dist/schema/core/int.js
var require_int = __commonJS({
  "node_modules/yaml/dist/schema/core/int.js"(exports) {
    "use strict";
    var stringifyNumber = require_stringifyNumber();
    var intIdentify = (value) => typeof value === "bigint" || Number.isInteger(value);
    var intResolve = (str, offset, radix, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str.substring(offset), radix);
    function intStringify(node, radix, prefix) {
      const { value } = node;
      if (intIdentify(value) && value >= 0)
        return prefix + value.toString(radix);
      return stringifyNumber.stringifyNumber(node);
    }
    var intOct = {
      identify: (value) => intIdentify(value) && value >= 0,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "OCT",
      test: /^0o[0-7]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 2, 8, opt),
      stringify: (node) => intStringify(node, 8, "0o")
    };
    var int = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      test: /^[-+]?[0-9]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 0, 10, opt),
      stringify: stringifyNumber.stringifyNumber
    };
    var intHex = {
      identify: (value) => intIdentify(value) && value >= 0,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "HEX",
      test: /^0x[0-9a-fA-F]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 2, 16, opt),
      stringify: (node) => intStringify(node, 16, "0x")
    };
    exports.int = int;
    exports.intHex = intHex;
    exports.intOct = intOct;
  }
});

// node_modules/yaml/dist/schema/core/schema.js
var require_schema = __commonJS({
  "node_modules/yaml/dist/schema/core/schema.js"(exports) {
    "use strict";
    var map = require_map();
    var _null = require_null();
    var seq = require_seq();
    var string = require_string();
    var bool = require_bool();
    var float = require_float();
    var int = require_int();
    var schema = [
      map.map,
      seq.seq,
      string.string,
      _null.nullTag,
      bool.boolTag,
      int.intOct,
      int.int,
      int.intHex,
      float.floatNaN,
      float.floatExp,
      float.float
    ];
    exports.schema = schema;
  }
});

// node_modules/yaml/dist/schema/json/schema.js
var require_schema2 = __commonJS({
  "node_modules/yaml/dist/schema/json/schema.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var map = require_map();
    var seq = require_seq();
    function intIdentify(value) {
      return typeof value === "bigint" || Number.isInteger(value);
    }
    var stringifyJSON = ({ value }) => JSON.stringify(value);
    var jsonScalars = [
      {
        identify: (value) => typeof value === "string",
        default: true,
        tag: "tag:yaml.org,2002:str",
        resolve: (str) => str,
        stringify: stringifyJSON
      },
      {
        identify: (value) => value == null,
        createNode: () => new Scalar.Scalar(null),
        default: true,
        tag: "tag:yaml.org,2002:null",
        test: /^null$/,
        resolve: () => null,
        stringify: stringifyJSON
      },
      {
        identify: (value) => typeof value === "boolean",
        default: true,
        tag: "tag:yaml.org,2002:bool",
        test: /^true$|^false$/,
        resolve: (str) => str === "true",
        stringify: stringifyJSON
      },
      {
        identify: intIdentify,
        default: true,
        tag: "tag:yaml.org,2002:int",
        test: /^-?(?:0|[1-9][0-9]*)$/,
        resolve: (str, _onError, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str, 10),
        stringify: ({ value }) => intIdentify(value) ? value.toString() : JSON.stringify(value)
      },
      {
        identify: (value) => typeof value === "number",
        default: true,
        tag: "tag:yaml.org,2002:float",
        test: /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]*)?(?:[eE][-+]?[0-9]+)?$/,
        resolve: (str) => parseFloat(str),
        stringify: stringifyJSON
      }
    ];
    var jsonError = {
      default: true,
      tag: "",
      test: /^/,
      resolve(str, onError) {
        onError(`Unresolved plain scalar ${JSON.stringify(str)}`);
        return str;
      }
    };
    var schema = [map.map, seq.seq].concat(jsonScalars, jsonError);
    exports.schema = schema;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/binary.js
var require_binary = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/binary.js"(exports) {
    "use strict";
    var node_buffer = __require("buffer");
    var Scalar = require_Scalar();
    var stringifyString = require_stringifyString();
    var binary = {
      identify: (value) => value instanceof Uint8Array,
      // Buffer inherits from Uint8Array
      default: false,
      tag: "tag:yaml.org,2002:binary",
      /**
       * Returns a Buffer in node and an Uint8Array in browsers
       *
       * To use the resulting buffer as an image, you'll want to do something like:
       *
       *   const blob = new Blob([buffer], { type: 'image/jpeg' })
       *   document.querySelector('#photo').src = URL.createObjectURL(blob)
       */
      resolve(src, onError) {
        if (typeof node_buffer.Buffer === "function") {
          return node_buffer.Buffer.from(src, "base64");
        } else if (typeof atob === "function") {
          const str = atob(src.replace(/[\n\r]/g, ""));
          const buffer = new Uint8Array(str.length);
          for (let i = 0; i < str.length; ++i)
            buffer[i] = str.charCodeAt(i);
          return buffer;
        } else {
          onError("This environment does not support reading binary tags; either Buffer or atob is required");
          return src;
        }
      },
      stringify({ comment, type, value }, ctx, onComment, onChompKeep) {
        if (!value)
          return "";
        const buf = value;
        let str;
        if (typeof node_buffer.Buffer === "function") {
          str = buf instanceof node_buffer.Buffer ? buf.toString("base64") : node_buffer.Buffer.from(buf.buffer).toString("base64");
        } else if (typeof btoa === "function") {
          let s = "";
          for (let i = 0; i < buf.length; ++i)
            s += String.fromCharCode(buf[i]);
          str = btoa(s);
        } else {
          throw new Error("This environment does not support writing binary tags; either Buffer or btoa is required");
        }
        type ?? (type = Scalar.Scalar.BLOCK_LITERAL);
        if (type !== Scalar.Scalar.QUOTE_DOUBLE) {
          const lineWidth = Math.max(ctx.options.lineWidth - ctx.indent.length, ctx.options.minContentWidth);
          const n = Math.ceil(str.length / lineWidth);
          const lines = new Array(n);
          for (let i = 0, o = 0; i < n; ++i, o += lineWidth) {
            lines[i] = str.substr(o, lineWidth);
          }
          str = lines.join(type === Scalar.Scalar.BLOCK_LITERAL ? "\n" : " ");
        }
        return stringifyString.stringifyString({ comment, type, value: str }, ctx, onComment, onChompKeep);
      }
    };
    exports.binary = binary;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/pairs.js
var require_pairs = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/pairs.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Pair = require_Pair();
    var Scalar = require_Scalar();
    var YAMLSeq = require_YAMLSeq();
    function resolvePairs(seq, onError) {
      if (identity.isSeq(seq)) {
        for (let i = 0; i < seq.items.length; ++i) {
          let item2 = seq.items[i];
          if (identity.isPair(item2))
            continue;
          else if (identity.isMap(item2)) {
            if (item2.items.length > 1)
              onError("Each pair must have its own sequence indicator");
            const pair = item2.items[0] || new Pair.Pair(new Scalar.Scalar(null));
            if (item2.commentBefore)
              pair.key.commentBefore = pair.key.commentBefore ? `${item2.commentBefore}
${pair.key.commentBefore}` : item2.commentBefore;
            if (item2.comment) {
              const cn = pair.value ?? pair.key;
              cn.comment = cn.comment ? `${item2.comment}
${cn.comment}` : item2.comment;
            }
            item2 = pair;
          }
          seq.items[i] = identity.isPair(item2) ? item2 : new Pair.Pair(item2);
        }
      } else
        onError("Expected a sequence for this tag");
      return seq;
    }
    function createPairs(schema, iterable, ctx) {
      const { replacer } = ctx;
      const pairs2 = new YAMLSeq.YAMLSeq(schema);
      pairs2.tag = "tag:yaml.org,2002:pairs";
      let i = 0;
      if (iterable && Symbol.iterator in Object(iterable))
        for (let it of iterable) {
          if (typeof replacer === "function")
            it = replacer.call(iterable, String(i++), it);
          let key, value;
          if (Array.isArray(it)) {
            if (it.length === 2) {
              key = it[0];
              value = it[1];
            } else
              throw new TypeError(`Expected [key, value] tuple: ${it}`);
          } else if (it && it instanceof Object) {
            const keys = Object.keys(it);
            if (keys.length === 1) {
              key = keys[0];
              value = it[key];
            } else {
              throw new TypeError(`Expected tuple with one key, not ${keys.length} keys`);
            }
          } else {
            key = it;
          }
          pairs2.items.push(Pair.createPair(key, value, ctx));
        }
      return pairs2;
    }
    var pairs = {
      collection: "seq",
      default: false,
      tag: "tag:yaml.org,2002:pairs",
      resolve: resolvePairs,
      createNode: createPairs
    };
    exports.createPairs = createPairs;
    exports.pairs = pairs;
    exports.resolvePairs = resolvePairs;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/omap.js
var require_omap = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/omap.js"(exports) {
    "use strict";
    var identity = require_identity();
    var toJS = require_toJS();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var pairs = require_pairs();
    var YAMLOMap = class _YAMLOMap extends YAMLSeq.YAMLSeq {
      constructor() {
        super();
        this.add = YAMLMap.YAMLMap.prototype.add.bind(this);
        this.delete = YAMLMap.YAMLMap.prototype.delete.bind(this);
        this.get = YAMLMap.YAMLMap.prototype.get.bind(this);
        this.has = YAMLMap.YAMLMap.prototype.has.bind(this);
        this.set = YAMLMap.YAMLMap.prototype.set.bind(this);
        this.tag = _YAMLOMap.tag;
      }
      /**
       * If `ctx` is given, the return type is actually `Map<unknown, unknown>`,
       * but TypeScript won't allow widening the signature of a child method.
       */
      toJSON(_, ctx) {
        if (!ctx)
          return super.toJSON(_);
        const map = /* @__PURE__ */ new Map();
        if (ctx?.onCreate)
          ctx.onCreate(map);
        for (const pair of this.items) {
          let key, value;
          if (identity.isPair(pair)) {
            key = toJS.toJS(pair.key, "", ctx);
            value = toJS.toJS(pair.value, key, ctx);
          } else {
            key = toJS.toJS(pair, "", ctx);
          }
          if (map.has(key))
            throw new Error("Ordered maps must not include duplicate keys");
          map.set(key, value);
        }
        return map;
      }
      static from(schema, iterable, ctx) {
        const pairs$1 = pairs.createPairs(schema, iterable, ctx);
        const omap2 = new this();
        omap2.items = pairs$1.items;
        return omap2;
      }
    };
    YAMLOMap.tag = "tag:yaml.org,2002:omap";
    var omap = {
      collection: "seq",
      identify: (value) => value instanceof Map,
      nodeClass: YAMLOMap,
      default: false,
      tag: "tag:yaml.org,2002:omap",
      resolve(seq, onError) {
        const pairs$1 = pairs.resolvePairs(seq, onError);
        const seenKeys = [];
        for (const { key } of pairs$1.items) {
          if (identity.isScalar(key)) {
            if (seenKeys.includes(key.value)) {
              onError(`Ordered maps must not include duplicate keys: ${key.value}`);
            } else {
              seenKeys.push(key.value);
            }
          }
        }
        return Object.assign(new YAMLOMap(), pairs$1);
      },
      createNode: (schema, iterable, ctx) => YAMLOMap.from(schema, iterable, ctx)
    };
    exports.YAMLOMap = YAMLOMap;
    exports.omap = omap;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/bool.js
var require_bool2 = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/bool.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    function boolStringify({ value, source }, ctx) {
      const boolObj = value ? trueTag : falseTag;
      if (source && boolObj.test.test(source))
        return source;
      return value ? ctx.options.trueStr : ctx.options.falseStr;
    }
    var trueTag = {
      identify: (value) => value === true,
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^(?:Y|y|[Yy]es|YES|[Tt]rue|TRUE|[Oo]n|ON)$/,
      resolve: () => new Scalar.Scalar(true),
      stringify: boolStringify
    };
    var falseTag = {
      identify: (value) => value === false,
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^(?:N|n|[Nn]o|NO|[Ff]alse|FALSE|[Oo]ff|OFF)$/,
      resolve: () => new Scalar.Scalar(false),
      stringify: boolStringify
    };
    exports.falseTag = falseTag;
    exports.trueTag = trueTag;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/float.js
var require_float2 = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/float.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var stringifyNumber = require_stringifyNumber();
    var floatNaN = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
      resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
      stringify: stringifyNumber.stringifyNumber
    };
    var floatExp = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      format: "EXP",
      test: /^[-+]?(?:[0-9][0-9_]*)?(?:\.[0-9_]*)?[eE][-+]?[0-9]+$/,
      resolve: (str) => parseFloat(str.replace(/_/g, "")),
      stringify(node) {
        const num = Number(node.value);
        return isFinite(num) ? num.toExponential() : stringifyNumber.stringifyNumber(node);
      }
    };
    var float = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^[-+]?(?:[0-9][0-9_]*)?\.[0-9_]*$/,
      resolve(str) {
        const node = new Scalar.Scalar(parseFloat(str.replace(/_/g, "")));
        const dot = str.indexOf(".");
        if (dot !== -1) {
          const f = str.substring(dot + 1).replace(/_/g, "");
          if (f[f.length - 1] === "0")
            node.minFractionDigits = f.length;
        }
        return node;
      },
      stringify: stringifyNumber.stringifyNumber
    };
    exports.float = float;
    exports.floatExp = floatExp;
    exports.floatNaN = floatNaN;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/int.js
var require_int2 = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/int.js"(exports) {
    "use strict";
    var stringifyNumber = require_stringifyNumber();
    var intIdentify = (value) => typeof value === "bigint" || Number.isInteger(value);
    function intResolve(str, offset, radix, { intAsBigInt }) {
      const sign = str[0];
      if (sign === "-" || sign === "+")
        offset += 1;
      str = str.substring(offset).replace(/_/g, "");
      if (intAsBigInt) {
        switch (radix) {
          case 2:
            str = `0b${str}`;
            break;
          case 8:
            str = `0o${str}`;
            break;
          case 16:
            str = `0x${str}`;
            break;
        }
        const n2 = BigInt(str);
        return sign === "-" ? BigInt(-1) * n2 : n2;
      }
      const n = parseInt(str, radix);
      return sign === "-" ? -1 * n : n;
    }
    function intStringify(node, radix, prefix) {
      const { value } = node;
      if (intIdentify(value)) {
        const str = value.toString(radix);
        return value < 0 ? "-" + prefix + str.substr(1) : prefix + str;
      }
      return stringifyNumber.stringifyNumber(node);
    }
    var intBin = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "BIN",
      test: /^[-+]?0b[0-1_]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 2, 2, opt),
      stringify: (node) => intStringify(node, 2, "0b")
    };
    var intOct = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "OCT",
      test: /^[-+]?0[0-7_]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 1, 8, opt),
      stringify: (node) => intStringify(node, 8, "0")
    };
    var int = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      test: /^[-+]?[0-9][0-9_]*$/,
      resolve: (str, _onError, opt) => intResolve(str, 0, 10, opt),
      stringify: stringifyNumber.stringifyNumber
    };
    var intHex = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "HEX",
      test: /^[-+]?0x[0-9a-fA-F_]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 2, 16, opt),
      stringify: (node) => intStringify(node, 16, "0x")
    };
    exports.int = int;
    exports.intBin = intBin;
    exports.intHex = intHex;
    exports.intOct = intOct;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/set.js
var require_set = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/set.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Pair = require_Pair();
    var YAMLMap = require_YAMLMap();
    var YAMLSet = class _YAMLSet extends YAMLMap.YAMLMap {
      constructor(schema) {
        super(schema);
        this.tag = _YAMLSet.tag;
      }
      add(key) {
        let pair;
        if (identity.isPair(key))
          pair = key;
        else if (key && typeof key === "object" && "key" in key && "value" in key && key.value === null)
          pair = new Pair.Pair(key.key, null);
        else
          pair = new Pair.Pair(key, null);
        const prev = YAMLMap.findPair(this.items, pair.key);
        if (!prev)
          this.items.push(pair);
      }
      /**
       * If `keepPair` is `true`, returns the Pair matching `key`.
       * Otherwise, returns the value of that Pair's key.
       */
      get(key, keepPair) {
        const pair = YAMLMap.findPair(this.items, key);
        return !keepPair && identity.isPair(pair) ? identity.isScalar(pair.key) ? pair.key.value : pair.key : pair;
      }
      set(key, value) {
        if (typeof value !== "boolean")
          throw new Error(`Expected boolean value for set(key, value) in a YAML set, not ${typeof value}`);
        const prev = YAMLMap.findPair(this.items, key);
        if (prev && !value) {
          this.items.splice(this.items.indexOf(prev), 1);
        } else if (!prev && value) {
          this.items.push(new Pair.Pair(key));
        }
      }
      toJSON(_, ctx) {
        return super.toJSON(_, ctx, Set);
      }
      toString(ctx, onComment, onChompKeep) {
        if (!ctx)
          return JSON.stringify(this);
        if (this.hasAllNullValues(true))
          return super.toString(Object.assign({}, ctx, { allNullValues: true }), onComment, onChompKeep);
        else
          throw new Error("Set items must all have null values");
      }
      static from(schema, iterable, ctx) {
        const { replacer } = ctx;
        const set2 = new this(schema);
        if (iterable && Symbol.iterator in Object(iterable))
          for (let value of iterable) {
            if (typeof replacer === "function")
              value = replacer.call(iterable, value, value);
            set2.items.push(Pair.createPair(value, null, ctx));
          }
        return set2;
      }
    };
    YAMLSet.tag = "tag:yaml.org,2002:set";
    var set = {
      collection: "map",
      identify: (value) => value instanceof Set,
      nodeClass: YAMLSet,
      default: false,
      tag: "tag:yaml.org,2002:set",
      createNode: (schema, iterable, ctx) => YAMLSet.from(schema, iterable, ctx),
      resolve(map, onError) {
        if (identity.isMap(map)) {
          if (map.hasAllNullValues(true))
            return Object.assign(new YAMLSet(), map);
          else
            onError("Set items must all have null values");
        } else
          onError("Expected a mapping for this tag");
        return map;
      }
    };
    exports.YAMLSet = YAMLSet;
    exports.set = set;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/timestamp.js
var require_timestamp = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/timestamp.js"(exports) {
    "use strict";
    var stringifyNumber = require_stringifyNumber();
    function parseSexagesimal(str, asBigInt) {
      const sign = str[0];
      const parts = sign === "-" || sign === "+" ? str.substring(1) : str;
      const num = (n) => asBigInt ? BigInt(n) : Number(n);
      const res = parts.replace(/_/g, "").split(":").reduce((res2, p) => res2 * num(60) + num(p), num(0));
      return sign === "-" ? num(-1) * res : res;
    }
    function stringifySexagesimal(node) {
      let { value } = node;
      let num = (n) => n;
      if (typeof value === "bigint")
        num = (n) => BigInt(n);
      else if (isNaN(value) || !isFinite(value))
        return stringifyNumber.stringifyNumber(node);
      let sign = "";
      if (value < 0) {
        sign = "-";
        value *= num(-1);
      }
      const _60 = num(60);
      const parts = [value % _60];
      if (value < 60) {
        parts.unshift(0);
      } else {
        value = (value - parts[0]) / _60;
        parts.unshift(value % _60);
        if (value >= 60) {
          value = (value - parts[0]) / _60;
          parts.unshift(value);
        }
      }
      return sign + parts.map((n) => String(n).padStart(2, "0")).join(":").replace(/000000\d*$/, "");
    }
    var intTime = {
      identify: (value) => typeof value === "bigint" || Number.isInteger(value),
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "TIME",
      test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+$/,
      resolve: (str, _onError, { intAsBigInt }) => parseSexagesimal(str, intAsBigInt),
      stringify: stringifySexagesimal
    };
    var floatTime = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      format: "TIME",
      test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\.[0-9_]*$/,
      resolve: (str) => parseSexagesimal(str, false),
      stringify: stringifySexagesimal
    };
    var timestamp = {
      identify: (value) => value instanceof Date,
      default: true,
      tag: "tag:yaml.org,2002:timestamp",
      // If the time zone is omitted, the timestamp is assumed to be specified in UTC. The time part
      // may be omitted altogether, resulting in a date format. In such a case, the time part is
      // assumed to be 00:00:00Z (start of day, UTC).
      test: RegExp("^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})(?:(?:t|T|[ \\t]+)([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2}(\\.[0-9]+)?)(?:[ \\t]*(Z|[-+][012]?[0-9](?::[0-9]{2})?))?)?$"),
      resolve(str) {
        const match = str.match(timestamp.test);
        if (!match)
          throw new Error("!!timestamp expects a date, starting with yyyy-mm-dd");
        const [, year, month, day, hour, minute, second] = match.map(Number);
        const millisec = match[7] ? Number((match[7] + "00").substr(1, 3)) : 0;
        let date = Date.UTC(year, month - 1, day, hour || 0, minute || 0, second || 0, millisec);
        const tz = match[8];
        if (tz && tz !== "Z") {
          let d = parseSexagesimal(tz, false);
          if (Math.abs(d) < 30)
            d *= 60;
          date -= 6e4 * d;
        }
        return new Date(date);
      },
      stringify: ({ value }) => value?.toISOString().replace(/(T00:00:00)?\.000Z$/, "") ?? ""
    };
    exports.floatTime = floatTime;
    exports.intTime = intTime;
    exports.timestamp = timestamp;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/schema.js
var require_schema3 = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/schema.js"(exports) {
    "use strict";
    var map = require_map();
    var _null = require_null();
    var seq = require_seq();
    var string = require_string();
    var binary = require_binary();
    var bool = require_bool2();
    var float = require_float2();
    var int = require_int2();
    var merge = require_merge();
    var omap = require_omap();
    var pairs = require_pairs();
    var set = require_set();
    var timestamp = require_timestamp();
    var schema = [
      map.map,
      seq.seq,
      string.string,
      _null.nullTag,
      bool.trueTag,
      bool.falseTag,
      int.intBin,
      int.intOct,
      int.int,
      int.intHex,
      float.floatNaN,
      float.floatExp,
      float.float,
      binary.binary,
      merge.merge,
      omap.omap,
      pairs.pairs,
      set.set,
      timestamp.intTime,
      timestamp.floatTime,
      timestamp.timestamp
    ];
    exports.schema = schema;
  }
});

// node_modules/yaml/dist/schema/tags.js
var require_tags = __commonJS({
  "node_modules/yaml/dist/schema/tags.js"(exports) {
    "use strict";
    var map = require_map();
    var _null = require_null();
    var seq = require_seq();
    var string = require_string();
    var bool = require_bool();
    var float = require_float();
    var int = require_int();
    var schema = require_schema();
    var schema$1 = require_schema2();
    var binary = require_binary();
    var merge = require_merge();
    var omap = require_omap();
    var pairs = require_pairs();
    var schema$2 = require_schema3();
    var set = require_set();
    var timestamp = require_timestamp();
    var schemas = /* @__PURE__ */ new Map([
      ["core", schema.schema],
      ["failsafe", [map.map, seq.seq, string.string]],
      ["json", schema$1.schema],
      ["yaml11", schema$2.schema],
      ["yaml-1.1", schema$2.schema]
    ]);
    var tagsByName = {
      binary: binary.binary,
      bool: bool.boolTag,
      float: float.float,
      floatExp: float.floatExp,
      floatNaN: float.floatNaN,
      floatTime: timestamp.floatTime,
      int: int.int,
      intHex: int.intHex,
      intOct: int.intOct,
      intTime: timestamp.intTime,
      map: map.map,
      merge: merge.merge,
      null: _null.nullTag,
      omap: omap.omap,
      pairs: pairs.pairs,
      seq: seq.seq,
      set: set.set,
      timestamp: timestamp.timestamp
    };
    var coreKnownTags = {
      "tag:yaml.org,2002:binary": binary.binary,
      "tag:yaml.org,2002:merge": merge.merge,
      "tag:yaml.org,2002:omap": omap.omap,
      "tag:yaml.org,2002:pairs": pairs.pairs,
      "tag:yaml.org,2002:set": set.set,
      "tag:yaml.org,2002:timestamp": timestamp.timestamp
    };
    function getTags(customTags, schemaName, addMergeTag) {
      const schemaTags = schemas.get(schemaName);
      if (schemaTags && !customTags) {
        return addMergeTag && !schemaTags.includes(merge.merge) ? schemaTags.concat(merge.merge) : schemaTags.slice();
      }
      let tags = schemaTags;
      if (!tags) {
        if (Array.isArray(customTags))
          tags = [];
        else {
          const keys = Array.from(schemas.keys()).filter((key) => key !== "yaml11").map((key) => JSON.stringify(key)).join(", ");
          throw new Error(`Unknown schema "${schemaName}"; use one of ${keys} or define customTags array`);
        }
      }
      if (Array.isArray(customTags)) {
        for (const tag of customTags)
          tags = tags.concat(tag);
      } else if (typeof customTags === "function") {
        tags = customTags(tags.slice());
      }
      if (addMergeTag)
        tags = tags.concat(merge.merge);
      return tags.reduce((tags2, tag) => {
        const tagObj = typeof tag === "string" ? tagsByName[tag] : tag;
        if (!tagObj) {
          const tagName = JSON.stringify(tag);
          const keys = Object.keys(tagsByName).map((key) => JSON.stringify(key)).join(", ");
          throw new Error(`Unknown custom tag ${tagName}; use one of ${keys}`);
        }
        if (!tags2.includes(tagObj))
          tags2.push(tagObj);
        return tags2;
      }, []);
    }
    exports.coreKnownTags = coreKnownTags;
    exports.getTags = getTags;
  }
});

// node_modules/yaml/dist/schema/Schema.js
var require_Schema = __commonJS({
  "node_modules/yaml/dist/schema/Schema.js"(exports) {
    "use strict";
    var identity = require_identity();
    var map = require_map();
    var seq = require_seq();
    var string = require_string();
    var tags = require_tags();
    var sortMapEntriesByKey = (a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
    var Schema = class _Schema {
      constructor({ compat, customTags, merge, resolveKnownTags, schema, sortMapEntries, toStringDefaults }) {
        this.compat = Array.isArray(compat) ? tags.getTags(compat, "compat") : compat ? tags.getTags(null, compat) : null;
        this.name = typeof schema === "string" && schema || "core";
        this.knownTags = resolveKnownTags ? tags.coreKnownTags : {};
        this.tags = tags.getTags(customTags, this.name, merge);
        this.toStringOptions = toStringDefaults ?? null;
        Object.defineProperty(this, identity.MAP, { value: map.map });
        Object.defineProperty(this, identity.SCALAR, { value: string.string });
        Object.defineProperty(this, identity.SEQ, { value: seq.seq });
        this.sortMapEntries = typeof sortMapEntries === "function" ? sortMapEntries : sortMapEntries === true ? sortMapEntriesByKey : null;
      }
      clone() {
        const copy = Object.create(_Schema.prototype, Object.getOwnPropertyDescriptors(this));
        copy.tags = this.tags.slice();
        return copy;
      }
    };
    exports.Schema = Schema;
  }
});

// node_modules/yaml/dist/stringify/stringifyDocument.js
var require_stringifyDocument = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyDocument.js"(exports) {
    "use strict";
    var identity = require_identity();
    var stringify2 = require_stringify();
    var stringifyComment = require_stringifyComment();
    function stringifyDocument(doc, options) {
      const lines = [];
      let hasDirectives = options.directives === true;
      if (options.directives !== false && doc.directives) {
        const dir = doc.directives.toString(doc);
        if (dir) {
          lines.push(dir);
          hasDirectives = true;
        } else if (doc.directives.docStart)
          hasDirectives = true;
      }
      if (hasDirectives)
        lines.push("---");
      const ctx = stringify2.createStringifyContext(doc, options);
      const { commentString } = ctx.options;
      if (doc.commentBefore) {
        if (lines.length !== 1)
          lines.unshift("");
        const cs = commentString(doc.commentBefore);
        lines.unshift(stringifyComment.indentComment(cs, ""));
      }
      let chompKeep = false;
      let contentComment = null;
      if (doc.contents) {
        if (identity.isNode(doc.contents)) {
          if (doc.contents.spaceBefore && hasDirectives)
            lines.push("");
          if (doc.contents.commentBefore) {
            const cs = commentString(doc.contents.commentBefore);
            lines.push(stringifyComment.indentComment(cs, ""));
          }
          ctx.forceBlockIndent = !!doc.comment;
          contentComment = doc.contents.comment;
        }
        const onChompKeep = contentComment ? void 0 : () => chompKeep = true;
        let body = stringify2.stringify(doc.contents, ctx, () => contentComment = null, onChompKeep);
        if (contentComment)
          body += stringifyComment.lineComment(body, "", commentString(contentComment));
        if ((body[0] === "|" || body[0] === ">") && lines[lines.length - 1] === "---") {
          lines[lines.length - 1] = `--- ${body}`;
        } else
          lines.push(body);
      } else {
        lines.push(stringify2.stringify(doc.contents, ctx));
      }
      if (doc.directives?.docEnd) {
        if (doc.comment) {
          const cs = commentString(doc.comment);
          if (cs.includes("\n")) {
            lines.push("...");
            lines.push(stringifyComment.indentComment(cs, ""));
          } else {
            lines.push(`... ${cs}`);
          }
        } else {
          lines.push("...");
        }
      } else {
        let dc = doc.comment;
        if (dc && chompKeep)
          dc = dc.replace(/^\n+/, "");
        if (dc) {
          if ((!chompKeep || contentComment) && lines[lines.length - 1] !== "")
            lines.push("");
          lines.push(stringifyComment.indentComment(commentString(dc), ""));
        }
      }
      return lines.join("\n") + "\n";
    }
    exports.stringifyDocument = stringifyDocument;
  }
});

// node_modules/yaml/dist/doc/Document.js
var require_Document = __commonJS({
  "node_modules/yaml/dist/doc/Document.js"(exports) {
    "use strict";
    var Alias = require_Alias();
    var Collection = require_Collection();
    var identity = require_identity();
    var Pair = require_Pair();
    var toJS = require_toJS();
    var Schema = require_Schema();
    var stringifyDocument = require_stringifyDocument();
    var anchors = require_anchors();
    var applyReviver = require_applyReviver();
    var createNode = require_createNode();
    var directives = require_directives();
    var Document = class _Document {
      constructor(value, replacer, options) {
        this.commentBefore = null;
        this.comment = null;
        this.errors = [];
        this.warnings = [];
        Object.defineProperty(this, identity.NODE_TYPE, { value: identity.DOC });
        let _replacer = null;
        if (typeof replacer === "function" || Array.isArray(replacer)) {
          _replacer = replacer;
        } else if (options === void 0 && replacer) {
          options = replacer;
          replacer = void 0;
        }
        const opt = Object.assign({
          intAsBigInt: false,
          keepSourceTokens: false,
          logLevel: "warn",
          prettyErrors: true,
          strict: true,
          stringKeys: false,
          uniqueKeys: true,
          version: "1.2"
        }, options);
        this.options = opt;
        let { version } = opt;
        if (options?._directives) {
          this.directives = options._directives.atDocument();
          if (this.directives.yaml.explicit)
            version = this.directives.yaml.version;
        } else
          this.directives = new directives.Directives({ version });
        this.setSchema(version, options);
        this.contents = value === void 0 ? null : this.createNode(value, _replacer, options);
      }
      /**
       * Create a deep copy of this Document and its contents.
       *
       * Custom Node values that inherit from `Object` still refer to their original instances.
       */
      clone() {
        const copy = Object.create(_Document.prototype, {
          [identity.NODE_TYPE]: { value: identity.DOC }
        });
        copy.commentBefore = this.commentBefore;
        copy.comment = this.comment;
        copy.errors = this.errors.slice();
        copy.warnings = this.warnings.slice();
        copy.options = Object.assign({}, this.options);
        if (this.directives)
          copy.directives = this.directives.clone();
        copy.schema = this.schema.clone();
        copy.contents = identity.isNode(this.contents) ? this.contents.clone(copy.schema) : this.contents;
        if (this.range)
          copy.range = this.range.slice();
        return copy;
      }
      /** Adds a value to the document. */
      add(value) {
        if (assertCollection(this.contents))
          this.contents.add(value);
      }
      /** Adds a value to the document. */
      addIn(path12, value) {
        if (assertCollection(this.contents))
          this.contents.addIn(path12, value);
      }
      /**
       * Create a new `Alias` node, ensuring that the target `node` has the required anchor.
       *
       * If `node` already has an anchor, `name` is ignored.
       * Otherwise, the `node.anchor` value will be set to `name`,
       * or if an anchor with that name is already present in the document,
       * `name` will be used as a prefix for a new unique anchor.
       * If `name` is undefined, the generated anchor will use 'a' as a prefix.
       */
      createAlias(node, name) {
        if (!node.anchor) {
          const prev = anchors.anchorNames(this);
          node.anchor = // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          !name || prev.has(name) ? anchors.findNewAnchor(name || "a", prev) : name;
        }
        return new Alias.Alias(node.anchor);
      }
      createNode(value, replacer, options) {
        let _replacer = void 0;
        if (typeof replacer === "function") {
          value = replacer.call({ "": value }, "", value);
          _replacer = replacer;
        } else if (Array.isArray(replacer)) {
          const keyToStr = (v) => typeof v === "number" || v instanceof String || v instanceof Number;
          const asStr = replacer.filter(keyToStr).map(String);
          if (asStr.length > 0)
            replacer = replacer.concat(asStr);
          _replacer = replacer;
        } else if (options === void 0 && replacer) {
          options = replacer;
          replacer = void 0;
        }
        const { aliasDuplicateObjects, anchorPrefix, flow, keepUndefined, onTagObj, tag } = options ?? {};
        const { onAnchor, setAnchors, sourceObjects } = anchors.createNodeAnchors(
          this,
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          anchorPrefix || "a"
        );
        const ctx = {
          aliasDuplicateObjects: aliasDuplicateObjects ?? true,
          keepUndefined: keepUndefined ?? false,
          onAnchor,
          onTagObj,
          replacer: _replacer,
          schema: this.schema,
          sourceObjects
        };
        const node = createNode.createNode(value, tag, ctx);
        if (flow && identity.isCollection(node))
          node.flow = true;
        setAnchors();
        return node;
      }
      /**
       * Convert a key and a value into a `Pair` using the current schema,
       * recursively wrapping all values as `Scalar` or `Collection` nodes.
       */
      createPair(key, value, options = {}) {
        const k = this.createNode(key, null, options);
        const v = this.createNode(value, null, options);
        return new Pair.Pair(k, v);
      }
      /**
       * Removes a value from the document.
       * @returns `true` if the item was found and removed.
       */
      delete(key) {
        return assertCollection(this.contents) ? this.contents.delete(key) : false;
      }
      /**
       * Removes a value from the document.
       * @returns `true` if the item was found and removed.
       */
      deleteIn(path12) {
        if (Collection.isEmptyPath(path12)) {
          if (this.contents == null)
            return false;
          this.contents = null;
          return true;
        }
        return assertCollection(this.contents) ? this.contents.deleteIn(path12) : false;
      }
      /**
       * Returns item at `key`, or `undefined` if not found. By default unwraps
       * scalar values from their surrounding node; to disable set `keepScalar` to
       * `true` (collections are always returned intact).
       */
      get(key, keepScalar) {
        return identity.isCollection(this.contents) ? this.contents.get(key, keepScalar) : void 0;
      }
      /**
       * Returns item at `path`, or `undefined` if not found. By default unwraps
       * scalar values from their surrounding node; to disable set `keepScalar` to
       * `true` (collections are always returned intact).
       */
      getIn(path12, keepScalar) {
        if (Collection.isEmptyPath(path12))
          return !keepScalar && identity.isScalar(this.contents) ? this.contents.value : this.contents;
        return identity.isCollection(this.contents) ? this.contents.getIn(path12, keepScalar) : void 0;
      }
      /**
       * Checks if the document includes a value with the key `key`.
       */
      has(key) {
        return identity.isCollection(this.contents) ? this.contents.has(key) : false;
      }
      /**
       * Checks if the document includes a value at `path`.
       */
      hasIn(path12) {
        if (Collection.isEmptyPath(path12))
          return this.contents !== void 0;
        return identity.isCollection(this.contents) ? this.contents.hasIn(path12) : false;
      }
      /**
       * Sets a value in this document. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       */
      set(key, value) {
        if (this.contents == null) {
          this.contents = Collection.collectionFromPath(this.schema, [key], value);
        } else if (assertCollection(this.contents)) {
          this.contents.set(key, value);
        }
      }
      /**
       * Sets a value in this document. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       */
      setIn(path12, value) {
        if (Collection.isEmptyPath(path12)) {
          this.contents = value;
        } else if (this.contents == null) {
          this.contents = Collection.collectionFromPath(this.schema, Array.from(path12), value);
        } else if (assertCollection(this.contents)) {
          this.contents.setIn(path12, value);
        }
      }
      /**
       * Change the YAML version and schema used by the document.
       * A `null` version disables support for directives, explicit tags, anchors, and aliases.
       * It also requires the `schema` option to be given as a `Schema` instance value.
       *
       * Overrides all previously set schema options.
       */
      setSchema(version, options = {}) {
        if (typeof version === "number")
          version = String(version);
        let opt;
        switch (version) {
          case "1.1":
            if (this.directives)
              this.directives.yaml.version = "1.1";
            else
              this.directives = new directives.Directives({ version: "1.1" });
            opt = { resolveKnownTags: false, schema: "yaml-1.1" };
            break;
          case "1.2":
          case "next":
            if (this.directives)
              this.directives.yaml.version = version;
            else
              this.directives = new directives.Directives({ version });
            opt = { resolveKnownTags: true, schema: "core" };
            break;
          case null:
            if (this.directives)
              delete this.directives;
            opt = null;
            break;
          default: {
            const sv = JSON.stringify(version);
            throw new Error(`Expected '1.1', '1.2' or null as first argument, but found: ${sv}`);
          }
        }
        if (options.schema instanceof Object)
          this.schema = options.schema;
        else if (opt)
          this.schema = new Schema.Schema(Object.assign(opt, options));
        else
          throw new Error(`With a null YAML version, the { schema: Schema } option is required`);
      }
      // json & jsonArg are only used from toJSON()
      toJS({ json, jsonArg, mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
        const ctx = {
          anchors: /* @__PURE__ */ new Map(),
          doc: this,
          keep: !json,
          mapAsMap: mapAsMap === true,
          mapKeyWarned: false,
          maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
        };
        const res = toJS.toJS(this.contents, jsonArg ?? "", ctx);
        if (typeof onAnchor === "function")
          for (const { count, res: res2 } of ctx.anchors.values())
            onAnchor(res2, count);
        return typeof reviver === "function" ? applyReviver.applyReviver(reviver, { "": res }, "", res) : res;
      }
      /**
       * A JSON representation of the document `contents`.
       *
       * @param jsonArg Used by `JSON.stringify` to indicate the array index or
       *   property name.
       */
      toJSON(jsonArg, onAnchor) {
        return this.toJS({ json: true, jsonArg, mapAsMap: false, onAnchor });
      }
      /** A YAML representation of the document. */
      toString(options = {}) {
        if (this.errors.length > 0)
          throw new Error("Document with errors cannot be stringified");
        if ("indent" in options && (!Number.isInteger(options.indent) || Number(options.indent) <= 0)) {
          const s = JSON.stringify(options.indent);
          throw new Error(`"indent" option must be a positive integer, not ${s}`);
        }
        return stringifyDocument.stringifyDocument(this, options);
      }
    };
    function assertCollection(contents) {
      if (identity.isCollection(contents))
        return true;
      throw new Error("Expected a YAML collection as document contents");
    }
    exports.Document = Document;
  }
});

// node_modules/yaml/dist/errors.js
var require_errors = __commonJS({
  "node_modules/yaml/dist/errors.js"(exports) {
    "use strict";
    var YAMLError = class extends Error {
      constructor(name, pos, code, message) {
        super();
        this.name = name;
        this.code = code;
        this.message = message;
        this.pos = pos;
      }
    };
    var YAMLParseError = class extends YAMLError {
      constructor(pos, code, message) {
        super("YAMLParseError", pos, code, message);
      }
    };
    var YAMLWarning = class extends YAMLError {
      constructor(pos, code, message) {
        super("YAMLWarning", pos, code, message);
      }
    };
    var prettifyError = (src, lc) => (error) => {
      if (error.pos[0] === -1)
        return;
      error.linePos = error.pos.map((pos) => lc.linePos(pos));
      const { line, col } = error.linePos[0];
      error.message += ` at line ${line}, column ${col}`;
      let ci = col - 1;
      let lineStr = src.substring(lc.lineStarts[line - 1], lc.lineStarts[line]).replace(/[\n\r]+$/, "");
      if (ci >= 60 && lineStr.length > 80) {
        const trimStart = Math.min(ci - 39, lineStr.length - 79);
        lineStr = "\u2026" + lineStr.substring(trimStart);
        ci -= trimStart - 1;
      }
      if (lineStr.length > 80)
        lineStr = lineStr.substring(0, 79) + "\u2026";
      if (line > 1 && /^ *$/.test(lineStr.substring(0, ci))) {
        let prev = src.substring(lc.lineStarts[line - 2], lc.lineStarts[line - 1]);
        if (prev.length > 80)
          prev = prev.substring(0, 79) + "\u2026\n";
        lineStr = prev + lineStr;
      }
      if (/[^ ]/.test(lineStr)) {
        let count = 1;
        const end = error.linePos[1];
        if (end?.line === line && end.col > col) {
          count = Math.max(1, Math.min(end.col - col, 80 - ci));
        }
        const pointer = " ".repeat(ci) + "^".repeat(count);
        error.message += `:

${lineStr}
${pointer}
`;
      }
    };
    exports.YAMLError = YAMLError;
    exports.YAMLParseError = YAMLParseError;
    exports.YAMLWarning = YAMLWarning;
    exports.prettifyError = prettifyError;
  }
});

// node_modules/yaml/dist/compose/resolve-props.js
var require_resolve_props = __commonJS({
  "node_modules/yaml/dist/compose/resolve-props.js"(exports) {
    "use strict";
    function resolveProps(tokens, { flow, indicator, next, offset, onError, parentIndent, startOnNewline }) {
      let spaceBefore = false;
      let atNewline = startOnNewline;
      let hasSpace = startOnNewline;
      let comment = "";
      let commentSep = "";
      let hasNewline = false;
      let reqSpace = false;
      let tab = null;
      let anchor = null;
      let tag = null;
      let newlineAfterProp = null;
      let comma = null;
      let found = null;
      let start = null;
      for (const token of tokens) {
        if (reqSpace) {
          if (token.type !== "space" && token.type !== "newline" && token.type !== "comma")
            onError(token.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
          reqSpace = false;
        }
        if (tab) {
          if (atNewline && token.type !== "comment" && token.type !== "newline") {
            onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
          }
          tab = null;
        }
        switch (token.type) {
          case "space":
            if (!flow && (indicator !== "doc-start" || next?.type !== "flow-collection") && token.source.includes("	")) {
              tab = token;
            }
            hasSpace = true;
            break;
          case "comment": {
            if (!hasSpace)
              onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
            const cb = token.source.substring(1) || " ";
            if (!comment)
              comment = cb;
            else
              comment += commentSep + cb;
            commentSep = "";
            atNewline = false;
            break;
          }
          case "newline":
            if (atNewline) {
              if (comment)
                comment += token.source;
              else if (!found || indicator !== "seq-item-ind")
                spaceBefore = true;
            } else
              commentSep += token.source;
            atNewline = true;
            hasNewline = true;
            if (anchor || tag)
              newlineAfterProp = token;
            hasSpace = true;
            break;
          case "anchor":
            if (anchor)
              onError(token, "MULTIPLE_ANCHORS", "A node can have at most one anchor");
            if (token.source.endsWith(":"))
              onError(token.offset + token.source.length - 1, "BAD_ALIAS", "Anchor ending in : is ambiguous", true);
            anchor = token;
            start ?? (start = token.offset);
            atNewline = false;
            hasSpace = false;
            reqSpace = true;
            break;
          case "tag": {
            if (tag)
              onError(token, "MULTIPLE_TAGS", "A node can have at most one tag");
            tag = token;
            start ?? (start = token.offset);
            atNewline = false;
            hasSpace = false;
            reqSpace = true;
            break;
          }
          case indicator:
            if (anchor || tag)
              onError(token, "BAD_PROP_ORDER", `Anchors and tags must be after the ${token.source} indicator`);
            if (found)
              onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.source} in ${flow ?? "collection"}`);
            found = token;
            atNewline = indicator === "seq-item-ind" || indicator === "explicit-key-ind";
            hasSpace = false;
            break;
          case "comma":
            if (flow) {
              if (comma)
                onError(token, "UNEXPECTED_TOKEN", `Unexpected , in ${flow}`);
              comma = token;
              atNewline = false;
              hasSpace = false;
              break;
            }
          // else fallthrough
          default:
            onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.type} token`);
            atNewline = false;
            hasSpace = false;
        }
      }
      const last = tokens[tokens.length - 1];
      const end = last ? last.offset + last.source.length : offset;
      if (reqSpace && next && next.type !== "space" && next.type !== "newline" && next.type !== "comma" && (next.type !== "scalar" || next.source !== "")) {
        onError(next.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
      }
      if (tab && (atNewline && tab.indent <= parentIndent || next?.type === "block-map" || next?.type === "block-seq"))
        onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
      return {
        comma,
        found,
        spaceBefore,
        comment,
        hasNewline,
        anchor,
        tag,
        newlineAfterProp,
        end,
        start: start ?? end
      };
    }
    exports.resolveProps = resolveProps;
  }
});

// node_modules/yaml/dist/compose/util-contains-newline.js
var require_util_contains_newline = __commonJS({
  "node_modules/yaml/dist/compose/util-contains-newline.js"(exports) {
    "use strict";
    function containsNewline(key) {
      if (!key)
        return null;
      switch (key.type) {
        case "alias":
        case "scalar":
        case "double-quoted-scalar":
        case "single-quoted-scalar":
          if (key.source.includes("\n"))
            return true;
          if (key.end) {
            for (const st of key.end)
              if (st.type === "newline")
                return true;
          }
          return false;
        case "flow-collection":
          for (const it of key.items) {
            for (const st of it.start)
              if (st.type === "newline")
                return true;
            if (it.sep) {
              for (const st of it.sep)
                if (st.type === "newline")
                  return true;
            }
            if (containsNewline(it.key) || containsNewline(it.value))
              return true;
          }
          return false;
        default:
          return true;
      }
    }
    exports.containsNewline = containsNewline;
  }
});

// node_modules/yaml/dist/compose/util-flow-indent-check.js
var require_util_flow_indent_check = __commonJS({
  "node_modules/yaml/dist/compose/util-flow-indent-check.js"(exports) {
    "use strict";
    var utilContainsNewline = require_util_contains_newline();
    function flowIndentCheck(indent, fc, onError) {
      if (fc?.type === "flow-collection") {
        const end = fc.end[0];
        if (end.indent === indent && (end.source === "]" || end.source === "}") && utilContainsNewline.containsNewline(fc)) {
          const msg = "Flow end indicator should be more indented than parent";
          onError(end, "BAD_INDENT", msg, true);
        }
      }
    }
    exports.flowIndentCheck = flowIndentCheck;
  }
});

// node_modules/yaml/dist/compose/util-map-includes.js
var require_util_map_includes = __commonJS({
  "node_modules/yaml/dist/compose/util-map-includes.js"(exports) {
    "use strict";
    var identity = require_identity();
    function mapIncludes(ctx, items, search) {
      const { uniqueKeys } = ctx.options;
      if (uniqueKeys === false)
        return false;
      const isEqual = typeof uniqueKeys === "function" ? uniqueKeys : (a, b) => a === b || identity.isScalar(a) && identity.isScalar(b) && a.value === b.value;
      return items.some((pair) => isEqual(pair.key, search));
    }
    exports.mapIncludes = mapIncludes;
  }
});

// node_modules/yaml/dist/compose/resolve-block-map.js
var require_resolve_block_map = __commonJS({
  "node_modules/yaml/dist/compose/resolve-block-map.js"(exports) {
    "use strict";
    var Pair = require_Pair();
    var YAMLMap = require_YAMLMap();
    var resolveProps = require_resolve_props();
    var utilContainsNewline = require_util_contains_newline();
    var utilFlowIndentCheck = require_util_flow_indent_check();
    var utilMapIncludes = require_util_map_includes();
    var startColMsg = "All mapping items must start at the same column";
    function resolveBlockMap({ composeNode, composeEmptyNode }, ctx, bm, onError, tag) {
      const NodeClass = tag?.nodeClass ?? YAMLMap.YAMLMap;
      const map = new NodeClass(ctx.schema);
      if (ctx.atRoot)
        ctx.atRoot = false;
      let offset = bm.offset;
      let commentEnd = null;
      for (const collItem of bm.items) {
        const { start, key, sep, value } = collItem;
        const keyProps = resolveProps.resolveProps(start, {
          indicator: "explicit-key-ind",
          next: key ?? sep?.[0],
          offset,
          onError,
          parentIndent: bm.indent,
          startOnNewline: true
        });
        const implicitKey = !keyProps.found;
        if (implicitKey) {
          if (key) {
            if (key.type === "block-seq")
              onError(offset, "BLOCK_AS_IMPLICIT_KEY", "A block sequence may not be used as an implicit map key");
            else if ("indent" in key && key.indent !== bm.indent)
              onError(offset, "BAD_INDENT", startColMsg);
          }
          if (!keyProps.anchor && !keyProps.tag && !sep) {
            commentEnd = keyProps.end;
            if (keyProps.comment) {
              if (map.comment)
                map.comment += "\n" + keyProps.comment;
              else
                map.comment = keyProps.comment;
            }
            continue;
          }
          if (keyProps.newlineAfterProp || utilContainsNewline.containsNewline(key)) {
            onError(key ?? start[start.length - 1], "MULTILINE_IMPLICIT_KEY", "Implicit keys need to be on a single line");
          }
        } else if (keyProps.found?.indent !== bm.indent) {
          onError(offset, "BAD_INDENT", startColMsg);
        }
        ctx.atKey = true;
        const keyStart = keyProps.end;
        const keyNode = key ? composeNode(ctx, key, keyProps, onError) : composeEmptyNode(ctx, keyStart, start, null, keyProps, onError);
        if (ctx.schema.compat)
          utilFlowIndentCheck.flowIndentCheck(bm.indent, key, onError);
        ctx.atKey = false;
        if (utilMapIncludes.mapIncludes(ctx, map.items, keyNode))
          onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
        const valueProps = resolveProps.resolveProps(sep ?? [], {
          indicator: "map-value-ind",
          next: value,
          offset: keyNode.range[2],
          onError,
          parentIndent: bm.indent,
          startOnNewline: !key || key.type === "block-scalar"
        });
        offset = valueProps.end;
        if (valueProps.found) {
          if (implicitKey) {
            if (value?.type === "block-map" && !valueProps.hasNewline)
              onError(offset, "BLOCK_AS_IMPLICIT_KEY", "Nested mappings are not allowed in compact mappings");
            if (ctx.options.strict && keyProps.start < valueProps.found.offset - 1024)
              onError(keyNode.range, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit block mapping key");
          }
          const valueNode = value ? composeNode(ctx, value, valueProps, onError) : composeEmptyNode(ctx, offset, sep, null, valueProps, onError);
          if (ctx.schema.compat)
            utilFlowIndentCheck.flowIndentCheck(bm.indent, value, onError);
          offset = valueNode.range[2];
          const pair = new Pair.Pair(keyNode, valueNode);
          if (ctx.options.keepSourceTokens)
            pair.srcToken = collItem;
          map.items.push(pair);
        } else {
          if (implicitKey)
            onError(keyNode.range, "MISSING_CHAR", "Implicit map keys need to be followed by map values");
          if (valueProps.comment) {
            if (keyNode.comment)
              keyNode.comment += "\n" + valueProps.comment;
            else
              keyNode.comment = valueProps.comment;
          }
          const pair = new Pair.Pair(keyNode);
          if (ctx.options.keepSourceTokens)
            pair.srcToken = collItem;
          map.items.push(pair);
        }
      }
      if (commentEnd && commentEnd < offset)
        onError(commentEnd, "IMPOSSIBLE", "Map comment with trailing content");
      map.range = [bm.offset, offset, commentEnd ?? offset];
      return map;
    }
    exports.resolveBlockMap = resolveBlockMap;
  }
});

// node_modules/yaml/dist/compose/resolve-block-seq.js
var require_resolve_block_seq = __commonJS({
  "node_modules/yaml/dist/compose/resolve-block-seq.js"(exports) {
    "use strict";
    var YAMLSeq = require_YAMLSeq();
    var resolveProps = require_resolve_props();
    var utilFlowIndentCheck = require_util_flow_indent_check();
    function resolveBlockSeq({ composeNode, composeEmptyNode }, ctx, bs, onError, tag) {
      const NodeClass = tag?.nodeClass ?? YAMLSeq.YAMLSeq;
      const seq = new NodeClass(ctx.schema);
      if (ctx.atRoot)
        ctx.atRoot = false;
      if (ctx.atKey)
        ctx.atKey = false;
      let offset = bs.offset;
      let commentEnd = null;
      for (const { start, value } of bs.items) {
        const props = resolveProps.resolveProps(start, {
          indicator: "seq-item-ind",
          next: value,
          offset,
          onError,
          parentIndent: bs.indent,
          startOnNewline: true
        });
        if (!props.found) {
          if (props.anchor || props.tag || value) {
            if (value?.type === "block-seq")
              onError(props.end, "BAD_INDENT", "All sequence items must start at the same column");
            else
              onError(offset, "MISSING_CHAR", "Sequence item without - indicator");
          } else {
            commentEnd = props.end;
            if (props.comment)
              seq.comment = props.comment;
            continue;
          }
        }
        const node = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, start, null, props, onError);
        if (ctx.schema.compat)
          utilFlowIndentCheck.flowIndentCheck(bs.indent, value, onError);
        offset = node.range[2];
        seq.items.push(node);
      }
      seq.range = [bs.offset, offset, commentEnd ?? offset];
      return seq;
    }
    exports.resolveBlockSeq = resolveBlockSeq;
  }
});

// node_modules/yaml/dist/compose/resolve-end.js
var require_resolve_end = __commonJS({
  "node_modules/yaml/dist/compose/resolve-end.js"(exports) {
    "use strict";
    function resolveEnd(end, offset, reqSpace, onError) {
      let comment = "";
      if (end) {
        let hasSpace = false;
        let sep = "";
        for (const token of end) {
          const { source, type } = token;
          switch (type) {
            case "space":
              hasSpace = true;
              break;
            case "comment": {
              if (reqSpace && !hasSpace)
                onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
              const cb = source.substring(1) || " ";
              if (!comment)
                comment = cb;
              else
                comment += sep + cb;
              sep = "";
              break;
            }
            case "newline":
              if (comment)
                sep += source;
              hasSpace = true;
              break;
            default:
              onError(token, "UNEXPECTED_TOKEN", `Unexpected ${type} at node end`);
          }
          offset += source.length;
        }
      }
      return { comment, offset };
    }
    exports.resolveEnd = resolveEnd;
  }
});

// node_modules/yaml/dist/compose/resolve-flow-collection.js
var require_resolve_flow_collection = __commonJS({
  "node_modules/yaml/dist/compose/resolve-flow-collection.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Pair = require_Pair();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var resolveEnd = require_resolve_end();
    var resolveProps = require_resolve_props();
    var utilContainsNewline = require_util_contains_newline();
    var utilMapIncludes = require_util_map_includes();
    var blockMsg = "Block collections are not allowed within flow collections";
    var isBlock = (token) => token && (token.type === "block-map" || token.type === "block-seq");
    function resolveFlowCollection({ composeNode, composeEmptyNode }, ctx, fc, onError, tag) {
      const isMap = fc.start.source === "{";
      const fcName = isMap ? "flow map" : "flow sequence";
      const NodeClass = tag?.nodeClass ?? (isMap ? YAMLMap.YAMLMap : YAMLSeq.YAMLSeq);
      const coll = new NodeClass(ctx.schema);
      coll.flow = true;
      const atRoot = ctx.atRoot;
      if (atRoot)
        ctx.atRoot = false;
      if (ctx.atKey)
        ctx.atKey = false;
      let offset = fc.offset + fc.start.source.length;
      for (let i = 0; i < fc.items.length; ++i) {
        const collItem = fc.items[i];
        const { start, key, sep, value } = collItem;
        const props = resolveProps.resolveProps(start, {
          flow: fcName,
          indicator: "explicit-key-ind",
          next: key ?? sep?.[0],
          offset,
          onError,
          parentIndent: fc.indent,
          startOnNewline: false
        });
        if (!props.found) {
          if (!props.anchor && !props.tag && !sep && !value) {
            if (i === 0 && props.comma)
              onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
            else if (i < fc.items.length - 1)
              onError(props.start, "UNEXPECTED_TOKEN", `Unexpected empty item in ${fcName}`);
            if (props.comment) {
              if (coll.comment)
                coll.comment += "\n" + props.comment;
              else
                coll.comment = props.comment;
            }
            offset = props.end;
            continue;
          }
          if (!isMap && ctx.options.strict && utilContainsNewline.containsNewline(key))
            onError(
              key,
              // checked by containsNewline()
              "MULTILINE_IMPLICIT_KEY",
              "Implicit keys of flow sequence pairs need to be on a single line"
            );
        }
        if (i === 0) {
          if (props.comma)
            onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
        } else {
          if (!props.comma)
            onError(props.start, "MISSING_CHAR", `Missing , between ${fcName} items`);
          if (props.comment) {
            let prevItemComment = "";
            loop: for (const st of start) {
              switch (st.type) {
                case "comma":
                case "space":
                  break;
                case "comment":
                  prevItemComment = st.source.substring(1);
                  break loop;
                default:
                  break loop;
              }
            }
            if (prevItemComment) {
              let prev = coll.items[coll.items.length - 1];
              if (identity.isPair(prev))
                prev = prev.value ?? prev.key;
              if (prev.comment)
                prev.comment += "\n" + prevItemComment;
              else
                prev.comment = prevItemComment;
              props.comment = props.comment.substring(prevItemComment.length + 1);
            }
          }
        }
        if (!isMap && !sep && !props.found) {
          const valueNode = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, sep, null, props, onError);
          coll.items.push(valueNode);
          offset = valueNode.range[2];
          if (isBlock(value))
            onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
        } else {
          ctx.atKey = true;
          const keyStart = props.end;
          const keyNode = key ? composeNode(ctx, key, props, onError) : composeEmptyNode(ctx, keyStart, start, null, props, onError);
          if (isBlock(key))
            onError(keyNode.range, "BLOCK_IN_FLOW", blockMsg);
          ctx.atKey = false;
          const valueProps = resolveProps.resolveProps(sep ?? [], {
            flow: fcName,
            indicator: "map-value-ind",
            next: value,
            offset: keyNode.range[2],
            onError,
            parentIndent: fc.indent,
            startOnNewline: false
          });
          if (valueProps.found) {
            if (!isMap && !props.found && ctx.options.strict) {
              if (sep)
                for (const st of sep) {
                  if (st === valueProps.found)
                    break;
                  if (st.type === "newline") {
                    onError(st, "MULTILINE_IMPLICIT_KEY", "Implicit keys of flow sequence pairs need to be on a single line");
                    break;
                  }
                }
              if (props.start < valueProps.found.offset - 1024)
                onError(valueProps.found, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit flow sequence key");
            }
          } else if (value) {
            if ("source" in value && value.source?.[0] === ":")
              onError(value, "MISSING_CHAR", `Missing space after : in ${fcName}`);
            else
              onError(valueProps.start, "MISSING_CHAR", `Missing , or : between ${fcName} items`);
          }
          const valueNode = value ? composeNode(ctx, value, valueProps, onError) : valueProps.found ? composeEmptyNode(ctx, valueProps.end, sep, null, valueProps, onError) : null;
          if (valueNode) {
            if (isBlock(value))
              onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
          } else if (valueProps.comment) {
            if (keyNode.comment)
              keyNode.comment += "\n" + valueProps.comment;
            else
              keyNode.comment = valueProps.comment;
          }
          const pair = new Pair.Pair(keyNode, valueNode);
          if (ctx.options.keepSourceTokens)
            pair.srcToken = collItem;
          if (isMap) {
            const map = coll;
            if (utilMapIncludes.mapIncludes(ctx, map.items, keyNode))
              onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
            map.items.push(pair);
          } else {
            const map = new YAMLMap.YAMLMap(ctx.schema);
            map.flow = true;
            map.items.push(pair);
            const endRange = (valueNode ?? keyNode).range;
            map.range = [keyNode.range[0], endRange[1], endRange[2]];
            coll.items.push(map);
          }
          offset = valueNode ? valueNode.range[2] : valueProps.end;
        }
      }
      const expectedEnd = isMap ? "}" : "]";
      const [ce, ...ee] = fc.end;
      let cePos = offset;
      if (ce?.source === expectedEnd)
        cePos = ce.offset + ce.source.length;
      else {
        const name = fcName[0].toUpperCase() + fcName.substring(1);
        const msg = atRoot ? `${name} must end with a ${expectedEnd}` : `${name} in block collection must be sufficiently indented and end with a ${expectedEnd}`;
        onError(offset, atRoot ? "MISSING_CHAR" : "BAD_INDENT", msg);
        if (ce && ce.source.length !== 1)
          ee.unshift(ce);
      }
      if (ee.length > 0) {
        const end = resolveEnd.resolveEnd(ee, cePos, ctx.options.strict, onError);
        if (end.comment) {
          if (coll.comment)
            coll.comment += "\n" + end.comment;
          else
            coll.comment = end.comment;
        }
        coll.range = [fc.offset, cePos, end.offset];
      } else {
        coll.range = [fc.offset, cePos, cePos];
      }
      return coll;
    }
    exports.resolveFlowCollection = resolveFlowCollection;
  }
});

// node_modules/yaml/dist/compose/compose-collection.js
var require_compose_collection = __commonJS({
  "node_modules/yaml/dist/compose/compose-collection.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var resolveBlockMap = require_resolve_block_map();
    var resolveBlockSeq = require_resolve_block_seq();
    var resolveFlowCollection = require_resolve_flow_collection();
    function resolveCollection(CN, ctx, token, onError, tagName, tag) {
      const coll = token.type === "block-map" ? resolveBlockMap.resolveBlockMap(CN, ctx, token, onError, tag) : token.type === "block-seq" ? resolveBlockSeq.resolveBlockSeq(CN, ctx, token, onError, tag) : resolveFlowCollection.resolveFlowCollection(CN, ctx, token, onError, tag);
      const Coll = coll.constructor;
      if (tagName === "!" || tagName === Coll.tagName) {
        coll.tag = Coll.tagName;
        return coll;
      }
      if (tagName)
        coll.tag = tagName;
      return coll;
    }
    function composeCollection(CN, ctx, token, props, onError) {
      const tagToken = props.tag;
      const tagName = !tagToken ? null : ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg));
      if (token.type === "block-seq") {
        const { anchor, newlineAfterProp: nl } = props;
        const lastProp = anchor && tagToken ? anchor.offset > tagToken.offset ? anchor : tagToken : anchor ?? tagToken;
        if (lastProp && (!nl || nl.offset < lastProp.offset)) {
          const message = "Missing newline after block sequence props";
          onError(lastProp, "MISSING_CHAR", message);
        }
      }
      const expType = token.type === "block-map" ? "map" : token.type === "block-seq" ? "seq" : token.start.source === "{" ? "map" : "seq";
      if (!tagToken || !tagName || tagName === "!" || tagName === YAMLMap.YAMLMap.tagName && expType === "map" || tagName === YAMLSeq.YAMLSeq.tagName && expType === "seq") {
        return resolveCollection(CN, ctx, token, onError, tagName);
      }
      let tag = ctx.schema.tags.find((t) => t.tag === tagName && t.collection === expType);
      if (!tag) {
        const kt = ctx.schema.knownTags[tagName];
        if (kt?.collection === expType) {
          ctx.schema.tags.push(Object.assign({}, kt, { default: false }));
          tag = kt;
        } else {
          if (kt) {
            onError(tagToken, "BAD_COLLECTION_TYPE", `${kt.tag} used for ${expType} collection, but expects ${kt.collection ?? "scalar"}`, true);
          } else {
            onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, true);
          }
          return resolveCollection(CN, ctx, token, onError, tagName);
        }
      }
      const coll = resolveCollection(CN, ctx, token, onError, tagName, tag);
      const res = tag.resolve?.(coll, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg), ctx.options) ?? coll;
      const node = identity.isNode(res) ? res : new Scalar.Scalar(res);
      node.range = coll.range;
      node.tag = tagName;
      if (tag?.format)
        node.format = tag.format;
      return node;
    }
    exports.composeCollection = composeCollection;
  }
});

// node_modules/yaml/dist/compose/resolve-block-scalar.js
var require_resolve_block_scalar = __commonJS({
  "node_modules/yaml/dist/compose/resolve-block-scalar.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    function resolveBlockScalar(ctx, scalar, onError) {
      const start = scalar.offset;
      const header = parseBlockScalarHeader(scalar, ctx.options.strict, onError);
      if (!header)
        return { value: "", type: null, comment: "", range: [start, start, start] };
      const type = header.mode === ">" ? Scalar.Scalar.BLOCK_FOLDED : Scalar.Scalar.BLOCK_LITERAL;
      const lines = scalar.source ? splitLines(scalar.source) : [];
      let chompStart = lines.length;
      for (let i = lines.length - 1; i >= 0; --i) {
        const content = lines[i][1];
        if (content === "" || content === "\r")
          chompStart = i;
        else
          break;
      }
      if (chompStart === 0) {
        const value2 = header.chomp === "+" && lines.length > 0 ? "\n".repeat(Math.max(1, lines.length - 1)) : "";
        let end2 = start + header.length;
        if (scalar.source)
          end2 += scalar.source.length;
        return { value: value2, type, comment: header.comment, range: [start, end2, end2] };
      }
      let trimIndent = scalar.indent + header.indent;
      let offset = scalar.offset + header.length;
      let contentStart = 0;
      for (let i = 0; i < chompStart; ++i) {
        const [indent, content] = lines[i];
        if (content === "" || content === "\r") {
          if (header.indent === 0 && indent.length > trimIndent)
            trimIndent = indent.length;
        } else {
          if (indent.length < trimIndent) {
            const message = "Block scalars with more-indented leading empty lines must use an explicit indentation indicator";
            onError(offset + indent.length, "MISSING_CHAR", message);
          }
          if (header.indent === 0)
            trimIndent = indent.length;
          contentStart = i;
          if (trimIndent === 0 && !ctx.atRoot) {
            const message = "Block scalar values in collections must be indented";
            onError(offset, "BAD_INDENT", message);
          }
          break;
        }
        offset += indent.length + content.length + 1;
      }
      for (let i = lines.length - 1; i >= chompStart; --i) {
        if (lines[i][0].length > trimIndent)
          chompStart = i + 1;
      }
      let value = "";
      let sep = "";
      let prevMoreIndented = false;
      for (let i = 0; i < contentStart; ++i)
        value += lines[i][0].slice(trimIndent) + "\n";
      for (let i = contentStart; i < chompStart; ++i) {
        let [indent, content] = lines[i];
        offset += indent.length + content.length + 1;
        const crlf = content[content.length - 1] === "\r";
        if (crlf)
          content = content.slice(0, -1);
        if (content && indent.length < trimIndent) {
          const src = header.indent ? "explicit indentation indicator" : "first line";
          const message = `Block scalar lines must not be less indented than their ${src}`;
          onError(offset - content.length - (crlf ? 2 : 1), "BAD_INDENT", message);
          indent = "";
        }
        if (type === Scalar.Scalar.BLOCK_LITERAL) {
          value += sep + indent.slice(trimIndent) + content;
          sep = "\n";
        } else if (indent.length > trimIndent || content[0] === "	") {
          if (sep === " ")
            sep = "\n";
          else if (!prevMoreIndented && sep === "\n")
            sep = "\n\n";
          value += sep + indent.slice(trimIndent) + content;
          sep = "\n";
          prevMoreIndented = true;
        } else if (content === "") {
          if (sep === "\n")
            value += "\n";
          else
            sep = "\n";
        } else {
          value += sep + content;
          sep = " ";
          prevMoreIndented = false;
        }
      }
      switch (header.chomp) {
        case "-":
          break;
        case "+":
          for (let i = chompStart; i < lines.length; ++i)
            value += "\n" + lines[i][0].slice(trimIndent);
          if (value[value.length - 1] !== "\n")
            value += "\n";
          break;
        default:
          value += "\n";
      }
      const end = start + header.length + scalar.source.length;
      return { value, type, comment: header.comment, range: [start, end, end] };
    }
    function parseBlockScalarHeader({ offset, props }, strict, onError) {
      if (props[0].type !== "block-scalar-header") {
        onError(props[0], "IMPOSSIBLE", "Block scalar header not found");
        return null;
      }
      const { source } = props[0];
      const mode = source[0];
      let indent = 0;
      let chomp = "";
      let error = -1;
      for (let i = 1; i < source.length; ++i) {
        const ch = source[i];
        if (!chomp && (ch === "-" || ch === "+"))
          chomp = ch;
        else {
          const n = Number(ch);
          if (!indent && n)
            indent = n;
          else if (error === -1)
            error = offset + i;
        }
      }
      if (error !== -1)
        onError(error, "UNEXPECTED_TOKEN", `Block scalar header includes extra characters: ${source}`);
      let hasSpace = false;
      let comment = "";
      let length = source.length;
      for (let i = 1; i < props.length; ++i) {
        const token = props[i];
        switch (token.type) {
          case "space":
            hasSpace = true;
          // fallthrough
          case "newline":
            length += token.source.length;
            break;
          case "comment":
            if (strict && !hasSpace) {
              const message = "Comments must be separated from other tokens by white space characters";
              onError(token, "MISSING_CHAR", message);
            }
            length += token.source.length;
            comment = token.source.substring(1);
            break;
          case "error":
            onError(token, "UNEXPECTED_TOKEN", token.message);
            length += token.source.length;
            break;
          /* istanbul ignore next should not happen */
          default: {
            const message = `Unexpected token in block scalar header: ${token.type}`;
            onError(token, "UNEXPECTED_TOKEN", message);
            const ts = token.source;
            if (ts && typeof ts === "string")
              length += ts.length;
          }
        }
      }
      return { mode, indent, chomp, comment, length };
    }
    function splitLines(source) {
      const split = source.split(/\n( *)/);
      const first = split[0];
      const m = first.match(/^( *)/);
      const line0 = m?.[1] ? [m[1], first.slice(m[1].length)] : ["", first];
      const lines = [line0];
      for (let i = 1; i < split.length; i += 2)
        lines.push([split[i], split[i + 1]]);
      return lines;
    }
    exports.resolveBlockScalar = resolveBlockScalar;
  }
});

// node_modules/yaml/dist/compose/resolve-flow-scalar.js
var require_resolve_flow_scalar = __commonJS({
  "node_modules/yaml/dist/compose/resolve-flow-scalar.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var resolveEnd = require_resolve_end();
    function resolveFlowScalar(scalar, strict, onError) {
      const { offset, type, source, end } = scalar;
      let _type;
      let value;
      const _onError = (rel, code, msg) => onError(offset + rel, code, msg);
      switch (type) {
        case "scalar":
          _type = Scalar.Scalar.PLAIN;
          value = plainValue(source, _onError);
          break;
        case "single-quoted-scalar":
          _type = Scalar.Scalar.QUOTE_SINGLE;
          value = singleQuotedValue(source, _onError);
          break;
        case "double-quoted-scalar":
          _type = Scalar.Scalar.QUOTE_DOUBLE;
          value = doubleQuotedValue(source, _onError);
          break;
        /* istanbul ignore next should not happen */
        default:
          onError(scalar, "UNEXPECTED_TOKEN", `Expected a flow scalar value, but found: ${type}`);
          return {
            value: "",
            type: null,
            comment: "",
            range: [offset, offset + source.length, offset + source.length]
          };
      }
      const valueEnd = offset + source.length;
      const re = resolveEnd.resolveEnd(end, valueEnd, strict, onError);
      return {
        value,
        type: _type,
        comment: re.comment,
        range: [offset, valueEnd, re.offset]
      };
    }
    function plainValue(source, onError) {
      let badChar = "";
      switch (source[0]) {
        /* istanbul ignore next should not happen */
        case "	":
          badChar = "a tab character";
          break;
        case ",":
          badChar = "flow indicator character ,";
          break;
        case "%":
          badChar = "directive indicator character %";
          break;
        case "|":
        case ">": {
          badChar = `block scalar indicator ${source[0]}`;
          break;
        }
        case "@":
        case "`": {
          badChar = `reserved character ${source[0]}`;
          break;
        }
      }
      if (badChar)
        onError(0, "BAD_SCALAR_START", `Plain value cannot start with ${badChar}`);
      return unfoldLines(source);
    }
    function singleQuotedValue(source, onError) {
      if (source[source.length - 1] !== "'" || source.length === 1)
        onError(source.length, "MISSING_CHAR", "Missing closing 'quote");
      return unfoldLines(source.slice(1, -1)).replace(/''/g, "'");
    }
    function unfoldLines(source) {
      const line = /(.*?)\r?\n/sy;
      let match = line.exec(source);
      if (!match)
        return source;
      let trimEnd, trimBoth;
      try {
        trimEnd = new RegExp("(?<![ 	])[ 	]+$");
        trimBoth = new RegExp("^[ 	]+|(?<![ 	])[ 	]+$", "g");
      } catch {
        trimEnd = /[ \t]+$/;
        trimBoth = /^[ \t]+|[ \t]+$/g;
      }
      let res = match[1].replace(trimEnd, "");
      let sep = " ";
      let pos = line.lastIndex;
      while (match = line.exec(source)) {
        const lm = match[1].replace(trimBoth, "");
        if (lm === "") {
          if (sep === "\n")
            res += sep;
          else
            sep = "\n";
        } else {
          res += sep + lm;
          sep = " ";
        }
        pos = line.lastIndex;
      }
      const last = /[ \t]*(.*)/sy;
      last.lastIndex = pos;
      match = last.exec(source);
      return res + sep + (match?.[1] ?? "");
    }
    function doubleQuotedValue(source, onError) {
      let res = "";
      for (let i = 1; i < source.length - 1; ++i) {
        const ch = source[i];
        if (ch === "\r" && source[i + 1] === "\n")
          continue;
        if (ch === "\n") {
          const { fold, offset } = foldNewline(source, i);
          res += fold;
          i = offset;
        } else if (ch === "\\") {
          let next = source[++i];
          const cc = escapeCodes[next];
          if (cc)
            res += cc;
          else if (next === "\n") {
            next = source[i + 1];
            while (next === " " || next === "	")
              next = source[++i + 1];
          } else if (next === "\r" && source[i + 1] === "\n") {
            next = source[++i + 1];
            while (next === " " || next === "	")
              next = source[++i + 1];
          } else if (next === "x" || next === "u" || next === "U") {
            const length = next === "x" ? 2 : next === "u" ? 4 : 8;
            res += parseCharCode(source, i + 1, length, onError);
            i += length;
          } else {
            const raw = source.substr(i - 1, 2);
            onError(i - 1, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
            res += raw;
          }
        } else if (ch === " " || ch === "	") {
          const wsStart = i;
          let next = source[i + 1];
          while (next === " " || next === "	")
            next = source[++i + 1];
          if (next !== "\n" && !(next === "\r" && source[i + 2] === "\n"))
            res += i > wsStart ? source.slice(wsStart, i + 1) : ch;
        } else {
          res += ch;
        }
      }
      if (source[source.length - 1] !== '"' || source.length === 1)
        onError(source.length, "MISSING_CHAR", 'Missing closing "quote');
      return res;
    }
    function foldNewline(source, offset) {
      let fold = "";
      let ch = source[offset + 1];
      while (ch === " " || ch === "	" || ch === "\n" || ch === "\r") {
        if (ch === "\r" && source[offset + 2] !== "\n")
          break;
        if (ch === "\n")
          fold += "\n";
        offset += 1;
        ch = source[offset + 1];
      }
      if (!fold)
        fold = " ";
      return { fold, offset };
    }
    var escapeCodes = {
      "0": "\0",
      // null character
      a: "\x07",
      // bell character
      b: "\b",
      // backspace
      e: "\x1B",
      // escape character
      f: "\f",
      // form feed
      n: "\n",
      // line feed
      r: "\r",
      // carriage return
      t: "	",
      // horizontal tab
      v: "\v",
      // vertical tab
      N: "\x85",
      // Unicode next line
      _: "\xA0",
      // Unicode non-breaking space
      L: "\u2028",
      // Unicode line separator
      P: "\u2029",
      // Unicode paragraph separator
      " ": " ",
      '"': '"',
      "/": "/",
      "\\": "\\",
      "	": "	"
    };
    function parseCharCode(source, offset, length, onError) {
      const cc = source.substr(offset, length);
      const ok = cc.length === length && /^[0-9a-fA-F]+$/.test(cc);
      const code = ok ? parseInt(cc, 16) : NaN;
      try {
        return String.fromCodePoint(code);
      } catch {
        const raw = source.substr(offset - 2, length + 2);
        onError(offset - 2, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
        return raw;
      }
    }
    exports.resolveFlowScalar = resolveFlowScalar;
  }
});

// node_modules/yaml/dist/compose/compose-scalar.js
var require_compose_scalar = __commonJS({
  "node_modules/yaml/dist/compose/compose-scalar.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var resolveBlockScalar = require_resolve_block_scalar();
    var resolveFlowScalar = require_resolve_flow_scalar();
    function composeScalar(ctx, token, tagToken, onError) {
      const { value, type, comment, range } = token.type === "block-scalar" ? resolveBlockScalar.resolveBlockScalar(ctx, token, onError) : resolveFlowScalar.resolveFlowScalar(token, ctx.options.strict, onError);
      const tagName = tagToken ? ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg)) : null;
      let tag;
      if (ctx.options.stringKeys && ctx.atKey) {
        tag = ctx.schema[identity.SCALAR];
      } else if (tagName)
        tag = findScalarTagByName(ctx.schema, value, tagName, tagToken, onError);
      else if (token.type === "scalar")
        tag = findScalarTagByTest(ctx, value, token, onError);
      else
        tag = ctx.schema[identity.SCALAR];
      let scalar;
      try {
        const res = tag.resolve(value, (msg) => onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg), ctx.options);
        scalar = identity.isScalar(res) ? res : new Scalar.Scalar(res);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg);
        scalar = new Scalar.Scalar(value);
      }
      scalar.range = range;
      scalar.source = value;
      if (type)
        scalar.type = type;
      if (tagName)
        scalar.tag = tagName;
      if (tag.format)
        scalar.format = tag.format;
      if (comment)
        scalar.comment = comment;
      return scalar;
    }
    function findScalarTagByName(schema, value, tagName, tagToken, onError) {
      if (tagName === "!")
        return schema[identity.SCALAR];
      const matchWithTest = [];
      for (const tag of schema.tags) {
        if (!tag.collection && tag.tag === tagName) {
          if (tag.default && tag.test)
            matchWithTest.push(tag);
          else
            return tag;
        }
      }
      for (const tag of matchWithTest)
        if (tag.test?.test(value))
          return tag;
      const kt = schema.knownTags[tagName];
      if (kt && !kt.collection) {
        schema.tags.push(Object.assign({}, kt, { default: false, test: void 0 }));
        return kt;
      }
      onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, tagName !== "tag:yaml.org,2002:str");
      return schema[identity.SCALAR];
    }
    function findScalarTagByTest({ atKey, directives, schema }, value, token, onError) {
      const tag = schema.tags.find((tag2) => (tag2.default === true || atKey && tag2.default === "key") && tag2.test?.test(value)) || schema[identity.SCALAR];
      if (schema.compat) {
        const compat = schema.compat.find((tag2) => tag2.default && tag2.test?.test(value)) ?? schema[identity.SCALAR];
        if (tag.tag !== compat.tag) {
          const ts = directives.tagString(tag.tag);
          const cs = directives.tagString(compat.tag);
          const msg = `Value may be parsed as either ${ts} or ${cs}`;
          onError(token, "TAG_RESOLVE_FAILED", msg, true);
        }
      }
      return tag;
    }
    exports.composeScalar = composeScalar;
  }
});

// node_modules/yaml/dist/compose/util-empty-scalar-position.js
var require_util_empty_scalar_position = __commonJS({
  "node_modules/yaml/dist/compose/util-empty-scalar-position.js"(exports) {
    "use strict";
    function emptyScalarPosition(offset, before, pos) {
      if (before) {
        pos ?? (pos = before.length);
        for (let i = pos - 1; i >= 0; --i) {
          let st = before[i];
          switch (st.type) {
            case "space":
            case "comment":
            case "newline":
              offset -= st.source.length;
              continue;
          }
          st = before[++i];
          while (st?.type === "space") {
            offset += st.source.length;
            st = before[++i];
          }
          break;
        }
      }
      return offset;
    }
    exports.emptyScalarPosition = emptyScalarPosition;
  }
});

// node_modules/yaml/dist/compose/compose-node.js
var require_compose_node = __commonJS({
  "node_modules/yaml/dist/compose/compose-node.js"(exports) {
    "use strict";
    var Alias = require_Alias();
    var identity = require_identity();
    var composeCollection = require_compose_collection();
    var composeScalar = require_compose_scalar();
    var resolveEnd = require_resolve_end();
    var utilEmptyScalarPosition = require_util_empty_scalar_position();
    var CN = { composeNode, composeEmptyNode };
    function composeNode(ctx, token, props, onError) {
      const atKey = ctx.atKey;
      const { spaceBefore, comment, anchor, tag } = props;
      let node;
      let isSrcToken = true;
      switch (token.type) {
        case "alias":
          node = composeAlias(ctx, token, onError);
          if (anchor || tag)
            onError(token, "ALIAS_PROPS", "An alias node must not specify any properties");
          break;
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
        case "block-scalar":
          node = composeScalar.composeScalar(ctx, token, tag, onError);
          if (anchor)
            node.anchor = anchor.source.substring(1);
          break;
        case "block-map":
        case "block-seq":
        case "flow-collection":
          try {
            node = composeCollection.composeCollection(CN, ctx, token, props, onError);
            if (anchor)
              node.anchor = anchor.source.substring(1);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            onError(token, "RESOURCE_EXHAUSTION", message);
          }
          break;
        default: {
          const message = token.type === "error" ? token.message : `Unsupported token (type: ${token.type})`;
          onError(token, "UNEXPECTED_TOKEN", message);
          isSrcToken = false;
        }
      }
      node ?? (node = composeEmptyNode(ctx, token.offset, void 0, null, props, onError));
      if (anchor && node.anchor === "")
        onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
      if (atKey && ctx.options.stringKeys && (!identity.isScalar(node) || typeof node.value !== "string" || node.tag && node.tag !== "tag:yaml.org,2002:str")) {
        const msg = "With stringKeys, all keys must be strings";
        onError(tag ?? token, "NON_STRING_KEY", msg);
      }
      if (spaceBefore)
        node.spaceBefore = true;
      if (comment) {
        if (token.type === "scalar" && token.source === "")
          node.comment = comment;
        else
          node.commentBefore = comment;
      }
      if (ctx.options.keepSourceTokens && isSrcToken)
        node.srcToken = token;
      return node;
    }
    function composeEmptyNode(ctx, offset, before, pos, { spaceBefore, comment, anchor, tag, end }, onError) {
      const token = {
        type: "scalar",
        offset: utilEmptyScalarPosition.emptyScalarPosition(offset, before, pos),
        indent: -1,
        source: ""
      };
      const node = composeScalar.composeScalar(ctx, token, tag, onError);
      if (anchor) {
        node.anchor = anchor.source.substring(1);
        if (node.anchor === "")
          onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
      }
      if (spaceBefore)
        node.spaceBefore = true;
      if (comment) {
        node.comment = comment;
        node.range[2] = end;
      }
      return node;
    }
    function composeAlias({ options }, { offset, source, end }, onError) {
      const alias = new Alias.Alias(source.substring(1));
      if (alias.source === "")
        onError(offset, "BAD_ALIAS", "Alias cannot be an empty string");
      if (alias.source.endsWith(":"))
        onError(offset + source.length - 1, "BAD_ALIAS", "Alias ending in : is ambiguous", true);
      const valueEnd = offset + source.length;
      const re = resolveEnd.resolveEnd(end, valueEnd, options.strict, onError);
      alias.range = [offset, valueEnd, re.offset];
      if (re.comment)
        alias.comment = re.comment;
      return alias;
    }
    exports.composeEmptyNode = composeEmptyNode;
    exports.composeNode = composeNode;
  }
});

// node_modules/yaml/dist/compose/compose-doc.js
var require_compose_doc = __commonJS({
  "node_modules/yaml/dist/compose/compose-doc.js"(exports) {
    "use strict";
    var Document = require_Document();
    var composeNode = require_compose_node();
    var resolveEnd = require_resolve_end();
    var resolveProps = require_resolve_props();
    function composeDoc(options, directives, { offset, start, value, end }, onError) {
      const opts = Object.assign({ _directives: directives }, options);
      const doc = new Document.Document(void 0, opts);
      const ctx = {
        atKey: false,
        atRoot: true,
        directives: doc.directives,
        options: doc.options,
        schema: doc.schema
      };
      const props = resolveProps.resolveProps(start, {
        indicator: "doc-start",
        next: value ?? end?.[0],
        offset,
        onError,
        parentIndent: 0,
        startOnNewline: true
      });
      if (props.found) {
        doc.directives.docStart = true;
        if (value && (value.type === "block-map" || value.type === "block-seq") && !props.hasNewline)
          onError(props.end, "MISSING_CHAR", "Block collection cannot start on same line with directives-end marker");
      }
      doc.contents = value ? composeNode.composeNode(ctx, value, props, onError) : composeNode.composeEmptyNode(ctx, props.end, start, null, props, onError);
      const contentEnd = doc.contents.range[2];
      const re = resolveEnd.resolveEnd(end, contentEnd, false, onError);
      if (re.comment)
        doc.comment = re.comment;
      doc.range = [offset, contentEnd, re.offset];
      return doc;
    }
    exports.composeDoc = composeDoc;
  }
});

// node_modules/yaml/dist/compose/composer.js
var require_composer = __commonJS({
  "node_modules/yaml/dist/compose/composer.js"(exports) {
    "use strict";
    var node_process = __require("process");
    var directives = require_directives();
    var Document = require_Document();
    var errors = require_errors();
    var identity = require_identity();
    var composeDoc = require_compose_doc();
    var resolveEnd = require_resolve_end();
    function getErrorPos(src) {
      if (typeof src === "number")
        return [src, src + 1];
      if (Array.isArray(src))
        return src.length === 2 ? src : [src[0], src[1]];
      const { offset, source } = src;
      return [offset, offset + (typeof source === "string" ? source.length : 1)];
    }
    function parsePrelude(prelude) {
      let comment = "";
      let atComment = false;
      let afterEmptyLine = false;
      for (let i = 0; i < prelude.length; ++i) {
        const source = prelude[i];
        switch (source[0]) {
          case "#":
            comment += (comment === "" ? "" : afterEmptyLine ? "\n\n" : "\n") + (source.substring(1) || " ");
            atComment = true;
            afterEmptyLine = false;
            break;
          case "%":
            if (prelude[i + 1]?.[0] !== "#")
              i += 1;
            atComment = false;
            break;
          default:
            if (!atComment)
              afterEmptyLine = true;
            atComment = false;
        }
      }
      return { comment, afterEmptyLine };
    }
    var Composer = class {
      constructor(options = {}) {
        this.doc = null;
        this.atDirectives = false;
        this.prelude = [];
        this.errors = [];
        this.warnings = [];
        this.onError = (source, code, message, warning) => {
          const pos = getErrorPos(source);
          if (warning)
            this.warnings.push(new errors.YAMLWarning(pos, code, message));
          else
            this.errors.push(new errors.YAMLParseError(pos, code, message));
        };
        this.directives = new directives.Directives({ version: options.version || "1.2" });
        this.options = options;
      }
      decorate(doc, afterDoc) {
        const { comment, afterEmptyLine } = parsePrelude(this.prelude);
        if (comment) {
          const dc = doc.contents;
          if (afterDoc) {
            doc.comment = doc.comment ? `${doc.comment}
${comment}` : comment;
          } else if (afterEmptyLine || doc.directives.docStart || !dc) {
            doc.commentBefore = comment;
          } else if (identity.isCollection(dc) && !dc.flow && dc.items.length > 0) {
            let it = dc.items[0];
            if (identity.isPair(it))
              it = it.key;
            const cb = it.commentBefore;
            it.commentBefore = cb ? `${comment}
${cb}` : comment;
          } else {
            const cb = dc.commentBefore;
            dc.commentBefore = cb ? `${comment}
${cb}` : comment;
          }
        }
        if (afterDoc) {
          for (let i = 0; i < this.errors.length; ++i)
            doc.errors.push(this.errors[i]);
          for (let i = 0; i < this.warnings.length; ++i)
            doc.warnings.push(this.warnings[i]);
        } else {
          doc.errors = this.errors;
          doc.warnings = this.warnings;
        }
        this.prelude = [];
        this.errors = [];
        this.warnings = [];
      }
      /**
       * Current stream status information.
       *
       * Mostly useful at the end of input for an empty stream.
       */
      streamInfo() {
        return {
          comment: parsePrelude(this.prelude).comment,
          directives: this.directives,
          errors: this.errors,
          warnings: this.warnings
        };
      }
      /**
       * Compose tokens into documents.
       *
       * @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
       * @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
       */
      *compose(tokens, forceDoc = false, endOffset = -1) {
        for (const token of tokens)
          yield* this.next(token);
        yield* this.end(forceDoc, endOffset);
      }
      /** Advance the composer by one CST token. */
      *next(token) {
        if (node_process.env.LOG_STREAM)
          console.dir(token, { depth: null });
        switch (token.type) {
          case "directive":
            this.directives.add(token.source, (offset, message, warning) => {
              const pos = getErrorPos(token);
              pos[0] += offset;
              this.onError(pos, "BAD_DIRECTIVE", message, warning);
            });
            this.prelude.push(token.source);
            this.atDirectives = true;
            break;
          case "document": {
            const doc = composeDoc.composeDoc(this.options, this.directives, token, this.onError);
            if (this.atDirectives && !doc.directives.docStart)
              this.onError(token, "MISSING_CHAR", "Missing directives-end/doc-start indicator line");
            this.decorate(doc, false);
            if (this.doc)
              yield this.doc;
            this.doc = doc;
            this.atDirectives = false;
            break;
          }
          case "byte-order-mark":
          case "space":
            break;
          case "comment":
          case "newline":
            this.prelude.push(token.source);
            break;
          case "error": {
            const msg = token.source ? `${token.message}: ${JSON.stringify(token.source)}` : token.message;
            const error = new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg);
            if (this.atDirectives || !this.doc)
              this.errors.push(error);
            else
              this.doc.errors.push(error);
            break;
          }
          case "doc-end": {
            if (!this.doc) {
              const msg = "Unexpected doc-end without preceding document";
              this.errors.push(new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg));
              break;
            }
            this.doc.directives.docEnd = true;
            const end = resolveEnd.resolveEnd(token.end, token.offset + token.source.length, this.doc.options.strict, this.onError);
            this.decorate(this.doc, true);
            if (end.comment) {
              const dc = this.doc.comment;
              this.doc.comment = dc ? `${dc}
${end.comment}` : end.comment;
            }
            this.doc.range[2] = end.offset;
            break;
          }
          default:
            this.errors.push(new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", `Unsupported token ${token.type}`));
        }
      }
      /**
       * Call at end of input to yield any remaining document.
       *
       * @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
       * @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
       */
      *end(forceDoc = false, endOffset = -1) {
        if (this.doc) {
          this.decorate(this.doc, true);
          yield this.doc;
          this.doc = null;
        } else if (forceDoc) {
          const opts = Object.assign({ _directives: this.directives }, this.options);
          const doc = new Document.Document(void 0, opts);
          if (this.atDirectives)
            this.onError(endOffset, "MISSING_CHAR", "Missing directives-end indicator line");
          doc.range = [0, endOffset, endOffset];
          this.decorate(doc, false);
          yield doc;
        }
      }
    };
    exports.Composer = Composer;
  }
});

// node_modules/yaml/dist/parse/cst-scalar.js
var require_cst_scalar = __commonJS({
  "node_modules/yaml/dist/parse/cst-scalar.js"(exports) {
    "use strict";
    var resolveBlockScalar = require_resolve_block_scalar();
    var resolveFlowScalar = require_resolve_flow_scalar();
    var errors = require_errors();
    var stringifyString = require_stringifyString();
    function resolveAsScalar(token, strict = true, onError) {
      if (token) {
        const _onError = (pos, code, message) => {
          const offset = typeof pos === "number" ? pos : Array.isArray(pos) ? pos[0] : pos.offset;
          if (onError)
            onError(offset, code, message);
          else
            throw new errors.YAMLParseError([offset, offset + 1], code, message);
        };
        switch (token.type) {
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar":
            return resolveFlowScalar.resolveFlowScalar(token, strict, _onError);
          case "block-scalar":
            return resolveBlockScalar.resolveBlockScalar({ options: { strict } }, token, _onError);
        }
      }
      return null;
    }
    function createScalarToken(value, context) {
      const { implicitKey = false, indent, inFlow = false, offset = -1, type = "PLAIN" } = context;
      const source = stringifyString.stringifyString({ type, value }, {
        implicitKey,
        indent: indent > 0 ? " ".repeat(indent) : "",
        inFlow,
        options: { blockQuote: true, lineWidth: -1 }
      });
      const end = context.end ?? [
        { type: "newline", offset: -1, indent, source: "\n" }
      ];
      switch (source[0]) {
        case "|":
        case ">": {
          const he = source.indexOf("\n");
          const head = source.substring(0, he);
          const body = source.substring(he + 1) + "\n";
          const props = [
            { type: "block-scalar-header", offset, indent, source: head }
          ];
          if (!addEndtoBlockProps(props, end))
            props.push({ type: "newline", offset: -1, indent, source: "\n" });
          return { type: "block-scalar", offset, indent, props, source: body };
        }
        case '"':
          return { type: "double-quoted-scalar", offset, indent, source, end };
        case "'":
          return { type: "single-quoted-scalar", offset, indent, source, end };
        default:
          return { type: "scalar", offset, indent, source, end };
      }
    }
    function setScalarValue(token, value, context = {}) {
      let { afterKey = false, implicitKey = false, inFlow = false, type } = context;
      let indent = "indent" in token ? token.indent : null;
      if (afterKey && typeof indent === "number")
        indent += 2;
      if (!type)
        switch (token.type) {
          case "single-quoted-scalar":
            type = "QUOTE_SINGLE";
            break;
          case "double-quoted-scalar":
            type = "QUOTE_DOUBLE";
            break;
          case "block-scalar": {
            const header = token.props[0];
            if (header.type !== "block-scalar-header")
              throw new Error("Invalid block scalar header");
            type = header.source[0] === ">" ? "BLOCK_FOLDED" : "BLOCK_LITERAL";
            break;
          }
          default:
            type = "PLAIN";
        }
      const source = stringifyString.stringifyString({ type, value }, {
        implicitKey: implicitKey || indent === null,
        indent: indent !== null && indent > 0 ? " ".repeat(indent) : "",
        inFlow,
        options: { blockQuote: true, lineWidth: -1 }
      });
      switch (source[0]) {
        case "|":
        case ">":
          setBlockScalarValue(token, source);
          break;
        case '"':
          setFlowScalarValue(token, source, "double-quoted-scalar");
          break;
        case "'":
          setFlowScalarValue(token, source, "single-quoted-scalar");
          break;
        default:
          setFlowScalarValue(token, source, "scalar");
      }
    }
    function setBlockScalarValue(token, source) {
      const he = source.indexOf("\n");
      const head = source.substring(0, he);
      const body = source.substring(he + 1) + "\n";
      if (token.type === "block-scalar") {
        const header = token.props[0];
        if (header.type !== "block-scalar-header")
          throw new Error("Invalid block scalar header");
        header.source = head;
        token.source = body;
      } else {
        const { offset } = token;
        const indent = "indent" in token ? token.indent : -1;
        const props = [
          { type: "block-scalar-header", offset, indent, source: head }
        ];
        if (!addEndtoBlockProps(props, "end" in token ? token.end : void 0))
          props.push({ type: "newline", offset: -1, indent, source: "\n" });
        for (const key of Object.keys(token))
          if (key !== "type" && key !== "offset")
            delete token[key];
        Object.assign(token, { type: "block-scalar", indent, props, source: body });
      }
    }
    function addEndtoBlockProps(props, end) {
      if (end)
        for (const st of end)
          switch (st.type) {
            case "space":
            case "comment":
              props.push(st);
              break;
            case "newline":
              props.push(st);
              return true;
          }
      return false;
    }
    function setFlowScalarValue(token, source, type) {
      switch (token.type) {
        case "scalar":
        case "double-quoted-scalar":
        case "single-quoted-scalar":
          token.type = type;
          token.source = source;
          break;
        case "block-scalar": {
          const end = token.props.slice(1);
          let oa = source.length;
          if (token.props[0].type === "block-scalar-header")
            oa -= token.props[0].source.length;
          for (const tok of end)
            tok.offset += oa;
          delete token.props;
          Object.assign(token, { type, source, end });
          break;
        }
        case "block-map":
        case "block-seq": {
          const offset = token.offset + source.length;
          const nl = { type: "newline", offset, indent: token.indent, source: "\n" };
          delete token.items;
          Object.assign(token, { type, source, end: [nl] });
          break;
        }
        default: {
          const indent = "indent" in token ? token.indent : -1;
          const end = "end" in token && Array.isArray(token.end) ? token.end.filter((st) => st.type === "space" || st.type === "comment" || st.type === "newline") : [];
          for (const key of Object.keys(token))
            if (key !== "type" && key !== "offset")
              delete token[key];
          Object.assign(token, { type, indent, source, end });
        }
      }
    }
    exports.createScalarToken = createScalarToken;
    exports.resolveAsScalar = resolveAsScalar;
    exports.setScalarValue = setScalarValue;
  }
});

// node_modules/yaml/dist/parse/cst-stringify.js
var require_cst_stringify = __commonJS({
  "node_modules/yaml/dist/parse/cst-stringify.js"(exports) {
    "use strict";
    var stringify2 = (cst) => "type" in cst ? stringifyToken(cst) : stringifyItem(cst);
    function stringifyToken(token) {
      switch (token.type) {
        case "block-scalar": {
          let res = "";
          for (const tok of token.props)
            res += stringifyToken(tok);
          return res + token.source;
        }
        case "block-map":
        case "block-seq": {
          let res = "";
          for (const item2 of token.items)
            res += stringifyItem(item2);
          return res;
        }
        case "flow-collection": {
          let res = token.start.source;
          for (const item2 of token.items)
            res += stringifyItem(item2);
          for (const st of token.end)
            res += st.source;
          return res;
        }
        case "document": {
          let res = stringifyItem(token);
          if (token.end)
            for (const st of token.end)
              res += st.source;
          return res;
        }
        default: {
          let res = token.source;
          if ("end" in token && token.end)
            for (const st of token.end)
              res += st.source;
          return res;
        }
      }
    }
    function stringifyItem({ start, key, sep, value }) {
      let res = "";
      for (const st of start)
        res += st.source;
      if (key)
        res += stringifyToken(key);
      if (sep)
        for (const st of sep)
          res += st.source;
      if (value)
        res += stringifyToken(value);
      return res;
    }
    exports.stringify = stringify2;
  }
});

// node_modules/yaml/dist/parse/cst-visit.js
var require_cst_visit = __commonJS({
  "node_modules/yaml/dist/parse/cst-visit.js"(exports) {
    "use strict";
    var BREAK = Symbol("break visit");
    var SKIP = Symbol("skip children");
    var REMOVE = Symbol("remove item");
    function visit2(cst, visitor) {
      if ("type" in cst && cst.type === "document")
        cst = { start: cst.start, value: cst.value };
      _visit(Object.freeze([]), cst, visitor);
    }
    visit2.BREAK = BREAK;
    visit2.SKIP = SKIP;
    visit2.REMOVE = REMOVE;
    visit2.itemAtPath = (cst, path12) => {
      let item2 = cst;
      for (const [field, index] of path12) {
        const tok = item2?.[field];
        if (tok && "items" in tok) {
          item2 = tok.items[index];
        } else
          return void 0;
      }
      return item2;
    };
    visit2.parentCollection = (cst, path12) => {
      const parent = visit2.itemAtPath(cst, path12.slice(0, -1));
      const field = path12[path12.length - 1][0];
      const coll = parent?.[field];
      if (coll && "items" in coll)
        return coll;
      throw new Error("Parent collection not found");
    };
    function _visit(path12, item2, visitor) {
      let ctrl = visitor(item2, path12);
      if (typeof ctrl === "symbol")
        return ctrl;
      for (const field of ["key", "value"]) {
        const token = item2[field];
        if (token && "items" in token) {
          for (let i = 0; i < token.items.length; ++i) {
            const ci = _visit(Object.freeze(path12.concat([[field, i]])), token.items[i], visitor);
            if (typeof ci === "number")
              i = ci - 1;
            else if (ci === BREAK)
              return BREAK;
            else if (ci === REMOVE) {
              token.items.splice(i, 1);
              i -= 1;
            }
          }
          if (typeof ctrl === "function" && field === "key")
            ctrl = ctrl(item2, path12);
        }
      }
      return typeof ctrl === "function" ? ctrl(item2, path12) : ctrl;
    }
    exports.visit = visit2;
  }
});

// node_modules/yaml/dist/parse/cst.js
var require_cst = __commonJS({
  "node_modules/yaml/dist/parse/cst.js"(exports) {
    "use strict";
    var cstScalar = require_cst_scalar();
    var cstStringify = require_cst_stringify();
    var cstVisit = require_cst_visit();
    var BOM = "\uFEFF";
    var DOCUMENT = "";
    var FLOW_END = "";
    var SCALAR = "";
    var isCollection = (token) => !!token && "items" in token;
    var isScalar = (token) => !!token && (token.type === "scalar" || token.type === "single-quoted-scalar" || token.type === "double-quoted-scalar" || token.type === "block-scalar");
    function prettyToken(token) {
      switch (token) {
        case BOM:
          return "<BOM>";
        case DOCUMENT:
          return "<DOC>";
        case FLOW_END:
          return "<FLOW_END>";
        case SCALAR:
          return "<SCALAR>";
        default:
          return JSON.stringify(token);
      }
    }
    function tokenType(source) {
      switch (source) {
        case BOM:
          return "byte-order-mark";
        case DOCUMENT:
          return "doc-mode";
        case FLOW_END:
          return "flow-error-end";
        case SCALAR:
          return "scalar";
        case "---":
          return "doc-start";
        case "...":
          return "doc-end";
        case "":
        case "\n":
        case "\r\n":
          return "newline";
        case "-":
          return "seq-item-ind";
        case "?":
          return "explicit-key-ind";
        case ":":
          return "map-value-ind";
        case "{":
          return "flow-map-start";
        case "}":
          return "flow-map-end";
        case "[":
          return "flow-seq-start";
        case "]":
          return "flow-seq-end";
        case ",":
          return "comma";
      }
      switch (source[0]) {
        case " ":
        case "	":
          return "space";
        case "#":
          return "comment";
        case "%":
          return "directive-line";
        case "*":
          return "alias";
        case "&":
          return "anchor";
        case "!":
          return "tag";
        case "'":
          return "single-quoted-scalar";
        case '"':
          return "double-quoted-scalar";
        case "|":
        case ">":
          return "block-scalar-header";
      }
      return null;
    }
    exports.createScalarToken = cstScalar.createScalarToken;
    exports.resolveAsScalar = cstScalar.resolveAsScalar;
    exports.setScalarValue = cstScalar.setScalarValue;
    exports.stringify = cstStringify.stringify;
    exports.visit = cstVisit.visit;
    exports.BOM = BOM;
    exports.DOCUMENT = DOCUMENT;
    exports.FLOW_END = FLOW_END;
    exports.SCALAR = SCALAR;
    exports.isCollection = isCollection;
    exports.isScalar = isScalar;
    exports.prettyToken = prettyToken;
    exports.tokenType = tokenType;
  }
});

// node_modules/yaml/dist/parse/lexer.js
var require_lexer = __commonJS({
  "node_modules/yaml/dist/parse/lexer.js"(exports) {
    "use strict";
    var cst = require_cst();
    function isEmpty(ch) {
      switch (ch) {
        case void 0:
        case " ":
        case "\n":
        case "\r":
        case "	":
          return true;
        default:
          return false;
      }
    }
    var hexDigits = new Set("0123456789ABCDEFabcdef");
    var tagChars = new Set("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-#;/?:@&=+$_.!~*'()");
    var flowIndicatorChars = new Set(",[]{}");
    var invalidAnchorChars = new Set(" ,[]{}\n\r	");
    var isNotAnchorChar = (ch) => !ch || invalidAnchorChars.has(ch);
    var Lexer = class {
      constructor() {
        this.atEnd = false;
        this.blockScalarIndent = -1;
        this.blockScalarKeep = false;
        this.buffer = "";
        this.flowKey = false;
        this.flowLevel = 0;
        this.indentNext = 0;
        this.indentValue = 0;
        this.lineEndPos = null;
        this.next = null;
        this.pos = 0;
      }
      /**
       * Generate YAML tokens from the `source` string. If `incomplete`,
       * a part of the last line may be left as a buffer for the next call.
       *
       * @returns A generator of lexical tokens
       */
      *lex(source, incomplete = false) {
        if (source) {
          if (typeof source !== "string")
            throw TypeError("source is not a string");
          this.buffer = this.buffer ? this.buffer + source : source;
          this.lineEndPos = null;
        }
        this.atEnd = !incomplete;
        let next = this.next ?? "stream";
        while (next && (incomplete || this.hasChars(1)))
          next = yield* this.parseNext(next);
      }
      atLineEnd() {
        let i = this.pos;
        let ch = this.buffer[i];
        while (ch === " " || ch === "	")
          ch = this.buffer[++i];
        if (!ch || ch === "#" || ch === "\n")
          return true;
        if (ch === "\r")
          return this.buffer[i + 1] === "\n";
        return false;
      }
      charAt(n) {
        return this.buffer[this.pos + n];
      }
      continueScalar(offset) {
        let ch = this.buffer[offset];
        if (this.indentNext > 0) {
          let indent = 0;
          while (ch === " ")
            ch = this.buffer[++indent + offset];
          if (ch === "\r") {
            const next = this.buffer[indent + offset + 1];
            if (next === "\n" || !next && !this.atEnd)
              return offset + indent + 1;
          }
          return ch === "\n" || indent >= this.indentNext || !ch && !this.atEnd ? offset + indent : -1;
        }
        if (ch === "-" || ch === ".") {
          const dt = this.buffer.substr(offset, 3);
          if ((dt === "---" || dt === "...") && isEmpty(this.buffer[offset + 3]))
            return -1;
        }
        return offset;
      }
      getLine() {
        let end = this.lineEndPos;
        if (typeof end !== "number" || end !== -1 && end < this.pos) {
          end = this.buffer.indexOf("\n", this.pos);
          this.lineEndPos = end;
        }
        if (end === -1)
          return this.atEnd ? this.buffer.substring(this.pos) : null;
        if (this.buffer[end - 1] === "\r")
          end -= 1;
        return this.buffer.substring(this.pos, end);
      }
      hasChars(n) {
        return this.pos + n <= this.buffer.length;
      }
      setNext(state) {
        this.buffer = this.buffer.substring(this.pos);
        this.pos = 0;
        this.lineEndPos = null;
        this.next = state;
        return null;
      }
      peek(n) {
        return this.buffer.substr(this.pos, n);
      }
      *parseNext(next) {
        switch (next) {
          case "stream":
            return yield* this.parseStream();
          case "line-start":
            return yield* this.parseLineStart();
          case "block-start":
            return yield* this.parseBlockStart();
          case "doc":
            return yield* this.parseDocument();
          case "flow":
            return yield* this.parseFlowCollection();
          case "quoted-scalar":
            return yield* this.parseQuotedScalar();
          case "block-scalar":
            return yield* this.parseBlockScalar();
          case "plain-scalar":
            return yield* this.parsePlainScalar();
        }
      }
      *parseStream() {
        let line = this.getLine();
        if (line === null)
          return this.setNext("stream");
        if (line[0] === cst.BOM) {
          yield* this.pushCount(1);
          line = line.substring(1);
        }
        if (line[0] === "%") {
          let dirEnd = line.length;
          let cs = line.indexOf("#");
          while (cs !== -1) {
            const ch = line[cs - 1];
            if (ch === " " || ch === "	") {
              dirEnd = cs - 1;
              break;
            } else {
              cs = line.indexOf("#", cs + 1);
            }
          }
          while (true) {
            const ch = line[dirEnd - 1];
            if (ch === " " || ch === "	")
              dirEnd -= 1;
            else
              break;
          }
          const n = (yield* this.pushCount(dirEnd)) + (yield* this.pushSpaces(true));
          yield* this.pushCount(line.length - n);
          this.pushNewline();
          return "stream";
        }
        if (this.atLineEnd()) {
          const sp = yield* this.pushSpaces(true);
          yield* this.pushCount(line.length - sp);
          yield* this.pushNewline();
          return "stream";
        }
        yield cst.DOCUMENT;
        return yield* this.parseLineStart();
      }
      *parseLineStart() {
        const ch = this.charAt(0);
        if (!ch && !this.atEnd)
          return this.setNext("line-start");
        if (ch === "-" || ch === ".") {
          if (!this.atEnd && !this.hasChars(4))
            return this.setNext("line-start");
          const s = this.peek(3);
          if ((s === "---" || s === "...") && isEmpty(this.charAt(3))) {
            yield* this.pushCount(3);
            this.indentValue = 0;
            this.indentNext = 0;
            return s === "---" ? "doc" : "stream";
          }
        }
        this.indentValue = yield* this.pushSpaces(false);
        if (this.indentNext > this.indentValue && !isEmpty(this.charAt(1)))
          this.indentNext = this.indentValue;
        return yield* this.parseBlockStart();
      }
      *parseBlockStart() {
        const [ch0, ch1] = this.peek(2);
        if (!ch1 && !this.atEnd)
          return this.setNext("block-start");
        if ((ch0 === "-" || ch0 === "?" || ch0 === ":") && isEmpty(ch1)) {
          const n = (yield* this.pushCount(1)) + (yield* this.pushSpaces(true));
          this.indentNext = this.indentValue + 1;
          this.indentValue += n;
          return "block-start";
        }
        return "doc";
      }
      *parseDocument() {
        yield* this.pushSpaces(true);
        const line = this.getLine();
        if (line === null)
          return this.setNext("doc");
        let n = yield* this.pushIndicators();
        switch (line[n]) {
          case "#":
            yield* this.pushCount(line.length - n);
          // fallthrough
          case void 0:
            yield* this.pushNewline();
            return yield* this.parseLineStart();
          case "{":
          case "[":
            yield* this.pushCount(1);
            this.flowKey = false;
            this.flowLevel = 1;
            return "flow";
          case "}":
          case "]":
            yield* this.pushCount(1);
            return "doc";
          case "*":
            yield* this.pushUntil(isNotAnchorChar);
            return "doc";
          case '"':
          case "'":
            return yield* this.parseQuotedScalar();
          case "|":
          case ">":
            n += yield* this.parseBlockScalarHeader();
            n += yield* this.pushSpaces(true);
            yield* this.pushCount(line.length - n);
            yield* this.pushNewline();
            return yield* this.parseBlockScalar();
          default:
            return yield* this.parsePlainScalar();
        }
      }
      *parseFlowCollection() {
        let nl, sp;
        let indent = -1;
        do {
          nl = yield* this.pushNewline();
          if (nl > 0) {
            sp = yield* this.pushSpaces(false);
            this.indentValue = indent = sp;
          } else {
            sp = 0;
          }
          sp += yield* this.pushSpaces(true);
        } while (nl + sp > 0);
        const line = this.getLine();
        if (line === null)
          return this.setNext("flow");
        if (indent !== -1 && indent < this.indentNext && line[0] !== "#" || indent === 0 && (line.startsWith("---") || line.startsWith("...")) && isEmpty(line[3])) {
          const atFlowEndMarker = indent === this.indentNext - 1 && this.flowLevel === 1 && (line[0] === "]" || line[0] === "}");
          if (!atFlowEndMarker) {
            this.flowLevel = 0;
            yield cst.FLOW_END;
            return yield* this.parseLineStart();
          }
        }
        let n = 0;
        while (line[n] === ",") {
          n += yield* this.pushCount(1);
          n += yield* this.pushSpaces(true);
          this.flowKey = false;
        }
        n += yield* this.pushIndicators();
        switch (line[n]) {
          case void 0:
            return "flow";
          case "#":
            yield* this.pushCount(line.length - n);
            return "flow";
          case "{":
          case "[":
            yield* this.pushCount(1);
            this.flowKey = false;
            this.flowLevel += 1;
            return "flow";
          case "}":
          case "]":
            yield* this.pushCount(1);
            this.flowKey = true;
            this.flowLevel -= 1;
            return this.flowLevel ? "flow" : "doc";
          case "*":
            yield* this.pushUntil(isNotAnchorChar);
            return "flow";
          case '"':
          case "'":
            this.flowKey = true;
            return yield* this.parseQuotedScalar();
          case ":": {
            const next = this.charAt(1);
            if (this.flowKey || isEmpty(next) || next === ",") {
              this.flowKey = false;
              yield* this.pushCount(1);
              yield* this.pushSpaces(true);
              return "flow";
            }
          }
          // fallthrough
          default:
            this.flowKey = false;
            return yield* this.parsePlainScalar();
        }
      }
      *parseQuotedScalar() {
        const quote = this.charAt(0);
        let end = this.buffer.indexOf(quote, this.pos + 1);
        if (quote === "'") {
          while (end !== -1 && this.buffer[end + 1] === "'")
            end = this.buffer.indexOf("'", end + 2);
        } else {
          while (end !== -1) {
            let n = 0;
            while (this.buffer[end - 1 - n] === "\\")
              n += 1;
            if (n % 2 === 0)
              break;
            end = this.buffer.indexOf('"', end + 1);
          }
        }
        const qb = this.buffer.substring(0, end);
        let nl = qb.indexOf("\n", this.pos);
        if (nl !== -1) {
          while (nl !== -1) {
            const cs = this.continueScalar(nl + 1);
            if (cs === -1)
              break;
            nl = qb.indexOf("\n", cs);
          }
          if (nl !== -1) {
            end = nl - (qb[nl - 1] === "\r" ? 2 : 1);
          }
        }
        if (end === -1) {
          if (!this.atEnd)
            return this.setNext("quoted-scalar");
          end = this.buffer.length;
        }
        yield* this.pushToIndex(end + 1, false);
        return this.flowLevel ? "flow" : "doc";
      }
      *parseBlockScalarHeader() {
        this.blockScalarIndent = -1;
        this.blockScalarKeep = false;
        let i = this.pos;
        while (true) {
          const ch = this.buffer[++i];
          if (ch === "+")
            this.blockScalarKeep = true;
          else if (ch > "0" && ch <= "9")
            this.blockScalarIndent = Number(ch) - 1;
          else if (ch !== "-")
            break;
        }
        return yield* this.pushUntil((ch) => isEmpty(ch) || ch === "#");
      }
      *parseBlockScalar() {
        let nl = this.pos - 1;
        let indent = 0;
        let ch;
        loop: for (let i2 = this.pos; ch = this.buffer[i2]; ++i2) {
          switch (ch) {
            case " ":
              indent += 1;
              break;
            case "\n":
              nl = i2;
              indent = 0;
              break;
            case "\r": {
              const next = this.buffer[i2 + 1];
              if (!next && !this.atEnd)
                return this.setNext("block-scalar");
              if (next === "\n")
                break;
            }
            // fallthrough
            default:
              break loop;
          }
        }
        if (!ch && !this.atEnd)
          return this.setNext("block-scalar");
        if (indent >= this.indentNext) {
          if (this.blockScalarIndent === -1)
            this.indentNext = indent;
          else {
            this.indentNext = this.blockScalarIndent + (this.indentNext === 0 ? 1 : this.indentNext);
          }
          do {
            const cs = this.continueScalar(nl + 1);
            if (cs === -1)
              break;
            nl = this.buffer.indexOf("\n", cs);
          } while (nl !== -1);
          if (nl === -1) {
            if (!this.atEnd)
              return this.setNext("block-scalar");
            nl = this.buffer.length;
          }
        }
        let i = nl + 1;
        ch = this.buffer[i];
        while (ch === " ")
          ch = this.buffer[++i];
        if (ch === "	") {
          while (ch === "	" || ch === " " || ch === "\r" || ch === "\n")
            ch = this.buffer[++i];
          nl = i - 1;
        } else if (!this.blockScalarKeep) {
          do {
            let i2 = nl - 1;
            let ch2 = this.buffer[i2];
            if (ch2 === "\r")
              ch2 = this.buffer[--i2];
            const lastChar = i2;
            while (ch2 === " ")
              ch2 = this.buffer[--i2];
            if (ch2 === "\n" && i2 >= this.pos && i2 + 1 + indent > lastChar)
              nl = i2;
            else
              break;
          } while (true);
        }
        yield cst.SCALAR;
        yield* this.pushToIndex(nl + 1, true);
        return yield* this.parseLineStart();
      }
      *parsePlainScalar() {
        const inFlow = this.flowLevel > 0;
        let end = this.pos - 1;
        let i = this.pos - 1;
        let ch;
        while (ch = this.buffer[++i]) {
          if (ch === ":") {
            const next = this.buffer[i + 1];
            if (isEmpty(next) || inFlow && flowIndicatorChars.has(next))
              break;
            end = i;
          } else if (isEmpty(ch)) {
            let next = this.buffer[i + 1];
            if (ch === "\r") {
              if (next === "\n") {
                i += 1;
                ch = "\n";
                next = this.buffer[i + 1];
              } else
                end = i;
            }
            if (next === "#" || inFlow && flowIndicatorChars.has(next))
              break;
            if (ch === "\n") {
              const cs = this.continueScalar(i + 1);
              if (cs === -1)
                break;
              i = Math.max(i, cs - 2);
            }
          } else {
            if (inFlow && flowIndicatorChars.has(ch))
              break;
            end = i;
          }
        }
        if (!ch && !this.atEnd)
          return this.setNext("plain-scalar");
        yield cst.SCALAR;
        yield* this.pushToIndex(end + 1, true);
        return inFlow ? "flow" : "doc";
      }
      *pushCount(n) {
        if (n > 0) {
          yield this.buffer.substr(this.pos, n);
          this.pos += n;
          return n;
        }
        return 0;
      }
      *pushToIndex(i, allowEmpty) {
        const s = this.buffer.slice(this.pos, i);
        if (s) {
          yield s;
          this.pos += s.length;
          return s.length;
        } else if (allowEmpty)
          yield "";
        return 0;
      }
      *pushIndicators() {
        let n = 0;
        loop: while (true) {
          switch (this.charAt(0)) {
            case "!":
              n += yield* this.pushTag();
              n += yield* this.pushSpaces(true);
              continue loop;
            case "&":
              n += yield* this.pushUntil(isNotAnchorChar);
              n += yield* this.pushSpaces(true);
              continue loop;
            case "-":
            // this is an error
            case "?":
            // this is an error outside flow collections
            case ":": {
              const inFlow = this.flowLevel > 0;
              const ch1 = this.charAt(1);
              if (isEmpty(ch1) || inFlow && flowIndicatorChars.has(ch1)) {
                if (!inFlow)
                  this.indentNext = this.indentValue + 1;
                else if (this.flowKey)
                  this.flowKey = false;
                n += yield* this.pushCount(1);
                n += yield* this.pushSpaces(true);
                continue loop;
              }
            }
          }
          break loop;
        }
        return n;
      }
      *pushTag() {
        if (this.charAt(1) === "<") {
          let i = this.pos + 2;
          let ch = this.buffer[i];
          while (!isEmpty(ch) && ch !== ">")
            ch = this.buffer[++i];
          return yield* this.pushToIndex(ch === ">" ? i + 1 : i, false);
        } else {
          let i = this.pos + 1;
          let ch = this.buffer[i];
          while (ch) {
            if (tagChars.has(ch))
              ch = this.buffer[++i];
            else if (ch === "%" && hexDigits.has(this.buffer[i + 1]) && hexDigits.has(this.buffer[i + 2])) {
              ch = this.buffer[i += 3];
            } else
              break;
          }
          return yield* this.pushToIndex(i, false);
        }
      }
      *pushNewline() {
        const ch = this.buffer[this.pos];
        if (ch === "\n")
          return yield* this.pushCount(1);
        else if (ch === "\r" && this.charAt(1) === "\n")
          return yield* this.pushCount(2);
        else
          return 0;
      }
      *pushSpaces(allowTabs) {
        let i = this.pos - 1;
        let ch;
        do {
          ch = this.buffer[++i];
        } while (ch === " " || allowTabs && ch === "	");
        const n = i - this.pos;
        if (n > 0) {
          yield this.buffer.substr(this.pos, n);
          this.pos = i;
        }
        return n;
      }
      *pushUntil(test) {
        let i = this.pos;
        let ch = this.buffer[i];
        while (!test(ch))
          ch = this.buffer[++i];
        return yield* this.pushToIndex(i, false);
      }
    };
    exports.Lexer = Lexer;
  }
});

// node_modules/yaml/dist/parse/line-counter.js
var require_line_counter = __commonJS({
  "node_modules/yaml/dist/parse/line-counter.js"(exports) {
    "use strict";
    var LineCounter = class {
      constructor() {
        this.lineStarts = [];
        this.addNewLine = (offset) => this.lineStarts.push(offset);
        this.linePos = (offset) => {
          let low = 0;
          let high = this.lineStarts.length;
          while (low < high) {
            const mid = low + high >> 1;
            if (this.lineStarts[mid] < offset)
              low = mid + 1;
            else
              high = mid;
          }
          if (this.lineStarts[low] === offset)
            return { line: low + 1, col: 1 };
          if (low === 0)
            return { line: 0, col: offset };
          const start = this.lineStarts[low - 1];
          return { line: low, col: offset - start + 1 };
        };
      }
    };
    exports.LineCounter = LineCounter;
  }
});

// node_modules/yaml/dist/parse/parser.js
var require_parser = __commonJS({
  "node_modules/yaml/dist/parse/parser.js"(exports) {
    "use strict";
    var node_process = __require("process");
    var cst = require_cst();
    var lexer = require_lexer();
    function includesToken(list, type) {
      for (let i = 0; i < list.length; ++i)
        if (list[i].type === type)
          return true;
      return false;
    }
    function findNonEmptyIndex(list) {
      for (let i = 0; i < list.length; ++i) {
        switch (list[i].type) {
          case "space":
          case "comment":
          case "newline":
            break;
          default:
            return i;
        }
      }
      return -1;
    }
    function isFlowToken(token) {
      switch (token?.type) {
        case "alias":
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
        case "flow-collection":
          return true;
        default:
          return false;
      }
    }
    function getPrevProps(parent) {
      switch (parent.type) {
        case "document":
          return parent.start;
        case "block-map": {
          const it = parent.items[parent.items.length - 1];
          return it.sep ?? it.start;
        }
        case "block-seq":
          return parent.items[parent.items.length - 1].start;
        /* istanbul ignore next should not happen */
        default:
          return [];
      }
    }
    function getFirstKeyStartProps(prev) {
      if (prev.length === 0)
        return [];
      let i = prev.length;
      loop: while (--i >= 0) {
        switch (prev[i].type) {
          case "doc-start":
          case "explicit-key-ind":
          case "map-value-ind":
          case "seq-item-ind":
          case "newline":
            break loop;
        }
      }
      while (prev[++i]?.type === "space") {
      }
      return prev.splice(i, prev.length);
    }
    function arrayPushArray(target, source) {
      if (source.length < 1e5)
        Array.prototype.push.apply(target, source);
      else
        for (let i = 0; i < source.length; ++i)
          target.push(source[i]);
    }
    function fixFlowSeqItems(fc) {
      if (fc.start.type === "flow-seq-start") {
        for (const it of fc.items) {
          if (it.sep && !it.value && !includesToken(it.start, "explicit-key-ind") && !includesToken(it.sep, "map-value-ind")) {
            if (it.key)
              it.value = it.key;
            delete it.key;
            if (isFlowToken(it.value)) {
              if (it.value.end)
                arrayPushArray(it.value.end, it.sep);
              else
                it.value.end = it.sep;
            } else
              arrayPushArray(it.start, it.sep);
            delete it.sep;
          }
        }
      }
    }
    var Parser = class {
      /**
       * @param onNewLine - If defined, called separately with the start position of
       *   each new line (in `parse()`, including the start of input).
       */
      constructor(onNewLine) {
        this.atNewLine = true;
        this.atScalar = false;
        this.indent = 0;
        this.offset = 0;
        this.onKeyLine = false;
        this.stack = [];
        this.source = "";
        this.type = "";
        this.lexer = new lexer.Lexer();
        this.onNewLine = onNewLine;
      }
      /**
       * Parse `source` as a YAML stream.
       * If `incomplete`, a part of the last line may be left as a buffer for the next call.
       *
       * Errors are not thrown, but yielded as `{ type: 'error', message }` tokens.
       *
       * @returns A generator of tokens representing each directive, document, and other structure.
       */
      *parse(source, incomplete = false) {
        if (this.onNewLine && this.offset === 0)
          this.onNewLine(0);
        for (const lexeme of this.lexer.lex(source, incomplete))
          yield* this.next(lexeme);
        if (!incomplete)
          yield* this.end();
      }
      /**
       * Advance the parser by the `source` of one lexical token.
       */
      *next(source) {
        this.source = source;
        if (node_process.env.LOG_TOKENS)
          console.log("|", cst.prettyToken(source));
        if (this.atScalar) {
          this.atScalar = false;
          yield* this.step();
          this.offset += source.length;
          return;
        }
        const type = cst.tokenType(source);
        if (!type) {
          const message = `Not a YAML token: ${source}`;
          yield* this.pop({ type: "error", offset: this.offset, message, source });
          this.offset += source.length;
        } else if (type === "scalar") {
          this.atNewLine = false;
          this.atScalar = true;
          this.type = "scalar";
        } else {
          this.type = type;
          yield* this.step();
          switch (type) {
            case "newline":
              this.atNewLine = true;
              this.indent = 0;
              if (this.onNewLine)
                this.onNewLine(this.offset + source.length);
              break;
            case "space":
              if (this.atNewLine && source[0] === " ")
                this.indent += source.length;
              break;
            case "explicit-key-ind":
            case "map-value-ind":
            case "seq-item-ind":
              if (this.atNewLine)
                this.indent += source.length;
              break;
            case "doc-mode":
            case "flow-error-end":
              return;
            default:
              this.atNewLine = false;
          }
          this.offset += source.length;
        }
      }
      /** Call at end of input to push out any remaining constructions */
      *end() {
        while (this.stack.length > 0)
          yield* this.pop();
      }
      get sourceToken() {
        const st = {
          type: this.type,
          offset: this.offset,
          indent: this.indent,
          source: this.source
        };
        return st;
      }
      *step() {
        const top = this.peek(1);
        if (this.type === "doc-end" && top?.type !== "doc-end") {
          while (this.stack.length > 0)
            yield* this.pop();
          this.stack.push({
            type: "doc-end",
            offset: this.offset,
            source: this.source
          });
          return;
        }
        if (!top)
          return yield* this.stream();
        switch (top.type) {
          case "document":
            return yield* this.document(top);
          case "alias":
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar":
            return yield* this.scalar(top);
          case "block-scalar":
            return yield* this.blockScalar(top);
          case "block-map":
            return yield* this.blockMap(top);
          case "block-seq":
            return yield* this.blockSequence(top);
          case "flow-collection":
            return yield* this.flowCollection(top);
          case "doc-end":
            return yield* this.documentEnd(top);
        }
        yield* this.pop();
      }
      peek(n) {
        return this.stack[this.stack.length - n];
      }
      *pop(error) {
        const token = error ?? this.stack.pop();
        if (!token) {
          const message = "Tried to pop an empty stack";
          yield { type: "error", offset: this.offset, source: "", message };
        } else if (this.stack.length === 0) {
          yield token;
        } else {
          const top = this.peek(1);
          if (token.type === "block-scalar") {
            token.indent = "indent" in top ? top.indent : 0;
          } else if (token.type === "flow-collection" && top.type === "document") {
            token.indent = 0;
          }
          if (token.type === "flow-collection")
            fixFlowSeqItems(token);
          switch (top.type) {
            case "document":
              top.value = token;
              break;
            case "block-scalar":
              top.props.push(token);
              break;
            case "block-map": {
              const it = top.items[top.items.length - 1];
              if (it.value) {
                top.items.push({ start: [], key: token, sep: [] });
                this.onKeyLine = true;
                return;
              } else if (it.sep) {
                it.value = token;
              } else {
                Object.assign(it, { key: token, sep: [] });
                this.onKeyLine = !it.explicitKey;
                return;
              }
              break;
            }
            case "block-seq": {
              const it = top.items[top.items.length - 1];
              if (it.value)
                top.items.push({ start: [], value: token });
              else
                it.value = token;
              break;
            }
            case "flow-collection": {
              const it = top.items[top.items.length - 1];
              if (!it || it.value)
                top.items.push({ start: [], key: token, sep: [] });
              else if (it.sep)
                it.value = token;
              else
                Object.assign(it, { key: token, sep: [] });
              return;
            }
            /* istanbul ignore next should not happen */
            default:
              yield* this.pop();
              yield* this.pop(token);
          }
          if ((top.type === "document" || top.type === "block-map" || top.type === "block-seq") && (token.type === "block-map" || token.type === "block-seq")) {
            const last = token.items[token.items.length - 1];
            if (last && !last.sep && !last.value && last.start.length > 0 && findNonEmptyIndex(last.start) === -1 && (token.indent === 0 || last.start.every((st) => st.type !== "comment" || st.indent < token.indent))) {
              if (top.type === "document")
                top.end = last.start;
              else
                top.items.push({ start: last.start });
              token.items.splice(-1, 1);
            }
          }
        }
      }
      *stream() {
        switch (this.type) {
          case "directive-line":
            yield { type: "directive", offset: this.offset, source: this.source };
            return;
          case "byte-order-mark":
          case "space":
          case "comment":
          case "newline":
            yield this.sourceToken;
            return;
          case "doc-mode":
          case "doc-start": {
            const doc = {
              type: "document",
              offset: this.offset,
              start: []
            };
            if (this.type === "doc-start")
              doc.start.push(this.sourceToken);
            this.stack.push(doc);
            return;
          }
        }
        yield {
          type: "error",
          offset: this.offset,
          message: `Unexpected ${this.type} token in YAML stream`,
          source: this.source
        };
      }
      *document(doc) {
        if (doc.value)
          return yield* this.lineEnd(doc);
        switch (this.type) {
          case "doc-start": {
            if (findNonEmptyIndex(doc.start) !== -1) {
              yield* this.pop();
              yield* this.step();
            } else
              doc.start.push(this.sourceToken);
            return;
          }
          case "anchor":
          case "tag":
          case "space":
          case "comment":
          case "newline":
            doc.start.push(this.sourceToken);
            return;
        }
        const bv = this.startBlockValue(doc);
        if (bv)
          this.stack.push(bv);
        else {
          yield {
            type: "error",
            offset: this.offset,
            message: `Unexpected ${this.type} token in YAML document`,
            source: this.source
          };
        }
      }
      *scalar(scalar) {
        if (this.type === "map-value-ind") {
          const prev = getPrevProps(this.peek(2));
          const start = getFirstKeyStartProps(prev);
          let sep;
          if (scalar.end) {
            sep = scalar.end;
            sep.push(this.sourceToken);
            delete scalar.end;
          } else
            sep = [this.sourceToken];
          const map = {
            type: "block-map",
            offset: scalar.offset,
            indent: scalar.indent,
            items: [{ start, key: scalar, sep }]
          };
          this.onKeyLine = true;
          this.stack[this.stack.length - 1] = map;
        } else
          yield* this.lineEnd(scalar);
      }
      *blockScalar(scalar) {
        switch (this.type) {
          case "space":
          case "comment":
          case "newline":
            scalar.props.push(this.sourceToken);
            return;
          case "scalar":
            scalar.source = this.source;
            this.atNewLine = true;
            this.indent = 0;
            if (this.onNewLine) {
              let nl = this.source.indexOf("\n") + 1;
              while (nl !== 0) {
                this.onNewLine(this.offset + nl);
                nl = this.source.indexOf("\n", nl) + 1;
              }
            }
            yield* this.pop();
            break;
          /* istanbul ignore next should not happen */
          default:
            yield* this.pop();
            yield* this.step();
        }
      }
      *blockMap(map) {
        const it = map.items[map.items.length - 1];
        switch (this.type) {
          case "newline":
            this.onKeyLine = false;
            if (it.value) {
              const end = "end" in it.value ? it.value.end : void 0;
              const last = Array.isArray(end) ? end[end.length - 1] : void 0;
              if (last?.type === "comment")
                end?.push(this.sourceToken);
              else
                map.items.push({ start: [this.sourceToken] });
            } else if (it.sep) {
              it.sep.push(this.sourceToken);
            } else {
              it.start.push(this.sourceToken);
            }
            return;
          case "space":
          case "comment":
            if (it.value) {
              map.items.push({ start: [this.sourceToken] });
            } else if (it.sep) {
              it.sep.push(this.sourceToken);
            } else {
              if (this.atIndentedComment(it.start, map.indent)) {
                const prev = map.items[map.items.length - 2];
                const end = prev?.value?.end;
                if (Array.isArray(end)) {
                  arrayPushArray(end, it.start);
                  end.push(this.sourceToken);
                  map.items.pop();
                  return;
                }
              }
              it.start.push(this.sourceToken);
            }
            return;
        }
        if (this.indent >= map.indent) {
          const atMapIndent = !this.onKeyLine && this.indent === map.indent;
          const atNextItem = atMapIndent && (it.sep || it.explicitKey) && this.type !== "seq-item-ind";
          let start = [];
          if (atNextItem && it.sep && !it.value) {
            const nl = [];
            for (let i = 0; i < it.sep.length; ++i) {
              const st = it.sep[i];
              switch (st.type) {
                case "newline":
                  nl.push(i);
                  break;
                case "space":
                  break;
                case "comment":
                  if (st.indent > map.indent)
                    nl.length = 0;
                  break;
                default:
                  nl.length = 0;
              }
            }
            if (nl.length >= 2)
              start = it.sep.splice(nl[1]);
          }
          switch (this.type) {
            case "anchor":
            case "tag":
              if (atNextItem || it.value) {
                start.push(this.sourceToken);
                map.items.push({ start });
                this.onKeyLine = true;
              } else if (it.sep) {
                it.sep.push(this.sourceToken);
              } else {
                it.start.push(this.sourceToken);
              }
              return;
            case "explicit-key-ind":
              if (!it.sep && !it.explicitKey) {
                it.start.push(this.sourceToken);
                it.explicitKey = true;
              } else if (atNextItem || it.value) {
                start.push(this.sourceToken);
                map.items.push({ start, explicitKey: true });
              } else {
                this.stack.push({
                  type: "block-map",
                  offset: this.offset,
                  indent: this.indent,
                  items: [{ start: [this.sourceToken], explicitKey: true }]
                });
              }
              this.onKeyLine = true;
              return;
            case "map-value-ind":
              if (it.explicitKey) {
                if (!it.sep) {
                  if (includesToken(it.start, "newline")) {
                    Object.assign(it, { key: null, sep: [this.sourceToken] });
                  } else {
                    const start2 = getFirstKeyStartProps(it.start);
                    this.stack.push({
                      type: "block-map",
                      offset: this.offset,
                      indent: this.indent,
                      items: [{ start: start2, key: null, sep: [this.sourceToken] }]
                    });
                  }
                } else if (it.value) {
                  map.items.push({ start: [], key: null, sep: [this.sourceToken] });
                } else if (includesToken(it.sep, "map-value-ind")) {
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start, key: null, sep: [this.sourceToken] }]
                  });
                } else if (isFlowToken(it.key) && !includesToken(it.sep, "newline")) {
                  const start2 = getFirstKeyStartProps(it.start);
                  const key = it.key;
                  const sep = it.sep;
                  sep.push(this.sourceToken);
                  delete it.key;
                  delete it.sep;
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start: start2, key, sep }]
                  });
                } else if (start.length > 0) {
                  it.sep = it.sep.concat(start, this.sourceToken);
                } else {
                  it.sep.push(this.sourceToken);
                }
              } else {
                if (!it.sep) {
                  Object.assign(it, { key: null, sep: [this.sourceToken] });
                } else if (it.value || atNextItem) {
                  map.items.push({ start, key: null, sep: [this.sourceToken] });
                } else if (includesToken(it.sep, "map-value-ind")) {
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start: [], key: null, sep: [this.sourceToken] }]
                  });
                } else {
                  it.sep.push(this.sourceToken);
                }
              }
              this.onKeyLine = true;
              return;
            case "alias":
            case "scalar":
            case "single-quoted-scalar":
            case "double-quoted-scalar": {
              const fs10 = this.flowScalar(this.type);
              if (atNextItem || it.value) {
                map.items.push({ start, key: fs10, sep: [] });
                this.onKeyLine = true;
              } else if (it.sep) {
                this.stack.push(fs10);
              } else {
                Object.assign(it, { key: fs10, sep: [] });
                this.onKeyLine = true;
              }
              return;
            }
            default: {
              const bv = this.startBlockValue(map);
              if (bv) {
                if (bv.type === "block-seq") {
                  if (!it.explicitKey && it.sep && !includesToken(it.sep, "newline")) {
                    yield* this.pop({
                      type: "error",
                      offset: this.offset,
                      message: "Unexpected block-seq-ind on same line with key",
                      source: this.source
                    });
                    return;
                  }
                } else if (atMapIndent) {
                  map.items.push({ start });
                }
                this.stack.push(bv);
                return;
              }
            }
          }
        }
        yield* this.pop();
        yield* this.step();
      }
      *blockSequence(seq) {
        const it = seq.items[seq.items.length - 1];
        switch (this.type) {
          case "newline":
            if (it.value) {
              const end = "end" in it.value ? it.value.end : void 0;
              const last = Array.isArray(end) ? end[end.length - 1] : void 0;
              if (last?.type === "comment")
                end?.push(this.sourceToken);
              else
                seq.items.push({ start: [this.sourceToken] });
            } else
              it.start.push(this.sourceToken);
            return;
          case "space":
          case "comment":
            if (it.value)
              seq.items.push({ start: [this.sourceToken] });
            else {
              if (this.atIndentedComment(it.start, seq.indent)) {
                const prev = seq.items[seq.items.length - 2];
                const end = prev?.value?.end;
                if (Array.isArray(end)) {
                  arrayPushArray(end, it.start);
                  end.push(this.sourceToken);
                  seq.items.pop();
                  return;
                }
              }
              it.start.push(this.sourceToken);
            }
            return;
          case "anchor":
          case "tag":
            if (it.value || this.indent <= seq.indent)
              break;
            it.start.push(this.sourceToken);
            return;
          case "seq-item-ind":
            if (this.indent !== seq.indent)
              break;
            if (it.value || includesToken(it.start, "seq-item-ind"))
              seq.items.push({ start: [this.sourceToken] });
            else
              it.start.push(this.sourceToken);
            return;
        }
        if (this.indent > seq.indent) {
          const bv = this.startBlockValue(seq);
          if (bv) {
            this.stack.push(bv);
            return;
          }
        }
        yield* this.pop();
        yield* this.step();
      }
      *flowCollection(fc) {
        const it = fc.items[fc.items.length - 1];
        if (this.type === "flow-error-end") {
          let top;
          do {
            yield* this.pop();
            top = this.peek(1);
          } while (top?.type === "flow-collection");
        } else if (fc.end.length === 0) {
          switch (this.type) {
            case "comma":
            case "explicit-key-ind":
              if (!it || it.sep)
                fc.items.push({ start: [this.sourceToken] });
              else
                it.start.push(this.sourceToken);
              return;
            case "map-value-ind":
              if (!it || it.value)
                fc.items.push({ start: [], key: null, sep: [this.sourceToken] });
              else if (it.sep)
                it.sep.push(this.sourceToken);
              else
                Object.assign(it, { key: null, sep: [this.sourceToken] });
              return;
            case "space":
            case "comment":
            case "newline":
            case "anchor":
            case "tag":
              if (!it || it.value)
                fc.items.push({ start: [this.sourceToken] });
              else if (it.sep)
                it.sep.push(this.sourceToken);
              else
                it.start.push(this.sourceToken);
              return;
            case "alias":
            case "scalar":
            case "single-quoted-scalar":
            case "double-quoted-scalar": {
              const fs10 = this.flowScalar(this.type);
              if (!it || it.value)
                fc.items.push({ start: [], key: fs10, sep: [] });
              else if (it.sep)
                this.stack.push(fs10);
              else
                Object.assign(it, { key: fs10, sep: [] });
              return;
            }
            case "flow-map-end":
            case "flow-seq-end":
              fc.end.push(this.sourceToken);
              return;
          }
          const bv = this.startBlockValue(fc);
          if (bv)
            this.stack.push(bv);
          else {
            yield* this.pop();
            yield* this.step();
          }
        } else {
          const parent = this.peek(2);
          if (parent.type === "block-map" && (this.type === "map-value-ind" && parent.indent === fc.indent || this.type === "newline" && !parent.items[parent.items.length - 1].sep)) {
            yield* this.pop();
            yield* this.step();
          } else if (this.type === "map-value-ind" && parent.type !== "flow-collection") {
            const prev = getPrevProps(parent);
            const start = getFirstKeyStartProps(prev);
            fixFlowSeqItems(fc);
            const sep = fc.end.splice(1, fc.end.length);
            sep.push(this.sourceToken);
            const map = {
              type: "block-map",
              offset: fc.offset,
              indent: fc.indent,
              items: [{ start, key: fc, sep }]
            };
            this.onKeyLine = true;
            this.stack[this.stack.length - 1] = map;
          } else {
            yield* this.lineEnd(fc);
          }
        }
      }
      flowScalar(type) {
        if (this.onNewLine) {
          let nl = this.source.indexOf("\n") + 1;
          while (nl !== 0) {
            this.onNewLine(this.offset + nl);
            nl = this.source.indexOf("\n", nl) + 1;
          }
        }
        return {
          type,
          offset: this.offset,
          indent: this.indent,
          source: this.source
        };
      }
      startBlockValue(parent) {
        switch (this.type) {
          case "alias":
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar":
            return this.flowScalar(this.type);
          case "block-scalar-header":
            return {
              type: "block-scalar",
              offset: this.offset,
              indent: this.indent,
              props: [this.sourceToken],
              source: ""
            };
          case "flow-map-start":
          case "flow-seq-start":
            return {
              type: "flow-collection",
              offset: this.offset,
              indent: this.indent,
              start: this.sourceToken,
              items: [],
              end: []
            };
          case "seq-item-ind":
            return {
              type: "block-seq",
              offset: this.offset,
              indent: this.indent,
              items: [{ start: [this.sourceToken] }]
            };
          case "explicit-key-ind": {
            this.onKeyLine = true;
            const prev = getPrevProps(parent);
            const start = getFirstKeyStartProps(prev);
            start.push(this.sourceToken);
            return {
              type: "block-map",
              offset: this.offset,
              indent: this.indent,
              items: [{ start, explicitKey: true }]
            };
          }
          case "map-value-ind": {
            this.onKeyLine = true;
            const prev = getPrevProps(parent);
            const start = getFirstKeyStartProps(prev);
            return {
              type: "block-map",
              offset: this.offset,
              indent: this.indent,
              items: [{ start, key: null, sep: [this.sourceToken] }]
            };
          }
        }
        return null;
      }
      atIndentedComment(start, indent) {
        if (this.type !== "comment")
          return false;
        if (this.indent <= indent)
          return false;
        return start.every((st) => st.type === "newline" || st.type === "space");
      }
      *documentEnd(docEnd) {
        if (this.type !== "doc-mode") {
          if (docEnd.end)
            docEnd.end.push(this.sourceToken);
          else
            docEnd.end = [this.sourceToken];
          if (this.type === "newline")
            yield* this.pop();
        }
      }
      *lineEnd(token) {
        switch (this.type) {
          case "comma":
          case "doc-start":
          case "doc-end":
          case "flow-seq-end":
          case "flow-map-end":
          case "map-value-ind":
            yield* this.pop();
            yield* this.step();
            break;
          case "newline":
            this.onKeyLine = false;
          // fallthrough
          case "space":
          case "comment":
          default:
            if (token.end)
              token.end.push(this.sourceToken);
            else
              token.end = [this.sourceToken];
            if (this.type === "newline")
              yield* this.pop();
        }
      }
    };
    exports.Parser = Parser;
  }
});

// node_modules/yaml/dist/public-api.js
var require_public_api = __commonJS({
  "node_modules/yaml/dist/public-api.js"(exports) {
    "use strict";
    var composer = require_composer();
    var Document = require_Document();
    var errors = require_errors();
    var log = require_log();
    var identity = require_identity();
    var lineCounter = require_line_counter();
    var parser = require_parser();
    function parseOptions(options) {
      const prettyErrors = options.prettyErrors !== false;
      const lineCounter$1 = options.lineCounter || prettyErrors && new lineCounter.LineCounter() || null;
      return { lineCounter: lineCounter$1, prettyErrors };
    }
    function parseAllDocuments(source, options = {}) {
      const { lineCounter: lineCounter2, prettyErrors } = parseOptions(options);
      const parser$1 = new parser.Parser(lineCounter2?.addNewLine);
      const composer$1 = new composer.Composer(options);
      const docs = Array.from(composer$1.compose(parser$1.parse(source)));
      if (prettyErrors && lineCounter2)
        for (const doc of docs) {
          doc.errors.forEach(errors.prettifyError(source, lineCounter2));
          doc.warnings.forEach(errors.prettifyError(source, lineCounter2));
        }
      if (docs.length > 0)
        return docs;
      return Object.assign([], { empty: true }, composer$1.streamInfo());
    }
    function parseDocument(source, options = {}) {
      const { lineCounter: lineCounter2, prettyErrors } = parseOptions(options);
      const parser$1 = new parser.Parser(lineCounter2?.addNewLine);
      const composer$1 = new composer.Composer(options);
      let doc = null;
      for (const _doc of composer$1.compose(parser$1.parse(source), true, source.length)) {
        if (!doc)
          doc = _doc;
        else if (doc.options.logLevel !== "silent") {
          doc.errors.push(new errors.YAMLParseError(_doc.range.slice(0, 2), "MULTIPLE_DOCS", "Source contains multiple documents; please use YAML.parseAllDocuments()"));
          break;
        }
      }
      if (prettyErrors && lineCounter2) {
        doc.errors.forEach(errors.prettifyError(source, lineCounter2));
        doc.warnings.forEach(errors.prettifyError(source, lineCounter2));
      }
      return doc;
    }
    function parse4(src, reviver, options) {
      let _reviver = void 0;
      if (typeof reviver === "function") {
        _reviver = reviver;
      } else if (options === void 0 && reviver && typeof reviver === "object") {
        options = reviver;
      }
      const doc = parseDocument(src, options);
      if (!doc)
        return null;
      doc.warnings.forEach((warning) => log.warn(doc.options.logLevel, warning));
      if (doc.errors.length > 0) {
        if (doc.options.logLevel !== "silent")
          throw doc.errors[0];
        else
          doc.errors = [];
      }
      return doc.toJS(Object.assign({ reviver: _reviver }, options));
    }
    function stringify2(value, replacer, options) {
      let _replacer = null;
      if (typeof replacer === "function" || Array.isArray(replacer)) {
        _replacer = replacer;
      } else if (options === void 0 && replacer) {
        options = replacer;
      }
      if (typeof options === "string")
        options = options.length;
      if (typeof options === "number") {
        const indent = Math.round(options);
        options = indent < 1 ? void 0 : indent > 8 ? { indent: 8 } : { indent };
      }
      if (value === void 0) {
        const { keepUndefined } = options ?? replacer ?? {};
        if (!keepUndefined)
          return void 0;
      }
      if (identity.isDocument(value) && !_replacer)
        return value.toString(options);
      return new Document.Document(value, _replacer, options).toString(options);
    }
    exports.parse = parse4;
    exports.parseAllDocuments = parseAllDocuments;
    exports.parseDocument = parseDocument;
    exports.stringify = stringify2;
  }
});

// node_modules/yaml/dist/index.js
var require_dist = __commonJS({
  "node_modules/yaml/dist/index.js"(exports) {
    "use strict";
    var composer = require_composer();
    var Document = require_Document();
    var Schema = require_Schema();
    var errors = require_errors();
    var Alias = require_Alias();
    var identity = require_identity();
    var Pair = require_Pair();
    var Scalar = require_Scalar();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var cst = require_cst();
    var lexer = require_lexer();
    var lineCounter = require_line_counter();
    var parser = require_parser();
    var publicApi = require_public_api();
    var visit2 = require_visit();
    exports.Composer = composer.Composer;
    exports.Document = Document.Document;
    exports.Schema = Schema.Schema;
    exports.YAMLError = errors.YAMLError;
    exports.YAMLParseError = errors.YAMLParseError;
    exports.YAMLWarning = errors.YAMLWarning;
    exports.Alias = Alias.Alias;
    exports.isAlias = identity.isAlias;
    exports.isCollection = identity.isCollection;
    exports.isDocument = identity.isDocument;
    exports.isMap = identity.isMap;
    exports.isNode = identity.isNode;
    exports.isPair = identity.isPair;
    exports.isScalar = identity.isScalar;
    exports.isSeq = identity.isSeq;
    exports.Pair = Pair.Pair;
    exports.Scalar = Scalar.Scalar;
    exports.YAMLMap = YAMLMap.YAMLMap;
    exports.YAMLSeq = YAMLSeq.YAMLSeq;
    exports.CST = cst;
    exports.Lexer = lexer.Lexer;
    exports.LineCounter = lineCounter.LineCounter;
    exports.Parser = parser.Parser;
    exports.parse = publicApi.parse;
    exports.parseAllDocuments = publicApi.parseAllDocuments;
    exports.parseDocument = publicApi.parseDocument;
    exports.stringify = publicApi.stringify;
    exports.visit = visit2.visit;
    exports.visitAsync = visit2.visitAsync;
  }
});

// src/fsutil.js
import fs from "node:fs";
import path from "node:path";
function canonical(p) {
  try {
    return fs.realpathSync.native(p);
  } catch {
    return path.resolve(p);
  }
}
function listDir(p) {
  try {
    return fs.readdirSync(p, { withFileTypes: true });
  } catch {
    return [];
  }
}
function subdirs(p) {
  return listDir(p).filter((e) => isDir(path.join(p, e.name))).map((e) => e.name).sort();
}
function readJson(p) {
  const t = readText(p);
  if (t == null) return null;
  try {
    return JSON.parse(t);
  } catch (e) {
    return { __parseError: String(e.message) };
  }
}
function readJsonc(p) {
  const t = readText(p);
  if (t == null) return null;
  const errors = [];
  const v = parse3(t, errors, { allowTrailingComma: true });
  return errors.length && v == null ? { __parseError: "jsonc parse error" } : v;
}
function readToml(p) {
  const t = readText(p);
  if (t == null) return null;
  try {
    return parse(t);
  } catch (e) {
    return { __parseError: String(e.message) };
  }
}
function readFrontmatter(p) {
  const t = readText(p);
  if (t == null) return null;
  const m = t.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: t };
  let data = {};
  try {
    data = import_yaml.default.parse(m[1]) || {};
  } catch {
    for (const line of m[1].split("\n")) {
      const kv = line.match(/^([A-Za-z_-]+):\s*(.*)$/);
      if (kv) data[kv[1]] = kv[2];
    }
  }
  return { data, body: m[2] };
}
function ancestors(from, to = null) {
  const out = [];
  let cur = path.resolve(from);
  for (; ; ) {
    out.push(cur);
    if (to && cur === path.resolve(to)) break;
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return out;
}
function findRoot(from, markers = [".git"]) {
  for (const d of ancestors(from)) {
    if (markers.some((m) => exists(path.join(d, m)))) return d;
  }
  return null;
}
var import_yaml, exists, isDir, isFile, readText, fileSize;
var init_fsutil = __esm({
  "src/fsutil.js"() {
    init_dist();
    init_main();
    import_yaml = __toESM(require_dist(), 1);
    exists = (p) => {
      try {
        fs.accessSync(p);
        return true;
      } catch {
        return false;
      }
    };
    isDir = (p) => {
      try {
        return fs.statSync(p).isDirectory();
      } catch {
        return false;
      }
    };
    isFile = (p) => {
      try {
        return fs.statSync(p).isFile();
      } catch {
        return false;
      }
    };
    readText = (p) => {
      try {
        return fs.readFileSync(p, "utf8");
      } catch {
        return null;
      }
    };
    fileSize = (p) => {
      try {
        return fs.statSync(p).size;
      } catch {
        return 0;
      }
    };
  }
});

// src/live/codex.js
import fs2 from "node:fs";
import { createRequire } from "node:module";
import path2 from "node:path";
function listRollouts(sessionsDir) {
  const out = [];
  const sub = (d) => {
    try {
      return fs2.readdirSync(d, { withFileTypes: true });
    } catch {
      return [];
    }
  };
  const desc = (a, b) => b.name.localeCompare(a.name);
  for (const y of sub(sessionsDir).filter((e) => e.isDirectory()).sort(desc))
    for (const m of sub(path2.join(sessionsDir, y.name)).filter((e) => e.isDirectory()).sort(desc))
      for (const d of sub(path2.join(sessionsDir, y.name, m.name)).filter((e) => e.isDirectory()).sort(desc))
        for (const f of sub(path2.join(sessionsDir, y.name, m.name, d.name)).filter((e) => e.isFile() && /^rollout-.*\.jsonl$/.test(e.name)).sort(desc))
          out.push(path2.join(sessionsDir, y.name, m.name, d.name, f.name));
  return out;
}
function readMeta(file) {
  let fd;
  try {
    fd = fs2.openSync(file, "r");
    const buf = Buffer.alloc(65536);
    let acc = "";
    for (; ; ) {
      const n = fs2.readSync(fd, buf, 0, buf.length, null);
      if (!n) break;
      acc += buf.toString("utf8", 0, n);
      const nl = acc.indexOf("\n");
      if (nl >= 0) {
        acc = acc.slice(0, nl);
        break;
      }
      if (acc.length > 4e6) return null;
    }
    const r = JSON.parse(acc);
    return r.type === "session_meta" ? r.payload : null;
  } catch {
    return null;
  } finally {
    if (fd !== void 0) fs2.closeSync(fd);
  }
}
function findRollout(sessionsDir, cwd, sessionId) {
  const files = listRollouts(sessionsDir);
  if (sessionId) {
    const byName = files.find((f) => f.endsWith(`-${sessionId}.jsonl`));
    if (byName) return byName;
    return files.find((f) => readMeta(f)?.id === sessionId) || null;
  }
  const want = path2.resolve(cwd);
  for (const f of files) {
    const cw = readMeta(f)?.cwd;
    if (cw && path2.resolve(cw) === want) return f;
  }
  return null;
}
function parseSkills(text) {
  const roots = {};
  const skills = [];
  for (const line of text.split("\n")) {
    const rm = /^- `(r\d+)` = `(.+)`$/.exec(line);
    if (rm) {
      roots[rm[1]] = rm[2];
      continue;
    }
    if (!line.startsWith("- ")) continue;
    const fm = /\(file: (\S+)\)\s*$/.exec(line);
    if (!fm) continue;
    const head = line.slice(2, fm.index);
    const colon = head.indexOf(": ");
    const name = (colon < 0 ? head.replace(/:\s*$/, "") : head.slice(0, colon)).trim();
    const rel = fm[1];
    const root = /^(r\d+)\//.exec(rel);
    const p = root && roots[root[1]] ? path2.join(roots[root[1]], rel.slice(root[1].length + 1)) : rel;
    skills.push({ name, path: p, realPath: realOr(p) });
  }
  return skills;
}
function resolveAgentsFiles(bootstrap, texts, codexHome) {
  if (!texts.length) return;
  const blob = texts.join("\n");
  const norm = (x) => x.replace(/\s+/g, " ").trim();
  const nb = norm(blob);
  const dirs = /* @__PURE__ */ new Set([codexHome]);
  for (const d of [...bootstrap.keys()]) {
    for (let c = d; ; c = path2.dirname(c)) {
      dirs.add(c);
      if (path2.dirname(c) === c) break;
    }
  }
  const found = /* @__PURE__ */ new Map();
  for (const d of dirs) {
    for (const n of ["AGENTS.override.md", "AGENTS.md"]) {
      const f = path2.join(d, n);
      let c;
      try {
        c = fs2.readFileSync(f, "utf8");
      } catch {
        continue;
      }
      if (!c.trim()) continue;
      if (nb.includes(norm(c))) found.set(f, { path: f, dir: d, inferred: true, contentMatched: true });
    }
  }
  if (!found.size) return;
  bootstrap.clear();
  for (const v of found.values()) bootstrap.set(v.path, v);
}
function omittedMcp(codexHome, threadId) {
  if (!threadId) return [];
  const dbPath = path2.join(codexHome, "logs_2.sqlite");
  if (!fs2.existsSync(dbPath)) return [];
  let db;
  try {
    const { DatabaseSync } = require2("node:sqlite");
    db = new DatabaseSync(dbPath, { readOnly: true });
    const rows = db.prepare("SELECT feedback_log_body AS b FROM logs WHERE thread_id = ? AND feedback_log_body LIKE '%omitting MCP server%'").all(threadId);
    return [...new Set(rows.map((r) => /server_name=(\S+)/.exec(r.b)?.[1]).filter(Boolean))].sort();
  } catch {
    return [];
  } finally {
    try {
      db?.close();
    } catch {
    }
  }
}
function codexThreadCwd({ home, env = {}, threadId }) {
  if (!threadId) return null;
  const codexHome = env.CODEX_HOME || path2.join(home, ".codex");
  const f = findRollout(path2.join(codexHome, "sessions"), null, threadId);
  return f ? readMeta(f)?.cwd || null : null;
}
function liveCodex({ cwd, home, env = {}, sessionId } = {}) {
  const codexHome = env.CODEX_HOME || path2.join(home, ".codex");
  const sessionsDir = path2.join(codexHome, "sessions");
  const rollout = findRollout(sessionsDir, cwd, sessionId);
  if (!rollout) {
    return { error: `no Codex rollout found for ${sessionId ? `session ${sessionId}` : `cwd ${cwd}`} under ${sessionsDir}` };
  }
  const meta = readMeta(rollout);
  const bootstrap = /* @__PURE__ */ new Map();
  const skills = /* @__PURE__ */ new Map();
  const mcp = /* @__PURE__ */ new Set();
  const disabledPlugins = /* @__PURE__ */ new Set();
  let effectiveWindow = null;
  const agentsTexts = [];
  const addText = (t) => {
    if (typeof t === "string" && t) agentsTexts.push(t);
  };
  const addDir = (dir) => {
    if (dir) bootstrap.set(dir, { path: path2.join(dir, "AGENTS.md"), dir, inferred: true });
  };
  for (const line of fs2.readFileSync(rollout, "utf8").split("\n")) {
    if (!line) continue;
    const isMsg = line.includes('"type":"message"');
    const isWorld = line.includes('"type":"world_state"') || line.includes('"type":"turn_context"');
    const isCall = line.includes("mcp__") || line.includes("mcp_tool_call");
    const isTokens = !effectiveWindow && line.includes('"model_context_window"');
    if (!isMsg && !isWorld && !isCall && !isTokens) continue;
    let r;
    try {
      r = JSON.parse(line);
    } catch {
      continue;
    }
    const p = r.payload || {};
    if (r.type === "response_item" && p.type === "message" && (p.role === "user" || p.role === "developer")) {
      const t = textOf(p);
      if (t.startsWith("# AGENTS.md instructions for ")) {
        for (const m of t.matchAll(/^# AGENTS\.md instructions for (.+)$/gm)) addDir(m[1].trim());
        addText(t);
      }
      if (p.role === "developer" && t.startsWith("<skills_instructions>")) {
        skills.clear();
        for (const s of parseSkills(t)) skills.set(`${s.name}\0${s.path}`, s);
      }
    } else if (r.type === "world_state") {
      addDir(p.state?.agents_md?.directory);
      addText(p.state?.agents_md?.text);
    } else if (r.type === "turn_context") {
      for (const id of p.disabled_plugin_ids || []) disabledPlugins.add(id);
    } else if (r.type === "response_item" && /function_call|tool_call/.test(p.type || "") && typeof p.name === "string") {
      const m = /^mcp__(.+?)__/.exec(p.name);
      if (m) mcp.add(m[1]);
    } else if (r.type === "event_msg" && p.type === "token_count" && p.info?.model_context_window) {
      effectiveWindow = Number(p.info.model_context_window);
    } else if (r.type === "event_msg" && /^mcp_tool_call/.test(p.type || "")) {
      const s = p.invocation?.server;
      if (s) mcp.add(s);
    }
  }
  resolveAgentsFiles(bootstrap, agentsTexts, codexHome);
  return {
    source: rollout,
    sessionId: meta?.id || path2.basename(rollout, ".jsonl").replace(/^rollout-.*?T[\d-]+-/, ""),
    cwd: meta?.cwd || null,
    // token_count reports the effective window (95% of the raw model window); the skill-list
    // budget is computed from the raw one, so convert back.
    contextWindow: effectiveWindow ? Math.round(effectiveWindow / 0.95) : null,
    observed: {
      bootstrap: [...bootstrap.values()].sort((a, b) => a.path.localeCompare(b.path)),
      skills: [...skills.values()].sort((a, b) => a.name.localeCompare(b.name) || a.path.localeCompare(b.path)),
      mcpServers: [...mcp].sort(),
      // Servers Codex logged as configured-but-not-ready ("omitting MCP server without an exact ready client").
      // Positive evidence of a ready server is not logged, so this is not part of mcpServers.
      mcpOmitted: omittedMcp(codexHome, meta?.id),
      disabledPlugins: [...disabledPlugins].sort(),
      hooks: []
    }
  };
}
var require2, realOr, textOf;
var init_codex = __esm({
  "src/live/codex.js"() {
    require2 = createRequire(import.meta.url);
    realOr = (p) => {
      try {
        return fs2.realpathSync(p);
      } catch {
        return p;
      }
    };
    textOf = (payload) => (payload.content || []).map((c) => c?.text || "").join("\n");
  }
});

// src/session.js
var session_exports = {};
__export(session_exports, {
  detectSession: () => detectSession,
  parseLaunchFlags: () => parseLaunchFlags,
  processArgs: () => processArgs,
  processCwd: () => processCwd
});
import { execFileSync } from "node:child_process";
import path3 from "node:path";
import os from "node:os";
function ps(pid) {
  try {
    const out = execFileSync("ps", ["-o", "ppid=,comm=", "-p", String(pid)], { encoding: "utf8" }).trim();
    const m = out.match(/^(\d+)\s+(.*)$/);
    return m ? { ppid: Number(m[1]), comm: m[2] } : null;
  } catch {
    return null;
  }
}
function processCwd(pid) {
  try {
    if (process.platform === "linux") return execFileSync("readlink", [`/proc/${pid}/cwd`], { encoding: "utf8" }).trim();
    const out = execFileSync("lsof", ["-a", "-p", String(pid), "-d", "cwd", "-Fn"], { encoding: "utf8" });
    const line = out.split("\n").find((l) => l.startsWith("n"));
    return line ? line.slice(1) : null;
  } catch {
    return null;
  }
}
function detectSession(env = process.env, startPid = process.ppid) {
  const s = { harness: null, pid: null, sessionId: null, bootCwd: null, detectedBy: [] };
  if (env.CLAUDECODE === "1" || env.CLAUDE_CODE_SESSION_ID) {
    s.harness = "claude";
    s.sessionId = env.CLAUDE_CODE_SESSION_ID || null;
    if (env.CLAUDE_PID) s.pid = Number(env.CLAUDE_PID);
    s.detectedBy.push("env");
  } else if (env.CODEX_THREAD_ID || env.CODEX_SESSION_ID || env.CODEX_MANAGED_BY_NPM || env.CODEX_SANDBOX) {
    s.harness = "codex";
    s.sessionId = env.CODEX_THREAD_ID || env.CODEX_SESSION_ID || null;
    s.detectedBy.push("env");
  } else if (env.OPENCODE || env.OPENCODE_SESSION_ID) {
    s.harness = "opencode";
    s.sessionId = env.OPENCODE_SESSION_ID || null;
    s.detectedBy.push("env");
  }
  if (!s.pid) {
    let pid = startPid;
    for (let i = 0; i < 12 && pid > 1; i++) {
      const info = ps(pid);
      if (!info) break;
      const hit = HARNESS_BY_COMM.find(([re]) => re.test(info.comm));
      if (hit && (!s.harness || s.harness === hit[1])) {
        s.harness = hit[1];
        s.pid = pid;
        s.detectedBy.push("process-tree");
        break;
      }
      pid = info.ppid;
    }
  }
  let argv = null;
  if (s.pid) {
    argv = processArgs(s.pid);
    const host = argv && /(?:^| )(app-server|exec-server)(?: |$)/.test(argv.join(" "));
    const cwd = host ? null : processCwd(s.pid);
    if (cwd) {
      s.bootCwd = path3.resolve(cwd);
      s.detectedBy.push("process-cwd");
    }
    if (host) s.detectedBy.push("codex-host-process");
  }
  if (s.harness === "codex" && s.sessionId) {
    const cwd = codexThreadCwd({ home: os.homedir(), env, threadId: s.sessionId });
    if (cwd) {
      s.bootCwd = path3.resolve(cwd);
      s.detectedBy.push("codex-rollout-cwd");
    }
  }
  if (argv) s.launch = parseLaunchFlags(argv, s.bootCwd || process.cwd());
  return s;
}
function processArgs(pid) {
  try {
    if (process.platform === "linux") {
      return execFileSync("cat", [`/proc/${pid}/cmdline`], { encoding: "utf8" }).split("\0").filter(Boolean);
    }
    const raw = execFileSync("ps", ["-ww", "-o", "args=", "-p", String(pid)], { encoding: "utf8" }).trim();
    const parts = raw.split(/ (?=--?[A-Za-z])/);
    const out = [];
    for (const p of parts) {
      const m = p.match(/^(--?[A-Za-z][\w-]*)(?:[ =]([\s\S]*))?$/);
      if (m) {
        out.push(m[1]);
        if (m[2] !== void 0) out.push(m[2]);
      } else out.push(p);
    }
    return out;
  } catch {
    return null;
  }
}
function parseLaunchFlags(argv, baseDir) {
  const launch = { argv0: argv[0] };
  for (let i = 1; i < argv.length; i++) {
    const flag = argv[i];
    if (MULTI[flag] && i + 1 < argv.length) {
      const key = MULTI[flag];
      let val = argv[++i];
      if (/^[{[]/.test(val.trim())) {
        try {
          val = { inline: JSON.parse(val) };
        } catch {
          val = { inline: null, unparsed: true };
        }
      } else if (key !== "configOverrides" && key !== "profile") {
        val = { path: path3.resolve(baseDir, val) };
      }
      (launch[key] ||= []).push(val);
    } else if (BOOL[flag]) {
      launch[BOOL[flag]] = true;
      if ((flag === "--append-system-prompt" || flag === "--system-prompt") && i + 1 < argv.length && !argv[i + 1].startsWith("-")) i++;
    }
  }
  return launch;
}
var HARNESS_BY_COMM, MULTI, BOOL;
var init_session = __esm({
  "src/session.js"() {
    init_codex();
    HARNESS_BY_COMM = [
      [/(^|\/)claude$/, "claude"],
      [/(^|\/)codex$|codex-[a-z0-9_-]+$/, "codex"],
      [/(^|\/)opencode$/, "opencode"]
    ];
    MULTI = {
      "--settings": "settings",
      "--mcp-config": "mcpConfig",
      "--plugin-dir": "pluginDirs",
      "--add-dir": "addDirs",
      "--append-system-prompt-file": "appendSystemPromptFiles",
      "--system-prompt-file": "systemPromptFiles",
      "--agents": "agents",
      "-c": "configOverrides",
      "--config": "configOverrides",
      "--profile": "profile"
    };
    BOOL = { "--strict-mcp-config": "strictMcpConfig", "--append-system-prompt": "appendSystemPrompt", "--system-prompt": "systemPrompt", "--bare": "bare" };
  }
});

// src/harness/claude.js
import path4 from "node:path";
function globToRegex(g) {
  let re = "";
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === "*") {
      if (g[i + 1] === "*") {
        i++;
        if (g[i + 1] === "/") {
          i++;
          re += "(?:.*/)?";
        } else re += ".*";
      } else re += "[^/]*";
    } else if (c === "?") re += "[^/]";
    else re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${re}$`);
}
function auditClaude(ctx) {
  const { home, env = {}, platform = process.platform } = ctx;
  const launch = ctx.launch || {};
  const cwd = canonical(ctx.cwd);
  const managedDir = ctx.managedDir || defaultManagedDir(platform);
  const warnings = [];
  const items = [];
  const push = (f) => {
    const it = item({ harness: H, ...f });
    items.push(it);
    return it;
  };
  const projectRoot = findRoot(cwd) || cwd;
  const userDir = path4.join(home, ".claude");
  const claudeJsonPath = path4.join(home, ".claude.json");
  const loadJson = (p) => {
    const d = readJson(p);
    if (d && d.__parseError) {
      warnings.push(`parse error in ${p}: ${d.__parseError}`);
      return null;
    }
    return d;
  };
  const claudeJson = loadJson(claudeJsonPath) || {};
  const projectsCfg = claudeJson.projects || {};
  const projKeys = [.../* @__PURE__ */ new Set([cwd, projectRoot])];
  const trusted = ancestors(cwd).some((d) => projectsCfg[d]?.hasTrustDialogAccepted === true);
  const projCfgs = projKeys.map((k) => projectsCfg[k]).filter(Boolean);
  for (const k of projKeys) {
    if (!projectsCfg[k]) {
      const ci = Object.keys(projectsCfg).find((x) => x.toLowerCase() === k.toLowerCase());
      if (ci) warnings.push(`~/.claude.json has project key "${ci}" that differs only by case from "${k}"; Claude Code keys by exact string, so it does not apply`);
    }
  }
  const sources = [];
  const addSource = (scope, p, via) => {
    if (!isFile(p)) return;
    const data = loadJson(p);
    if (data && typeof data === "object") sources.push({ scope, path: p, data, via });
  };
  addSource("user", path4.join(userDir, "settings.json"));
  const settingsDirs = [cwd];
  for (const d of settingsDirs) addSource("project", path4.join(d, ".claude", "settings.json"));
  for (const d of settingsDirs) addSource("local", path4.join(d, ".claude", "settings.local.json"));
  for (const s of asArray(launch.settings)) {
    if (s.path) addSource("local", s.path, "--settings");
    else if (s.inline && typeof s.inline === "object") sources.push({ scope: "local", path: "inline:--settings", data: s.inline, via: "--settings" });
  }
  addSource("managed", path4.join(managedDir, "managed-settings.json"));
  const mdDir = path4.join(managedDir, "managed-settings.d");
  for (const e of listDir(mdDir).filter((x) => x.name.endsWith(".json")).sort((a, b) => a.name.localeCompare(b.name))) {
    addSource("managed", path4.join(mdDir, e.name));
  }
  if (!trusted && sources.some((s) => s.scope === "project")) {
    warnings.push("folder has no recorded trust in ~/.claude.json: project settings.json MCP approval keys and project hooks may be ignored");
  }
  const scalar = (key, pred = () => true) => {
    let v;
    let from = null;
    for (const s of sources) if (key in s.data && pred(s)) {
      v = s.data[key];
      from = s.path;
    }
    return { v, from };
  };
  const union = (key, pred = () => true) => [...new Set(sources.filter(pred).flatMap((s) => asArray(s.data[key])))];
  const enabledPlugins = {};
  for (const s of sources) {
    for (const [k, v] of Object.entries(s.data.enabledPlugins || {})) enabledPlugins[k] = { v: !!v, from: s.path };
  }
  const nonManagedDisable = scalar("disableAllHooks", (s) => s.scope !== "managed").v === true;
  const managedDisable = scalar("disableAllHooks", (s) => s.scope === "managed").v === true;
  let order = 0;
  const excludes = union("claudeMdExcludes").map((g) => globToRegex(g.startsWith("~/") ? path4.join(home, g.slice(2)) : g));
  const isExcluded = (p) => excludes.some((r) => r.test(p));
  const seenBoot = /* @__PURE__ */ new Set();
  function addBootstrap(p, scope, status0, extra = {}, kind = "bootstrap", hop = 0, importedBy = null, nameOverride = null) {
    const rp = canonical(p);
    if (seenBoot.has(rp)) return null;
    const text0 = readText(p);
    if (text0 !== null && !text0.trim()) return null;
    let unreadable = false;
    if (text0 === null) {
      unreadable = true;
      warnings.push(`unreadable now, status unknown: ${p}`);
    }
    seenBoot.add(rp);
    let status = status0;
    let reason = extra.reason;
    if (unreadable) {
      status = "unknown";
      reason = "file exists but cannot be read now (iCloud-evicted or locked); may have loaded when the session started";
    }
    if (scope !== "managed" && isExcluded(p)) {
      status = "disabled";
      reason = "matched claudeMdExcludes";
    }
    const { reason: _r, ...rest } = extra;
    const it = push({
      kind,
      name: nameOverride || path4.basename(p),
      scope,
      status,
      path: p,
      reason,
      details: { order: ++order, bytes: fileSize(p), ...importedBy ? { importedBy, hop } : {}, ...rest }
    });
    expandImports(p, it, scope, hop);
    return it;
  }
  function findImports(text) {
    const stripped = text.replace(/<!--[\s\S]*?-->/g, "").replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, "").replace(/`[^`\n]*`/g, "");
    const out = [];
    for (const m of stripped.matchAll(/(?:^|[\s(])@((?:\\ |[^\s)\]`])+)/g)) out.push(m[1]);
    return out;
  }
  function resolveImport(raw, fromFile) {
    const tries = [raw, raw.replace(/[.,;:!?]+$/, "")];
    for (const t of tries) {
      let q = t.replace(/\\ /g, " ");
      if (q === "~" || q.startsWith("~/")) q = path4.join(home, q.slice(1));
      const abs = path4.isAbsolute(q) ? q : path4.resolve(path4.dirname(fromFile), q);
      if (isFile(abs)) return abs;
    }
    return null;
  }
  function expandImports(file, parentItem, scope, hop) {
    if (hop >= IMPORT_MAX_HOPS) return;
    if (parentItem.status === "disabled" || parentItem.status === "shadowed") return;
    const text = readText(file);
    if (!text) return;
    for (const raw of findImports(text)) {
      const abs = resolveImport(raw, file);
      if (!abs) continue;
      let status = parentItem.status;
      let reason;
      const external = !abs.startsWith(cwd + path4.sep) && abs !== cwd;
      if (external && scope !== "user" && scope !== "managed") {
        const approved = projCfgs.some((c) => c.hasClaudeMdExternalIncludesApproved === true);
        if (!approved) {
          status = "needs-approval";
          reason = "external import outside cwd not yet approved (~/.claude.json hasClaudeMdExternalIncludesApproved)";
        }
      }
      addBootstrap(abs, scope, status, { reason }, "bootstrap", hop + 1, file, `@${raw}`);
    }
  }
  const ruleStatus = (p) => {
    const fm = readFrontmatter(p);
    const paths = asArray(fm?.data?.paths);
    return paths.length ? { status: "conditional", extra: { paths, reason: "path-scoped rule: loads when matching files are touched" } } : { status: "active", extra: {} };
  };
  function walkRules(dir, scope) {
    const out = [];
    const rec = (d, rel) => {
      for (const e of listDir(d).sort((a, b) => a.name.localeCompare(b.name))) {
        const p = path4.join(d, e.name);
        if (isDir(p)) rec(p, path4.join(rel, e.name));
        else if (e.name.endsWith(".md") && isFile(p)) out.push([p, path4.join(rel, e.name)]);
      }
    };
    rec(dir, "");
    for (const [p, rel] of out) {
      const r = ruleStatus(p);
      addBootstrap(p, scope, r.status, r.extra, "rule", 0, null, rel);
    }
  }
  if (isFile(path4.join(managedDir, "CLAUDE.md"))) addBootstrap(path4.join(managedDir, "CLAUDE.md"), "managed", "active");
  const userMd = path4.join(userDir, "CLAUDE.md");
  if (isFile(userMd)) addBootstrap(userMd, "user", "active");
  walkRules(path4.join(userDir, "rules"), "user");
  const chain = ancestors(cwd).reverse();
  const agentsCandidates = [];
  let haveClaudeMd = false;
  for (const d of chain) {
    const scopeFor = d === cwd || d === projectRoot ? "project" : "ancestor";
    for (const [rel, scope] of [["CLAUDE.md", scopeFor], [".claude/CLAUDE.md", scopeFor], ["CLAUDE.local.md", "local"]]) {
      const p = path4.join(d, rel);
      if (!isFile(p)) continue;
      if (canonical(p) === canonical(userMd)) continue;
      const t = readText(p);
      if (t !== null && !t.trim()) continue;
      haveClaudeMd = true;
      addBootstrap(p, scope, "active");
    }
    for (const rel of ["AGENTS.md", ".claude/AGENTS.md"]) {
      const p = path4.join(d, rel);
      if (isFile(p)) agentsCandidates.push([p, scopeFor]);
    }
  }
  for (const [p, scope] of agentsCandidates) {
    if (haveClaudeMd) {
      push({ kind: "bootstrap", name: path4.basename(p), scope, status: "shadowed", path: p, reason: "AGENTS.md ignored: a CLAUDE.md/CLAUDE.local.md exists in cwd or above", details: { bytes: fileSize(p) } });
    } else addBootstrap(p, scope, "active", { reason: "AGENTS.md fallback: no CLAUDE.md found" });
  }
  for (const d of /* @__PURE__ */ new Set([projectRoot, cwd])) walkRules(path4.join(d, ".claude", "rules"), "project");
  const memFile = path4.join(userDir, "projects", projectRoot.replace(/[^a-zA-Z0-9]/g, "-"), "memory", "MEMORY.md");
  if (isFile(memFile)) addBootstrap(memFile, "user", "active", { autoMemory: true, reason: "auto memory index (first 200 lines / 25KB)" });
  const addDirs = asArray(launch.addDirs).map((d) => d.path).filter(Boolean);
  for (const d of addDirs) {
    for (const rel of ["CLAUDE.md", ".claude/CLAUDE.md", "CLAUDE.local.md"]) {
      const p = path4.join(d, rel);
      if (isFile(p)) addBootstrap(p, rel === "CLAUDE.local.md" ? "local" : "project", "active", { via: "--add-dir" });
    }
    walkRules(path4.join(d, ".claude", "rules"), "project");
  }
  for (const [key, flag, reason] of [["appendSystemPromptFiles", "--append-system-prompt-file", "appended to the system prompt"], ["systemPromptFiles", "--system-prompt-file", "replaces the default system prompt"]]) {
    for (const f of asArray(launch[key])) {
      if (!f.path) continue;
      push({ kind: "bootstrap", name: path4.basename(f.path), scope: "local", status: isFile(f.path) ? "active" : "unknown", path: f.path, reason, details: { order: ++order, bytes: fileSize(f.path), via: flag } });
    }
  }
  const hookKeys = /* @__PURE__ */ new Set();
  function eventMap(map) {
    return map && typeof map === "object" && !Array.isArray(map) ? map : {};
  }
  function addHooks(map, base) {
    for (const [event, groups] of Object.entries(eventMap(map))) {
      for (const g of asArray(groups)) {
        for (const h of asArray(g?.hooks)) {
          const matcher = g.matcher || "";
          const details = { event, matcher, type: h.type || "command" };
          if (base.via) details.via = base.via;
          if (h.command) details.command = h.command;
          if (h.url) details.url = scrubUrl(h.url);
          if (h.server) details.server = h.server;
          if (h.tool) details.tool = h.tool;
          if (h.prompt) details.prompt = String(h.prompt).slice(0, 120);
          let status = base.status || "active";
          let reason = base.reason;
          if (status === "active" && base.disabled) {
            status = "disabled";
            reason = "disableAllHooks is set";
          }
          if (base.dedupe && status === "active") {
            const key = JSON.stringify([event, matcher, h]);
            if (hookKeys.has(key)) {
              status = "shadowed";
              reason = "identical handler already defined in a higher-precedence-listed settings file; runs once";
            } else hookKeys.add(key);
          }
          push({ kind: "hook", name: `${event}:${matcher || "*"}`, scope: base.scope, status, path: base.path, plugin: base.plugin, reason, details: redact(details) });
        }
      }
    }
  }
  for (const s of sources) {
    const disabled = s.scope === "managed" ? managedDisable : nonManagedDisable || managedDisable;
    addHooks(s.data.hooks, { scope: s.scope, path: s.path, disabled, dedupe: true, via: s.via });
  }
  const installedPath = path4.join(userDir, "plugins", "installed_plugins.json");
  const installed = loadJson(installedPath)?.plugins || {};
  const activePlugins = [];
  const knownMkts = loadJson(path4.join(userDir, "plugins", "known_marketplaces.json")) || {};
  const mktCache = {};
  function marketplaceEntry(id) {
    const [pname, mkt] = id.split("@");
    if (!mkt || !knownMkts[mkt]) return null;
    mktCache[mkt] ??= loadJson(path4.join(knownMkts[mkt].installLocation || "", ".claude-plugin", "marketplace.json")) || {};
    return asArray(mktCache[mkt].plugins).find((e) => e.name === pname) || null;
  }
  for (const [id, entries] of Object.entries(installed)) {
    const apps = asArray(entries).filter((e2) => {
      if (e2.scope === "project" || e2.scope === "local") return e2.projectPath && [cwd, projectRoot].some((k) => k === e2.projectPath || k.startsWith(e2.projectPath + path4.sep));
      return true;
    });
    if (!apps.length) continue;
    const e = apps.find((x) => x.scope === "project" || x.scope === "local") || apps[0];
    const root = e.installPath;
    const manifestPath = path4.join(root, ".claude-plugin", "plugin.json");
    const manifest = isFile(manifestPath) ? loadJson(manifestPath) || {} : {};
    const en = enabledPlugins[id];
    let status;
    let reason;
    if (en) {
      status = en.v ? "active" : "disabled";
      if (!en.v) reason = "enabledPlugins is false";
    } else if (manifest.defaultEnabled === false) {
      status = "disabled";
      reason = "not in enabledPlugins and defaultEnabled is false";
    } else {
      status = "active";
      reason = "not in enabledPlugins; defaultEnabled defaults to true";
    }
    if (status === "active" && !isDir(root)) {
      status = "disabled";
      reason = `installPath missing: ${root}`;
    }
    const name = id.split("@")[0];
    const scope = ["user", "project", "local", "managed"].includes(e.scope) ? e.scope : "user";
    push({
      kind: "plugin",
      name: id,
      scope,
      status,
      reason,
      path: isFile(manifestPath) ? manifestPath : installedPath,
      definedIn: en?.from || installedPath,
      details: { version: e.version, installPath: root, description: manifest.description, installScope: e.scope }
    });
    if (status === "active") activePlugins.push({ id, name: manifest.name || name, root, manifest, manifestPath, entry: marketplaceEntry(id) });
  }
  for (const pd of asArray(launch.pluginDirs)) {
    const root = pd.path;
    if (!root || !isDir(root)) {
      warnings.push(`--plugin-dir not found: ${root}`);
      continue;
    }
    const manifestPath = path4.join(root, ".claude-plugin", "plugin.json");
    const manifest = isFile(manifestPath) ? loadJson(manifestPath) || {} : {};
    const name = manifest.name || path4.basename(root);
    const id = `${name}@inline`;
    push({ kind: "plugin", name: id, scope: "local", status: "active", reason: "loaded via --plugin-dir", path: isFile(manifestPath) ? manifestPath : root, details: { installPath: root, description: manifest.description, via: "--plugin-dir" } });
    activePlugins.push({ id, name, root, manifest, manifestPath });
  }
  for (const pl of activePlugins) {
    const base = { scope: "plugin", plugin: pl.id, disabled: nonManagedDisable || managedDisable };
    const hooksJson = path4.join(pl.root, "hooks", "hooks.json");
    if (isFile(hooksJson)) addHooks(loadJson(hooksJson)?.hooks, { ...base, path: hooksJson });
    for (const h of asArray(pl.manifest.hooks)) {
      if (typeof h === "string") {
        const hp = path4.resolve(pl.root, h);
        if (isFile(hp)) addHooks(loadJson(hp)?.hooks, { ...base, path: hp });
      } else addHooks(h, { ...base, path: pl.manifestPath });
    }
  }
  const mcpCands = [];
  const RANK = { managed: 0, local: 1, project: 2, user: 3, plugin: 4 };
  function addMcp(name, cfg, scope, p, extra = {}) {
    if (!cfg || typeof cfg !== "object") return;
    const transport = cfg.type || (cfg.url ? "http" : "stdio");
    const details = { transport };
    if (cfg.command) details.command = cfg.command;
    if (cfg.args) details.args = scrubArgs(cfg.args);
    if (cfg.url) details.url = scrubUrl(cfg.url);
    if (cfg.env) details.env = cfg.env;
    if (cfg.headers) details.headers = cfg.headers;
    if (extra.toolPrefix) details.toolPrefix = extra.toolPrefix;
    if (extra.via) details.via = extra.via;
    mcpCands.push({ name, scope, rank: RANK[scope], status: extra.status || "active", reason: extra.reason, path: p, plugin: extra.plugin, definedIn: extra.definedIn, cli: !!extra.via, url: cfg.url ? String(cfg.url).replace(/\/+$/, "").toLowerCase() : void 0, details: redact(details) });
  }
  const managedMcp = path4.join(managedDir, "managed-mcp.json");
  if (isFile(managedMcp)) {
    const d = loadJson(managedMcp);
    for (const [n, c] of Object.entries(d?.mcpServers || {})) addMcp(n, c, "managed", managedMcp);
  }
  for (const s of sources.filter((x) => x.scope === "managed")) {
    for (const [n, c] of Object.entries(s.data.managedMcpServers || {})) addMcp(n, c, "managed", s.path);
  }
  for (const m of asArray(launch.mcpConfig)) {
    const d = m.path ? loadJson(m.path) : m.inline;
    const map = d?.mcpServers || d || {};
    for (const [n, c] of Object.entries(map)) addMcp(n, c, "local", m.path || "inline:--mcp-config", { via: "--mcp-config" });
  }
  for (const k of projKeys) {
    for (const [n, c] of Object.entries(projectsCfg[k]?.mcpServers || {})) addMcp(n, c, "local", claudeJsonPath, { reason: `projects["${k}"]` });
  }
  const projTrustedSetting = (s) => s.scope !== "project" || trusted;
  const enableAll = scalar("enableAllProjectMcpServers", projTrustedSetting).v === true;
  const enabledNames = /* @__PURE__ */ new Set([...union("enabledMcpjsonServers", projTrustedSetting), ...projCfgs.flatMap((c) => asArray(c.enabledMcpjsonServers))]);
  const disabledNames = /* @__PURE__ */ new Set([...union("disabledMcpjsonServers", projTrustedSetting), ...projCfgs.flatMap((c) => asArray(c.disabledMcpjsonServers))]);
  const mcpJsonDirs = ancestors(cwd);
  const seenMcpNames = /* @__PURE__ */ new Set();
  for (const dir of mcpJsonDirs) {
    const mcpJson = path4.join(dir, ".mcp.json");
    if (!isFile(mcpJson)) continue;
    const d = loadJson(mcpJson);
    for (const [n, c] of Object.entries(d?.mcpServers || {})) {
      if (seenMcpNames.has(n)) continue;
      seenMcpNames.add(n);
      let status;
      let reason;
      if (disabledNames.has(n)) {
        status = "disabled";
        reason = "in disabledMcpjsonServers";
      } else if (enableAll) {
        status = "active";
        reason = "enableAllProjectMcpServers";
      } else if (enabledNames.has(n)) {
        status = "active";
        reason = "in enabledMcpjsonServers";
      } else {
        status = "needs-approval";
        reason = "project .mcp.json server not yet approved";
      }
      addMcp(n, c, "project", mcpJson, { status, reason });
    }
  }
  for (const [names, from] of [
    ...projCfgs.map((c) => [asArray(c.enabledMcpjsonServers), claudeJsonPath]),
    ...sources.filter(projTrustedSetting).map((src) => [asArray(src.data.enabledMcpjsonServers), src.path])
  ]) {
    for (const n of names) {
      if (seenMcpNames.has(n) || mcpCands.some((c) => c.name === n && c.stale)) continue;
      mcpCands.push({ name: n, scope: "project", rank: RANK.project, status: "disabled", reason: "listed in enabledMcpjsonServers but no .mcp.json defines it (stale approval)", path: from, stale: true, details: { transport: "unknown" } });
    }
  }
  for (const [n, c] of Object.entries(claudeJson.mcpServers || {})) addMcp(n, c, "user", claudeJsonPath);
  for (const pl of activePlugins) {
    const files = [path4.join(pl.root, ".mcp.json")];
    const inline = [];
    for (const m of asArray(pl.manifest.mcpServers)) {
      if (typeof m === "string") files.push(path4.resolve(pl.root, m));
      else inline.push(m);
    }
    const defs2 = [];
    for (const f of files) {
      if (!isFile(f) || !f.endsWith(".json")) continue;
      const d = loadJson(f);
      defs2.push([f, d?.mcpServers || d || {}]);
    }
    for (const m of inline) defs2.push([pl.manifestPath, m]);
    for (const [f, map] of defs2) {
      for (const [n, c] of Object.entries(map)) {
        if (!c || typeof c !== "object") continue;
        addMcp(n, c, "plugin", f, { plugin: pl.id, toolPrefix: `mcp__plugin_${pl.name}_${n}__` });
      }
    }
  }
  if (launch.strictMcpConfig) {
    for (const c of mcpCands) if (!c.cli) {
      c.status = "disabled";
      c.reason = "--strict-mcp-config";
    }
    warnings.push("--strict-mcp-config: only --mcp-config servers apply; claude.ai connectors are also excluded");
  }
  mcpCands.sort((a, b) => a.rank - b.rank);
  const winnerName = /* @__PURE__ */ new Map();
  const winnerUrl = /* @__PURE__ */ new Map();
  for (const c of mcpCands) {
    if (c.status === "disabled") continue;
    const byName = c.scope === "plugin" ? null : winnerName.get(c.name);
    const byUrl = c.url && winnerUrl.get(c.url);
    if (byName || byUrl) {
      const w = byName || byUrl;
      c.status = "shadowed";
      c.reason = `overridden by ${w.scope} server "${w.name}" (${w.path})`;
    } else {
      if (c.scope !== "plugin") winnerName.set(c.name, c);
      if (c.url) winnerUrl.set(c.url, c);
    }
  }
  for (const c of mcpCands) {
    push({ kind: "mcp", name: c.name, scope: c.scope, status: c.status, path: c.path, plugin: c.plugin, reason: c.reason, details: c.details });
  }
  for (const n of asArray(claudeJson.claudeAiMcpEverConnected)) {
    push({ kind: "mcp", name: String(n).replace(/[^a-zA-Z0-9_-]/g, "_"), scope: "remote", status: "unknown", path: claudeJsonPath, reason: "claude.ai connector listed in claudeAiMcpEverConnected; whether it loads this session depends on the account", details: { transport: "claude.ai", connector: n } });
  }
  if (claudeJson.hasCompletedClaudeInChromeOnboarding || claudeJson.claudeInChromeDefaultEnabled) {
    push({ kind: "mcp", name: "claude-in-chrome", scope: "builtin", status: "active", path: claudeJsonPath, reason: "built-in Claude in Chrome integration (claudeInChromeDefaultEnabled / onboarding in ~/.claude.json); not defined by any server config", details: { transport: "builtin" } });
  }
  const loadedNames = new Set(items.filter((i) => i.kind === "mcp" && i.status === "active").map((i) => i.name));
  for (const s of sources) {
    for (const [n, c] of Object.entries(s.data.mcpServers || {})) {
      const details = { transport: c?.type || (c?.url ? "http" : "stdio") };
      if (c?.command) details.command = c.command;
      if (c?.url) details.url = scrubUrl(c.url);
      const reason = loadedNames.has(n) ? `ignored here: Claude Code does not read mcpServers from settings files. "${n}" still loads from its definition in ~/.claude.json or .mcp.json` : "ignored: Claude Code does not read mcpServers from settings files. Move it to ~/.claude.json (claude mcp add) or .mcp.json for it to load";
      push({ kind: "mcp", name: n, scope: s.scope, status: "disabled", path: s.path, reason, details: redact(details) });
    }
  }
  warnings.push("claude.ai connectors cannot be detected from local files; list them from a live session (/mcp)");
  const skillRank = { managed: 0, user: 1, project: 2 };
  const agentRank = { managed: 0, project: 1, user: 2 };
  const defs = { skill: [], command: [], agent: [] };
  const truthy = (v) => v === true || typeof v === "string" && /^(true|yes|on|1)$/i.test(v.trim()) || v === 1;
  const fmDetails = (fm, alias) => {
    const d = {};
    if (alias) d.alias = alias;
    d.modelInvocable = !truthy(fm?.data?.["disable-model-invocation"]);
    if (fm?.data?.description) d.description = String(fm.data.description).slice(0, 300);
    for (const k of ["disable-model-invocation", "user-invocable", "context", "model", "paths"]) if (fm?.data?.[k] != null) d[k] = fm.data[k];
    return d;
  };
  function skillFromDir(dir, scope, prefix, plugin, rootFallback = false) {
    const f = path4.join(dir, "SKILL.md");
    if (!isFile(f)) return;
    const fm = readFrontmatter(f);
    const n = String(rootFallback ? fm?.data?.name || path4.basename(dir) : path4.basename(dir));
    const alias = fm?.data?.name && String(fm.data.name) !== n ? String(fm.data.name) : null;
    defs.skill.push({ name: prefix ? `${prefix}:${n}` : n, scope, path: f, plugin, fm, alias });
  }
  let rootDir = null;
  function skillsIn(dir, scope, prefix, plugin) {
    if (isFile(path4.join(dir, "SKILL.md"))) {
      skillFromDir(dir, scope, prefix, plugin, scope === "plugin" && dir === rootDir);
      return;
    }
    for (const s of subdirs(dir)) skillFromDir(path4.join(dir, s), scope, prefix, plugin);
  }
  function mdFiles(dir) {
    const out = [];
    const rec = (d, rel) => {
      for (const e of listDir(d).sort((a, b) => a.name.localeCompare(b.name))) {
        const p = path4.join(d, e.name);
        if (isDir(p)) rec(p, [...rel, e.name]);
        else if (e.name.endsWith(".md") && isFile(p)) out.push([p, [...rel, e.name.slice(0, -3)]]);
      }
    };
    rec(dir, []);
    return out;
  }
  function cmdsIn(dir, scope, prefix, plugin) {
    for (const [p, parts] of mdFiles(dir)) {
      const n = parts.join(":");
      defs.command.push({ name: prefix ? `${prefix}:${n}` : n, scope, path: p, plugin, fm: readFrontmatter(p) });
    }
  }
  function agentsIn(dir, scope, prefix, plugin) {
    for (const [p, parts] of mdFiles(dir)) {
      const fm = readFrontmatter(p);
      const n = String(fm?.data?.name || parts.join(":"));
      defs.agent.push({ name: prefix ? `${prefix}:${n}` : n, scope, path: p, plugin, fm });
    }
  }
  const seenDirs = /* @__PURE__ */ new Set();
  const scanClaudeDir = (cdir, scope) => {
    const rp = canonical(cdir);
    if (seenDirs.has(rp + scope)) return;
    seenDirs.add(rp + scope);
    skillsIn(path4.join(cdir, "skills"), scope);
    cmdsIn(path4.join(cdir, "commands"), scope);
    agentsIn(path4.join(cdir, "agents"), scope);
  };
  scanClaudeDir(managedDir.endsWith(".claude") ? managedDir : path4.join(managedDir, ".claude"), "managed");
  scanClaudeDir(userDir, "user");
  const syncedRoot = path4.join(userDir, "skills", "synced");
  for (const bucket of subdirs(syncedRoot)) skillsIn(path4.join(syncedRoot, bucket), "user", "anthropic-skills");
  const userReal = canonical(userDir);
  for (const d of ancestors(cwd, projectRoot)) {
    if (canonical(path4.join(d, ".claude")) === userReal) continue;
    scanClaudeDir(path4.join(d, ".claude"), "project");
  }
  for (const d of addDirs) scanClaudeDir(path4.join(d, ".claude"), "project");
  for (const pl of activePlugins) {
    const m = pl.manifest;
    const pre = pl.name;
    const resolve = (p) => path4.resolve(pl.root, p);
    rootDir = pl.root;
    const entrySkills = asArray(pl.entry?.skills);
    if (entrySkills.length) for (const sk of entrySkills) skillsIn(resolve(sk), "plugin", pre, pl.id);
    else if (isDir(path4.join(pl.root, "skills"))) skillsIn(path4.join(pl.root, "skills"), "plugin", pre, pl.id);
    else if (isFile(path4.join(pl.root, "SKILL.md")) && !m.skills) skillFromDir(pl.root, "plugin", pre, pl.id, true);
    for (const s of asArray(m.skills)) skillsIn(resolve(s), "plugin", pre, pl.id);
    if (m.commands == null) cmdsIn(path4.join(pl.root, "commands"), "plugin", pre, pl.id);
    else if (typeof m.commands === "object" && !Array.isArray(m.commands)) {
      for (const [n, v] of Object.entries(m.commands)) {
        const p = v?.source ? resolve(v.source) : pl.manifestPath;
        defs.command.push({ name: `${pre}:${n}`, scope: "plugin", path: p, plugin: pl.id, fm: { data: { description: v?.description } } });
      }
    } else {
      for (const c of asArray(m.commands)) {
        const p = resolve(c);
        if (isDir(p)) cmdsIn(p, "plugin", pre, pl.id);
        else if (isFile(p)) defs.command.push({ name: `${pre}:${path4.basename(p, ".md")}`, scope: "plugin", path: p, plugin: pl.id, fm: readFrontmatter(p) });
      }
    }
    if (m.agents == null) agentsIn(path4.join(pl.root, "agents"), "plugin", pre, pl.id);
    else {
      for (const a of asArray(m.agents)) {
        const p = resolve(a);
        if (!isFile(p)) continue;
        const fm = readFrontmatter(p);
        defs.agent.push({ name: `${pre}:${String(fm?.data?.name || path4.basename(p, ".md"))}`, scope: "plugin", path: p, plugin: pl.id, fm });
      }
    }
  }
  const shadow = (list, rankMap, extraWinners = null) => {
    const best = /* @__PURE__ */ new Map();
    for (const d of list) if (d.scope !== "plugin") best.set(d.name, Math.min(best.get(d.name) ?? 99, rankMap[d.scope]));
    for (const d of list) {
      if (d.scope === "plugin") {
        d.status = "active";
        continue;
      }
      const skillWin = extraWinners?.get(d.name);
      if (skillWin) {
        d.status = "shadowed";
        d.reason = `skill "${d.name}" of the same name wins (${skillWin})`;
      } else if (rankMap[d.scope] > best.get(d.name)) {
        d.status = "shadowed";
        d.reason = `same-name ${Object.keys(rankMap).find((k) => rankMap[k] === best.get(d.name))}-scope item takes precedence`;
      } else d.status = "active";
    }
  };
  shadow(defs.skill, skillRank);
  const skillPaths = new Map(defs.skill.filter((s) => s.status === "active" && s.scope !== "plugin").map((s) => [s.name, s.path]));
  shadow(defs.command, skillRank, skillPaths);
  shadow(defs.agent, agentRank);
  for (const kind of ["skill", "command", "agent"]) {
    for (const d of defs[kind]) {
      let status = d.status;
      let reason = d.reason;
      if (status === "active" && d.fm == null) {
        status = "unknown";
        reason = "file exists but cannot be read now (iCloud-evicted or locked)";
      }
      if (status === "active" && kind === "skill" && asArray(d.fm?.data?.paths).length) {
        status = "conditional";
        reason = "skill has paths frontmatter: auto-loads for matching files";
      }
      push({ kind, name: d.name, scope: d.scope, status, path: d.path, plugin: d.plugin, reason, details: fmDetails(d.fm, d.alias) });
      const fh = d.fm?.data?.hooks;
      if (fh && typeof fh === "object" && d.path.endsWith(".md")) {
        addHooks(fh, { scope: d.scope, path: d.path, plugin: d.plugin, status: "conditional", reason: `${kind} frontmatter hook: registers when the ${kind} is used` });
      }
    }
  }
  const seenIds = /* @__PURE__ */ new Map();
  for (const it of items) {
    const n = (seenIds.get(it.id) || 0) + 1;
    seenIds.set(it.id, n);
    if (n > 1) it.id += `#${n}`;
  }
  return { harness: H, projectRoot, chain, items, warnings };
}
var H, IMPORT_MAX_HOPS, SECRETISH, defaultManagedDir, asArray, scrubUrl, scrubArgs;
var init_claude = __esm({
  "src/harness/claude.js"() {
    init_fsutil();
    init_model();
    H = "claude";
    IMPORT_MAX_HOPS = 4;
    SECRETISH = /(token|secret|key|password|bearer|credential|authorization)/i;
    defaultManagedDir = (platform) => platform === "darwin" ? "/Library/Application Support/ClaudeCode" : platform === "win32" ? "C:\\Program Files\\ClaudeCode" : "/etc/claude-code";
    asArray = (v) => v == null ? [] : Array.isArray(v) ? v : [v];
    scrubUrl = (u) => {
      try {
        const x = new URL(u);
        x.username = "";
        x.password = "";
        x.search = "";
        return x.toString();
      } catch {
        return u;
      }
    };
    scrubArgs = (args) => asArray(args).map((a) => typeof a === "string" && SECRETISH.test(a) && /[=:]/.test(a) ? `${a.split(/[=:]/)[0]}=<redacted>` : a);
  }
});

// src/harness/codex.js
import fs3 from "node:fs";
import path5 from "node:path";
function sameFile(a, b) {
  return real(a) === real(b);
}
function auditCodex(ctx) {
  const home = ctx.home;
  const env = ctx.env || {};
  const cwd = canonical(ctx.cwd);
  const codexHome = env.CODEX_HOME || path5.join(home, ".codex");
  const sysDir = ctx.systemDir || "/etc/codex";
  const warnings = [];
  const items = [];
  const push = (f) => items.push(item({ harness: H2, ...f }));
  const loadToml = (p) => {
    if (!isFile(p)) return null;
    const t = readToml(p);
    if (t?.__parseError) {
      warnings.push(`${p}: TOML parse error: ${t.__parseError}`);
      return null;
    }
    return t;
  };
  const sysCfgPath = path5.join(sysDir, "config.toml");
  const userCfgPath = path5.join(codexHome, "config.toml");
  const sysCfg = loadToml(sysCfgPath) || {};
  const userCfg = loadToml(userCfgPath) || {};
  const launch = ctx.launch || {};
  const profName = [].concat(launch.profile || []).filter(Boolean).pop() || userCfg.profile || sysCfg.profile || null;
  const profPath = profName ? path5.join(codexHome, `${profName}.config.toml`) : null;
  const profFile = profPath ? loadToml(profPath) : null;
  const profInline = profName && isObj(userCfg.profiles?.[profName]) ? userCfg.profiles[profName] : null;
  if (profName && !profFile && !profInline) warnings.push(`profile "${profName}" selected but ${profPath} not found`);
  const profCfg = { ...profInline || {}, ...profFile || {} };
  const profSrc = profFile ? profPath : userCfgPath;
  const ovCfg = {};
  for (const o of launch.configOverrides || []) {
    const eq = String(o).indexOf("=");
    if (eq < 1) {
      warnings.push(`ignored malformed -c override: ${o}`);
      continue;
    }
    const k = o.slice(0, eq).trim();
    const v = o.slice(eq + 1).trim();
    let parsed;
    try {
      parsed = parse(`${k} = ${v}`);
    } catch {
      try {
        parsed = parse(`${k} = ${JSON.stringify(v)}`);
      } catch {
        warnings.push(`ignored unparsable -c override: ${k}`);
        continue;
      }
    }
    deepMerge(ovCfg, parsed);
  }
  const hasOv = Object.keys(ovCfg).length > 0;
  const base = { ...sysCfg, ...userCfg, ...profCfg, ...ovCfg };
  const markers = Array.isArray(base.project_root_markers) && base.project_root_markers.length ? base.project_root_markers : [".git"];
  const fallbacks = Array.isArray(base.project_doc_fallback_filenames) ? base.project_doc_fallback_filenames : [];
  const maxBytes = Number.isFinite(base.project_doc_max_bytes) ? base.project_doc_max_bytes : DEFAULT_MAX_BYTES;
  const projectRoot = findRoot(cwd, markers);
  const dirs = projectRoot ? ancestors(cwd, projectRoot).reverse() : [cwd];
  const scopeOf = (d) => d === cwd ? "project" : "ancestor";
  const projects = { ...sysCfg.projects || {}, ...userCfg.projects || {} };
  const trust = resolveTrust(projects, projectRoot, cwd);
  const trusted = trust.trusted;
  const projLayers = dirs.map((d) => ({ dir: d, codexDir: path5.join(d, ".codex"), scope: scopeOf(d) })).filter((l) => isDir(l.codexDir) && !sameFile(l.codexDir, codexHome));
  const projCfgs = projLayers.map((l) => {
    const p = path5.join(l.codexDir, "config.toml");
    return { ...l, cfgPath: p, cfg: loadToml(p) };
  });
  const chain = [
    { layer: "system", path: sysCfgPath, exists: isFile(sysCfgPath) },
    { layer: "user", path: userCfgPath, exists: isFile(userCfgPath) },
    ...profName ? [{ layer: "profile", name: profName, path: profSrc, exists: !!(profFile || profInline) }] : [],
    ...projCfgs.map((l) => ({
      layer: "project",
      path: l.cfgPath,
      exists: isFile(l.cfgPath),
      trusted,
      trustMatch: trust.match
    })),
    ...hasOv ? [{ layer: "cli", path: "-c", exists: true }] : []
  ];
  const projGate = trusted ? {} : { status: "needs-approval", reason: `project not trusted (${trust.match}); project-layer config, hooks and rules are skipped until trusted` };
  const trustDetails = { trustMatch: trust.match, ...trust.via ? { trustedVia: trust.via } : {} };
  let order = 0;
  const empty = (p) => (readText(p) ?? "").trim().length === 0;
  const globalCands = AGENTS_NAMES.map((n) => path5.join(codexHome, n)).filter(isFile);
  let globalChosen = false;
  for (const p of globalCands) {
    const bytes = fileSize(p);
    if (empty(p)) {
      push({ kind: "bootstrap", name: path5.basename(p), scope: "user", status: "disabled", path: p, reason: "empty", details: { bytes, order: null, global: true } });
    } else if (!globalChosen) {
      globalChosen = true;
      push({ kind: "bootstrap", name: path5.basename(p), scope: "user", status: "active", path: p, details: { bytes, order: order++, global: true } });
    } else {
      push({ kind: "bootstrap", name: path5.basename(p), scope: "user", status: "shadowed", path: p, reason: "only the first non-empty global file is used", details: { bytes, order: null, global: true } });
    }
  }
  let used = 0;
  const names = [...AGENTS_NAMES, ...fallbacks];
  for (const d of dirs) {
    const cands = names.map((n) => path5.join(d, n)).filter(isFile);
    let chosen = false;
    for (const p of cands) {
      if (items.some((i) => i.kind === "bootstrap" && i.path === p)) continue;
      const bytes = fileSize(p);
      const base_ = { kind: "bootstrap", name: path5.basename(p), scope: scopeOf(d), path: p };
      if (empty(p)) {
        push({ ...base_, status: "disabled", reason: "empty", details: { bytes, order: null } });
      } else if (chosen) {
        push({ ...base_, status: "shadowed", reason: "only one file per directory is used", details: { bytes, order: null } });
      } else {
        chosen = true;
        const remaining = maxBytes - used;
        if (remaining <= 0) {
          push({ ...base_, status: "disabled", reason: `project_doc_max_bytes (${maxBytes}) already reached`, details: { bytes, order: null, truncated: true, included: 0 } });
        } else if (bytes > remaining) {
          used = maxBytes;
          push({ ...base_, status: "active", reason: `truncated to fit project_doc_max_bytes (${maxBytes})`, details: { bytes, order: order++, truncated: true, included: remaining } });
        } else {
          used += bytes;
          push({ ...base_, status: "active", details: { bytes, order: order++ } });
        }
      }
    }
  }
  const pluginCfg = { ...sysCfg.plugins || {}, ...userCfg.plugins || {} };
  const activePlugins = [];
  const cacheRoot = path5.join(codexHome, "plugins", "cache");
  const addPlugin = (id, pc, remote) => {
    const [pname, mkt] = id.split("@");
    const enabled = !(pc && pc.enabled === false);
    const cacheBase = path5.join(cacheRoot, mkt || "", pname);
    const versions = isDir(cacheBase) ? [...new Set(listDir(cacheBase).map((e) => path5.join(cacheBase, e.name)).filter(isDir).map(real))].map((p) => ({ dir: p, version: path5.basename(p), mtime: mtime(p) })).sort((a, b) => b.mtime - a.mtime) : [];
    const picked = versions[0];
    const manifestPath = picked ? path5.join(picked.dir, ".codex-plugin", "plugin.json") : null;
    const manifest = manifestPath && isFile(manifestPath) ? readJson(manifestPath) : null;
    const details = { marketplace: mkt, enabled, ...remote ? { remoteInstalled: true } : {}, ...picked ? { version: picked.version, dir: picked.dir } : {} };
    if (versions.length > 1) {
      details.versions = versions.map((v) => v.version);
      details.note = `${versions.length} cached versions; newest by mtime (${picked.version}) selected`;
    }
    if (!picked) {
      push({ kind: "plugin", name: id, scope: "plugin", status: "unknown", path: userCfgPath, plugin: id, reason: "enabled/listed in config but not found in plugin cache", details });
      return;
    }
    push({
      kind: "plugin",
      name: id,
      scope: "plugin",
      status: enabled ? "active" : "disabled",
      path: manifest && !manifest.__parseError ? manifestPath : picked.dir,
      ...remote ? {} : { definedIn: userCfgPath },
      plugin: id,
      ...enabled ? {} : { reason: "plugins.<id>.enabled = false" },
      ...remote ? { reason: "installed via remote plugin marker (.codex-remote-plugin-install.json); not listed in config.toml" } : {},
      details: { ...details, ...manifest?.version ? { manifestVersion: manifest.version } : {}, ...manifest?.description ? { description: manifest.description } : {} }
    });
    if (enabled) activePlugins.push({ id, pname, dir: picked.dir, manifest: manifest && !manifest.__parseError ? manifest : {}, override: pc || {} });
  };
  for (const [id, pc] of Object.entries(pluginCfg)) addPlugin(id, pc, false);
  for (const mk2 of listDir(cacheRoot)) {
    for (const pe of listDir(path5.join(cacheRoot, mk2.name))) {
      const id = `${pe.name}@${mk2.name}`;
      if (id in pluginCfg) continue;
      if (isFile(path5.join(cacheRoot, mk2.name, pe.name, ".codex-remote-plugin-install.json"))) addPlugin(id, {}, true);
    }
  }
  const mcpEntries = [];
  const addMcp = (servers, o) => {
    if (!isObj(servers)) return;
    for (const [name, cfg] of Object.entries(servers)) {
      let c = isObj(cfg) ? cfg : {};
      if (o.via) {
        const prev = mcpEntries.filter((e) => e.name === name).pop();
        if (prev) c = { ...prev.cfg, ...c };
      }
      mcpEntries.push({ name, cfg: c, ...o });
    }
  };
  addMcp(sysCfg.mcp_servers, { scope: "managed", path: sysCfgPath });
  addMcp(userCfg.mcp_servers, { scope: "user", path: userCfgPath });
  if (profName) addMcp(profCfg.mcp_servers, { scope: "user", path: profSrc, profile: profName });
  for (const l of projCfgs) addMcp(l.cfg?.mcp_servers, { scope: l.scope, path: l.cfgPath, project: true });
  addMcp(ovCfg.mcp_servers, { scope: "local", path: "cli:-c", via: "-c" });
  const lastIdx = /* @__PURE__ */ new Map();
  mcpEntries.forEach((e, i) => lastIdx.set(e.name, i));
  mcpEntries.forEach((e, i) => {
    const cfg = e.cfg;
    let gate = {};
    let status = cfg.enabled === false ? "disabled" : "active";
    let reason = cfg.enabled === false ? "enabled = false" : void 0;
    if (e.project && !trusted) {
      status = "needs-approval";
      reason = projGate.reason;
    }
    if (lastIdx.get(e.name) !== i) {
      status = "shadowed";
      reason = "overridden by a higher-precedence layer defining the same server";
    }
    push({
      kind: "mcp",
      name: e.name,
      scope: e.scope,
      status,
      path: e.path,
      ...reason ? { reason } : {},
      details: { ...mcpSummary(cfg), ...e.project ? trustDetails : {}, ...e.via ? { via: e.via } : {}, ...e.profile ? { profile: e.profile } : {}, config: redact(cfg), ...gate }
    });
  });
  for (const pl of activePlugins) {
    const mf = pl.manifest.mcpServers;
    let servers = null;
    let src = null;
    if (isObj(mf)) {
      servers = mf.mcpServers || mf;
      src = path5.join(pl.dir, ".codex-plugin", "plugin.json");
    } else if (typeof mf === "string") {
      const p = path5.join(pl.dir, mf);
      if (isFile(p)) {
        const j = readJson(p);
        if (j?.__parseError) warnings.push(`${p}: ${j.__parseError}`);
        else {
          servers = j?.mcpServers || j;
          src = p;
        }
      }
    }
    if (!isObj(servers)) continue;
    for (const [name, cfg0] of Object.entries(servers)) {
      if (!isObj(cfg0)) continue;
      const ov = pl.override.mcp_servers?.[name] || {};
      const cfg = { ...cfg0, ...ov };
      const disabled = cfg.enabled === false;
      push({
        kind: "mcp",
        name,
        scope: "plugin",
        plugin: pl.id,
        status: disabled ? "disabled" : "active",
        path: src,
        definedIn: userCfgPath,
        ...disabled ? { reason: ov.enabled === false ? "plugins.<id>.mcp_servers override enabled = false" : "enabled = false in plugin .mcp.json" } : {},
        details: { ...mcpSummary(cfg), ...Object.keys(ov).length ? { overridden: Object.keys(ov) } : {}, config: redact(cfg) }
      });
    }
  }
  const skillCfgs = [...sysCfg.skills?.config || [], ...userCfg.skills?.config || []];
  const disabledSkills = /* @__PURE__ */ new Set();
  for (const sc of skillCfgs) {
    if (!isObj(sc) || sc.enabled !== false || typeof sc.path !== "string") continue;
    const p = sc.path.startsWith("~") ? path5.join(home, sc.path.slice(1)) : sc.path;
    disabledSkills.add(real(path5.basename(p) === "SKILL.md" ? path5.dirname(p) : p));
  }
  const seenSkillDirs = /* @__PURE__ */ new Set();
  const skillRecs = [];
  const scanSkills = (root, scope, extra = {}) => {
    if (!isDir(root)) return;
    const rr = real(root);
    if (seenSkillDirs.has(rr + "|" + scope)) return;
    seenSkillDirs.add(rr + "|" + scope);
    for (const e of listDir(root).sort((a, b) => a.name.localeCompare(b.name))) {
      const dir = path5.join(root, e.name);
      if (!isDir(dir)) continue;
      if (e.name === ".system" && extra.allowSystem) {
        scanSkills(dir, "builtin", { ...extra, allowSystem: false });
        continue;
      }
      if (e.name.startsWith(".")) continue;
      const md = path5.join(dir, "SKILL.md");
      if (!isFile(md)) continue;
      const fm = readFrontmatter(md);
      const name = String(fm?.data?.name || e.name);
      const desc = fm?.data?.description;
      const realDir = real(dir);
      const off = disabledSkills.has(realDir) || disabledSkills.has(path5.resolve(dir));
      let allowImplicit;
      const oy = path5.join(realDir, "agents", "openai.yaml");
      if (isFile(oy)) {
        try {
          allowImplicit = import_yaml2.default.parse(readText(oy))?.policy?.allow_implicit_invocation;
        } catch {
        }
      }
      const symlink = realDir !== path5.resolve(dir);
      const noModel = fm?.data?.["disable-model-invocation"] === true || allowImplicit === false;
      const listName = extra.plugin ? `${extra.pluginName}:${name}` : name;
      skillRecs.push({
        listName,
        noModel,
        off,
        scope,
        dir: path5.resolve(dir),
        builtin: scope === "builtin",
        rel: extra.plugin ? path5.relative(path5.dirname(path5.dirname(extra.pluginDir)), path5.join(dir, "SKILL.md")) : `${e.name}/SKILL.md`,
        fields: {
          kind: "skill",
          name: listName,
          scope,
          path: path5.join(realDir, "SKILL.md"),
          ...extra.plugin ? { plugin: extra.plugin } : {},
          details: {
            listedPath: path5.join(path5.resolve(dir), "SKILL.md"),
            ...desc ? { description: String(desc).slice(0, 300) } : {},
            ...symlink ? { symlinkFrom: path5.resolve(dir) } : {},
            ...allowImplicit === false ? { implicitInvocation: false } : {},
            ...fm?.data?.["disable-model-invocation"] === true ? { disableModelInvocation: true } : {},
            ...!fm?.data?.name ? { nameFromDir: true } : {}
          }
        }
      });
    }
  };
  for (const d of dirs.slice().reverse()) scanSkills(path5.join(d, ".agents", "skills"), scopeOf(d));
  scanSkills(path5.join(home, ".agents", "skills"), "user");
  scanSkills(path5.join(sysDir, "skills"), "managed");
  scanSkills(path5.join(codexHome, "skills"), "user", { allowSystem: true });
  for (const pl of activePlugins) {
    const sp = typeof pl.manifest.skills === "string" ? pl.manifest.skills : "skills";
    scanSkills(path5.join(pl.dir, sp), "plugin", { plugin: pl.id, pluginName: pl.manifest.name || pl.pname, pluginDir: pl.dir });
  }
  finalizeSkills();
  function finalizeSkills() {
    const eligible = skillRecs.filter((r) => !r.off && !r.noModel);
    const rank = (r) => r.builtin ? 0 : r.scope === "project" || r.scope === "ancestor" ? 1 : 2;
    eligible.sort((a, b) => rank(a) - rank(b) || a.listName.toLowerCase().localeCompare(b.listName.toLowerCase()) || (a.fields.path < b.fields.path ? -1 : a.fields.path > b.fields.path ? 1 : 0));
    const fill = (budget) => {
      let used2 = 0;
      const inc = /* @__PURE__ */ new Set();
      for (const r of eligible) {
        const len = `- ${r.listName}: (file: r0/${r.rel})
`.length;
        if (used2 + len <= budget) {
          used2 += len;
          inc.add(r);
        }
      }
      return inc;
    };
    const win = skillWindow();
    let lo;
    let hi;
    let basis;
    if (ctx.skillBudget) {
      lo = hi = fill(ctx.skillBudget);
      basis = `test budget ${ctx.skillBudget}`;
    } else if (win) {
      lo = fill(windowBudget(win.low));
      hi = win.high === win.low ? lo : fill(windowBudget(win.high));
      basis = `context window ${win.low}${win.high !== win.low ? `..${win.high}` : ""} (${win.source})`;
    } else {
      lo = hi = new Set(eligible);
      basis = null;
      warnings.push("skill listing budget not modelled: model context window unknown");
    }
    let unknownN = 0;
    let cutN = 0;
    for (const r of skillRecs) {
      let status = "active";
      let reason;
      if (r.off) {
        status = "disabled";
        reason = "[[skills.config]] enabled = false";
      } else if (r.noModel) {
        status = "conditional";
        reason = "model invocation disabled (disable-model-invocation / allow_implicit_invocation=false): omitted from the skill listing, usable via explicit $skill";
      } else if (!lo.has(r) && hi.has(r)) {
        status = "unknown";
        unknownN++;
        r.fields.details.reason = "skill-list-budget-uncertain";
        reason = `listed only if the session ran with the larger context window (${basis}); the cap is ~2% of the window in tokens (4 chars/token), inferred not documented`;
      } else if (!hi.has(r)) {
        status = "shadowed";
        cutN++;
        r.fields.details.reason = "skill-list-budget";
        reason = `dropped from the skill listing: skills context budget exceeded (${basis})`;
      }
      push({ ...r.fields, status, ...reason ? { reason } : {}, ...r.off ? { definedIn: userCfgPath } : {} });
    }
    if (cutN) warnings.push(`${cutN} skills fall past the skill-listing budget and are not shown to the model`);
    if (unknownN) warnings.push(`${unknownN} skills are listed only if the session used the larger context window; status unknown`);
  }
  function skillWindow() {
    const model = base.model;
    const cat = readJson(path5.join(codexHome, "models_cache.json"));
    const m = (cat?.models || []).find((x) => x.slug === model);
    if (ctx.contextWindow) return { low: ctx.contextWindow, high: ctx.contextWindow, source: "live session log" };
    const pinned = Number(base.model_context_window);
    if (Number.isFinite(pinned) && pinned > 0) return { low: pinned, high: pinned, source: "model_context_window config" };
    if (!m?.context_window) return null;
    return { low: m.context_window, high: Math.max(m.context_window, m.max_context_window || 0), source: `models_cache ${model}` };
  }
  const hooksFlag = firstDefined(ovCfg.features?.hooks, ovCfg.features?.codex_hooks, profCfg.features?.hooks, profCfg.features?.codex_hooks, userCfg.features?.hooks, userCfg.features?.codex_hooks, sysCfg.features?.hooks, sysCfg.features?.codex_hooks);
  const hooksOn = hooksFlag !== false;
  const hookGate = hooksOn ? {} : { status: "disabled", reason: "[features] hooks = false" };
  const emitHooks = (map, o) => {
    if (!isObj(map)) return;
    for (const [event, groups] of Object.entries(map)) {
      if (!Array.isArray(groups)) continue;
      const seen = /* @__PURE__ */ new Map();
      groups.forEach((g) => {
        if (!isObj(g)) return;
        const base_ = `${event}[${g.matcher || "*"}]`;
        const handlers = (Array.isArray(g.hooks) ? g.hooks : []).filter(isObj).map((h) => redact(h));
        const gate = o.gate && o.gate.status ? o.gate : hookGate;
        (handlers.length ? handlers : [null]).forEach((h) => {
          const k = (seen.get(base_) || 0) + 1;
          seen.set(base_, k);
          push({
            kind: "hook",
            name: k > 1 ? `${base_}#${k}` : base_,
            scope: o.scope,
            path: o.path,
            status: "active",
            ...gate,
            ...o.plugin ? { plugin: o.plugin } : {},
            ...o.definedIn ? { definedIn: o.definedIn } : {},
            details: {
              event,
              matcher: g.matcher ?? null,
              ...h ? { type: h.type, ...h.command !== void 0 ? { command: h.command } : {}, ...h.server !== void 0 ? { server: h.server } : {}, ...h.tool !== void 0 ? { tool: h.tool } : {}, ...h.input !== void 0 ? { input: h.input } : {}, ...h.timeout !== void 0 ? { timeout: h.timeout } : {}, ...h.async !== void 0 ? { async: h.async } : {}, ...h.statusMessage !== void 0 ? { statusMessage: h.statusMessage } : {} } : {},
              trustReviewRequired: !o.managed,
              ...o.project ? trustDetails : {},
              ...hooksFlag === void 0 ? {} : { featureFlag: hooksFlag },
              ...ovCfg.features && (ovCfg.features.hooks !== void 0 || ovCfg.features.codex_hooks !== void 0) ? { via: "-c" } : {}
            }
          });
        });
      });
    }
  };
  const userHooksJson = path5.join(codexHome, "hooks.json");
  if (isFile(userHooksJson)) emitHooksJson(userHooksJson, { scope: "user" });
  emitHooks(userCfg.hooks, { scope: "user", path: userCfgPath });
  if (profName) emitHooks(profCfg.hooks, { scope: "user", path: profSrc });
  emitHooks(sysCfg.hooks, { scope: "managed", path: sysCfgPath, managed: true });
  for (const l of projCfgs) emitHooks(l.cfg?.hooks, { scope: l.scope, path: l.cfgPath, project: true, gate: projGate });
  for (const l of projLayers) {
    const hj = path5.join(l.codexDir, "hooks.json");
    if (isFile(hj)) emitHooksJson(hj, { scope: l.scope, project: true, gate: projGate });
  }
  for (const pl of activePlugins) {
    const hm = pl.manifest.hooks;
    if (isObj(hm)) emitHooks(hm.hooks || hm, { scope: "plugin", plugin: pl.id, path: path5.join(pl.dir, ".codex-plugin", "plugin.json"), definedIn: userCfgPath });
    else {
      const p = path5.join(pl.dir, typeof hm === "string" ? hm : path5.join("hooks", "hooks.json"));
      if (isFile(p)) emitHooksJson(p, { scope: "plugin", plugin: pl.id, definedIn: userCfgPath });
    }
  }
  function emitHooksJson(p, o) {
    const j = readJson(p);
    if (j?.__parseError) {
      warnings.push(`${p}: ${j.__parseError}`);
      return;
    }
    emitHooks(j?.hooks || j, { ...o, path: p });
  }
  const notify = userCfg.notify ?? sysCfg.notify;
  if (Array.isArray(notify) && notify.length) {
    push({
      kind: "hook",
      name: "notify",
      scope: userCfg.notify ? "user" : "managed",
      status: "active",
      path: userCfg.notify ? userCfgPath : sysCfgPath,
      details: { event: "agent-turn-complete", command: notify.map(String), note: "legacy notify; not gated by [features] hooks" }
    });
  }
  const emitRules = (dir, o) => {
    for (const e of listDir(dir).sort((a, b) => a.name.localeCompare(b.name))) {
      if (!e.name.endsWith(".rules")) continue;
      const p = path5.join(dir, e.name);
      if (!isFile(p)) continue;
      const count = (readText(p) || "").match(/^\s*prefix_rule\s*\(/gm)?.length || 0;
      push({ kind: "rule", name: e.name, scope: o.scope, status: "active", path: p, ...o.gate || {}, details: { count, ...o.project ? trustDetails : {} } });
    }
  };
  emitRules(path5.join(sysDir, "rules"), { scope: "managed" });
  emitRules(path5.join(codexHome, "rules"), { scope: "user" });
  for (const l of projLayers) emitRules(path5.join(l.codexDir, "rules"), { scope: l.scope, project: true, gate: projGate });
  return { harness: H2, projectRoot, chain, items, warnings };
}
function deepMerge(a, b) {
  for (const [k, v] of Object.entries(b)) {
    if (isObj(v) && isObj(a[k])) deepMerge(a[k], v);
    else a[k] = v;
  }
  return a;
}
function firstDefined(...vs) {
  return vs.find((v) => v !== void 0);
}
function mcpSummary(cfg) {
  const o = { transport: cfg.url ? "http" : cfg.command ? "stdio" : "unknown" };
  if (cfg.command) o.command = cfg.command;
  if (Array.isArray(cfg.args)) o.args = cfg.args;
  if (cfg.url) o.url = cfg.url;
  if (cfg.cwd) o.cwd = cfg.cwd;
  if (cfg.required !== void 0) o.required = cfg.required;
  if (cfg.enabled_tools) o.enabledTools = cfg.enabled_tools;
  if (cfg.disabled_tools) o.disabledTools = cfg.disabled_tools;
  return o;
}
function resolveTrust(projects, root, cwd) {
  const norm = (p) => p.replace(/\/+$/, "") || "/";
  const table = new Map(Object.entries(projects).map(([k, v]) => [norm(k), v]));
  const lookup = (p) => table.get(p) ?? table.get(canonical(p));
  for (const p of [root, cwd].filter(Boolean)) {
    const e = lookup(p);
    if (e) {
      const t = e.trust_level === "trusted";
      return { trusted: t, match: t ? "exact" : "exact-untrusted", via: p };
    }
  }
  for (const p of ancestors(root || cwd)) {
    if (p === (root || cwd)) continue;
    const e = lookup(p);
    if (e?.trust_level === "trusted") return { trusted: true, match: "ancestor", via: p };
  }
  return { trusted: false, match: "none" };
}
var import_yaml2, H2, DEFAULT_MAX_BYTES, windowBudget, AGENTS_NAMES, real, mtime, isObj;
var init_codex2 = __esm({
  "src/harness/codex.js"() {
    import_yaml2 = __toESM(require_dist(), 1);
    init_dist();
    init_model();
    init_fsutil();
    H2 = "codex";
    DEFAULT_MAX_BYTES = 32 * 1024;
    windowBudget = (w) => 0.08 * w - 1380;
    AGENTS_NAMES = ["AGENTS.override.md", "AGENTS.md"];
    real = (p) => {
      try {
        return fs3.realpathSync(p);
      } catch {
        return path5.resolve(p);
      }
    };
    mtime = (p) => {
      try {
        return fs3.statSync(p).mtimeMs;
      } catch {
        return 0;
      }
    };
    isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
  }
});

// src/harness/opencode.js
import fs4 from "node:fs";
import path6 from "node:path";
function mk({ kind, name, scope, status = "active", path: p, reason, details }) {
  const f = { harness: "opencode", kind, name, scope, status, path: p };
  if (reason) f.reason = reason;
  if (details && Object.keys(details).length) f.details = details;
  return item(f);
}
function globalDir(ctx) {
  const xdg = ctx.env?.XDG_CONFIG_HOME;
  return xdg ? path6.join(xdg, "opencode") : path6.join(ctx.home, ".config", "opencode");
}
function managedDirFor(ctx) {
  if (ctx.managedDir !== void 0) return ctx.managedDir;
  if (ctx.platform === "darwin") return "/Library/Application Support/opencode";
  if (ctx.platform === "linux") return "/etc/opencode";
  return null;
}
function resolveDefs(defs) {
  const winner = /* @__PURE__ */ new Map();
  for (const d of defs) if (!d.off) winner.set(d.name, d);
  return defs.map((d) => {
    if (d.off) return { ...d, status: "disabled", reason: d.off };
    const w = winner.get(d.name);
    if (w !== d) return { ...d, status: "shadowed", reason: `same name defined later in ${w.path}` };
    return { ...d, status: "active" };
  });
}
function mcpDetails(v) {
  if (!isObj2(v)) return {};
  const argv = Array.isArray(v.command) ? v.command : [v.command];
  const d = { type: v.type ?? null, timeout: v.timeout ?? null };
  if (v.type === "local" || Array.isArray(v.command)) {
    d.command = argv[0] ?? null;
    d.argCount = Math.max(argv.length - 1, 0);
    if (v.cwd) d.cwd = v.cwd;
    if (v.environment) d.environment = v.environment;
  }
  if (v.url !== void 0) d.url = safeUrl(v.url);
  if (v.headers) d.headers = v.headers;
  if (v.oauth !== void 0) d.oauth = v.oauth;
  return redact(d);
}
function segRegex(seg) {
  const re = seg.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*").replace(/\?/g, "[^/]");
  return new RegExp(`^${re}$`);
}
function walkGlob(dir, segs, out) {
  if (segs.length === 0) {
    if (isFile(dir)) out.push(dir);
    return;
  }
  const [seg, ...rest] = segs;
  if (seg === "**") {
    walkGlob(dir, rest, out);
    for (const s of subdirs(dir)) if (!WALK_SKIP.has(s)) walkGlob(path6.join(dir, s), segs, out);
    return;
  }
  if (GLOB_CHARS.test(seg)) {
    const re = segRegex(seg);
    for (const e of listDir(dir)) if (re.test(e.name)) walkGlob(path6.join(dir, e.name), rest, out);
    return;
  }
  walkGlob(path6.join(dir, seg), rest, out);
}
function expandGlob(pattern, base) {
  const abs = path6.normalize(path6.isAbsolute(pattern) ? pattern : path6.join(base, pattern));
  const segs = abs.slice(path6.parse(abs).root.length).split(path6.sep).filter(Boolean);
  let start = path6.parse(abs).root;
  let i = 0;
  while (i < segs.length && !GLOB_CHARS.test(segs[i])) start = path6.join(start, segs[i++]);
  const out = [];
  walkGlob(start, segs.slice(i), out);
  return [...new Set(out)].sort();
}
function listFiles(dir, re) {
  return listDir(dir).filter((e) => re.test(e.name) && isFile(path6.join(dir, e.name))).map((e) => path6.join(dir, e.name)).sort();
}
function walkMarkdown(dir, prefix = "", out = []) {
  for (const e of listDir(dir)) {
    const full = path6.join(dir, e.name);
    if (isDir(full)) {
      walkMarkdown(full, `${prefix}${e.name}/`, out);
    } else if (MD_EXT.test(e.name) && isFile(full)) {
      out.push({ name: prefix + e.name.replace(MD_EXT, ""), file: full });
    }
  }
  return out;
}
function findSkillFiles(root, depth = 0, out = [], seen = /* @__PURE__ */ new Set()) {
  if (depth > MAX_SKILL_DEPTH) return out;
  let real2;
  try {
    real2 = fs4.realpathSync(root);
  } catch {
    return out;
  }
  if (seen.has(real2)) return out;
  seen.add(real2);
  for (const s of subdirs(root)) {
    if (WALK_SKIP.has(s)) continue;
    const dir = path6.join(root, s);
    const f = path6.join(dir, "SKILL.md");
    if (isFile(f)) out.push(f);
    findSkillFiles(dir, depth + 1, out, seen);
  }
  return out;
}
function findBinary(env) {
  for (const d of (env.PATH || "").split(path6.delimiter)) {
    if (!d) continue;
    const p = path6.join(d, "opencode");
    if (isFile(p)) {
      try {
        return fs4.realpathSync(p);
      } catch {
        return p;
      }
    }
  }
  return null;
}
function auditOpencode(ctx) {
  const env = ctx.env || {};
  const home = ctx.home;
  const cwd = path6.resolve(ctx.cwd);
  const warnings = [];
  const items = [];
  const chain = [];
  const gDir = globalDir(ctx);
  const projectRoot = findRoot(cwd) ?? cwd;
  const walk = ancestors(cwd, projectRoot);
  const scopeOf = (dir) => dir === cwd || dir === projectRoot ? "project" : "ancestor";
  const claudeCodeOff = flagSet(env, "OPENCODE_DISABLE_CLAUDE_CODE");
  const claudePromptOff = claudeCodeOff || flagSet(env, "OPENCODE_DISABLE_CLAUDE_CODE_PROMPT");
  const claudeSkillsOff = claudeCodeOff || flagSet(env, "OPENCODE_DISABLE_CLAUDE_CODE_SKILLS");
  const cfgFiles = [];
  const addCfg = (dir, scope) => {
    for (const n of CONFIG_NAMES) {
      const f = path6.join(dir, n);
      if (isFile(f)) cfgFiles.push({ path: f, scope });
    }
  };
  addCfg(gDir, "user");
  if (env.OPENCODE_CONFIG) {
    const f = path6.resolve(cwd, env.OPENCODE_CONFIG);
    if (isFile(f)) cfgFiles.push({ path: f, scope: "user" });
    else warnings.push(`OPENCODE_CONFIG points at a missing file: ${f}`);
  }
  for (const dir of [...walk].reverse()) addCfg(dir, scopeOf(dir));
  const managed = managedDirFor(ctx);
  if (managed) addCfg(managed, "managed");
  const cfg = { mcp: [], agent: [], command: [], plugin: [], instructions: [] };
  for (const c of cfgFiles) {
    const data = readJsonc(c.path);
    if (data?.__parseError || !isObj2(data)) {
      warnings.push(`${c.path}: ${data?.__parseError ?? "not a JSON object"}; skipped`);
      continue;
    }
    chain.push({ path: c.path, scope: c.scope });
    for (const kind of ["mcp", "agent", "command"]) {
      if (isObj2(data[kind])) {
        for (const [name, value] of Object.entries(data[kind])) cfg[kind].push({ name, path: c.path, scope: c.scope, value });
      }
    }
    if (Array.isArray(data.plugin)) {
      for (const v of data.plugin) if (typeof v === "string") cfg.plugin.push({ name: v, path: c.path, scope: c.scope });
    }
    if (Array.isArray(data.instructions)) {
      for (const v of data.instructions) if (typeof v === "string") cfg.instructions.push({ entry: v, path: c.path, scope: c.scope });
    }
  }
  for (const d of resolveDefs(cfg.mcp)) {
    let { status, reason } = d;
    if (status === "active" && d.value?.enabled === false) {
      status = "disabled";
      reason = "enabled: false";
    }
    items.push(mk({ kind: "mcp", name: d.name, scope: d.scope, status, path: d.path, reason, details: mcpDetails(d.value) }));
  }
  for (const kind of ["agent", "command"]) {
    for (const d of resolveDefs(cfg[kind])) {
      items.push(mk({
        kind,
        name: d.name,
        scope: d.scope,
        status: d.status,
        path: d.path,
        reason: d.reason,
        details: redact(pick(d.value, ["description", "mode", "model", "agent", "subtask"]))
      }));
    }
  }
  for (const d of resolveDefs(cfg.plugin)) {
    items.push(mk({ kind: "plugin", name: d.name, scope: d.scope, status: d.status, path: d.path, reason: d.reason }));
  }
  for (const d of cfg.instructions) {
    if (/^https?:\/\//i.test(d.entry)) {
      items.push(mk({
        kind: "rule",
        name: safeUrl(d.entry),
        scope: "remote",
        status: "unknown",
        path: d.path,
        reason: "remote instructions are fetched at runtime; not checked"
      }));
      continue;
    }
    const base = path6.dirname(d.path);
    const matches = expandGlob(d.entry, base);
    if (!matches.length) warnings.push(`instructions entry "${d.entry}" in ${d.path} matched no files`);
    for (const f of matches) {
      items.push(mk({ kind: "rule", name: path6.relative(base, f), scope: d.scope, path: f, details: { bytes: fileSize(f) } }));
    }
  }
  const boot = (file, scope, status = "active", reason) => mk({
    kind: "bootstrap",
    name: path6.basename(file),
    scope,
    status,
    path: file,
    reason,
    details: { bytes: fileSize(file) }
  });
  const projAgents = walk.map((d) => path6.join(d, "AGENTS.md")).filter(isFile);
  const projClaude = walk.map((d) => path6.join(d, "CLAUDE.md")).filter(isFile);
  for (const f of projAgents) items.push(boot(f, scopeOf(path6.dirname(f))));
  for (const f of projClaude) {
    const sc = scopeOf(path6.dirname(f));
    if (projAgents.length) items.push(boot(f, sc, "shadowed", "CLAUDE.md is used only when no AGENTS.md is found"));
    else if (claudeCodeOff) items.push(boot(f, sc, "disabled", "OPENCODE_DISABLE_CLAUDE_CODE is set"));
    else items.push(boot(f, sc));
  }
  const gAgents = path6.join(gDir, "AGENTS.md");
  const gClaude = path6.join(home, ".claude", "CLAUDE.md");
  if (isFile(gAgents)) items.push(boot(gAgents, "user"));
  if (isFile(gClaude)) {
    if (claudePromptOff) items.push(boot(gClaude, "user", "disabled", "OPENCODE_DISABLE_CLAUDE_CODE(_PROMPT) is set"));
    else if (isFile(gAgents)) items.push(boot(gClaude, "user", "shadowed", "~/.config/opencode/AGENTS.md takes precedence"));
    else items.push(boot(gClaude, "user"));
  }
  const skillRoots = [];
  skillRoots.push({ dir: path6.join(home, ".agents", "skills"), scope: "user" });
  skillRoots.push({ dir: path6.join(home, ".claude", "skills"), scope: "user", claude: true });
  skillRoots.push({ dir: path6.join(gDir, "skills"), scope: "user" });
  for (const dir of [...walk].reverse()) {
    const sc = scopeOf(dir);
    skillRoots.push({ dir: path6.join(dir, ".agents", "skills"), scope: sc });
    skillRoots.push({ dir: path6.join(dir, ".claude", "skills"), scope: sc, claude: true });
    skillRoots.push({ dir: path6.join(dir, ".opencode", "skills"), scope: sc });
  }
  const binary = findBinary(env);
  const skillDefs = [];
  if (binary) {
    for (const name of BUILTIN_SKILLS) skillDefs.push({ name, path: binary, scope: "builtin", details: {} });
  } else {
    warnings.push("built-in skills not listed: no opencode binary found on PATH");
  }
  const seenRoots = /* @__PURE__ */ new Set();
  for (const root of skillRoots) {
    if (seenRoots.has(root.dir) || !listDir(root.dir).length) continue;
    seenRoots.add(root.dir);
    for (const file of findSkillFiles(root.dir)) {
      const fm = readFrontmatter(file)?.data ?? {};
      const name = typeof fm.name === "string" ? fm.name.trim() : "";
      const description = typeof fm.description === "string" ? fm.description.trim() : "";
      if (!name || !description) {
        warnings.push(`skill at ${file} has no name/description frontmatter; opencode does not list it`);
        continue;
      }
      dirNameCheck(file, name, warnings);
      skillDefs.push({
        name,
        path: file,
        scope: root.scope,
        off: root.claude && claudeSkillsOff ? "OPENCODE_DISABLE_CLAUDE_CODE(_SKILLS) is set" : void 0,
        details: { description, bytes: fileSize(file) }
      });
    }
  }
  for (const d of resolveDefs(skillDefs)) {
    items.push(mk({ kind: "skill", name: d.name, scope: d.scope, status: d.status, path: d.path, reason: d.reason, details: d.details }));
  }
  const opencodeDirs = [{ base: gDir, scope: "user" }, ...[...walk].reverse().map((d) => ({ base: path6.join(d, ".opencode"), scope: scopeOf(d) }))];
  const hookSeen = /* @__PURE__ */ new Set();
  for (const { base, scope } of opencodeDirs) {
    for (const sub of ["plugins", "plugin"]) {
      for (const f of listFiles(path6.join(base, sub), SCRIPT_EXT)) {
        if (hookSeen.has(f)) continue;
        hookSeen.add(f);
        items.push(mk({
          kind: "hook",
          name: path6.basename(f).replace(SCRIPT_EXT, ""),
          scope,
          path: f,
          details: { bytes: fileSize(f), note: HOOK_NOTE }
        }));
      }
    }
  }
  const mdDefs = (subs) => {
    const defs = [];
    for (const { base, scope } of opencodeDirs) {
      for (const sub of subs) {
        for (const { name, file } of walkMarkdown(path6.join(base, sub))) {
          const description = readFrontmatter(file)?.data?.description;
          defs.push({ name, path: file, scope, details: description ? { description: String(description) } : {} });
        }
      }
    }
    return defs;
  };
  for (const [kind, subs] of [["agent", ["agents", "agent"]], ["command", ["commands", "command"]]]) {
    for (const d of resolveDefs(mdDefs(subs))) {
      items.push(mk({ kind, name: d.name, scope: d.scope, status: d.status, path: d.path, reason: d.reason, details: d.details }));
    }
  }
  return { harness: "opencode", projectRoot, chain, items, warnings };
}
function dirNameCheck(file, name, warnings) {
  const dirName = path6.basename(path6.dirname(file));
  if (dirName !== name) {
    warnings.push(`skill frontmatter name "${name}" differs from directory "${dirName}" (${file}); using frontmatter name`);
  }
}
var CONFIG_NAMES, SCRIPT_EXT, MD_EXT, GLOB_CHARS, WALK_SKIP, MAX_SKILL_DEPTH, BUILTIN_SKILLS, HOOK_NOTE, isObj2, flagSet, safeUrl, pick;
var init_opencode = __esm({
  "src/harness/opencode.js"() {
    init_model();
    init_fsutil();
    CONFIG_NAMES = ["opencode.json", "opencode.jsonc"];
    SCRIPT_EXT = /\.[cm]?[jt]s$/;
    MD_EXT = /\.md$/;
    GLOB_CHARS = /[*?[\]{}]/;
    WALK_SKIP = /* @__PURE__ */ new Set(["node_modules", ".git"]);
    MAX_SKILL_DEPTH = 32;
    BUILTIN_SKILLS = ["customize-opencode"];
    HOOK_NOTE = "Code plugin: the hooks it registers are only known at runtime; not statically analyzed.";
    isObj2 = (v) => v != null && typeof v === "object" && !Array.isArray(v);
    flagSet = (env, name) => {
      const v = env[name];
      return v != null && v !== "" && v !== "0" && v.toLowerCase() !== "false";
    };
    safeUrl = (u) => {
      try {
        const x = new URL(String(u));
        return x.origin + x.pathname;
      } catch {
        return "<unparseable url>";
      }
    };
    pick = (v, keys) => isObj2(v) ? Object.fromEntries(keys.filter((k) => v[k] !== void 0).map((k) => [k, v[k]])) : {};
  }
});

// src/live/claude.js
import fs5 from "node:fs";
import path7 from "node:path";
function redactCommand(cmd) {
  return String(cmd).replace(/\b([A-Za-z0-9_]*(?:token|secret|key|password|passwd|auth)[A-Za-z0-9_]*)=("[^"]*"|'[^']*'|\S+)/gi, "$1=<redacted>").replace(/(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/g, "$1 <redacted>");
}
function findTranscript({ cwd, home, sessionId }) {
  const projects = path7.join(home, ".claude", "projects");
  const dirs = [cwd];
  try {
    dirs.push(fs5.realpathSync(cwd));
  } catch {
  }
  for (const d of [...new Set(dirs)]) {
    const dir = path7.join(projects, claudeSlug(d));
    if (!fs5.existsSync(dir)) continue;
    if (sessionId) {
      const p = path7.join(dir, `${sessionId}.jsonl`);
      if (fs5.existsSync(p)) return p;
      continue;
    }
    const files = fs5.readdirSync(dir).filter((f) => f.endsWith(".jsonl")).map((f) => ({ p: path7.join(dir, f), t: fs5.statSync(path7.join(dir, f)).mtimeMs })).sort((a, b) => b.t - a.t);
    if (files.length) return files[0].p;
  }
  return null;
}
function liveClaude({ cwd, home, env, sessionId } = {}) {
  const transcript = findTranscript({ cwd, home, sessionId });
  if (!transcript) {
    return { error: `no Claude transcript found for ${cwd}${sessionId ? ` session ${sessionId}` : ""} under ${path7.join(home, ".claude", "projects", claudeSlug(cwd))}` };
  }
  const bootstrap = /* @__PURE__ */ new Map();
  const skills = /* @__PURE__ */ new Set();
  const tools = /* @__PURE__ */ new Set();
  const mcp = /* @__PURE__ */ new Set();
  const mcpFailed = /* @__PURE__ */ new Set();
  const hooks = /* @__PURE__ */ new Map();
  const agents = /* @__PURE__ */ new Set();
  const addHook = (a) => {
    const hn = String(a.hookName || "");
    const i = hn.indexOf(":");
    const event = a.hookEvent || (i < 0 ? hn : hn.slice(0, i));
    const matcher = i < 0 ? "" : hn.slice(i + 1);
    const command = a.command ? redactCommand(a.command) : null;
    hooks.set(`${event}\0${matcher}\0${command}`, { event, matcher, command });
  };
  for (const line of fs5.readFileSync(transcript, "utf8").split("\n")) {
    if (!line.includes('"attachment"')) continue;
    let r;
    try {
      r = JSON.parse(line);
    } catch {
      continue;
    }
    const a = r.attachment;
    if (!a || typeof a !== "object") continue;
    switch (a.type) {
      case "instructions":
        for (const f of a.files || []) if (f?.path) bootstrap.set(f.path, { path: f.path, type: f.type || null });
        break;
      case "nested_memory": {
        const p = a.path || a.content?.path;
        if (p && !bootstrap.has(p)) bootstrap.set(p, { path: p, type: a.content?.type || null, nested: true });
        break;
      }
      case "skill_listing": {
        const names = Array.isArray(a.names) ? a.names : String(a.content || "").split("\n").filter((l) => l.startsWith("- ")).map((l) => l.slice(2).split(": ")[0].replace(/\s+\(.*\)$/, ""));
        for (const n of names) skills.add(n);
        break;
      }
      case "mcp_instructions_delta":
        for (const n of a.addedNames || []) mcp.add(normMcp(n));
        for (const n of a.removedNames || []) mcp.delete(normMcp(n));
        break;
      case "deferred_tools_delta":
        for (const n of a.addedNames || []) tools.add(n);
        for (const n of a.removedNames || []) tools.delete(n);
        for (const f of a.failedMcpServers || []) if (f?.name) mcpFailed.add(f.name);
        break;
      case "hook_success":
      case "hook_cancelled":
      case "hook_non_blocking_error":
        addHook(a);
        break;
      case "agent_listing_delta":
        for (const n of a.addedTypes || []) agents.add(n);
        for (const n of a.removedTypes || []) agents.delete(n);
        break;
      default:
    }
  }
  for (const t of tools) {
    const m = /^mcp__(.+?)__/.exec(t);
    if (m) mcp.add(m[1]);
  }
  const sortedHooks = [...hooks.values()].sort((x, y) => `${x.event}\0${x.matcher}\0${x.command}`.localeCompare(`${y.event}\0${y.matcher}\0${y.command}`));
  return {
    source: transcript,
    sessionId: path7.basename(transcript, ".jsonl"),
    observed: {
      bootstrap: [...bootstrap.values()].sort((a, b) => a.path.localeCompare(b.path)),
      skills: uniqSorted(skills),
      mcpServers: uniqSorted(mcp),
      mcpFailed: uniqSorted(mcpFailed),
      hooks: sortedHooks,
      agents: uniqSorted(agents)
    }
  };
}
var claudeSlug, uniqSorted, normMcp;
var init_claude2 = __esm({
  "src/live/claude.js"() {
    claudeSlug = (cwd) => cwd.replace(/[^a-zA-Z0-9]/g, "-");
    uniqSorted = (arr) => [...new Set(arr)].sort();
    normMcp = (name) => String(name).replace(/[^a-zA-Z0-9_-]/g, "_");
  }
});

// src/index.js
var src_exports = {};
__export(src_exports, {
  ADAPTERS: () => ADAPTERS,
  audit: () => audit
});
import os2 from "node:os";
import path8 from "node:path";
function audit(opts = {}) {
  const env = opts.env || process.env;
  const home = canonical(opts.home || os2.homedir());
  const session = opts.session || (opts.cwd ? { harness: null, detectedBy: [] } : detectSession(env));
  const cwd = canonical(opts.cwd || session.bootCwd || process.cwd());
  const names = opts.harnesses?.length ? opts.harnesses : Object.keys(ADAPTERS);
  const report = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    cwd,
    home,
    platform: process.platform,
    session,
    harnesses: {}
  };
  for (const name of names) {
    const launch = opts.launch || (session.harness === name ? session.launch : void 0);
    const ctx = { cwd, home, env, platform: process.platform, launch };
    const sid = opts.sessionId || (session.harness === name ? session.sessionId : null);
    let live;
    if (opts.live && LIVE[name]) {
      try {
        live = LIVE[name]({ cwd, home, env, sessionId: sid });
      } catch (e) {
        live = { error: String(e.message || e) };
      }
      if (live?.contextWindow) ctx.contextWindow = live.contextWindow;
    }
    try {
      report.harnesses[name] = ADAPTERS[name](ctx);
    } catch (e) {
      report.harnesses[name] = { items: [], chain: [], warnings: [`adapter crashed: ${e.stack || e}`] };
    }
    if (live) report.harnesses[name].live = live;
  }
  report.hygiene = skillHygiene(report);
  return report;
}
function skillHygiene(report) {
  const byPath = /* @__PURE__ */ new Map();
  for (const [h, r] of Object.entries(report.harnesses)) {
    for (const it of r.items || []) {
      if (it.kind !== "skill" || !/SKILL\.md$/.test(it.path || "")) continue;
      const e = byPath.get(it.path) || { path: it.path, harnesses: [] };
      if (!e.harnesses.includes(h)) e.harnesses.push(h);
      byPath.set(it.path, e);
    }
  }
  const out = [];
  for (const e of byPath.values()) {
    const fm = readFrontmatter(e.path);
    if (!fm) continue;
    const dir = path8.basename(path8.dirname(e.path));
    const name = fm.data?.name, desc = fm.data?.description;
    if (!name && !desc) out.push({ ...e, issue: "no name or description in frontmatter (OpenCode skips it; others fall back to the folder name)" });
    else if (!desc) out.push({ ...e, issue: "no description in frontmatter, so the model cannot tell when to use it" });
    else if (!name) out.push({ ...e, issue: `no name in frontmatter; harnesses fall back to the folder name "${dir}"` });
    else if (String(name) !== dir) out.push({ ...e, issue: `frontmatter name "${name}" differs from folder "${dir}"; Claude Code lists it by folder, OpenCode and Codex by name` });
  }
  return out;
}
var ADAPTERS, LIVE;
var init_src = __esm({
  "src/index.js"() {
    init_model();
    init_fsutil();
    init_session();
    init_claude();
    init_codex2();
    init_opencode();
    init_claude2();
    init_codex();
    ADAPTERS = { claude: auditClaude, codex: auditCodex, opencode: auditOpencode };
    LIVE = { claude: liveClaude, codex: liveCodex };
  }
});

// src/render/diff.js
import fs6 from "node:fs";
function sessionStart(source) {
  if (!source) return null;
  try {
    const fd = fs6.openSync(source, "r");
    const buf = Buffer.alloc(1 << 16);
    const n = fs6.readSync(fd, buf, 0, buf.length, 0);
    fs6.closeSync(fd);
    for (const l of buf.subarray(0, n).toString("utf8").split("\n").slice(0, 60)) {
      try {
        const t = JSON.parse(l).timestamp;
        if (t) return Date.parse(t);
      } catch {
      }
    }
    return fs6.statSync(source).birthtimeMs;
  } catch {
    return null;
  }
}
function staleEvidence(it, start) {
  if (!start || !it?.path) return null;
  try {
    const st = fs6.statSync(it.path);
    const changed = Math.max(st.mtimeMs, st.birthtimeMs);
    if (/\.claude\.json$/.test(it.path)) return null;
    if (changed > start) return { path: it.path, changedAt: new Date(changed).toISOString(), sessionStart: new Date(start).toISOString() };
  } catch {
  }
  return null;
}
function category({ preds, lives, canon, label, harness, cat, start, failed = [], hidden = 0, unverifiable = /* @__PURE__ */ new Set() }) {
  const unmatchedLive = [...lives];
  const matched = [];
  const extraItems = [];
  for (const p of preds) {
    const i = unmatchedLive.indexOf(canon(p));
    if (i >= 0) {
      matched.push(label(p));
      unmatchedLive.splice(i, 1);
    } else extraItems.push(p);
  }
  const missing = unmatchedLive.map((l) => nameOf(l));
  const builtinMissing = missing.filter((n) => isBuiltin(harness, cat, n));
  const unverifiableMissing = missing.filter((n) => !isBuiltin(harness, cat, n) && unverifiable.has(n));
  const unexplainedMissing = missing.filter((n) => !isBuiltin(harness, cat, n) && !unverifiable.has(n));
  const extraExplained = [];
  const extraUnexplained = [];
  for (const p of extraItems) {
    const name = label(p);
    const failedHit = failed.some((f) => normMcp2(f) === canon(p));
    const remote = p.status === "unknown" && p.scope === "remote";
    const ev = failedHit || remote ? null : staleEvidence(p, start);
    if (failedHit) extraExplained.push({ name, reason: "failed-connection" });
    else if (remote) extraExplained.push({ name, reason: "remote-unverifiable" });
    else if (ev) extraExplained.push({ name, reason: "stale-session", evidence: ev });
    else extraUnexplained.push(name);
  }
  const fileBackedObserved = lives.length - builtinMissing.length;
  return {
    predicted: preds.length,
    observed: lives.length,
    matched: matched.length,
    missing,
    extra: extraItems.map(label),
    precision: ratio(matched.length, preds.length),
    recall: ratio(matched.length, lives.length),
    builtinMissing,
    unverifiableMissing,
    unexplainedMissing,
    extraExplained,
    extraUnexplained,
    hiddenFromListing: hidden,
    recallFileBacked: ratio(matched.length, fileBackedObserved),
    precisionAdjusted: ratio(matched.length, preds.length - extraExplained.length)
  };
}
function compareLive(h) {
  const live = h?.live;
  if (!live || live.error || !live.observed) return null;
  const o = live.observed;
  const harness = harnessOf(h);
  const start = sessionStart(live.source);
  const items = h.items || [];
  const dedupe = (arr, key) => [...new Map(arr.map((x) => [key(x), x])).values()];
  const skillKinds = COMMANDS_ARE_SKILLS.has(harness) ? ["skill", "command"] : ["skill"];
  const skillItems = items.filter((i) => skillKinds.includes(i.kind) && i.status === "active");
  const visible = skillItems.filter((i) => i.details?.modelInvocable !== false);
  const skillName = (i) => i.plugin && !String(i.name).includes(":") ? `${pluginName(i.plugin)}:${i.name}` : i.name;
  const mcpItems = items.filter((i) => i.kind === "mcp" && (i.status === "active" || i.status === "unknown" && i.scope === "remote"));
  const mcpName = (i) => harness === "claude" && i.scope === "plugin" && i.plugin ? `plugin_${pluginName(i.plugin)}_${normMcp2(i.name)}` : normMcp2(i.name);
  return {
    source: live.source ?? null,
    bootstrap: category({
      // Claude's .claude/rules files without `paths` load at boot like CLAUDE.md (canary-verified).
      preds: dedupe(items.filter((i) => (i.kind === "bootstrap" || harness === "claude" && i.kind === "rule") && i.status === "active"), (i) => i.path),
      lives: (o.bootstrap || []).map((b) => typeof b === "string" ? b : b.path),
      canon: (i) => i.path,
      label: (i) => i.path,
      harness,
      cat: "bootstrap",
      start,
      unverifiable: new Set(items.filter((i) => i.kind === "bootstrap" && i.status === "unknown").map((i) => i.path))
    }),
    skills: (() => {
      const liveSkills = o.skills || [];
      const byPath = liveSkills.length > 0 && liveSkills.every((x) => x && typeof x === "object" && (x.realPath || x.path));
      const canon = byPath ? (i) => realOr2(i.path) : skillName;
      return category({
        preds: dedupe(visible, canon),
        lives: byPath ? liveSkills.map((x) => x.realPath || realOr2(x.path)) : liveSkills.map(nameOf),
        canon,
        label: byPath ? (i) => i.path : skillName,
        harness,
        cat: "skills",
        start,
        hidden: dedupe(skillItems, canon).length - dedupe(visible, canon).length,
        unverifiable: new Set(items.filter((i) => skillKinds.includes(i.kind) && i.status === "unknown").map(canon))
      });
    })(),
    // Codex rollouts never record MCP servers, so without another oracle (e.g. `codex mcp list`)
    // there is nothing to compare against; report not-observable instead of false extras.
    mcp: harness === "codex" && !(o.mcpServers || []).length ? null : category({
      preds: dedupe(mcpItems, mcpName),
      lives: (o.mcpServers || []).map(nameOf),
      canon: mcpName,
      label: mcpName,
      harness,
      cat: "mcp",
      start,
      failed: o.mcpFailed || []
    })
  };
}
var nameOf, normMcp2, pluginName, BUILTIN, COMMANDS_ARE_SKILLS, isBuiltin, realOr2, ratio, harnessOf, pct;
var init_diff = __esm({
  "src/render/diff.js"() {
    nameOf = (x) => typeof x === "string" ? x : x?.name ?? x?.id ?? x?.path ?? "";
    normMcp2 = (s) => String(s).replace(/[^a-zA-Z0-9_-]/g, "_");
    pluginName = (id) => String(id).split("@")[0];
    BUILTIN = {
      claude: {
        skills: [
          "artifact-capabilities",
          "artifact-design",
          "artifact-diagramming",
          "claude-api",
          "claude-in-chrome",
          "code-review",
          "dataviz",
          "fewer-permission-prompts",
          "init",
          "keybindings-help",
          "loop",
          "plugin-authoring",
          "run",
          "schedule",
          "security-review",
          "simplify",
          "update-config",
          "workflow-authoring",
          "review",
          "compact",
          "context",
          "cost",
          "debug",
          "batch",
          "verify",
          "less-permission-prompts"
        ],
        // claude.ai connectors (claude_ai_*) and the Claude in Chrome extension are provided by the account/app.
        mcp: [/^claude_ai_/, "claude-in-chrome"],
        bootstrap: []
      },
      codex: { skills: [], mcp: [], bootstrap: [] },
      opencode: { skills: [], mcp: [], bootstrap: [] }
    };
    COMMANDS_ARE_SKILLS = /* @__PURE__ */ new Set(["claude"]);
    isBuiltin = (harness, cat, name) => (BUILTIN[harness]?.[cat] || []).some((b) => b instanceof RegExp ? b.test(name) : b === name);
    realOr2 = (p) => {
      try {
        return fs6.realpathSync(p);
      } catch {
        return p;
      }
    };
    ratio = (a, b) => b ? a / b : null;
    harnessOf = (h) => h?.harness || h?.items?.find((i) => i.harness)?.harness || (String(h?.live?.source || "").includes("/.claude/") ? "claude" : null);
    pct = (x) => x == null ? "n/a" : `${Math.round(x * 100)}%`;
  }
});

// src/render/html.js
var html_exports = {};
__export(html_exports, {
  renderHtml: () => renderHtml
});
function renderHtml(report) {
  const compare = {};
  for (const [n, h] of Object.entries(report.harnesses || {})) compare[n] = compareLive(h);
  const data = { ...report, compare };
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>context-audit</title>
<style>${CSS}</style></head>
<body><div id="app"></div>
<script id="data" type="application/json">${safeJson(data)}</script>
<script>${JS}</script>
</body></html>
`;
}
var CSS, JS, safeJson;
var init_html = __esm({
  "src/render/html.js"() {
    init_diff();
    CSS = `
:root{--bg:#fafaf9;--panel:#fff;--fg:#1c1917;--mut:#78716c;--bd:#e7e5e4;--acc:#2563eb;--hi:#eff6ff;
--active:#15803d;--conditional:#0e7490;--disabled:#78716c;--shadowed:#b45309;--needs-approval:#7e22ce;--unknown:#78716c}
@media(prefers-color-scheme:dark){:root{--bg:#131211;--panel:#1c1a19;--fg:#e7e5e4;--mut:#a8a29e;--bd:#33302e;--acc:#60a5fa;--hi:#1e2a3f;
--active:#4ade80;--conditional:#22d3ee;--disabled:#a8a29e;--shadowed:#fbbf24;--needs-approval:#c084fc;--unknown:#a8a29e}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:13px/1.45 ui-sans-serif,system-ui,-apple-system,sans-serif}
header{padding:12px 16px;border-bottom:1px solid var(--bd);background:var(--panel)}
h1{font-size:15px;margin:0 0 2px}.mut{color:var(--mut)}.mono,code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px}
nav{display:flex;gap:4px;padding:8px 16px 0;border-bottom:1px solid var(--bd);background:var(--panel);flex-wrap:wrap}
nav button{border:1px solid transparent;border-bottom:0;background:none;color:var(--mut);padding:6px 12px;cursor:pointer;font:inherit;border-radius:4px 4px 0 0}
nav button.on{color:var(--fg);background:var(--bg);border-color:var(--bd);font-weight:600}
main{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:16px;padding:16px;align-items:start}
@media(max-width:900px){main{grid-template-columns:1fr}}
.panel{background:var(--panel);border:1px solid var(--bd);border-radius:6px;padding:10px 12px;margin-bottom:12px}
.views{display:flex;gap:6px;margin-bottom:10px}
.views button,.chip,.copy{border:1px solid var(--bd);background:var(--panel);color:var(--fg);border-radius:12px;padding:2px 10px;cursor:pointer;font:inherit;font-size:12px}
.views button.on,.chip.on{background:var(--acc);color:#fff;border-color:var(--acc)}
.chips{display:flex;gap:4px;flex-wrap:wrap;margin:4px 0}
input[type=search]{width:100%;padding:6px 8px;border:1px solid var(--bd);border-radius:4px;background:var(--bg);color:var(--fg);font:inherit}
table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:4px 6px;border-bottom:1px solid var(--bd);vertical-align:top}
th{color:var(--mut);font-weight:500;cursor:pointer;white-space:nowrap}tr.item{cursor:pointer}tr.item:hover,tr.sel{background:var(--hi)}
td.p{word-break:break-all;color:var(--mut)}
.tag{display:inline-block;border:1px solid var(--bd);border-radius:3px;padding:0 5px;font-size:11px;color:var(--mut)}
.st{font-weight:600}.node{border-left:2px solid var(--bd);margin:6px 0 6px 8px;padding-left:10px}
.node>.nh{font-weight:600}.node .it{padding:2px 4px;cursor:pointer;border-radius:3px;display:flex;gap:6px;flex-wrap:wrap}
.node .it:hover,.node .it.sel{background:var(--hi)}
.src{border:1px solid var(--bd);border-radius:6px;padding:6px 10px;margin:8px 0;background:var(--panel)}
dl{display:grid;grid-template-columns:90px 1fr;gap:4px 8px;margin:0}dt{color:var(--mut)}dd{margin:0;word-break:break-all}
pre{background:var(--bg);border:1px solid var(--bd);padding:8px;overflow:auto;max-height:260px;margin:4px 0}
.bar{height:6px;background:var(--bd);border-radius:3px;overflow:hidden;min-width:60px}.bar i{display:block;height:100%;background:var(--acc)}
aside{position:sticky;top:8px}
.nw{white-space:nowrap}td.p{white-space:nowrap}
.strip{display:flex;gap:6px;flex-wrap:wrap;align-items:center;padding:8px 16px;border-bottom:1px solid var(--bd);background:var(--panel)}
.strip .sep{width:1px;height:16px;background:var(--bd);margin:0 4px}
.chip.warn{border-color:var(--shadowed);color:var(--shadowed)}.chip.warn.on{background:var(--shadowed);color:#fff}
.full{padding:16px 16px 0}.full .panel{margin-bottom:0}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px;margin-top:8px}
.card{border:1px solid var(--bd);border-radius:6px;padding:8px 10px;min-width:0}
.card h3{margin:0 0 4px;font-size:13px}
.m{display:grid;grid-template-columns:1fr auto;gap:2px 8px}.m span:nth-child(even){text-align:right;font-variant-numeric:tabular-nums}
.grp{margin-top:6px;border-left:3px solid var(--bd);padding-left:8px}
.grp.bad{border-color:#dc2626;background:rgba(220,38,38,.08);padding:4px 8px;border-radius:0 4px 4px 0}
.grp.bad b{color:#dc2626}
.grp div{word-break:break-all}.grp .ev{color:var(--mut);font-size:11px}
.launch{border-left:3px solid var(--acc)}


#tip{position:fixed;z-index:50;max-width:340px;background:#1c1917;color:#fafaf9;border:1px solid #57534e;border-radius:4px;padding:6px 9px;font-size:12px;line-height:1.4;white-space:pre-line;pointer-events:none;display:none;box-shadow:0 4px 14px rgba(0,0,0,.3);word-break:break-word}
@media(prefers-color-scheme:dark){#tip{background:#f5f5f4;color:#1c1917;border-color:#a8a29e}}
.chip.note{color:var(--mut);cursor:help;font-size:11px}
.status{margin:12px 16px 0;padding:7px 12px;border:1px solid var(--bd);border-left-width:4px;border-radius:6px;background:var(--panel);display:flex;gap:8px;flex-wrap:wrap;align-items:baseline}
.status.good{border-left-color:var(--active)}.status.warn{border-left-color:var(--shadowed)}.status.neutral{border-left-color:var(--mut)}
.status .l{color:var(--mut)}
.below{padding:0 16px 24px}.below details>summary{cursor:pointer;font-weight:600;padding:8px 0}
.below table{margin-top:4px}.below td.num,.below th.num{text-align:right;font-variant-numeric:tabular-nums}
.tools{display:flex;gap:6px;margin-left:auto}
details.fold>summary{cursor:pointer;list-style:none;display:flex;gap:8px;align-items:baseline;padding:2px 0}
details.fold>summary::-webkit-details-marker{display:none}
details.fold>summary::before{content:"\\25B8";color:var(--mut);width:10px;flex:none}
details.fold[open]>summary::before{content:"\\25BE"}
details.fold>.body{margin-left:14px;border-left:1px solid var(--bd);padding-left:8px}
.fold .lab{font-weight:600}.fold .cnt{color:var(--mut);font-size:12px}
.emptyrun{color:var(--mut);padding:2px 0 2px 18px;opacity:.7}
.gh{color:var(--mut);font-size:11px;text-transform:uppercase;letter-spacing:.04em;margin:8px 0 2px}
.it{display:flex;gap:8px;align-items:baseline;padding:2px 4px;cursor:pointer;border-radius:3px}.it:hover,.it.sel{background:var(--hi)}.it .mono{flex:none}
`;
    JS = `
const D=JSON.parse(document.getElementById('data').textContent);
const KINDS=['bootstrap','skill','hook','mcp','plugin','command','agent','rule'];
const STAT=['active','conditional','disabled','shadowed','needs-approval','unknown'];
const SCOPES=['managed','user','ancestor','project','local','plugin','builtin','remote'];
const G={
 status:{active:'Loaded at session start. The agent sees this item.',
  conditional:'Loads later, only when needed (a path-scoped rule, a nested CLAUDE.md, or a skill that is only pulled in on demand).',
  disabled:'Present in config but switched off, so it does not load.',
  shadowed:'Overridden by a same-named item from a higher-precedence place. The other copy wins.',
  'needs-approval':'Present but waiting on a trust or approval decision you have not made yet, so it is not loaded.',
  unknown:'Cannot be determined from local files (for example claude.ai connectors, or a file that could not be read).'},
 scope:{managed:'Set by organization or system policy. Highest precedence, usually cannot be overridden.',
  user:'Your personal config in your home directory. Applies to every project.',
  ancestor:'Found in a parent folder above the working directory. Applies to projects beneath it.',
  project:'Defined in the project folder you are working in.',
  local:'Project-local and personal: not meant for version control, or injected by launch flags such as --settings.',
  plugin:'Contributed by an installed plugin.',
  builtin:'Ships with the agent itself. No file on disk defines it.',
  remote:'Provided by an account-level service such as claude.ai connectors.'},
 kind:{bootstrap:'Instruction documents (CLAUDE.md, AGENTS.md) loaded into context at the start, in load order.',
  skill:'A reusable capability the agent can invoke. Its description is listed to the model.',
  hook:'A command that runs automatically on an event (before a tool call, at session start, ...).',
  mcp:'An MCP server: an external tool provider the agent can call.',
  plugin:'An installed plugin bundle that can contribute skills, hooks, commands and servers.',
  command:'A slash command defined by a file.',agent:'A sub-agent definition the main agent can delegate to.',
  rule:'A rule file: extra instructions, often scoped to certain paths.'},
 metric:{
  'file-backed recall':'Of the items the live session actually used that are defined by a file on disk, the share this tool predicted. Excludes harness-builtin items, which no file defines.',
  'raw recall':'Of everything the live session reported, the share this tool predicted. Lower than file-backed recall when the agent has built-in items.',
  'raw precision':'Of the items this tool predicted, the share the live session confirmed.',
  'adjusted precision':'Raw precision after removing predicted-but-unseen items that have a known reason (failed connection, file changed after the session started, remote and unverifiable).',
  'harness-builtin':'Reported by the live session but defined by the agent itself, not by any file. Cannot be predicted from disk.',
  unverifiable:'Defined by a local file that exists but could not be read, so it cannot be predicted.',
  'stale-session':'Predicted but not seen live because its file changed after the session started. The running session has the older version.',
  'failed-connection':'Predicted, but the MCP server failed to connect in the live session.',
  'remote-unverifiable':'A remote connector that cannot be verified from local files.',
  unexplained:'A mismatch with no known reason. These are the ones worth investigating.',
  predicted:'Items this tool says apply to the session.',observed:'Items found in the live session log.',matched:'Predicted items that the live log confirms.'},
 ui:{search:'Filter items by name, path, plugin, reason or details.',
  showhidden:'Disabled and shadowed items are hidden by default. Tick to include them.',
  folder:'Items grouped by the folder they come from, from / down to the working directory.',
  bykind:'A flat sortable table of every item with filters.',
  expand:'Open every folder and group.',collapse:'Close every folder and group.',
  copypath:'Copy the full file path to the clipboard.',copyopen:'Copy a shell command that opens this file.',
  launch:'The session was started with command-line flags that change what loads. Hooks defined by --settings files are attributed to scope local.',
  livestatus:'Compares what this tool predicts against the live session log. Only items defined by files are scored; agent built-ins are excluded.',
  th:{kind:'What type of thing this is.',name:'Item name.',scope:'Where in the hierarchy it comes from.',status:'Whether it is actually in effect.',path:'File that defines it. Hover a row for the full path.'}}
};
const $=(t,a,...c)=>{const e=document.createElement(t);for(const k in a||{}){if(k==='class')e.className=a[k];else if(typeof a[k]==='function')e[k]=a[k];else if(a[k]!=null)e.setAttribute(k,a[k])}for(const x of c.flat())if(x!=null&&x!==false)e.append(x.nodeType?x:document.createTextNode(String(x)));return e};
const tip=(e,t)=>{if(t){e.setAttribute('data-tip',t);e.setAttribute('aria-label',t.split('\\n')[0])}return e};
const home=D.home;const til=p=>p&&home&&(p===home||p.startsWith(home+'/'))?'~'+p.slice(home.length):p;
const mid=(p,n=58)=>{p=String(p||'');if(p.length<=n)return p;const k=Math.floor((n-1)/2);return p.slice(0,k)+'\\u2026'+p.slice(p.length-(n-1-k))};
const names=Object.keys(D.harnesses);
const QS=new URLSearchParams(location.search);
const hashTab=decodeURIComponent((location.hash||'').slice(1)||QS.get('tab')||'');
const S={h:names.includes(hashTab)?hashTab:names[0],view:'folder',q:'',scope:new Set(),status:new Set(),kind:new Set(),sel:null,sort:'kind',showHidden:false,open:new Set(),closed:new Set(),liveOpen:QS.get('open')==='live'};
// floating tooltip: shows on hover and keyboard focus, works for every [data-tip]
const tipEl=document.createElement('div');tipEl.id='tip';tipEl.setAttribute('role','tooltip');document.body.append(tipEl);
const showTip=(el)=>{const t=el.getAttribute('data-tip');if(!t)return;tipEl.textContent=t;tipEl.style.display='block';const r=el.getBoundingClientRect(),w=tipEl.offsetWidth,h=tipEl.offsetHeight;
 let x=Math.min(Math.max(8,r.left),innerWidth-w-8),y=r.bottom+6;if(y+h>innerHeight-8)y=Math.max(8,r.top-h-6);tipEl.style.left=x+'px';tipEl.style.top=y+'px'};
const hideTip=()=>{tipEl.style.display='none'};
document.addEventListener('mouseover',e=>{const el=e.target.closest&&e.target.closest('[data-tip]');el?showTip(el):hideTip()});
document.addEventListener('focusin',e=>{const el=e.target.closest&&e.target.closest('[data-tip]');el?showTip(el):hideTip()});
document.addEventListener('focusout',hideTip);document.addEventListener('scroll',hideTip,true);
const cp=(txt,b)=>{const done=()=>{const o=b.textContent;b.textContent='copied';setTimeout(()=>b.textContent=o,900)};
 if(navigator.clipboard)navigator.clipboard.writeText(txt).then(done,()=>fb(txt,done));else fb(txt,done)};
const fb=(t,d)=>{const a=document.createElement('textarea');a.value=t;document.body.append(a);a.select();try{document.execCommand('copy')}catch(e){}a.remove();d()};
const H=()=>D.harnesses[S.h];
function visible(it,ignoreFilters){
 if(!S.showHidden&&(it.status==='disabled'||it.status==='shadowed')&&!S.status.has(it.status))return false;
 if(ignoreFilters)return true;
 if(S.scope.size&&!S.scope.has(it.scope))return false;
 if(S.status.size&&!S.status.has(it.status))return false;
 if(S.kind.size&&!S.kind.has(it.kind))return false;
 if(S.q){const q=S.q.toLowerCase();if(!(it.name+' '+it.path+' '+(it.plugin||'')+' '+(it.reason||'')+' '+JSON.stringify(it.details||{})).toLowerCase().includes(q))return false}
 return true}
const cnt=(k)=>{const m={};for(const i of H().items||[])m[i[k]]=(m[i[k]]||0)+1;return m};
const gl=(group,key)=>(G[group]&&G[group][key])||'';
function chips(set,vals,counts,group){return $('div',{class:'chips'},vals.filter(v=>counts[v]).map(v=>tip($('button',{class:'chip'+(set.has(v)?' on':''),onclick:()=>{set.has(v)?set.delete(v):set.add(v);render()}},v+' '+counts[v]),gl(group,v)+'\\nClick to filter.')))}
const stEl=s=>tip($('span',{class:'st',style:'color:var(--'+s+')'},s),gl('status',s));
const tagEl=(g,v)=>tip($('span',{class:'tag'},v),gl(g,v));
const itemTip=it=>it.name+'  ['+it.kind+', '+it.scope+', '+it.status+']\\n'+(it.reason?it.reason+'\\n':'')+it.path;
function pathBtns(p){return $('span',{},tip($('button',{class:'copy',onclick:e=>{e.stopPropagation();cp(p,e.target)}},'copy path'),G.ui.copypath),' ',tip($('button',{class:'copy',onclick:e=>{e.stopPropagation();cp("open '"+p.replace(/'/g,"'\\\\''")+"'",e.target)}},'copy open cmd'),G.ui.copyopen))}
function select(it){S.sel=it.id;render()}
function detail(){
 const it=(H().items||[]).find(i=>i.id===S.sel);
 const box=$('div',{class:'panel'});
 if(!it){box.append($('div',{class:'mut'},'Select an item to see details.'));return box}
 box.append($('div',{style:'font-weight:600;font-size:14px'},it.name),$('div',{},tagEl('kind',it.kind),' ',tagEl('scope',it.scope),' ',stEl(it.status)));
 const dl=$('dl',{style:'margin-top:8px'});
 const row=(k,v,t)=>{if(v){dl.append(tip($('dt',{},k),t),$('dd',{class:'mono'},v))}};
 row('path',it.path,'Full path of the file that defines this item.');row('defined in',it.definedIn,'The config file that references this item, when different from its own file.');
 row('plugin',it.plugin,'The plugin that contributes this item.');row('reason',it.reason,'Why the item has this status.');row('id',it.id,'Stable identifier of this item.');
 box.append(dl,$('div',{style:'margin-top:6px'},pathBtns(it.path)));
 if(it.details&&Object.keys(it.details).length)box.append(tip($('div',{class:'mut',style:'margin-top:8px'},'details (redacted)'),'Kind-specific details. Secrets such as tokens and env values are replaced with <redacted>.'),$('pre',{class:'mono'},JSON.stringify(it.details,null,2)));
 return box}
function toolbar(){
 const b=$('div',{class:'panel'});
 const inp=tip($('input',{type:'search',placeholder:'Search name, path, plugin, details...',value:S.q}),G.ui.search);
 inp.oninput=()=>{S.q=inp.value;const pos=inp.selectionStart;render();const n=document.querySelector('input[type=search]');n.focus();n.setSelectionRange(pos,pos)};
 b.append(inp);
 const items=(H().items||[]).filter(i=>visible(i,true));
 const c=(k)=>{const m={};for(const i of items)m[i[k]]=(m[i[k]]||0)+1;return m};
 b.append(chips(S.kind,KINDS,c('kind'),'kind'),chips(S.scope,SCOPES,c('scope'),'scope'),chips(S.status,STAT,cnt('status'),'status'));
 const hid=(H().items||[]).filter(i=>i.status==='disabled'||i.status==='shadowed').length;
 if(hid){const cb=$('input',Object.assign({type:'checkbox'},S.showHidden?{checked:''}:{}));cb.onchange=()=>{S.showHidden=cb.checked;render()};b.append(tip($('label',{class:'mut'},cb,' show disabled/shadowed ('+hid+' hidden by default)'),G.ui.showhidden))}
 return b}
function table(){
 const items=(H().items||[]).filter(i=>visible(i));
 const key={kind:i=>KINDS.indexOf(i.kind)+i.name,name:i=>i.name,scope:i=>i.scope+i.name,status:i=>i.status+i.name,path:i=>i.path};
 items.sort((a,b)=>String(key[S.sort](a)).localeCompare(String(key[S.sort](b))));
 const t=$('table',{},$('thead',{},$('tr',{},['kind','name','scope','status','path'].map(c=>tip($('th',{onclick:()=>{S.sort=c;render()}},c+(S.sort===c?' v':'')),G.ui.th[c]+' Click to sort.')))));
 const tb=$('tbody');
 for(const it of items)tb.append(tip($('tr',{class:'item'+(S.sel===it.id?' sel':''),onclick:()=>select(it)},$('td',{},tagEl('kind',it.kind)),$('td',{},it.name),$('td',{},tagEl('scope',it.scope)),$('td',{},stEl(it.status)),$('td',{class:'p mono'},mid(til(it.path)))),itemTip(it)));
 t.append(tb);
 return $('div',{class:'panel'},$('div',{class:'mut'},items.length+' items'),t)}
// ---- folder tree
const kindSummary=items=>{const m={};for(const i of items)m[i.kind]=(m[i.kind]||0)+1;return KINDS.filter(k=>m[k]).map(k=>k+' '+m[k]).join(', ')};
function isOpen(key,def){const k=S.h+'|'+key;return S.open.has(k)?true:S.closed.has(k)?false:def}
function fold(key,def,label,labelTip,items,extra,bodyFn){
 const d=$('details',{class:'fold'});if(isOpen(key,def))d.setAttribute('open','');
 const sum=tip($('summary',{},$('span',{class:'lab'},label),$('span',{class:'cnt'},items.length+' item'+(items.length===1?'':'s')+(items.length?' ('+kindSummary(items)+')':'')),extra),labelTip);
 d.append(sum);
 const body=$('div',{class:'body'});d.append(body);
 let done=false;const fill=()=>{if(done)return;done=true;bodyFn(body)};
 if(d.hasAttribute('open'))fill();
 d.addEventListener('toggle',()=>{const k=S.h+'|'+key;if(d.open){S.open.add(k);S.closed.delete(k);fill()}else{S.closed.add(k);S.open.delete(k)}});
 return d}
function itemRows(items,into){
 items=items.slice().sort((x,y)=>KINDS.indexOf(x.kind)-KINDS.indexOf(y.kind)||x.name.localeCompare(y.name));
 for(const it of items)into.append(tip($('div',{class:'it'+(S.sel===it.id?' sel':''),onclick:()=>select(it)},tagEl('kind',it.kind),$('span',{},it.name),stEl(it.status),$('span',{class:'mut mono nw'},mid(til(it.path),52))),itemTip(it)))}
function folderTree(){
 const h=H();const items=(h.items||[]).filter(i=>visible(i));
 let chain=(h.chain||[]).filter(c=>typeof c==='string').sort((a,b)=>a.length-b.length);
 if(!chain.length){const root=h.projectRoot||D.cwd;chain=['/'];let a='';for(const x of root.split('/').filter(Boolean)){a+='/'+x;chain.push(a)}}
 if(chain[0]!=='/')chain.unshift('/');
 const dirItems={};const groups={};const order=[];
 const grp=(key,label,tipText,pri)=>{if(!groups[key]){groups[key]={key,label,tip:tipText,pri,items:[]};order.push(groups[key])}return groups[key]};
 const own={managed:['Managed (policy)',0],user:['User config ('+til(home)+')',1],builtin:['Built-in',90],remote:['Remote / connectors',91]};
 for(const it of items){
  if(own[it.scope])grp('s:'+it.scope,own[it.scope][0],gl('scope',it.scope),own[it.scope][1]).items.push(it);
  else if(it.scope==='plugin')grp('plugin:'+(it.plugin||'?'),'Plugin '+(it.plugin||'(unknown)'),gl('scope','plugin'),50).items.push(it);
  else if(it.details&&it.details.via)grp('launch','Launch flags (--settings / --mcp-config / --plugin-dir)','Items defined by files passed on the command line when the session was launched. They are not found by walking the folder chain.',2).items.push(it);
  else{let best=null;const lastD=chain[chain.length-1];
   for(const d of chain){if(it.path.startsWith(d==='/'?'/':d+'/')){const rest=it.path.slice(d==='/'?1:d.length+1);
    if(d===lastD||/^[^/]+$/.test(rest)||/^(\\.claude|\\.codex|\\.agents|\\.opencode)\\//.test(rest))best=d}}
   if(best)(dirItems[best]||(dirItems[best]=[])).push(it);
   else if(D.session&&D.session.launch&&D.session.harness===S.h)grp('launch','Launch flags (--settings / --mcp-config / --plugin-dir)','Items defined by files passed on the command line when the session was launched. They are not found by walking the folder chain.',2).items.push(it);
   else grp('other','Other','Items whose file is outside the folder chain.',95).items.push(it)}}
 order.sort((a,b)=>a.pri-b.pri||a.label.localeCompare(b.label));
 const root=$('div',{class:'panel'});
 const tools=$('div',{style:'display:flex;gap:6px;align-items:center;margin-bottom:6px'},$('span',{class:'gh',style:'margin:0'},'Sources'),$('div',{class:'tools'},
  tip($('button',{class:'chip',onclick:()=>{allKeys.forEach(k=>{S.open.add(S.h+'|'+k);S.closed.delete(S.h+'|'+k)});render()}},'Expand all'),G.ui.expand),
  tip($('button',{class:'chip',onclick:()=>{allKeys.forEach(k=>{S.closed.add(S.h+'|'+k);S.open.delete(S.h+'|'+k)});render()}},'Collapse all'),G.ui.collapse)));
 root.append(tools);
 const allKeys=[];
 const pre=order.filter(g=>g.pri<80),post=order.filter(g=>g.pri>=80);
 const addGroup=(g,into)=>{allKeys.push(g.key);into.append(fold(g.key,false,g.label,g.tip,g.items,null,b=>itemRows(g.items,b)))};
 for(const g of pre)addGroup(g,root);
 root.append($('div',{class:'gh'},'Folders, from / down to the working directory'));
 // folders: merge runs of empty intermediate folders into one dimmed line
 const segOf=d=>d==='/'?'/':d===home?'~ (home)':d.split('/').pop();
 const buildDirs=(idx,into)=>{
  if(idx>=chain.length)return;
  let j=idx;const run=[];
  while(j<chain.length-1&&!(dirItems[chain[j]]||[]).length){run.push(chain[j]);j++}
  if(run.length){
   const segs=run.map(segOf);
   into.append(tip($('div',{class:'emptyrun'},segs.join(' / ').replace('/ /','/')+'  (0 items, '+run.length+' folder'+(run.length>1?'s':'')+')'),'Empty intermediate folders. Nothing is defined here.\\n'+run[run.length-1]));
  }
  const d=chain[j];const its=dirItems[d]||[];const seg=segOf(d);
  const key='d:'+d;allKeys.push(key);
  const isCwd=j===chain.length-1;
  const node=fold(key,its.length>0||isCwd,seg+(isCwd?'  (working directory)':''),d+'\\nFolder: '+(isCwd?'the working directory.':'items here apply to projects at or beneath it.'),its,null,b=>{itemRows(its,b);buildDirs(j+1,b)});
  into.append(node);
 };
 buildDirs(0,root);
 for(const g of post)addGroup(g,root);
 return root}
// ---- live status + details
function liveSummary(){
 const h=H();const c=D.compare[S.h];
 if(h.live&&h.live.error)return $('div',{class:'status neutral'},tip($('span',{class:'l'},'Live session check unavailable:'),G.ui.livestatus),$('span',{},h.live.error));
 if(!c)return null;
 let m=0,den=0,un=0;const parts=[];
 for(const [k,label] of [['bootstrap','bootstrap'],['skills','skills'],['mcp','MCP']]){const r=c[k];const d=r.observed-(r.builtinMissing||[]).length;m+=r.matched;den+=d;un+=(r.unexplainedMissing||[]).length+(r.extraUnexplained||[]).length;parts.push(label+' '+r.matched+'/'+d)}
 const pc=den?Math.round(m/den*100):100;
 const good=pc>=95&&un===0;
 const el=$('div',{class:'status '+(good?'good':'warn')});
 el.append(tip($('b',{},"Matches this session's log: "+pc+'% of file-backed items'),G.ui.livestatus+'\\nScored: '+m+' matched of '+den+' file-backed items the session reported.'),$('span',{class:'mut'},'('+parts.join(', ')+')'));
 if(un)el.append(tip($('b',{style:'color:#dc2626'},un+' unexplained mismatch'+(un>1?'es':'')),G.metric.unexplained));
 const more=tip($('button',{class:'chip',onclick:()=>{S.liveOpen=true;render();const d=document.getElementById('livedetails');if(d)d.scrollIntoView()}},'details'),'Open the full live session check below the list.');
 el.append(more);
 return el}
function launchLine(){
 const l=D.session&&D.session.launch;if(!l||S.h!==D.session.harness)return null;
 const bits=[];for(const [k,v] of Object.entries(l)){if(k==='argv0')continue;
  const vals=Array.isArray(v)?v.map(x=>x&&typeof x==='object'?(x.path||(x.unparsed?'(inline, unparsed)':'(inline JSON)')):String(x)):[String(v)];
  bits.push('--'+k.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())+' '+vals.map(til).join(', '))}
 if(!bits.length)return null;
 const el=$('div',{class:'status neutral launch'},tip($('span',{class:'l'},'Launched with:'),G.ui.launch),$('span',{class:'mono nw',style:'overflow:hidden;text-overflow:ellipsis;max-width:100%'},mid(bits.join('  '),140)));
 return tip(el,G.ui.launch+'\\n'+bits.join('\\n'))}
function liveDetails(){
 const c=D.compare[S.h];if(!c)return null;
 const p=x=>x==null?'n/a':Math.round(x*100)+'%';
 const d=$('details',{id:'livedetails'});if(S.liveOpen)d.setAttribute('open','');d.addEventListener('toggle',()=>{S.liveOpen=d.open});
 d.append(tip($('summary',{},'Live session check (details)'),G.ui.livestatus));
 if(c.source)d.append($('div',{class:'mut mono nw',title:c.source},'log: '+mid(til(String(c.source)),120)));
 const names={bootstrap:'Bootstrap docs',skills:'Skills',mcp:'MCP servers'};
 const heads=[['category',''],['predicted','predicted'],['observed','observed'],['matched','matched'],['raw recall','raw recall'],['file-backed recall','file-backed recall'],['raw precision','raw precision'],['adjusted precision','adjusted precision']];
 const t=$('table',{},$('thead',{},$('tr',{},heads.map(([k,l],i)=>tip($('th',{class:i?'num':''},l||'category'),i?(G.metric[k]||''):'The kind of item compared.')))));
 const tb=$('tbody');
 for(const k of ['bootstrap','skills','mcp']){const r=c[k];tb.append($('tr',{},$('td',{},names[k]),...[r.predicted,r.observed,r.matched,p(r.recall),p(r.recallFileBacked),p(r.precision),p(r.precisionAdjusted)].map(v=>$('td',{class:'num'},v))))}
 t.append(tb);d.append(t);
 const nm=x=>$('div',{class:'mono',title:x},mid(til(x),110));
 const exf=x=>$('div',{},$('span',{class:'mono',title:x.name},mid(til(x.name),110)),x.evidence?$('div',{class:'ev'},'changed '+x.evidence.changedAt+', after session start '+x.evidence.sessionStart):null);
 for(const k of ['bootstrap','skills','mcp']){const r=c[k];
  const ex=(reason)=>(r.extraExplained||[]).filter(e=>e.reason===reason);
  const blocks=[];
  const grp=(cls,key,title,list,fmt)=>{if(!list||!list.length)return;
   const g=cls==='bad'?$('div',{class:'grp bad'},tip($('b',{},title+' ('+list.length+')'),G.metric.unexplained)):$('details',{class:'grp'},tip($('summary',{},title+' ('+list.length+')'),G.metric[key]||''));
   for(const x of list.slice(0,40))g.append(fmt(x));if(list.length>40)g.append($('div',{class:'mut'},'... '+(list.length-40)+' more'));blocks.push(g)};
  grp('bad','unexplained','UNEXPLAINED: seen live, not predicted',r.unexplainedMissing,nm);
  grp('bad','unexplained','UNEXPLAINED: predicted, not seen live',r.extraUnexplained,nm);
  grp('','harness-builtin','harness-builtin',r.builtinMissing,nm);
  grp('','unverifiable','unverifiable',r.unverifiableMissing,nm);
  grp('','failed-connection','failed-connection',ex('failed-connection'),exf);
  grp('','stale-session','stale-session',ex('stale-session'),exf);
  grp('','remote-unverifiable','remote-unverifiable',ex('remote-unverifiable'),exf);
  if(blocks.length)d.append($('div',{class:'gh'},names[k]),...blocks)}
 return $('div',{class:'below'},d)}
function strip(){
 const items=H().items||[];const act={};for(const i of items)if(i.status==='active')act[i.kind]=(act[i.kind]||0)+1;
 const el=$('div',{class:'strip'},tip($('span',{class:'mut'},'active:'),G.status.active));
 for(const k of KINDS)if(act[k])el.append(tip($('button',{class:'chip'+(S.kind.has(k)?' on':''),onclick:()=>{S.kind.has(k)?S.kind.delete(k):S.kind.add(k);S.view='kind';render()}},k+' '+act[k]),'Active '+k+' items. '+gl('kind',k)+'\\nClick to filter the table.'));
 el.append($('span',{class:'sep'}),tip($('span',{class:'mut'},'attention:'),'Items that are not simply loaded: they may need action or explain surprises.'));
 const st=cnt('status');
 for(const k of ['needs-approval','unknown','shadowed','disabled'])el.append(tip($('button',{class:'chip warn'+(S.status.has(k)?' on':''),onclick:()=>{S.status.has(k)?S.status.delete(k):S.status.add(k);S.view='kind';render()}},k+' '+(st[k]||0)),gl('status',k)+'\\nClick to filter the table.'));
 const ws=H().warnings||[];
 if(ws.length)el.append($('span',{class:'sep'}),tip($('span',{class:'chip note',tabindex:'0'},ws.length+' note'+(ws.length>1?'s':'')),'Notes from the audit:\\n'+ws.join('\\n')));
 return el}
function render(){
 hideTip();
 const root=document.getElementById('app');root.textContent='';
 const nav=$('nav',{},names.map(n=>tip($('button',{class:n===S.h?'on':'',onclick:()=>{S.h=n;S.sel=null;try{history.replaceState(null,'','#'+n)}catch(e){}render()}},n+' ('+((D.harnesses[n].items||[]).length)+')'),'Show what the '+n+' harness loads. The number is how many items it found.')));
 const h=H();
 const head=$('header',{},$('h1',{},'context-audit'),$('div',{class:'mut mono'},'cwd '+til(D.cwd)+'  |  generated '+D.generatedAt+(D.session&&D.session.harness?'  |  session '+D.session.harness+' pid '+D.session.pid:'')));
 const left=$('div',{},$('div',{class:'views'},[['folder','Folder tree'],['kind','By kind']].map(([k,l])=>tip($('button',{class:S.view===k?'on':'',onclick:()=>{S.view=k;render()}},l),k==='folder'?G.ui.folder:G.ui.bykind))),toolbar(),S.view==='folder'?folderTree():table());
 root.append(...[head,nav,strip(),launchLine(),liveSummary(),$('main',{},left,$('aside',{},detail())),liveDetails()].filter(Boolean));
 const dt=QS.get('demoTooltip');if(dt){const el=document.querySelector('[data-tip*="'+dt.replace(/"/g,'')+'"]');if(el)showTip(el)}
}
render();
{const y=Number(QS.get('scroll'));if(y)window.scrollTo(0,y)}
`;
    safeJson = (o) => JSON.stringify(o).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  }
});

// src/render/app.js
function renderApp({ home, cwd }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>context-audit</title>
<style>
:root{--bg:#fafaf9;--panel:#fff;--fg:#1c1917;--mut:#78716c;--bd:#e7e5e4;--acc:#2563eb;--hi:#eff6ff;--ok:#15803d;--warn:#b45309;
--claude:#c2410c;--codex:#0f766e;--opencode:#6d28d9;--on-acc:#fff;--mono:ui-monospace,SFMono-Regular,Menlo,monospace;color-scheme:light}
@media(prefers-color-scheme:dark){:root{--bg:#131211;--panel:#1c1a19;--fg:#e7e5e4;--mut:#a8a29e;--bd:#33302e;--acc:#60a5fa;--hi:#1e2a3f;--ok:#4ade80;--warn:#fbbf24;
--claude:#fb923c;--codex:#2dd4bf;--opencode:#a78bfa;--on-acc:#0b1220;color-scheme:dark}}
*{box-sizing:border-box}html,body{height:100%}
body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.45 system-ui,-apple-system,sans-serif;display:grid;grid-template-columns:360px 1fr}
aside{border-right:1px solid var(--bd);background:var(--panel);overflow:auto;display:flex;flex-direction:column}
header{padding:16px 16px 12px;border-bottom:1px solid var(--bd)}
h1{font:600 16px var(--mono);margin:0}header p{margin:4px 0 0;color:var(--mut);font-size:13px}
section{padding:14px 16px;border-bottom:1px solid var(--bd);display:flex;flex-direction:column;gap:8px}
h2{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);margin:0;display:flex;justify-content:space-between;align-items:center;font-weight:600}
input[type=text]{width:100%;font:13px var(--mono);padding:7px 8px;border:1px solid var(--bd);border-radius:6px;background:var(--bg);color:var(--fg)}
input:focus-visible,button:focus-visible{outline:2px solid var(--acc);outline-offset:1px}
.row{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
button{font:inherit;font-size:13px;border:1px solid var(--bd);background:var(--panel);color:var(--fg);border-radius:6px;padding:5px 10px;cursor:pointer}
button.primary{background:var(--acc);border-color:var(--acc);color:var(--on-acc);font-weight:600}
button.link{border:0;background:none;color:var(--acc);padding:0;font-size:12px}
label.h{display:flex;gap:4px;align-items:center;font-size:13px}
.list{display:flex;flex-direction:column;gap:2px;max-height:260px;overflow:auto}
.item{display:grid;grid-template-columns:86px 1fr;gap:2px 8px;text-align:left;border:1px solid transparent;border-radius:6px;padding:6px 8px;background:none;width:100%}
.item:hover{background:var(--hi)}.item.on{border-color:var(--acc);background:var(--hi)}
.item .p{font:12px var(--mono);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:rtl;text-align:left}
.item .m{grid-column:2;color:var(--mut);font-size:11.5px}
.badge{justify-self:start;font:600 10.5px var(--mono);padding:1px 6px;border-radius:4px;border:1px solid currentColor;align-self:start;margin-top:1px}
.badge.claude{color:var(--claude)}.badge.codex{color:var(--codex)}.badge.opencode{color:var(--opencode)}
.empty{color:var(--mut);font-size:12.5px}
.browser{border:1px solid var(--bd);border-radius:6px;background:var(--bg)}
.browser .cur{font:12px var(--mono);padding:6px 8px;border-bottom:1px solid var(--bd);display:flex;gap:6px;align-items:center;justify-content:space-between}
.browser .ents{max-height:200px;overflow:auto;padding:4px}
.browser .ents button{display:block;width:100%;text-align:left;border:0;background:none;font:12px var(--mono);padding:3px 6px}
.browser .ents button:hover{background:var(--hi)}
.mk{font:10.5px var(--mono);color:var(--ok);border:1px solid var(--bd);border-radius:4px;padding:0 4px;margin-right:3px}
main{display:flex;flex-direction:column;min-width:0}
.bar{display:flex;align-items:center;gap:10px;padding:8px 14px;border-bottom:1px solid var(--bd);background:var(--panel);min-height:42px;font-size:13px}
.bar .t{font:12.5px var(--mono);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0}
iframe{flex:1;border:0;width:100%;background:var(--bg)}
.welcome{flex:1;display:flex;align-items:center;justify-content:center;padding:32px}
.welcome div{max-width:560px;display:flex;flex-direction:column;gap:10px}
.welcome h3{margin:0;font-size:20px;text-wrap:balance}.welcome p{margin:0;color:var(--mut)}
.welcome ol{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px}
.spin{color:var(--mut);font-size:12px}
@media(max-width:800px){body{grid-template-columns:1fr;grid-template-rows:auto 1fr}aside{max-height:55vh;border-right:0;border-bottom:1px solid var(--bd)}}
</style></head><body>
<aside>
  <header><h1>context-audit</h1><p>See every skill, hook, MCP server and bootstrap doc an agent session loads, and the file it comes from.</p></header>
  <section>
    <h2>Audit a folder</h2>
    <input type="text" id="dir" value="${esc(cwd)}" spellcheck="false" aria-label="Folder path">
    <div class="row">
      <label class="h"><input type="checkbox" class="hz" value="claude" checked> Claude Code</label>
      <label class="h"><input type="checkbox" class="hz" value="codex" checked> Codex</label>
      <label class="h"><input type="checkbox" class="hz" value="opencode" checked> OpenCode</label>
    </div>
    <div class="row"><button class="primary" id="go">Audit folder</button><button id="browse">Browse\u2026</button></div>
    <div class="browser" id="browser" hidden></div>
  </section>
  <section>
    <h2>Running agents <button class="link" id="rr">Refresh</button></h2>
    <div class="list" id="running"><span class="spin">Looking for running agents\u2026</span></div>
    <p class="empty">Audits the agent exactly as it was started, launch flags included, and compares the result with its live session log.</p>
  </section>
  <section>
    <h2>Recent sessions <button class="link" id="rs">Refresh</button></h2>
    <div class="list" id="recent"><span class="spin">Reading session logs\u2026</span></div>
  </section>
</aside>
<main>
  <div class="bar"><span class="t" id="what">Nothing audited yet</span><button id="json" hidden>Download JSON</button><button id="newtab" hidden>Open in new tab</button></div>
  <div class="welcome" id="welcome"><div>
    <h3>Pick something to audit</h3>
    <p>context-audit reads the same config files the agent harnesses read, then shows what would load for that folder and why.</p>
    <ol>
      <li><b>Running agents</b>: audit a live Claude Code or Codex session. Its launch flags are included and the result is checked against the session log.</li>
      <li><b>Recent sessions</b>: audit the folder of a past session and compare with what that session actually loaded.</li>
      <li><b>Audit a folder</b>: type or browse to any directory to see what a new session started there would load.</li>
    </ol>
  </div></div>
  <iframe id="frame" title="Audit report" hidden></iframe>
</main>
<script>
const HOME=${JSON.stringify(home)};
const $=(id)=>document.getElementById(id);
const tild=(p)=>p&&p.startsWith(HOME)?'~'+p.slice(HOME.length):p;
const ago=(t)=>{const m=Math.round((Date.now()-t)/60000);return m<60?m+' min ago':m<1440?Math.round(m/60)+' h ago':Math.round(m/1440)+' d ago'};
const NAME={claude:'Claude Code',codex:'Codex',opencode:'OpenCode'};
let current=null;
function show(params,label){
  current=new URLSearchParams(params).toString();
  $('welcome').hidden=true;const f=$('frame');f.hidden=false;f.src='/report?'+current;
  $('what').textContent=label;$('json').hidden=false;$('newtab').hidden=false;
  document.querySelectorAll('.item.on').forEach(e=>e.classList.remove('on'));
}
function harnesses(){return [...document.querySelectorAll('.hz:checked')].map(e=>e.value).join(',')}
$('go').onclick=()=>{const d=$('dir').value.trim();if(d)show({dir:d.replace(/^~(?=\\/|$)/,HOME),harness:harnesses()},'Folder '+tild(d))};
$('dir').addEventListener('keydown',e=>{if(e.key==='Enter')$('go').click()});
$('json').onclick=()=>{location.href='/api/audit?'+current};
$('newtab').onclick=()=>{window.open('/report?'+current,'_blank')};
function item(el,{badge,path,meta,onclick}){
  const b=document.createElement('button');b.className='item';b.title=path;
  b.innerHTML='<span class="badge '+badge+'">'+NAME[badge]+'</span><span class="p"></span><span class="m"></span>';
  b.querySelector('.p').textContent='\\u200e'+tild(path);b.querySelector('.m').textContent=meta;
  b.onclick=()=>{onclick();b.classList.add('on')};el.appendChild(b);
}
async function loadRunning(){
  const el=$('running');el.innerHTML='<span class="spin">Looking for running agents\u2026</span>';
  const rows=await fetch('/api/running').then(r=>r.json()).catch(()=>[]);el.innerHTML='';
  const hosts=rows.filter(r=>r.host);const agents=rows.filter(r=>!r.host);
  if(!agents.length&&!hosts.length){el.innerHTML='<span class="empty">No Claude Code, Codex or OpenCode processes are running.</span>';return}
  if(hosts.length){const n=document.createElement('span');n.className='empty';n.textContent=hosts.length+' Codex app/exec server'+(hosts.length>1?'s host':' hosts')+' threads with their own folders; find those under Recent sessions.';el.appendChild(n)}
  for(const r of agents){
    const flags=Object.keys(r.launch||{}).filter(k=>k!=='argv0');
    item(el,{badge:r.harness,path:r.cwd,meta:'pid '+r.pid+(flags.length?' \xB7 flags: '+flags.join(', '):''),
      onclick:()=>show({pid:r.pid,h:r.harness,harness:r.harness,live:'1',...(r.sessionId?{session:r.sessionId}:{})},NAME[r.harness]+' pid '+r.pid+' in '+tild(r.cwd))});
  }
}
async function loadRecent(){
  const el=$('recent');el.innerHTML='<span class="spin">Reading session logs\u2026</span>';
  const rows=await fetch('/api/recent').then(r=>r.json()).catch(()=>[]);el.innerHTML='';
  if(!rows.length){el.innerHTML='<span class="empty">No sessions in the last 72 hours.</span>';return}
  for(const r of rows) item(el,{badge:r.harness,path:r.cwd,meta:ago(r.at),
    onclick:()=>show({dir:r.cwd,harness:r.harness,live:'1',session:r.sessionId},NAME[r.harness]+' session in '+tild(r.cwd))});
}
async function browse(dir){
  const el=$('browser');el.hidden=false;
  const d=await fetch('/api/ls?dir='+encodeURIComponent(dir)).then(r=>r.json());
  if(d.error){el.textContent=d.error;return}
  $('dir').value=tild(d.dir);
  el.innerHTML='<div class="cur"><span></span><span class="row"></span></div><div class="ents"></div>';
  el.querySelector('.cur span').textContent=tild(d.dir);
  const mk=el.querySelector('.cur .row');d.markers.forEach(m=>{const s=document.createElement('span');s.className='mk';s.textContent=m;mk.appendChild(s)});
  const ents=el.querySelector('.ents');
  if(d.parent){const up=document.createElement('button');up.textContent='..';up.onclick=()=>browse(d.parent);ents.appendChild(up)}
  for(const n of d.entries){const b=document.createElement('button');b.textContent=n+'/';b.onclick=()=>browse(d.dir+'/'+n);ents.appendChild(b)}
}
$('browse').onclick=()=>{const el=$('browser');if(!el.hidden){el.hidden=true;return}browse($('dir').value.trim().replace(/^~(?=\\/|$)/,HOME)||HOME)};
$('rr').onclick=loadRunning;$('rs').onclick=loadRecent;
loadRunning();loadRecent();
</script></body></html>`;
}
var esc;
var init_app = __esm({
  "src/render/app.js"() {
    esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  }
});

// src/discover.js
import fs7 from "node:fs";
import os3 from "node:os";
import path9 from "node:path";
import { execFileSync as execFileSync2 } from "node:child_process";
function listRunning() {
  let out = "";
  try {
    out = execFileSync2("ps", ["-axo", "pid=,comm="], { encoding: "utf8" });
  } catch {
    return [];
  }
  const rows = [];
  for (const line of out.split("\n")) {
    const m = line.trim().match(/^(\d+)\s+(.*)$/);
    const hit = m && HARNESS.find(([re]) => re.test(m[2]));
    if (!hit) continue;
    const pid = Number(m[1]);
    const cwd = processCwd(pid);
    if (!cwd) continue;
    const argv = processArgs(pid) || [];
    const host = argv.join(" ").match(/(?:^| )(app-server|exec-server|mcp-server)(?: |$)/)?.[1];
    if (host) {
      rows.push({ pid, harness: hit[1], host, cwd: null });
      continue;
    }
    const i = argv.indexOf("--session-id");
    rows.push({ pid, harness: hit[1], cwd, sessionId: i >= 0 ? argv[i + 1] : null, launch: parseLaunchFlags(argv, cwd) });
  }
  return rows.sort((a, b) => String(a.cwd).localeCompare(String(b.cwd)));
}
function listRecent({ home = os3.homedir(), hours = 72, limit = 40 } = {}) {
  const since = Date.now() - hours * 36e5;
  const rows = [];
  const claudeBase = path9.join(home, ".claude/projects");
  for (const d of safeDir(claudeBase)) {
    for (const f of safeDir(path9.join(claudeBase, d)).filter((x) => x.endsWith(".jsonl"))) {
      const p = path9.join(claudeBase, d, f);
      const st = safeStat(p);
      if (!st || st.mtimeMs < since || st.size < 2e3) continue;
      for (const l of firstLines(p)) {
        try {
          const j = JSON.parse(l);
          if (j.cwd && !j.isSidechain) {
            rows.push({ harness: "claude", cwd: j.cwd, sessionId: f.slice(0, -6), at: st.mtimeMs });
            break;
          }
        } catch {
        }
      }
    }
  }
  const codexBase = path9.join(process.env.CODEX_HOME || path9.join(home, ".codex"), "sessions");
  const walk = (d, depth) => {
    for (const e of safeDir(d, true)) {
      const p = path9.join(d, e.name);
      if (e.isDirectory() && depth < 3) walk(p, depth + 1);
      else if (e.name.endsWith(".jsonl")) {
        const st = safeStat(p);
        if (!st || st.mtimeMs < since) continue;
        try {
          const j = JSON.parse(firstLines(p, 1)[0]);
          if (j.type === "session_meta") rows.push({ harness: "codex", cwd: j.payload.cwd, sessionId: j.payload.id, at: st.mtimeMs });
        } catch {
        }
      }
    }
  };
  walk(codexBase, 0);
  const seen = /* @__PURE__ */ new Set();
  return rows.sort((a, b) => b.at - a.at).filter((r) => {
    const k = `${r.harness}|${r.cwd}`;
    if (seen.has(k) || !fs7.existsSync(r.cwd)) return false;
    seen.add(k);
    return true;
  }).slice(0, limit);
}
function safeDir(d, withTypes = false) {
  try {
    return fs7.readdirSync(d, withTypes ? { withFileTypes: true } : void 0);
  } catch {
    return [];
  }
}
function safeStat(p) {
  try {
    return fs7.statSync(p);
  } catch {
    return null;
  }
}
function listFolder(dir) {
  const abs = path9.resolve(dir);
  const MARKERS = ["CLAUDE.md", "AGENTS.md", ".claude", ".codex", ".agents", ".opencode", "opencode.json", ".mcp.json", ".git"];
  const entries = safeDir(abs, true).filter((e) => (e.isDirectory() || e.isSymbolicLink()) && !e.name.startsWith(".") && safeStat(path9.join(abs, e.name))?.isDirectory()).map((e) => e.name).sort((a, b) => a.localeCompare(b));
  const markers = MARKERS.filter((m) => fs7.existsSync(path9.join(abs, m)));
  return { dir: abs, parent: path9.dirname(abs) === abs ? null : path9.dirname(abs), markers, entries };
}
var HARNESS, firstLines;
var init_discover = __esm({
  "src/discover.js"() {
    init_session();
    HARNESS = [[/(^|\/)claude$/, "claude"], [/(^|\/)codex$/, "codex"], [/(^|\/)opencode$/, "opencode"]];
    firstLines = (f, n = 40) => {
      try {
        const fd = fs7.openSync(f, "r");
        const buf = Buffer.alloc(1 << 18);
        const len = fs7.readSync(fd, buf, 0, buf.length, 0);
        fs7.closeSync(fd);
        return buf.subarray(0, len).toString("utf8").split("\n").slice(0, n);
      } catch {
        return [];
      }
    };
  }
});

// src/server.js
var server_exports = {};
__export(server_exports, {
  startServer: () => startServer
});
import http from "node:http";
import fs8 from "node:fs";
import os4 from "node:os";
function reportFor(q) {
  const harnesses = q.get("harness") ? q.get("harness").split(",").filter(Boolean) : void 0;
  const pid = q.get("pid") ? Number(q.get("pid")) : null;
  let dir = q.get("dir");
  let launch, session = { harness: null, detectedBy: [] };
  if (pid) {
    const cwd = processCwd(pid);
    if (!cwd) throw Object.assign(new Error(`process ${pid} is no longer running`), { status: 410 });
    dir = cwd;
    launch = parseLaunchFlags(processArgs(pid) || [], cwd);
    session = { harness: q.get("h") || null, pid, bootCwd: cwd, sessionId: q.get("session") || null, launch, detectedBy: ["ui"] };
  }
  if (!dir || !fs8.existsSync(dir)) throw Object.assign(new Error(`folder not found: ${dir || "(none)"}`), { status: 404 });
  return audit({ cwd: dir, harnesses, live: q.get("live") === "1", sessionId: q.get("session") || void 0, launch, session });
}
function startServer({ port = 4747, host = "127.0.0.1" } = {}) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${host}`);
    const q = url.searchParams;
    const send = (status, type, body) => {
      res.writeHead(status, { "content-type": type, "cache-control": "no-store" });
      res.end(body);
    };
    const json = (v) => send(200, "application/json; charset=utf-8", JSON.stringify(v));
    try {
      switch (url.pathname) {
        case "/":
          return send(200, "text/html; charset=utf-8", renderApp({ home: os4.homedir(), cwd: process.cwd() }));
        case "/report":
          return send(200, "text/html; charset=utf-8", renderHtml(reportFor(q)));
        case "/api/audit": {
          const body = JSON.stringify(reportFor(q), null, 2);
          res.writeHead(200, { "content-type": "application/json; charset=utf-8", "content-disposition": 'attachment; filename="context-audit.json"' });
          return res.end(body);
        }
        case "/api/running":
          return json(listRunning());
        case "/api/recent":
          return json(listRecent({ hours: Number(q.get("hours") || 72) }));
        case "/api/ls":
          return json(listFolder(q.get("dir") || os4.homedir()));
        default:
          return send(404, "text/plain", "not found");
      }
    } catch (e) {
      const msg = String(e.message || e);
      if (url.pathname === "/report") return send(e.status || 500, "text/html; charset=utf-8", `<p style="font:14px system-ui;padding:24px">${msg.replace(/</g, "&lt;")}</p>`);
      return send(e.status || 500, "application/json", JSON.stringify({ error: msg }));
    }
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => resolve({ server, url: `http://${host}:${server.address().port}/` }));
  });
}
var init_server = __esm({
  "src/server.js"() {
    init_src();
    init_html();
    init_app();
    init_discover();
    init_session();
  }
});

// src/render/summary.js
var summary_exports = {};
__export(summary_exports, {
  renderSummary: () => renderSummary
});
import path10 from "node:path";
function skillSource(it, tild) {
  if (it.plugin) return `plugin ${it.plugin}`;
  const m = it.path.match(/^(.*?\/(?:\.claude|\.codex|\.agents|\.opencode|opencode)\/skills)\//);
  if (m) return tild(m[1]);
  return tild(path10.dirname(path10.dirname(path10.dirname(it.path)))).replace(/\/agents\/[^/]+\//, "/agents/*/");
}
function renderSummary(report, { harness, htmlPath, opened, maxList = 8 } = {}) {
  const home = report.home;
  const tild = (p) => p && home && p.startsWith(home + "/") ? "~" + p.slice(home.length) : p;
  const h = report.harnesses[harness];
  const items = h.items || [];
  const s = report.session || {};
  const out = [];
  const flags = Object.entries(s.launch || {}).filter(([k]) => k !== "argv0").map(([k, v]) => `--${k.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())}${Array.isArray(v) ? " " + v.map((x) => tild(x.path) || (x.inline ? "<inline>" : String(x))).join(", ") : ""}`);
  out.push(`## Context audit: ${NAME[harness] || harness}`);
  out.push("");
  out.push(s.harness === harness && (s.pid || s.sessionId) ? `**Session:** ${NAME[harness]} ${s.pid ? `pid ${s.pid}` : `session ${s.sessionId}`}, booted in \`${tild(report.cwd)}\`${flags.length ? `, launch flags: ${flags.join("; ")}` : ""}` : `**Folder:** \`${tild(report.cwd)}\` (what a new ${NAME[harness]} session started here would load)`);
  if (htmlPath) out.push(`**Interactive report:** [open the context tree](${new URL("file://" + htmlPath).href})${opened ? " (also opened in the browser on this machine)" : ""}  
\`${htmlPath}\``);
  out.push("");
  out.push("| Kind | Active | Not active |");
  out.push("|---|---|---|");
  for (const [k, label] of KIND) {
    const all = items.filter((i) => i.kind === k);
    if (!all.length) continue;
    const on = all.filter((i) => i.status === "active").length;
    out.push(`| ${label} | ${on} | ${all.length - on} |`);
  }
  out.push("");
  const boot = items.filter((i) => (i.kind === "bootstrap" || i.kind === "rule" && harness === "claude") && i.status === "active").sort((a, b) => (a.details?.order ?? 99) - (b.details?.order ?? 99));
  if (boot.length) {
    out.push(`**Bootstrap docs, in load order** (${kb(boot.reduce((n, i) => n + (i.details?.bytes || 0), 0))} total):`);
    boot.forEach((i, n) => out.push(`${n + 1}. \`${tild(i.path)}\` ${kb(i.details?.bytes)}, ${i.scope}`));
    out.push("");
  }
  const skills = items.filter((i) => i.kind === "skill" && i.status === "active");
  if (skills.length) {
    const by = /* @__PURE__ */ new Map();
    for (const it of skills) {
      const k = skillSource(it, tild);
      by.set(k, (by.get(k) || 0) + 1);
    }
    const top = [...by.entries()].sort((a, b) => b[1] - a[1]);
    out.push(`**Skills by source** (${skills.length} active):`);
    top.slice(0, maxList).forEach(([k, n]) => out.push(`- ${n} from \`${k}\``));
    if (top.length > maxList) out.push(`- ${top.slice(maxList).reduce((n, [, c]) => n + c, 0)} more from ${top.length - maxList} other sources`);
    out.push("");
  }
  const mcp = items.filter((i) => i.kind === "mcp" && i.status === "active");
  if (mcp.length) {
    out.push(`**MCP servers** (${mcp.length} active): ${mcp.map((i) => `${i.name} (${i.scope})`).join(", ")}`);
    out.push("");
  }
  const hooks = items.filter((i) => i.kind === "hook" && i.status === "active");
  if (hooks.length) {
    const ev = {};
    for (const i of hooks) {
      const e = i.details?.event || i.name.split(":")[0];
      ev[e] = (ev[e] || 0) + 1;
    }
    const files = [...new Set(hooks.map((i) => tild(i.path)))];
    out.push(`**Hooks** (${hooks.length} active): ${Object.entries(ev).map(([e, n]) => `${e} ${n}`).join(", ")}. Defined in: ${files.slice(0, 5).map((f) => `\`${f}\``).join(", ")}${files.length > 5 ? ` +${files.length - 5} more` : ""}`);
    out.push("");
  }
  const cmp = h.live && !h.live.error ? compareLive(h) : null;
  if (cmp) {
    out.push("**Live check against this session's own log:**");
    out.push("");
    out.push("| | Predicted | Seen | Matched | Recall (file-backed) | Not file-backed / unverifiable |");
    out.push("|---|---|---|---|---|---|");
    for (const [k, label] of [["bootstrap", "Bootstrap docs"], ["skills", "Skills"], ["mcp", "MCP servers"]]) {
      const c = cmp[k];
      if (!c) {
        out.push(`| ${label} | - | - | - | not recorded in this harness's log | - |`);
        continue;
      }
      const other = (c.builtinMissing?.length || 0) + (c.unverifiableMissing?.length || 0);
      out.push(`| ${label} | ${c.predicted} | ${c.observed} | ${c.matched} | ${pct2(c.recallFileBacked)} | ${other} |`);
    }
    const unexplained = ["bootstrap", "skills", "mcp"].flatMap((k) => cmp[k]?.unexplainedMissing || []);
    out.push("");
    out.push(unexplained.length ? `Loaded but not predicted (worth checking): ${unexplained.slice(0, maxList).join(", ")}` : "Everything the session loaded from files was predicted.");
    out.push("");
  }
  const attention = items.filter((i) => ATTENTION.includes(i.status) && i.kind !== "skill");
  const shadowedSkills = items.filter((i) => i.kind === "skill" && i.status !== "active");
  const hygiene = (report.hygiene || []).filter((x) => x.harnesses.includes(harness));
  if (attention.length || shadowedSkills.length || hygiene.length || h.warnings?.length) {
    out.push("**Needs attention:**");
    const connectors = attention.filter((i) => i.status === "unknown" && i.scope === "remote");
    if (connectors.length) out.push(`- [unknown] ${connectors.length} claude.ai connectors (${connectors.map((i) => i.details?.connector || i.name).join(", ")}): set on the account, not in files, so whether each loads depends on the login`);
    for (const st of ATTENTION) {
      const group = attention.filter((i) => i.status === st && !connectors.includes(i));
      group.slice(0, maxList).forEach((i) => out.push(`- [${st}] ${i.kind} \`${i.name}\`: ${i.reason || tild(i.path)}`));
      if (group.length > maxList) out.push(`- [${st}] ${group.length - maxList} more ${st} items in the report`);
    }
    if (shadowedSkills.length) {
      const why = {};
      for (const i of shadowedSkills) {
        const r = i.details?.reason || i.reason || i.status;
        why[r] = (why[r] || 0) + 1;
      }
      Object.entries(why).sort((a, b) => b[1] - a[1]).slice(0, 4).forEach(([r, n]) => out.push(`- [skills] ${n} not shown to the model: ${r}`));
    }
    hygiene.slice(0, maxList).forEach((x) => out.push(`- [skill hygiene] \`${tild(x.path)}\`: ${x.issue}`));
    if (hygiene.length > maxList) out.push(`- [skill hygiene] ${hygiene.length - maxList} more in the report`);
    (h.warnings || []).slice(0, 3).forEach((w) => out.push(`- [note] ${w}`));
    out.push("");
  }
  return out.join("\n");
}
var NAME, KIND, ATTENTION, kb, pct2;
var init_summary = __esm({
  "src/render/summary.js"() {
    init_diff();
    NAME = { claude: "Claude Code", codex: "Codex", opencode: "OpenCode" };
    KIND = [["bootstrap", "Bootstrap docs"], ["skill", "Skills"], ["hook", "Hooks"], ["mcp", "MCP servers"], ["plugin", "Plugins"], ["command", "Commands"], ["agent", "Agents"], ["rule", "Rules"]];
    ATTENTION = ["needs-approval", "disabled", "shadowed", "unknown"];
    kb = (b) => b == null ? "?" : b >= 1024 ? `${(b / 1024).toFixed(1)} KB` : `${b} B`;
    pct2 = (x) => x == null ? "n/a" : `${Math.round(x * 100)}%`;
  }
});

// src/render/tree.js
var tree_exports = {};
__export(tree_exports, {
  renderTree: () => renderTree,
  tildify: () => tildify
});
import os5 from "node:os";
function renderTree(report, opts = {}) {
  const color = opts.color ?? (process.stdout.isTTY && !process.env.NO_COLOR);
  const home = report.home || os5.homedir();
  const paint = (code, s) => color ? `\x1B[${code}m${s}\x1B[0m` : s;
  const dim = (s) => paint(2, s);
  const bold = (s) => paint(1, s);
  const t = (p) => tildify(p, home);
  const kinds = opts.kinds?.length ? opts.kinds : null;
  const out = [];
  const W = 100;
  for (const [name, h] of Object.entries(report.harnesses || {})) {
    const items = h.items || [];
    out.push("", bold(`== ${name} ==`) + dim(`  project root: ${t(h.projectRoot || h.root || report.cwd)}`));
    const chain = (h.chain || []).map(chainPath).filter(Boolean);
    if (chain.length) out.push(dim("   chain: " + chain.map(t).join(" > ")));
    for (const w of h.warnings || []) out.push(paint(33, `   warning: ${w}`.slice(0, W)));
    const hidden = items.filter((i) => ["disabled", "shadowed"].includes(i.status));
    const shown = items.filter((i) => (!kinds || kinds.includes(i.kind)) && (opts.all || !["disabled", "shadowed"].includes(i.status)));
    for (const kind of KIND_ORDER) {
      const group = shown.filter((i) => i.kind === kind);
      if (!group.length) continue;
      out.push("", bold(`${KIND_LABEL[kind]} (${group.length})`));
      for (const it of group) {
        const st = paint(STATUS_COLOR[it.status] || 0, it.status.padEnd(9));
        const indent = kind === "bootstrap" ? "  ".repeat(1 + (it.details?.depth ?? it.details?.importDepth ?? 0)) : "  ";
        const order = kind === "bootstrap" && it.details?.order != null ? `${it.details.order}. ` : "";
        const size = kind === "bootstrap" ? fmtBytes(it.details?.bytes) : "";
        const left = `${indent}${order}${it.name}`;
        const tag = `[${it.scope}]`;
        out.push(`${left.padEnd(34)} ${tag.padEnd(11)} ${st} ${size ? size.padStart(8) + " " : ""}${dim(t(it.path))}`);
        if (it.reason && it.status !== "active") out.push(dim(`${indent}  ${it.reason}`.slice(0, W)));
      }
    }
    const count = (key, list) => {
      const m = {};
      for (const i of list) m[i[key]] = (m[i[key]] || 0) + 1;
      return Object.entries(m).map(([k, v]) => `${k} ${v}`).join(", ") || "none";
    };
    out.push("", bold("Summary: ") + `${items.length} items`);
    out.push(`  by kind:  ${count("kind", items)}`);
    out.push(`  by scope: ${count("scope", items)}`);
    const dis = hidden.filter((i) => i.status === "disabled").length;
    const sh = hidden.filter((i) => i.status === "shadowed").length;
    out.push(`  disabled ${dis}, shadowed ${sh}${opts.all ? "" : " (hidden; use --all to show)"}`);
    const cmp = compareLive(h);
    if (h.live?.error) out.push("", paint(33, `Live: ${h.live.error}`));
    if (cmp) {
      out.push("", bold("Live vs predicted") + dim(cmp.source ? `  (${t(String(cmp.source))})` : ""));
      for (const k of ["bootstrap", "skills", "mcp"]) {
        const c = cmp[k];
        if (!c) {
          out.push(dim(`  ${k.padEnd(10)} not observable from this harness's session log`));
          continue;
        }
        out.push(`  ${k.padEnd(10)} pred ${c.predicted}  obs ${c.observed}  match ${c.matched}  recall ${pct(c.recall)} (file-backed ${pct(c.recallFileBacked)})  precision ${pct(c.precision)} (adjusted ${pct(c.precisionAdjusted)})`);
        const list = (label, arr, code) => {
          if (!arr?.length) return;
          out.push((code ? paint(code, `    ${label}`) : dim(`    ${label}`)) + dim(`: ${arr.slice(0, 6).map((x) => t(x.name ?? x)).join(", ")}${arr.length > 6 ? `, ... (+${arr.length - 6})` : ""}`));
        };
        list(`UNEXPLAINED missing (observed, not predicted) ${c.unexplainedMissing?.length}`, c.unexplainedMissing, "1;31");
        list(`UNEXPLAINED extra (predicted, not observed) ${c.extraUnexplained?.length}`, c.extraUnexplained, "1;31");
        list(`builtin ${c.builtinMissing?.length}`, c.builtinMissing);
        list(`unverifiable ${c.unverifiableMissing?.length}`, c.unverifiableMissing);
        for (const reason of ["failed-connection", "stale-session", "remote-unverifiable"]) {
          const e = (c.extraExplained || []).filter((x) => x.reason === reason);
          list(`${reason} ${e.length}`, e);
        }
      }
    }
  }
  return out.join("\n") + "\n";
}
var KIND_ORDER, KIND_LABEL, STATUS_COLOR, tildify, fmtBytes, chainPath;
var init_tree = __esm({
  "src/render/tree.js"() {
    init_diff();
    KIND_ORDER = ["bootstrap", "skill", "hook", "mcp", "plugin", "command", "agent", "rule"];
    KIND_LABEL = { bootstrap: "Bootstrap docs", skill: "Skills", hook: "Hooks", mcp: "MCP servers", plugin: "Plugins", command: "Commands", agent: "Agents", rule: "Rules" };
    STATUS_COLOR = { active: 32, conditional: 36, disabled: 90, shadowed: 33, "needs-approval": 35, unknown: 90 };
    tildify = (p, home = os5.homedir()) => p && home && (p === home || p.startsWith(home + "/")) ? "~" + p.slice(home.length) : p;
    fmtBytes = (n) => n == null ? "" : n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`;
    chainPath = (c) => typeof c === "string" ? c : c?.path ?? "";
  }
});

// bin/context-audit.js
import fs9 from "node:fs";
import path11 from "node:path";
import { parseArgs } from "node:util";
import { spawn } from "node:child_process";
var USAGE = `Usage: context-audit [dir] [options]
       context-audit serve [--port 4747] [--no-open]   local web UI
  --harness a,b     claude,codex,opencode (default: all)
  --json            print the raw report as JSON
  --html [file]     write a self-contained HTML report (default ./context-audit.html)
  --open            open the HTML report (implies --html)
  --live            compare against the live session transcript
  --session <id>    session id for --live
  --kind a,b        only show these kinds (skill,mcp,hook,bootstrap,plugin,command,agent,rule)
  --all             include disabled and shadowed items
  --summary         fixed-format summary + HTML report (default when an agent runs it)
  --tree            terminal tree even when run by an agent
  --no-open         do not open the HTML report in a browser
  -h, --help
`;
if (process.argv[2] === "serve") {
  const { values: sv } = parseArgs({ args: process.argv.slice(3), options: { port: { type: "string", default: "4747" }, "no-open": { type: "boolean" } } });
  const { startServer: startServer2 } = await Promise.resolve().then(() => (init_server(), server_exports));
  const { url } = await startServer2({ port: Number(sv.port) });
  console.log(`context-audit UI running at ${url} (local only). Ctrl+C to stop.`);
  if (!sv["no-open"]) spawn(process.platform === "darwin" ? "open" : "xdg-open", [url], { stdio: "ignore", detached: true }).unref();
} else {
  await main();
}
async function main() {
  const argv = process.argv.slice(2);
  let htmlFile = null;
  let wantHtml = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--html") {
      wantHtml = true;
      const next = argv[i + 1];
      if (next && !next.startsWith("-") && /\.html?$/i.test(next)) {
        htmlFile = next;
        argv.splice(i, 2);
      } else argv.splice(i, 1);
      break;
    }
  }
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        harness: { type: "string" },
        json: { type: "boolean" },
        open: { type: "boolean" },
        live: { type: "boolean" },
        session: { type: "string" },
        kind: { type: "string" },
        all: { type: "boolean" },
        help: { type: "boolean", short: "h" },
        summary: { type: "boolean" },
        tree: { type: "boolean" },
        "no-open": { type: "boolean" }
      }
    });
  } catch (e) {
    console.error(`${e.message}

${USAGE}`);
    process.exit(2);
  }
  const { values, positionals } = parsed;
  if (values.help) {
    process.stdout.write(USAGE);
    process.exit(0);
  }
  const list = (s2) => s2 ? s2.split(",").map((x) => x.trim()).filter(Boolean) : void 0;
  const { audit: audit2, ADAPTERS: ADAPTERS2 } = await Promise.resolve().then(() => (init_src(), src_exports));
  const harnesses = list(values.harness);
  const bad = harnesses?.filter((h) => !ADAPTERS2[h]);
  if (bad?.length) {
    console.error(`unknown harness: ${bad.join(", ")} (known: ${Object.keys(ADAPTERS2).join(", ")})`);
    process.exit(2);
  }
  const KIND_ALIAS = { skills: "skill", hooks: "hook", plugins: "plugin", commands: "command", agents: "agent", rules: "rule", docs: "bootstrap" };
  const kinds = list(values.kind)?.map((k) => KIND_ALIAS[k] || k);
  const { detectSession: detectSession2 } = await Promise.resolve().then(() => (init_session(), session_exports));
  const session = detectSession2();
  const agentMode = (values.summary || !!session.harness) && !values.json && !values.tree;
  const wantLive = values.live || !!values.session || agentMode && !!session.harness && !positionals[0];
  const report = audit2({
    cwd: positionals[0] ? path11.resolve(positionals[0]) : void 0,
    harnesses,
    live: wantLive,
    sessionId: values.session,
    session: positionals[0] ? { harness: null, detectedBy: [] } : session
  });
  if (agentMode) {
    const os6 = await import("node:os");
    const { renderHtml: renderHtml2 } = await Promise.resolve().then(() => (init_html(), html_exports));
    const { renderSummary: renderSummary2 } = await Promise.resolve().then(() => (init_summary(), summary_exports));
    const dir = path11.join(os6.tmpdir(), "context-audit");
    fs9.mkdirSync(dir, { recursive: true });
    const file = htmlFile ? path11.resolve(htmlFile) : path11.join(dir, `report-${path11.basename(report.cwd) || "root"}-${(/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-")}.html`);
    fs9.writeFileSync(file, renderHtml2(report, { all: values.all }));
    let opened = false;
    if (!values["no-open"] && !process.env.CONTEXT_AUDIT_NO_OPEN) {
      try {
        const child = spawn(process.platform === "darwin" ? "open" : process.platform === "win32" ? "explorer" : "xdg-open", [file], { stdio: "ignore", detached: true });
        child.on("error", () => {
        });
        child.unref();
        opened = !!child.pid;
      } catch {
      }
    }
    const which = report.session?.harness && report.harnesses[report.session.harness] ? [report.session.harness] : Object.keys(report.harnesses);
    const body = which.map((h) => renderSummary2(report, { harness: h, htmlPath: file, opened })).join("\n---\n\n");
    process.stdout.write([
      "AGENT INSTRUCTIONS (required response format, also in chat channels such as Telegram or Slack):",
      "1. Send the user everything between the BEGIN and END lines exactly as written. It is Markdown. Do not shorten, paraphrase or reformat it.",
      `2. Give the user the interactive HTML report in one click: if your interface can attach or send files, attach this file: ${file}. Otherwise send it as a clickable link: ${new URL("file://" + file).href}. Never give only a bare path.`,
      "3. Then answer any specific question the user asked, in one or two sentences.",
      "===== BEGIN CONTEXT AUDIT =====",
      body.trimEnd(),
      "===== END CONTEXT AUDIT =====",
      ""
    ].join("\n"));
    return;
  }
  if (values.json) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    return;
  }
  const s = report.session || {};
  const sessionLine = positionals[0] ? `auditing ${report.cwd}` : s.harness ? `session detected: ${s.harness}${s.pid ? ` pid ${s.pid}` : ""} cwd ${s.bootCwd || report.cwd}` : `no agent session detected; using cwd ${report.cwd}`;
  if (wantHtml || values.open) {
    const { renderHtml: renderHtml2 } = await Promise.resolve().then(() => (init_html(), html_exports));
    const file = path11.resolve(htmlFile || "context-audit.html");
    fs9.writeFileSync(file, renderHtml2(report, { all: values.all }));
    console.log(sessionLine);
    console.log(file);
    if (values.open) {
      const child = spawn(process.platform === "darwin" ? "open" : "xdg-open", [file], { stdio: "ignore", detached: true });
      child.on("error", (e) => console.error(`could not open: ${e.message}`));
      child.unref();
    }
  } else {
    const { renderTree: renderTree2 } = await Promise.resolve().then(() => (init_tree(), tree_exports));
    console.log(sessionLine);
    process.stdout.write(renderTree2(report, { all: values.all, kinds }));
  }
}
/*! Bundled license information:

smol-toml/dist/error.js:
smol-toml/dist/primitive.js:
smol-toml/dist/date.js:
smol-toml/dist/extract.js:
smol-toml/dist/util.js:
smol-toml/dist/struct.js:
smol-toml/dist/parse.js:
smol-toml/dist/stringify.js:
smol-toml/dist/index.js:
  (*!
   * Copyright (c) Squirrel Chat et al., All rights reserved.
   * SPDX-License-Identifier: BSD-3-Clause
   *
   * Redistribution and use in source and binary forms, with or without
   * modification, are permitted provided that the following conditions are met:
   *
   * 1. Redistributions of source code must retain the above copyright notice, this
   *    list of conditions and the following disclaimer.
   * 2. Redistributions in binary form must reproduce the above copyright notice,
   *    this list of conditions and the following disclaimer in the
   *    documentation and/or other materials provided with the distribution.
   * 3. Neither the name of the copyright holder nor the names of its contributors
   *    may be used to endorse or promote products derived from this software without
   *    specific prior written permission.
   *
   * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
   * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
   * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
   * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
   * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
   * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
   * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
   * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
   * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
   * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
   *)
*/
