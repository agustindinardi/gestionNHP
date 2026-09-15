#!/usr/bin/env python3
"""
Extrae SC codes (errores) y SP codes (codigos) del manual de servicio Ricoh
(MS_MP6002-7502-9002.pdf) y genera un seed SQL para la tabla manual_entries.

Esquema de salida (una fila por entry):
  type, code, level, title, detection, causes, solution, description, setting
  - ERROR (SC): level, title, detection, causes, solution
  - CODIGO (SP): title(=nombre), description, setting  (una fila por sub-parametro)

Uso:
    python extract_manual.py <pdf_o_txt> [salida.sql]

Nota: el PDF es a varias columnas; la extraccion es best-effort. code/level/title
(SC) y code/name (SP) salen confiables; la separacion deteccion/causas/solucion y
los sub-parametros de SP pueden tener imperfecciones, editables desde la app.
"""
import re
import sys
import subprocess
import os

MANUAL_ID = "a1b2c3d4-0000-4000-8000-000000007502"
MACHINE_NAME = "RICOH 7502"
LEVELS = {"A", "B", "C", "D"}

SOLUTION_START = re.compile(
    r"^(?:\d+[.)]\s|"
    r"(?:Check|Replace|Reinstall|Clean|Reset|Verify|Turn|Adjust|Reconnect|"
    r"Confirm|Make sure|Ensure|Perform|Install|Remove|Set |Re-install|Repair)\b)",
    re.I,
)

NOISE_PATTERNS = [
    re.compile(r"^\s*SM Appendix", re.I),
    re.compile(r"^\s*D1\d\d/D1\d\d/D1\d\d"),
    re.compile(r"^\s*SC\d00:\s", re.I),
    re.compile(r"^\s*Appendix:\s*$", re.I),
    re.compile(r"^\s*Service Call\s*$", re.I),
    re.compile(r"^\s*Service\s*$", re.I),
    re.compile(r"^\s*Conditions\s*$", re.I),
    re.compile(r"^\s*Program\s*$", re.I),
    re.compile(r"^\s*Mode Tables\s*$", re.I),
    re.compile(r"^\s*SM\s*$"),
    re.compile(r"^\s*2\.\d+(\.\d+)?\s+SC", re.I),
    re.compile(r"^\s*3\.\d+\s+SP", re.I),
    re.compile(r"^\s*SP\d000\s", re.I),
    re.compile(r"^\s*(Printer|Scanner) SP Tables", re.I),
    re.compile(r"^\s*SP1000 Feed|SP2000 Drum|SP3000|SP4000|SP5000|SP6000|SP7000|SP8000", re.I),
    re.compile(r"^\s*\d+\s*$"),
    re.compile(r"^\s*\d-\d+\s*$"),
    re.compile(r"^\s*Note \d", re.I),
]

def is_noise(line):
    return any(p.search(line) for p in NOISE_PATTERNS)

def fix_symbols(text):
    # Artefactos comunes de OCR/encoding del PDF Ricoh
    text = text.replace("M-0C", "°C").replace("M-0", "°")  # grados
    text = text.replace("\x0c", " ")
    # El caracter de reemplazo U+FFFD aparece por ±, − (menos) o ° segun contexto:
    text = re.sub(r"(?<=\d)�(?=\s*C\b)", "°", text)  # 0�C  -> 0°C
    text = re.sub(r"(?<=\d)�(?=\d)", "±", text)      # 3�2  -> 3±2
    text = re.sub(r"�(?=\d)", "-", text)                   # �9   -> -9 (rangos)
    text = text.replace("�", "±")                     # resto -> ±
    return text

def clean(text):
    text = fix_symbols(text)
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r"\s*Appendix:\s*$", "", text).strip()
    return text

def sql_val(v):
    if v is None:
        return "NULL"
    v = v.strip()
    if not v:
        return "NULL"
    # Dollar-quoting: no necesita escapar comillas simples, y es inmune a que el
    # editor convierta '' en comillas tipograficas al pegar. Se elige un tag que
    # no aparezca en el valor.
    for tag in ("$m$", "$mm$", "$mmm$", "$sql9$"):
        if tag not in v:
            return tag + v + tag
    # fallback improbable
    return "'" + v.replace("'", "''") + "'"

def extract_text(path):
    if path.lower().endswith(".txt"):
        with open(path, encoding="utf-8", errors="replace") as f:
            return f.read()
    txt_out = os.path.join(os.path.dirname(path) or ".", "manual.txt")
    subprocess.run(["pdftotext", "-layout", path, txt_out], check=True)
    with open(txt_out, encoding="utf-8", errors="replace") as f:
        return f.read()

def body_index(lines, needle, after=0):
    """Busca el needle ignorando lineas de indice (TOC) con puntos de relleno."""
    for i in range(after, len(lines)):
        if needle in lines[i] and "...." not in lines[i]:
            return i
    return None

# ---------------------------------------------------------------- SC (errores)

def parse_sc_codes(lines):
    start = body_index(lines, "2.2 SC100: SCANNING", 11000)
    if start is None:
        return []
    end = body_index(lines, "ADDITIONAL SC CODES PRINTED IN SMC", start)
    if end is None:
        end = len(lines)
    section = lines[start:end]

    header_re = re.compile(r"^\s*SC(\d{3}(?:-\d{1,2})?)\b(.*)$")
    heads = []
    for i, ln in enumerate(section):
        if is_noise(ln):
            continue
        m = header_re.match(ln)
        if m:
            heads.append((i, m.group(1), m.group(2)))
    heads.append((len(section), None, None))

    entries = []
    seen = set()
    for k in range(len(heads) - 1):
        hi, num, header_rest = heads[k]
        code = "SC" + num
        if code in seen:
            continue
        seen.add(code)

        body = [ln for ln in section[hi + 1:heads[k + 1][0]]
                if not is_noise(ln) and ln.strip()]

        title = clean(header_rest)
        level = None

        # nivel en el titulo ("B Exit guide motor")
        m2 = re.match(r"^([ABCD])\s+(.*)$", title)
        if m2:
            level, title = m2.group(1), clean(m2.group(2))

        # nivel como primera linea suelta ("D") o prefijo ("A The fusing...")
        idx = 0
        if level is None and body:
            first = body[0].strip()
            if first in LEVELS:
                level = first
                idx = 1
            else:
                m3 = re.match(r"^([ABCD])\s+(\S.*)$", first)
                if m3:
                    level = m3.group(1)
                    body = body[:]
                    body[0] = m3.group(2)

        rest = [clean(x) for x in body[idx:] if clean(x) and clean(x) != "-"]

        det, causes, sol = [], [], []
        phase = "det"
        for j, s in enumerate(rest):
            if SOLUTION_START.match(s):
                phase = "sol"
                sol.append(s)
                continue
            if phase == "sol":
                sol.append(s)
                continue
            if phase == "det":
                det.append(s)
                nxt = rest[j + 1] if j + 1 < len(rest) else ""
                ends_sentence = s.endswith(".")
                nxt_fragment = nxt and len(nxt.split()) <= 6 and not nxt.endswith(".")
                if (ends_sentence and nxt_fragment) or (det and len(s.split()) <= 6 and not ends_sentence):
                    phase = "cause"
                continue
            # phase == cause
            causes.append(s)

        # si nunca cambio de fase, todo quedo en det; intentar mover fragmentos
        # cortos del final a causas
        if not causes and len(det) > 1:
            while det and len(det[-1].split()) <= 6 and not det[-1].endswith("."):
                causes.insert(0, det.pop())

        entries.append({
            "type": "error",
            "code": code,
            "level": level,
            "title": title or None,
            "detection": clean(" ".join(det)) or None,
            "causes": " · ".join(causes) or None,
            "solution": " ".join(sol) or None,
            "description": None,
            "setting": None,
        })
    return entries

# ---------------------------------------------------------------- SP (codigos)

RANGE_RE = re.compile(r"\[[^\]]*\]")
SUB_RE = re.compile(r"^\s*(\d{1,2})\s+([A-Za-z\[].*)$")
MAIN_RE = re.compile(r"^\s*(\d{4})\s{2,}([A-Za-z\[].*?)\s*$")

def _sp_code(digits, mode, sub=None):
    if mode == "system":
        base = f"SP{digits[0]}-{digits[1:]}"
    elif mode == "printer":
        base = f"Printer SP{digits}"
    else:
        base = f"Scanner SP{digits}"
    if sub is not None:
        base += f"-{int(sub):03d}"
    return base

def _flush_sp(main, mode, out):
    """Convierte un bloque SP (main + descripcion + subs) en filas."""
    if not main:
        return
    digits, name, desc_lines, subs = main
    description = clean(" ".join(desc_lines))
    # setting general: rangos en la descripcion
    main_settings = " ".join(RANGE_RE.findall(" ".join(desc_lines)))
    if subs:
        for n, (sub_idx, sub_text) in enumerate(subs):
            st = " ".join(RANGE_RE.findall(sub_text))
            sub_name = clean(RANGE_RE.sub("", sub_text))
            out[_sp_code(digits, mode, sub_idx)] = {
                # La descripcion del SP es comun a todos sus sub-parametros;
                # se guarda solo en el primero para no repetirla (y no inflar el seed).
                "title": sub_name or None,
                "description": (description or None) if n == 0 else None,
                "setting": clean(st) or None,
            }
    else:
        out[_sp_code(digits, mode)] = {
            "title": clean(name) or None,
            "description": description or None,
            "setting": clean(main_settings) or None,
        }

def _parse_sp_section(sec, mode):
    out = {}
    main = None  # (digits, name, desc_lines[], subs[(idx,text)])
    for ln in sec:
        if is_noise(ln):
            continue
        if not ln.strip():
            continue
        m = MAIN_RE.match(ln)
        if m:
            _flush_sp(main, mode, out)
            main = (m.group(1), clean(m.group(2)), [], [])
            continue
        if main is None:
            continue
        ms = SUB_RE.match(ln)
        if ms and not RANGE_RE.fullmatch(ln.strip()):
            main[3].append((ms.group(1), clean(ms.group(2))))
        else:
            # linea de descripcion / rango del main (o del ultimo sub)
            if main[3]:
                idx, txt = main[3][-1]
                main[3][-1] = (idx, clean(txt + " " + ln.strip()))
            else:
                main[2].append(ln.strip())
    _flush_sp(main, mode, out)
    return out

def parse_sp_codes(lines):
    i_sys = body_index(lines, "3.2 SP1000 FEED", 14000)
    i_printer = body_index(lines, "3.11 PRINTER SP TABLES", 14000)
    i_scanner = body_index(lines, "3.12 SCANNER SP TABLES", 14000)
    # SP7000/SP8000 son data logs (no codigos ajustables): se excluyen.
    i_datalogs = body_index(lines, "3.9 SP7000 DATA LOGS", 14000)
    if i_sys is None:
        return []
    merged = {}
    end_sys = i_datalogs or i_printer or len(lines)
    merged.update(_parse_sp_section(lines[i_sys:end_sys], "system"))
    if i_printer:
        end_p = i_scanner or len(lines)
        merged.update(_parse_sp_section(lines[i_printer:end_p], "printer"))
    if i_scanner:
        merged.update(_parse_sp_section(lines[i_scanner:i_scanner + 400], "scanner"))

    def sort_key(code):
        rank = 0 if code.startswith("SP") else (1 if code.startswith("Printer") else 2)
        return (rank, code)

    entries = []
    for code in sorted(merged.keys(), key=sort_key):
        d = merged[code]
        entries.append({
            "type": "codigo",
            "code": code,
            "level": None,
            "title": d["title"],
            "detection": None,
            "causes": None,
            "solution": None,
            "description": d["description"],
            "setting": d["setting"],
        })
    return entries

# ---------------------------------------------------------------- salida

COLS = ["type", "code", "level", "title", "detection", "causes", "solution", "description", "setting"]

def _insert_stmt(chunk):
    collist = ", ".join(["manual_id"] + COLS)
    rows = []
    for e in chunk:
        vals = ["'%s'" % MANUAL_ID] + [sql_val(e[c]) for c in COLS]
        rows.append("  (" + ", ".join(vals) + ")")
    return f"INSERT INTO manual_entries ({collist}) VALUES\n" + ",\n".join(rows) + ";\n\n"

def write_seed(entries, out, max_bytes=85000):
    """Escribe el seed partido en varios archivos chicos (<~90KB) para que el
    pegado en el SQL editor sea confiable. El primero trae el DELETE + manual."""
    base, ext = os.path.splitext(out)
    header1 = (
        "-- Seed del manual RICOH 7502 (generado por extract_manual.py)\n"
        "-- Aplicar despues del schema de manuals (009). Correr los part en orden.\n\n"
        "DELETE FROM manual_entries WHERE manual_id = '%s';\n"
        "INSERT INTO manuals (id, machine_name) VALUES ('%s', %s)\n"
        "  ON CONFLICT (id) DO NOTHING;\n\n" % (MANUAL_ID, MANUAL_ID, sql_val(MACHINE_NAME))
    )

    BATCH = 50
    stmts = [_insert_stmt(entries[i:i + BATCH]) for i in range(0, len(entries), BATCH)]

    files = []
    part = 1
    buf = header1
    for s in stmts:
        if len(buf) + len(s) > max_bytes and buf.strip():
            fn = f"{base}_part{part}{ext}"
            with open(fn, "w", encoding="utf-8") as f:
                f.write(buf)
            files.append(fn)
            part += 1
            buf = f"-- Seed RICOH 7502 (part {part})\n\n"
        buf += s
    if buf.strip():
        fn = f"{base}_part{part}{ext}"
        with open(fn, "w", encoding="utf-8") as f:
            f.write(buf)
        files.append(fn)
    return files

def main():
    if len(sys.argv) < 2:
        print("Uso: python extract_manual.py <pdf_o_txt> [salida.sql]")
        sys.exit(1)
    src = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else "010_seed_manual_ricoh7502.sql"

    text = extract_text(src)
    lines = text.splitlines()

    sc = parse_sc_codes(lines)
    sp = parse_sp_codes(lines)
    files = write_seed(sc + sp, out)

    print(f"SC (error): {len(sc)}  |  SP (codigo): {len(sp)}  |  total: {len(sc)+len(sp)}")
    print("Archivos generados:")
    for fn in files:
        print("  -", fn, f"({os.path.getsize(fn)} bytes)")

if __name__ == "__main__":
    main()
