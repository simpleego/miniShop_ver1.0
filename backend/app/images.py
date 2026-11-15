"""상품 이미지 업로드 처리 : 검증, 크기 줄이기(썸네일), 파일 저장 / 삭제

정책
  - JPG / PNG / WEBP 만 받는다. 확장자나 Content-Type 이 아니라 파일 내용(Pillow 가 읽은 실제 형식)으로 판단한다.
    (SVG 는 안에 스크립트를 넣을 수 있어 받지 않는다)
  - 파일 크기 2MB 이하, 가로 x 세로 2,500만 화소 이하 (아주 큰 그림으로 서버 메모리를 채우는 것을 막는다)
  - 저장할 때 파일 이름은 서버가 무작위(uuid)로 정한다. 올린 사람이 보낸 이름은 쓰지 않는다. (경로 조작, 덮어쓰기 방지)
  - 모두 JPG 로 다시 저장한다. (EXIF 의 회전 정보를 반영하고, 위치 정보 같은 메타데이터는 버린다)
    대표 이미지 : 가로 / 세로 최대 1000px,  썸네일(목록 카드) : 최대 400px,  상세 이미지 : 가로 최대 1000px
"""
import logging
import re
import uuid
from io import BytesIO
from pathlib import Path

from fastapi import HTTPException, UploadFile
from PIL import Image, ImageOps, UnidentifiedImageError

logger = logging.getLogger(__name__)

# backend/products/images (main.py 가 이 폴더를 /products/images 로 내려준다)
IMAGES_DIR = Path(__file__).resolve().parent.parent / "products" / "images"
URL_PREFIX = "/products/images/"

MAX_BYTES = 2 * 1024 * 1024
MAX_PIXELS = 25_000_000
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}

MAIN_MAX = 1000          # 대표 이미지 한 변 최대 px
THUMB_MAX = 400          # 썸네일 한 변 최대 px
DETAIL_MAX_WIDTH = 1000  # 상세 이미지 가로 최대 px
MAIN_SLOTS = 3           # 대표 이미지 최대 장수
DETAIL_MAX = 10          # 상세 이미지 최대 장수

# 이 서버가 만든 파일 이름 모양 (uuid.jpg, uuid_thumb.jpg). 지울 때는 이 모양인 파일만 지운다.
GENERATED_RE = re.compile(r"^[0-9a-f]{32}(_thumb)?\.jpg$")


def bad_image(message: str) -> HTTPException:
    return HTTPException(status_code=422, detail=message)


def load_image(upload: UploadFile) -> Image.Image:
    """업로드 파일을 검사하고 Pillow 이미지로 돌려준다. 문제가 있으면 422."""
    name = upload.filename or "파일"
    data = upload.file.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise bad_image(f"{name} : 파일 크기는 {MAX_BYTES // 1024 // 1024}MB 이하여야 합니다.")
    try:
        probe = Image.open(BytesIO(data))
        if probe.format not in ALLOWED_FORMATS:
            raise bad_image(f"{name} : JPG, PNG, WEBP 이미지만 올릴 수 있습니다.")
        if probe.width * probe.height > MAX_PIXELS:
            raise bad_image(f"{name} : 이미지 해상도가 너무 큽니다.")
        probe.verify()                       # 깨진 파일 검사 (verify 뒤에는 다시 열어야 한다)
        img = Image.open(BytesIO(data))
        img.load()
    except HTTPException:
        raise
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError):
        raise bad_image(f"{name} : 이미지 파일이 아니거나 손상되었습니다.")
    return img


def to_rgb(img: Image.Image) -> Image.Image:
    img = ImageOps.exif_transpose(img)       # 휴대폰 사진의 회전 정보 반영
    if img.mode in ("RGBA", "LA", "P"):      # 투명 배경은 흰색으로 채운다 (JPG 는 투명을 못 쓴다)
        img = img.convert("RGBA")
        background = Image.new("RGB", img.size, "white")
        background.paste(img, mask=img.getchannel("A"))
        return background
    return img.convert("RGB")


def _save_jpeg(img: Image.Image, path: Path, quality=88) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "JPEG", quality=quality, optimize=True)


def _new_name(suffix="") -> str:
    return f"{uuid.uuid4().hex}{suffix}.jpg"


def url_to_path(url: str) -> Path | None:
    """DB 의 이미지 주소(/products/images/...) 를 실제 파일 경로로. 이미지 폴더 밖이면 None."""
    if not url or not url.startswith(URL_PREFIX):
        return None
    path = (IMAGES_DIR / url[len(URL_PREFIX):]).resolve()
    try:
        path.relative_to(IMAGES_DIR.resolve())
    except ValueError:
        return None
    return path


def save_main(img: Image.Image, written: list) -> str:
    """대표 이미지 1장 저장 (한 변 최대 1000px). 주소를 돌려준다. 저장한 파일은 written 에 기록한다."""
    img = to_rgb(img)
    img.thumbnail((MAIN_MAX, MAIN_MAX))
    name = _new_name()
    _save_jpeg(img, IMAGES_DIR / name)
    written.append(IMAGES_DIR / name)
    return URL_PREFIX + name


def save_thumbnail(img: Image.Image, written: list) -> str:
    """썸네일 저장 (한 변 최대 400px). 주소를 돌려준다."""
    img = to_rgb(img)
    img.thumbnail((THUMB_MAX, THUMB_MAX))
    name = _new_name("_thumb")
    _save_jpeg(img, IMAGES_DIR / name, quality=85)
    written.append(IMAGES_DIR / name)
    return URL_PREFIX + name


def save_detail(img: Image.Image, written: list) -> str:
    """상세 이미지 1장 저장 (가로 최대 1000px, 세로는 비율대로)."""
    img = to_rgb(img)
    if img.width > DETAIL_MAX_WIDTH:
        img = img.resize((DETAIL_MAX_WIDTH, round(img.height * DETAIL_MAX_WIDTH / img.width)), Image.LANCZOS)
    name = _new_name()
    path = IMAGES_DIR / "detail" / name
    _save_jpeg(img, path)
    written.append(path)
    return URL_PREFIX + "detail/" + name


def open_existing(url: str) -> Image.Image | None:
    """이미 저장된 이미지를 다시 연다 (썸네일을 새로 만들 때 쓴다). 파일이 없으면 None."""
    path = url_to_path(url)
    if path is None or not path.is_file():
        return None
    try:
        img = Image.open(path)
        img.load()
        return img
    except (OSError, UnidentifiedImageError):
        return None


def delete_files(paths) -> None:
    for p in paths:
        try:
            Path(p).unlink(missing_ok=True)
        except OSError as e:
            logger.warning("이미지 파일 삭제 실패 %s: %s", p, e)


def is_generated(url: str) -> bool:
    """이 서버가 업로드로 만든 파일인가 (시드 이미지 같은 기존 파일은 지우지 않는다)."""
    path = url_to_path(url)
    return path is not None and GENERATED_RE.match(path.name) is not None
