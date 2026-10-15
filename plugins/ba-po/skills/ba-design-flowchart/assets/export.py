from playwright.sync_api import sync_playwright
import sys, pathlib

if len(sys.argv) < 3:
    print("Usage: python export.py <src.html> <out.png> [scale]")
    sys.exit(1)

src, out = sys.argv[1], sys.argv[2]
scale = float(sys.argv[3]) if len(sys.argv) > 3 else 2.0

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(device_scale_factor=scale)
    page.goto(f"file://{pathlib.Path(src).resolve()}")
    page.wait_for_load_state("networkidle")
    page.locator("svg").first.screenshot(path=out, omit_background=True)
    browser.close()
