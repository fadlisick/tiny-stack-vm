// Tiny stack VM, written fresh from the ISA: 32-bit values, 256-deep data
// stack, 64-deep call stack, 256 words of memory, 1,000,000 steps max,
// 65,536 output bytes max. vm.mjs rules where the ISA is ambiguous.
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const IND = process.env.MAKEFUN_INPUT_DIR || "/input";
const OUTD = process.env.MAKEFUN_OUTPUT_DIR || "/output";

// Runs one program to its end: the bytes it wrote and its exit code (0-255).
function run(p: Uint8Array, inp: Uint8Array): { out: Uint8Array; exit: number } {
  const n = p.length, D = new Int32Array(256), C = new Int32Array(64), M = new Int32Array(256);
  const out = new Uint8Array(65536), enc = new TextEncoder();
  let sp = 0, csp = 0, olen = 0, ip = 0, pc = 0, steps = 0;
  const done = (exit: number) => ({ out: out.slice(0, olen), exit });
  // Binary ops (pop 2, push 1): 0x10-0x16, 0x18-0x1a, 0x1c-0x1e, 0x20-0x22.
  const bin = (o: number) => (o >= 0x10 && o <= 0x16) || (o >= 0x18 && o <= 0x1a) ||
    (o >= 0x1c && o <= 0x1e) || (o >= 0x20 && o <= 0x22);
  for (;;) {
    if (steps === 1000000) return done(10);
    if (pc < 0 || pc >= n) return done(9);
    const op = p[pc];
    const imm = op === 1 ? 1 : op === 2 ? 4 : op >= 0x30 && op <= 0x33 ? 2 : 0;
    const known = op <= 7 || bin(op) || op === 0x17 || op === 0x1b ||
      (op >= 0x30 && op <= 0x34) || op === 0x40 || op === 0x41 || (op >= 0x50 && op <= 0x53);
    if (!known) return done(5);
    if (pc + imm >= n) return done(9);
    steps++;
    const next = pc + 1 + imm;
    const pops = op === 7 ? 3 : op === 5 || op === 6 || op === 0x41 || bin(op) ? 2
      : op === 3 || op === 4 || op === 0x17 || op === 0x1b || op === 0x31 || op === 0x32 ||
        op === 0x40 || op === 0x50 || op === 0x51 || op === 0x53 ? 1 : 0;
    const pushes = op === 6 || op === 7 ? 3 : op === 4 || op === 5 ? 2
      : op === 1 || op === 2 || op === 0x17 || op === 0x1b || op === 0x40 || op === 0x52 || bin(op) ? 1 : 0;
    if (sp < pops) return done(2);
    if (sp - pops + pushes > 256) return done(3);
    pc = next;
    switch (op) {
      case 0: return done(0);
      case 1: D[sp++] = (p[next - 1] << 24) >> 24; break;
      case 2: D[sp++] = p[next - 4] | (p[next - 3] << 8) | (p[next - 2] << 16) | (p[next - 1] << 24); break;
      case 3: sp--; break;
      case 4: D[sp] = D[sp - 1]; sp++; break;
      case 5: { const t = D[sp - 1]; D[sp - 1] = D[sp - 2]; D[sp - 2] = t; break; }
      case 6: D[sp] = D[sp - 2]; sp++; break;
      case 7: { const a = D[sp - 3]; D[sp - 3] = D[sp - 2]; D[sp - 2] = D[sp - 1]; D[sp - 1] = a; break; }
      case 0x17: D[sp - 1] = -D[sp - 1] | 0; break;
      case 0x1b: D[sp - 1] = ~D[sp - 1]; break;
      case 0x30: case 0x31: case 0x32: {
        const rel = ((p[next - 2] | (p[next - 1] << 8)) << 16) >> 16;
        let take = true;
        if (op !== 0x30) { const v = D[--sp]; take = op === 0x31 ? v === 0 : v !== 0; }
        if (take) pc = next + rel;
        break;
      }
      case 0x33:
        if (csp === 64) return done(7);
        C[csp++] = next; pc = p[next - 2] | (p[next - 1] << 8);
        break;
      case 0x34:
        if (csp === 0) return done(8);
        pc = C[--csp];
        break;
      case 0x40: { const a = D[sp - 1]; if (a < 0 || a >= 256) return done(6); D[sp - 1] = M[a]; break; }
      case 0x41: {
        const a = D[sp - 1], v = D[sp - 2];
        if (a < 0 || a >= 256) return done(6);
        sp -= 2; M[a] = v;
        break;
      }
      case 0x50: {
        const b = enc.encode(String(D[sp - 1]));
        if (olen + b.length > 65536) return done(11);
        sp--; out.set(b, olen); olen += b.length;
        break;
      }
      case 0x51:
        if (olen + 1 > 65536) return done(11);
        out[olen++] = D[--sp] & 255;
        break;
      case 0x52: D[sp++] = ip < inp.length ? inp[ip++] : -1; break;
      case 0x53: return done(D[--sp] & 255);
      default: { // Binary ops: pop b (top), then a; push the result.
        const b = D[sp - 1], a = D[sp - 2];
        let r = 0;
        if (op === 0x10) r = a + b | 0;
        else if (op === 0x11) r = a - b | 0;
        else if (op === 0x12) r = Math.imul(a, b);
        else if (op === 0x13) { if (b === 0) return done(4); r = a === -2147483648 && b === -1 ? a : a / b | 0; }
        else if (op === 0x14) { if (b === 0) return done(4); r = b === -1 ? 0 : a % b | 0; }
        else if (op === 0x15) { if (b === 0) return done(4); r = Math.floor((a >>> 0) / (b >>> 0)) | 0; }
        else if (op === 0x16) { if (b === 0) return done(4); r = (a >>> 0) % (b >>> 0) | 0; }
        else if (op === 0x18) r = a & b;
        else if (op === 0x19) r = a | b;
        else if (op === 0x1a) r = a ^ b;
        else if (op === 0x1c) r = a << (b & 31);
        else if (op === 0x1d) r = a >> (b & 31);
        else if (op === 0x1e) r = (a >>> (b & 31)) | 0;
        else if (op === 0x20) r = a === b ? 1 : 0;
        else if (op === 0x21) r = a < b ? 1 : 0;
        else r = a >>> 0 < b >>> 0 ? 1 : 0;
        sp -= 2; D[sp++] = r;
        break;
      }
    }
  }
}

// Driver: every /input/<id>/{program,input}.bin answers
// /output/<id>/{stdout.bin,exit.txt}, in sorted id order.
for (const id of readdirSync(IND).sort()) {
  const dir = join(IND, id);
  let program: Buffer;
  try { program = readFileSync(join(dir, "program.bin")); } catch { continue; }
  let input: Buffer;
  try { input = readFileSync(join(dir, "input.bin")); } catch { input = Buffer.alloc(0); }
  const { out, exit } = run(program, input);
  const od = join(OUTD, id);
  mkdirSync(od, { recursive: true });
  writeFileSync(join(od, "stdout.bin"), out);
  writeFileSync(join(od, "exit.txt"), String(exit) + "\n");
}
