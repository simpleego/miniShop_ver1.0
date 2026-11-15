import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCartContext } from "../context/cartContext";
import Dialog from "../components/Dialog";
import { SHIPPING_FEE } from "../utils/pricing";
import "./CartPage.css";

// 할인 : 아직 정책이 없어 고정값(0원)이다. (쿠폰은 주문결제 화면에서 가상으로 적용한다)
//   배송비는 주문결제 화면과 같은 값을 쓰도록 utils/pricing.js 에서 가져온다.
const DISCOUNT_AMOUNT = 0;

// 12345 → "12,345원"
const won = (n) => `${n.toLocaleString()}원`;

// 장바구니 화면 : 상품별 목록 + 선택(체크박스) + 오른쪽 결제 금액 영역
function CartPage() {
  const { cart, updateQuantity, removeItem, removeItems } = useCartContext();
  const navigate = useNavigate();

  // 체크가 "해제된" 상품의 id 모음. (기본은 모두 선택 상태)
  //   선택된 상품을 따로 저장하지 않고 "해제된 것" 을 저장하면,
  //   새로 담은 상품은 자동으로 선택 상태가 되고 삭제된 상품을 정리할 필요도 없다.
  const [unselected, setUnselected] = useState(() => new Set());
  // "선택삭제" 확인 대화상자가 열려 있는지
  const [deleteOpen, setDeleteOpen] = useState(false);

  // 비어 있을 때
  if (cart.length === 0) {
    return (
      <div className="cart-page">
        <h2 className="cart-title">장바구니</h2>
        <p className="cart-empty">장바구니가 비어 있습니다.</p>
        <Link to="/" className="cart-go">상품 보러 가기</Link>
      </div>
    );
  }

  // ── 계산값 : state 로 따로 만들지 않고 매번 계산한다 ──
  const selectedItems = cart.filter((item) => !unselected.has(item.id));
  const allSelected = selectedItems.length === cart.length;
  const productAmount = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingFee = selectedItems.length > 0 ? SHIPPING_FEE : 0;
  const payAmount = productAmount - DISCOUNT_AMOUNT + shippingFee;
  const noneSelected = selectedItems.length === 0;

  // 체크박스 하나 켜고 끄기
  function toggleItem(id) {
    setUnselected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // 전체선택 : 모두 선택된 상태면 모두 해제, 아니면 모두 선택
  function toggleAll() {
    setUnselected(allSelected ? new Set(cart.map((item) => item.id)) : new Set());
  }

  // 선택삭제 : 대화상자에서 [삭제] 를 눌렀을 때
  function handleDeleteSelected() {
    removeItems(selectedItems.map((item) => item.id));
    setDeleteOpen(false);
  }

  // 수량 입력칸 : 숫자가 아니면 무시하고, 숫자면 1 ~ 재고로 보정해서 저장한다
  function handleQuantityInput(id, e) {
    const n = parseInt(e.target.value, 10);
    if (Number.isNaN(n)) return;
    updateQuantity(id, n);
  }

  return (
    <div className="cart-page">
      <h2 className="cart-title">장바구니</h2>

      <div className="cart-layout">
        {/* ───── 왼쪽 : 상품 목록 ───── */}
        <section className="cart-main">
          {/* 전체선택 / 선택삭제 */}
          <div className="cart-toolbar">
            <label className="cart-check-all">
              <input
                type="checkbox"
                className="cart-check"
                checked={allSelected}
                onChange={toggleAll}
              />
              전체선택 ({selectedItems.length}/{cart.length})
            </label>

            <button
              type="button"
              className="cart-delete-selected"
              disabled={noneSelected}
              onClick={() => setDeleteOpen(true)}
            >
              선택삭제
            </button>
          </div>

          <div className="cart-card">
            <div className="cart-store">
              <input
                type="checkbox"
                className="cart-check"
                checked={allSelected}
                onChange={toggleAll}
                aria-label="음료 자판기 상품 전체 선택"
              />
              <span className="cart-store-name">음료 자판기</span>
            </div>

            <ul className="cart-list">
              {cart.map((item) => (
                <li key={item.id} className="cart-item">
                  <input
                    type="checkbox"
                    className="cart-check"
                    checked={!unselected.has(item.id)}
                    onChange={() => toggleItem(item.id)}
                    aria-label={`${item.name} 선택`}
                  />

                  <Link to={`/product/${item.id}`} className="cart-item-image">
                    <img src={item.image_url} alt={item.name} />
                  </Link>

                  <div className="cart-item-info">
                    <Link to={`/product/${item.id}`} className="cart-item-name">
                      {item.name}
                    </Link>
                    <span className="cart-item-unit">{won(item.price)}</span>
                  </div>

                  {/* 수량 : (−) [ n ] (+)  (1 ~ 재고) */}
                  <div className="cart-qty">
                    <button
                      type="button"
                      className="cart-qty-btn"
                      aria-label="수량 줄이기"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                    >
                      −
                    </button>
                    <input
                      className="cart-qty-input"
                      type="number"
                      min="1"
                      max={item.stock}
                      value={item.quantity}
                      aria-label={`${item.name} 수량`}
                      onChange={(e) => handleQuantityInput(item.id, e)}
                    />
                    <button
                      type="button"
                      className="cart-qty-btn"
                      aria-label="수량 늘리기"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      disabled={item.quantity >= item.stock}
                    >
                      +
                    </button>
                  </div>

                  <span className="cart-item-amount">{won(item.price * item.quantity)}</span>

                  <button
                    type="button"
                    className="cart-remove"
                    aria-label={`${item.name} 삭제`}
                    onClick={() => removeItem(item.id)}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>

            {/* 상품금액 − 할인금액 + 배송비 = 주문금액 */}
            <div className="cart-calc">
              <div className="cart-calc-col">
                <span className="cart-calc-label">상품금액</span>
                <strong className="cart-calc-value">{won(productAmount)}</strong>
              </div>
              <span className="cart-calc-op">−</span>
              <div className="cart-calc-col">
                <span className="cart-calc-label">할인금액</span>
                <strong className="cart-calc-value discount">{won(DISCOUNT_AMOUNT)}</strong>
              </div>
              <span className="cart-calc-op">+</span>
              <div className="cart-calc-col">
                <span className="cart-calc-label">
                  {shippingFee === 0 ? "묶음배송비 적용 중" : "배송비"}
                </span>
                <strong className={shippingFee === 0 ? "cart-calc-value free" : "cart-calc-value"}>
                  {shippingFee === 0 ? "무료배송" : won(shippingFee)}
                </strong>
              </div>
              <span className="cart-calc-op">=</span>
              <div className="cart-calc-col">
                <span className="cart-calc-label">주문금액</span>
                <strong className="cart-calc-value">{won(payAmount)}</strong>
              </div>
            </div>
          </div>
        </section>

        {/* ───── 오른쪽 : 결제 금액 + 구매하기 ───── */}
        <aside className="cart-side">
          <div className="cart-pay-total">
            <span>총 결제금액</span>
            <strong>{won(payAmount)}</strong>
          </div>

          <dl className="cart-pay-rows">
            <div>
              <dt>상품수</dt>
              <dd>{selectedItems.length}개</dd>
            </div>
            <div>
              <dt>상품금액</dt>
              <dd>{won(productAmount)}</dd>
            </div>
            <div>
              <dt>할인금액</dt>
              <dd className="discount">{won(DISCOUNT_AMOUNT)}</dd>
            </div>
            <div>
              <dt>배송비</dt>
              <dd>{won(shippingFee)}</dd>
            </div>
          </dl>

          {/* 구매하기 : 선택한 상품의 id 만 담아서 주문결제 화면(/checkout)으로 이동한다 */}
          <button
            type="button"
            className="cart-buy"
            disabled={noneSelected}
            onClick={() =>
              navigate("/checkout", { state: { ids: selectedItems.map((item) => item.id) } })
            }
          >
            구매하기
          </button>
        </aside>
      </div>

      {/* 선택삭제 확인 : [취소] [삭제] */}
      <Dialog
        open={deleteOpen}
        title="선택 상품 삭제"
        confirmText="삭제"
        cancelText="취소"
        onConfirm={handleDeleteSelected}
        onCancel={() => setDeleteOpen(false)}
      >
        선택한 상품 {selectedItems.length}개를 장바구니에서 삭제할까요?
      </Dialog>
    </div>
  );
}

export default CartPage;
