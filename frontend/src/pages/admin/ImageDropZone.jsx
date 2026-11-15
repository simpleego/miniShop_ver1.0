import { useRef, useState } from "react";
import { ACCEPT } from "../../utils/imageFile";

// 이미지 1장을 고르는 칸 : 클릭해서 파일 선택 / 끌어다 놓기
//   src      : 지금 보여 줄 이미지 (기존 이미지 또는 새로 고른 파일의 미리보기). 없으면 빈 칸
//   onFiles  : 파일을 고르면 호출 (multiple 이면 여러 개)
//   onRemove : 이미지가 있을 때 "삭제" 버튼을 누르면 호출 (없으면 삭제 버튼을 숨긴다)
function ImageDropZone({ src, label, caption, multiple = false, tall = false, onFiles, onRemove, error }) {
  const inputRef = useRef(null);
  const [over, setOver] = useState(false);

  const pick = (fileList) => {
    const files = Array.from(fileList ?? []);
    if (files.length) onFiles(multiple ? files : files.slice(0, 1));
  };

  return (
    <div className="dz-wrap">
      <div
        className={`dz${src ? " has-image" : ""}${over ? " over" : ""}${tall ? " tall" : ""}${error ? " bad" : ""}`}
        role="button"
        tabIndex={0}
        aria-label={`${label} ${src ? "바꾸기" : "선택"}`}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), inputRef.current?.click())}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files); }}
      >
        {src ? (
          <img src={src} alt={label} />
        ) : (
          <span className="dz-empty">
            <span className="dz-plus">＋</span>
            클릭하거나 파일을 끌어 놓으세요
          </span>
        )}
        <input
          ref={inputRef} type="file" accept={ACCEPT} multiple={multiple} hidden
          onChange={(e) => { pick(e.target.files); e.target.value = ""; }}
        />
      </div>
      <div className="dz-foot">
        <span className="dz-label">{label}</span>
        {onRemove && src && <button type="button" className="dz-remove" onClick={onRemove}>삭제</button>}
      </div>
      {caption && <p className="dz-caption">{caption}</p>}
      {error && <p className="dz-error" role="alert">{error}</p>}
    </div>
  );
}

export default ImageDropZone;
