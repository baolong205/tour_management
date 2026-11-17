"""Trich xuat text tu file .docx (khong can python-docx)."""
import sys
import re
import zipfile
from xml.etree import ElementTree as ET

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def para_text(p):
    parts = []
    for node in p.iter():
        tag = node.tag
        if tag == W + "t":
            parts.append(node.text or "")
        elif tag == W + "tab":
            parts.append("\t")
        elif tag == W + "br":
            parts.append("\n")
    return "".join(parts)


def style_of(p):
    ppr = p.find(W + "pPr")
    if ppr is None:
        return ""
    st = ppr.find(W + "pStyle")
    if st is None:
        return ""
    return st.get(W + "val") or ""


def walk(body, out):
    for child in body:
        if child.tag == W + "p":
            txt = para_text(child).strip()
            st = style_of(child)
            if txt:
                prefix = f"[{st}] " if st else ""
                out.append(prefix + txt)
        elif child.tag == W + "tbl":
            out.append("<<TABLE>>")
            for row in child.findall(W + "tr"):
                cells = []
                for tc in row.findall(W + "tc"):
                    ct = " ".join(para_text(p).strip() for p in tc.findall(W + "p"))
                    cells.append(ct.strip())
                out.append(" | ".join(cells))
            out.append("<<END TABLE>>")


def main(path, out_path):
    with zipfile.ZipFile(path) as z:
        xml = z.read("word/document.xml")
    root = ET.fromstring(xml)
    body = root.find(W + "body")
    out = []
    walk(body, out)
    text = "\n".join(out)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(text)
    print(f"lines={len(out)} chars={len(text)}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
