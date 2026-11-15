import { useState } from "react";
import ImageDropZone from "./ImageDropZone";
import { validateImageFile, formatSize, createPreview, MAX_MB } from "../../utils/imageFile";

const NAMES = ["대표 이미지 1", "대표 이미지 2", "대표 이미지 3"];

// 대표 이미지 3칸 (상세 화면 왼쪽의 큰 이미지, 1번이 대표)
//   slots : [{ src, file, original }] 3개. src = 보여 줄 주소, file = 새로 고른 파일(없으면 null), original = 기존 이미지 주소
//   썸네일(목록 카드)은 올리지 않는다. 서버가 1번 이미지를 줄여서 만든다.
function MainImagesEditor({ slots, onChange, productName }) {
  const [errors, setErrors] = useState(["", "", ""]);
  const setError = (i, msg) => setErrors((e) => e.map((v, k) => (k === i ? msg : v)));

  function choose(i, [file]) {
    const problem = validateImageFile(file);
    if (problem) return setError(i, problem);
    setError(i, "");
    onChange(slots.map((s, k) => (k === i ? { ...s, src: createPreview(file), file } : s)));
  }

  function remove(i) {
    setError(i, "");
    onChange(slots.map((s, k) => (k === i ? { src: "", file: null, original: "" } : s)));
  }

  const shown = slots.filter((s) => s.src);

  return (
    <div>
      <p className="img-guide">
        상세 화면 왼쪽에 보이는 큰 이미지입니다. <strong>1번이 대표 이미지</strong>이고 최대 3장까지 올릴 수 있습니다.
        JPG · PNG · WEBP, 장당 {MAX_MB}MB 이하 (정사각형 권장). 큰 이미지는 서버가 1000px 이내로 줄여 저장합니다.
      </p>

      <div className="img-slots">
        {slots.map((s, i) => (
          <ImageDropZone
            key={i}
            label={NAMES[i]}
            src={s.src}
            error={errors[i]}
            caption={s.file ? `새 파일 · ${s.file.name} (${formatSize(s.file.size)})` : s.src ? "현재 등록된 이미지" : i === 0 ? "필수" : "선택"}
            onFiles={(files) => choose(i, files)}
            onRemove={() => remove(i)}
          />
        ))}
      </div>

      <div className="img-preview">
        <h4>미리보기 <small>썸네일은 대표 이미지 1번을 줄여서 서버가 자동으로 만듭니다</small></h4>
        <div className="img-preview-row">
          <div className="pv-card">
            <span className="pv-title">상품 목록 카드 (썸네일)</span>
            <div className="pv-card-img">{slots[0].src ? <img src={slots[0].src} alt="" /> : <span>이미지 없음</span>}</div>
            <p>{productName || "상품명"}</p>
          </div>
          <div className="pv-gallery">
            <span className="pv-title">상세 화면 작은 이미지 줄</span>
            <div className="pv-thumbs">
              {shown.length === 0 && <span className="pv-none">이미지 없음</span>}
              {shown.map((s, i) => <img key={i} src={s.src} alt="" className={i === 0 ? "first" : ""} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MainImagesEditor;
