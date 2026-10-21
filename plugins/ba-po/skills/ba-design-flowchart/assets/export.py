#!/usr/bin/env python3
"""
export.py — Xuất sơ đồ Editorial HTML sang PNG và SVG chuẩn mực.

Tính năng:
- PNG: Khởi chạy Playwright với Viewport tối thiểu Full HD (1920x1080) và Device Scale Factor 2x
  đảm bảo hình ảnh sắc nét, không bị co dúm hay mất thông tin ở độ phân giải cao. Đợi fonts ready.
- SVG: Trích xuất SVG thuần, chuẩn hóa XML 1.1, nhúng Google Fonts với entity &amp;,
  chuẩn hóa mã màu rgba(...) sang hex + opacity để tương thích với mọi công cụ (Figma, PowerPoint, Jira).
- Hỗ trợ xuất cả 2 định dạng cùng lúc khi chọn đuôi .all hoặc truyền --both.

Sử dụng:
  python3 export.py <src.html> <out.png|out.svg> [scale] [--transparent]
  python3 export.py <src.html> --both [scale]
"""

import sys
import re
import pathlib
import argparse

STYLE_IMPORT_XML = """    <style>@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&amp;family=Geist:wght@400;500;600&amp;family=Geist+Mono:wght@400;500;600&amp;family=Noto+Serif:ital@0;1&amp;family=Noto+Sans+KR:wght@400;500;600&amp;family=Noto+Serif+KR:wght@400&amp;family=Noto+Sans+TC:wght@400;500;600&amp;family=Noto+Serif+TC:wght@400&amp;display=swap');</style>"""

def export_svg(src_path: pathlib.Path, out_path: pathlib.Path) -> bool:
    """Trích xuất và chuẩn hóa SVG độc lập từ file HTML."""
    try:
        content = src_path.read_text(encoding='utf-8')
    except Exception as e:
        print(f"❌ Không thể đọc file HTML: {e}")
        return False

    # Tìm khối <svg>...</svg>
    match = re.search(r'(<svg\b[^>]*>[\s\S]*?</svg>)', content, re.IGNORECASE)
    if not match:
        print("❌ Không tìm thấy thẻ <svg> nào trong file HTML nguồn.")
        return False

    svg_str = match.group(1)

    # 1. Đảm bảo có namespace xmlns
    if 'xmlns="http://www.w3.org/2000/svg"' not in svg_str:
        svg_str = re.sub(r'<svg\b', '<svg xmlns="http://www.w3.org/2000/svg"', svg_str, count=1)
    if 'xmlns:xlink=' not in svg_str:
        svg_str = re.sub(r'<svg\b', '<svg xmlns:xlink="http://www.w3.org/1999/xlink"', svg_str, count=1)

    # 2. Nhúng fonts vào <defs> với &amp; XML-escape (KHÔNG nhân đôi thẻ <defs>)
    if '<defs' in svg_str:
        # Nếu đã có <defs>, chèn <style> ngay bên trong <defs>
        svg_str = re.sub(r'(<defs\b[^>]*>)', r'\1\n' + STYLE_IMPORT_XML, svg_str, count=1)
    else:
        # Nếu chưa có <defs>, tạo mới block <defs> ngay sau <svg>
        svg_str = re.sub(r'(<svg\b[^>]*>)', r'\1\n  <defs>\n' + STYLE_IMPORT_XML + '\n  </defs>', svg_str, count=1)

    # 3. Chuẩn hóa màu rgba(...) sang hex + opacity cho chuẩn SVG 1.1 (tương thích PowerPoint/Figma)
    svg_str = re.sub(
        r'(fill|stroke)="rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d*\.?\d+)\s*\)"',
        lambda m: '{0}="#{1:02x}{2:02x}{3:02x}" {0}-opacity="{4}"'.format(
            m.group(1), int(m.group(2)), int(m.group(3)), int(m.group(4)), m.group(5)
        ),
        svg_str,
    )
    svg_str = re.sub(r'(fill|stroke)="transparent"', r'\1="none"', svg_str)

    # 4. Kiểm tra cảnh báo foreignObject (anti-pattern gây lỗi trắng chữ trong viewer ngoài)
    if '<foreignObject' in svg_str:
        print("⚠️ CẢNH BÁO: SVG chứa thẻ <foreignObject>. Một số công cụ (PowerPoint/Figma/QuickLook) sẽ không hiển thị được text. Khuyến nghị dùng thẻ <text> SVG thuần.")

    # 5. Thêm header XML declaration
    final_svg = '<?xml version="1.0" encoding="UTF-8"?>\n' + svg_str.strip() + '\n'

    out_path.write_text(final_svg, encoding='utf-8')
    print(f"✅ Đã xuất SVG độc lập: {out_path} ({out_path.stat().st_size} bytes)")
    return True

def export_png(src_path: pathlib.Path, out_path: pathlib.Path, scale: float = 2.0, transparent: bool = True) -> bool:
    """Render và chụp ảnh PNG qua Playwright với Viewport tối thiểu Full HD (1920x1080)."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("❌ Playwright chưa được cài đặt. Chạy: pip install playwright && playwright install chromium")
        return False

    # Đọc viewBox của SVG trong HTML để tính kích thước viewport tối ưu
    content = src_path.read_text(encoding='utf-8')
    vb_match = re.search(r'<svg\b[^>]*viewBox=["\']\s*[\d.-]+\s+[\d.-]+\s+([\d.-]+)\s+([\d.-]+)\s*["\']', content, re.IGNORECASE)
    
    vb_w = float(vb_match.group(1)) if vb_match else 1920.0
    vb_h = float(vb_match.group(2)) if vb_match else 1080.0

    # Viewport tối thiểu 1920x1080 (Full HD), mở rộng nếu diagram lớn hơn
    vp_w = max(1920, int(vb_w + 120))
    vp_h = max(1080, int(vb_h + 120))

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page(
                viewport={"width": vp_w, "height": vp_h},
                device_scale_factor=scale
            )
            file_url = f"file://{src_path.resolve()}"
            page.goto(file_url)
            page.wait_for_load_state("networkidle")
            
            # Đợi load font đầy đủ để không bị FOUC/nhảy chữ
            try:
                page.wait_for_function("document.fonts.ready", timeout=5000)
            except Exception:
                pass

            svg_locator = page.locator("svg").first
            if svg_locator.count() > 0:
                svg_locator.screenshot(path=str(out_path), omit_background=transparent)
            else:
                page.screenshot(path=str(out_path), full_page=True, omit_background=transparent)

            browser.close()
            print(f"✅ Đã xuất PNG sắc nét ({vp_w}x{vp_h} @{scale}x): {out_path} ({out_path.stat().st_size} bytes)")
            return True
    except Exception as e:
        print(f"❌ Lỗi khi xuất PNG qua Playwright: {e}")
        return False

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 export.py <src.html> [<out.png|out.svg|--both>] [scale] [--transparent]")
        sys.exit(1)

    src_file = pathlib.Path(sys.argv[1]).resolve()
    if not src_file.exists():
        print(f"❌ Không tìm thấy file nguồn: {src_file}")
        sys.exit(1)

    target = sys.argv[2] if len(sys.argv) > 2 else "--both"
    scale = 2.0
    transparent = True

    # Parse tham số scale và flags
    for arg in sys.argv[3:]:
        if arg.replace('.', '', 1).isdigit():
            scale = float(arg)
        elif arg == '--opaque' or arg == '--white':
            transparent = False
        elif arg == '--transparent':
            transparent = True

    base_stem = src_file.stem
    parent_dir = src_file.parent

    if target == "--both" or target == "both" or target == "all":
        out_svg = parent_dir / f"{base_stem}.svg"
        out_png = parent_dir / f"{base_stem}.png"
        export_svg(src_file, out_svg)
        export_png(src_file, out_png, scale=scale, transparent=transparent)
    elif target.lower().endswith('.svg'):
        out_svg = pathlib.Path(target) if pathlib.Path(target).is_absolute() else (parent_dir / target)
        export_svg(src_file, out_svg)
    elif target.lower().endswith('.png'):
        out_png = pathlib.Path(target) if pathlib.Path(target).is_absolute() else (parent_dir / target)
        export_png(src_file, out_png, scale=scale, transparent=transparent)
    else:
        # Nếu truyền tên thư mục hoặc tên file không có extension
        out_svg = parent_dir / f"{target}.svg"
        out_png = parent_dir / f"{target}.png"
        export_svg(src_file, out_svg)
        export_png(src_file, out_png, scale=scale, transparent=transparent)

if __name__ == "__main__":
    main()

