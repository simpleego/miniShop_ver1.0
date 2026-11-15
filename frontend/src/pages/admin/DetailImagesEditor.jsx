import { useState } from "react";
import ImageDropZone from "./ImageDropZone";
import { validateImageFile, formatSize, createPreview, newDetailKey, DETAIL_MAX, MAX_MB } from "../../utils/imageFile";

// 상세 이미지 목록 (상세 화면 아래 "상세 보기" 에 위에서 아래로 이어 붙는 긴 설명 이미지)
//   items : [{ key, src, file, name, original }]  file = 새로 고른 파일(없으면 null), original = 기존 이미지 주소
//   여러 장 추가, ▲▼ 순서 바꾸기, 삭제
function DetailImagesEditor({ items, onChange }) {
  const [errors, setErrors] = useState([]);       // 이번에 고른 파일 중 거부된 것의 사유

  function addFiles(files) {
    const msgs = [];
    const added = [];
    files.forEach((file) => {
      const problem = validateImageFile(file);
      if (problem) return msgs.push(`${file.name} : ${problem}`);
      if (items.length + added.length >= DETAIL_MAX) return msgs.push(`${file.name} : 최대 ${DETAIL_MAX}장까지만 올릴 수 있습니다.`);
      added.push({ key: newDetailKey(), src: createPreview(file), file, name: file.name, original: "" });
    });
    setErrors(msgs);
    if (added.length) onChange([...items, ...added]);
  }

  function move(index, delta) {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div>
      <p className="img-guide">
        상세 화면 아래 <strong>"상세 보기"</strong>에 위에서 아래 순서대로 이어 붙는 설명 이미지입니다.
        최대 {DETAIL_MAX}장, JPG · PNG · WEBP, 장당 {MAX_MB}MB 이하 (세로로 긴 이미지 권장). 가로 1000px 이내로 줄여 저장합니다.
      </p>

      <ImageDropZone
        label="상세 이미지 추가"
        multiple
        src=""
        caption={`${items.length} / ${DETAIL_MAX}장 · 여러 장을 한 번에 선택할 수 있습니다`}
        onFiles={addFiles}
      />
      {errors.length > 0 && <ul className="dz-error-list" role="alert">{errors.map((m, i) => <li key={i}>{m}</li>)}</ul>}

      {items.length === 0 ? (
        <p className="admin-message">등록된 상세 이미지가 없습니다.</p>
      ) : (
        <ol className="detail-list">
          {items.map((it, i) => (
            <li key={it.key} className="detail-item">
              <span className="detail-no">{i + 1}</span>
              <img src={it.src} alt={`상세 이미지 ${i + 1}`} />
              <div className="detail-info">
                <strong>{it.name}</strong>
                <span>{it.file ? `새 파일 · ${formatSize(it.file.size)}` : "현재 등록된 이미지"}</span>
              </div>
              <div className="detail-btns">
                <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label="위로">▲</button>
                <button type="button" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label="아래로">▼</button>
                <button type="button" className="danger" onClick={() => onChange(items.filter((_, k) => k !== i))}>삭제</button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default DetailImagesEditor;
