import qrcode
from PIL import Image, ImageDraw

# =========================
# CONFIG
# =========================

QR_DATA = "https://www.thecentralguild.quest"

LOGO_PATH = "logo.png"
OUTPUT_PATH = "web_qr.png"

QR_SIZE = 1200
LOGO_SCALE = 0.22  # 22% of QR size

# Colors
BG_COLOR = "#111111"
QR_COLOR = "#D0D4DA"
RING_COLOR = "#8A6A2F"

# =========================
# GENERATE QR
# =========================

qr = qrcode.QRCode(
    version=1,
    error_correction=qrcode.constants.ERROR_CORRECT_H,
    box_size=20,
    border=4,
)

qr.add_data(QR_DATA)
qr.make(fit=True)

img = qr.make_image(
    fill_color=QR_COLOR,
    back_color=BG_COLOR
).convert("RGBA")

# Resize to final size
img = img.resize((QR_SIZE, QR_SIZE))

# =========================
# LOAD LOGO
# =========================

logo = Image.open(LOGO_PATH).convert("RGBA")

logo_size = int(QR_SIZE * LOGO_SCALE)

logo.thumbnail((logo_size, logo_size))

# =========================
# CREATE CENTER CIRCLE
# =========================

circle_size = int(logo_size * 1.4)

circle = Image.new(
    "RGBA",
    (circle_size, circle_size),
    (0, 0, 0, 0)
)

draw = ImageDraw.Draw(circle)

# Outer bronze ring
draw.ellipse(
    (0, 0, circle_size, circle_size),
    fill=RING_COLOR
)

# Inner dark circle
padding = 10

draw.ellipse(
    (
        padding,
        padding,
        circle_size - padding,
        circle_size - padding
    ),
    fill=BG_COLOR
)

# Paste logo inside
logo_x = (circle_size - logo.width) // 2
logo_y = (circle_size - logo.height) // 2

circle.paste(
    logo,
    (logo_x, logo_y),
    logo
)

# =========================
# PASTE CENTER LOGO
# =========================

pos_x = (img.width - circle_size) // 2
pos_y = (img.height - circle_size) // 2

img.paste(
    circle,
    (pos_x, pos_y),
    circle
)

# =========================
# SAVE
# =========================

img.save(OUTPUT_PATH)

print(f"Guild QR saved as: {OUTPUT_PATH}")
