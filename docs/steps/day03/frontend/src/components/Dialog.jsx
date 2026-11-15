import { useEffect, useId, useRef } from "react";
import "./Dialog.css";

// 공용 대화상자 (모달)
//   window.confirm / alert 는 모양을 바꿀 수 없고 화면을 통째로 멈추지만,
//   이 컴포넌트는 앱 디자인에 맞게 꾸밀 수 있다.
//
// props
//   open        : true 면 보이고 false 면 숨는다
//   title       : 제목
//   children    : 본문 (글자, 태그 모두 가능)
//   confirmText : 확인 버튼 글자 (기본 "확인")
//   cancelText  : 취소 버튼 글자. 주지 않으면 취소 버튼이 없는 "알림" 대화상자가 된다
//   onConfirm   : 확인 버튼을 눌렀을 때
//   onCancel    : 취소 버튼 / ESC / 바깥 영역을 눌렀을 때 (없으면 onConfirm 이 대신 실행된다)
//   icon        : 제목 위에 보여 줄 그림 (선택)
//   center      : true 면 글자와 버튼을 가운데 정렬한 "단순한" 모양 (선택)
//   showClose   : true 면 오른쪽 위에 ✕ 닫기 버튼을 보인다 (선택)
//   className   : 대화상자에 덧붙일 클래스 (예: 폼처럼 넓은 대화상자 "wide") (선택)
function Dialog({
  open,
  title,
  children,
  confirmText = "확인",
  cancelText,
  onConfirm,
  onCancel,
  icon,
  center = false,
  showClose = false,
  className = "",
}) {
  const ref = useRef(null);
  // 화면에 대화상자가 여러 개 있어도 id 가 겹치지 않게 React 가 만들어 주는 고유 id
  const titleId = useId();

  // 닫는 동작 : 취소 처리 함수가 없으면 확인 처리로 닫는다 (알림 대화상자)
  const close = onCancel ?? onConfirm;

  // open 값에 맞춰 브라우저의 <dialog> 를 열고 닫는다
  //   showModal() : 뒷배경을 어둡게 하고, 포커스를 대화상자 안에 가둔다
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={className ? `dialog ${className}` : "dialog"}
      aria-labelledby={titleId}
      // ESC 키 : 브라우저가 알아서 닫지 않고 우리 상태(open)로 닫도록 막는다
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      // 어두운 바깥 영역을 누르면 닫는다 (대화상자 안쪽을 누른 경우는 제외)
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
    >
      <div className={center ? "dialog-box center" : "dialog-box"}>
        {showClose && (
          <button type="button" className="dialog-x" aria-label="닫기" onClick={close}>
            ✕
          </button>
        )}

        {icon && <div className="dialog-icon">{icon}</div>}
        <h3 id={titleId} className="dialog-title">{title}</h3>
        {children && <div className="dialog-body">{children}</div>}

        <div className="dialog-actions">
          {cancelText && (
            <button type="button" className="dialog-btn" onClick={onCancel}>
              {cancelText}
            </button>
          )}
          <button type="button" className="dialog-btn primary" onClick={onConfirm} autoFocus>
            {confirmText}
          </button>
        </div>
      </div>
    </dialog>
  );
}

export default Dialog;
