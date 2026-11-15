// "장바구니에 담았습니다" 대화상자에 쓰는 장바구니 + 아이콘 (SVG, 외부 이미지 파일 없이 코드로 그린다)
function CartPlusIcon({ size = 64 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"   // 장식용이므로 스크린리더는 읽지 않는다
    >
      {/* 장바구니 */}
      <path
        d="M6 12h8l6 28h28l6-20H17"
        stroke="#444"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="50" r="3.5" stroke="#444" strokeWidth="3" />
      <circle cx="44" cy="50" r="3.5" stroke="#444" strokeWidth="3" />

      {/* 오른쪽 위 파란 + 배지 */}
      <circle cx="49" cy="14" r="10" fill="#2f8fe8" />
      <path d="M49 9v10M44 14h10" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default CartPlusIcon;
