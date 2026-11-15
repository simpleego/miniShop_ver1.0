import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useCartContext } from "../context/cartContext";
import { useAuthContext } from "../context/authContext";
import Dialog from "../components/Dialog";
import { MOCK_MEMBER, DELIVERY_REQUESTS } from "../data/mockMember";
import { createOrder } from "../api/orders";
import { fetchAddresses } from "../api/addresses";
import { openPostcode } from "../utils/daumPostcode";
import { SHIPPING_FEE, COUPON_RATE, POINT_RATE, GRADE_POINT_RATE, won } from "../utils/pricing";
import "./CheckoutPage.css";

// 주문결제 화면
//   장바구니에서 "선택한 상품" 만 받아서 보여 주고, 최종 결제금액을 계산한다.
//   로그인한 회원만 결제할 수 있다 (로그인 전이면 로그인 화면으로 보냈다가 다시 돌아온다).
//   배송지는 이 화면에서 입력해 주문에 저장하고, 회원의 배송지로도 저장된다 (저장된 배송지는 골라서 쓸 수 있다).
//   주소는 다음(카카오) 우편번호 서비스로 검색한다. 쿠폰 / 적립은 가상 데이터이다.
//   결제하기 : 확인 대화상자에서 최종 확인 → POST /orders (주문 + 결제, 결제 방식은 다루지 않는다)
//              → 성공하면 장바구니에서 구매한 상품을 빼고 /order-complete 로 이동한다.
//   ※ 서버는 상품 가격 × 수량으로 계산한다. 쿠폰 / 배송비 / 적립은 가상이라 서버 금액에 반영되지 않는다.
function CheckoutPage() {
  const { cart, removeItems } = useCartContext();
  const { user, ready, logout } = useAuthContext();
  const navigate = useNavigate();

  // 이 화면으로 들어오는 길은 두 가지이고, 둘 다 navigate 의 state 로 정보를 받는다.
  //   ① 장바구니의 구매하기      : state.ids        → 선택한 상품의 id 목록 (장바구니에서 찾는다)
  //   ② 상품 상세의 구매하기     : state.directItem → 그 상품 1개와 수량 (장바구니와 무관)
  //   state 는 브라우저 기록에 저장되어 새로고침해도 유지된다.
  const location = useLocation();
  const ids = location.state?.ids;
  const directItem = location.state?.directItem;

  // 배송지 입력값 (받는 사람은 입력 전에는 회원 이름으로 보인다)
  const [receiver, setReceiver] = useState(null);
  const [phone, setPhone] = useState("");
  const [zipcode, setZipcode] = useState("");               // 우편번호 (주소 검색 결과)
  const [address, setAddress] = useState("");               // 주소 (주소 검색 결과)
  const [addressDetail, setAddressDetail] = useState("");   // 상세주소 (직접 입력)
  const [saveAddress, setSaveAddress] = useState(true);     // 이 배송지를 내 배송지로 저장
  const [savedList, setSavedList] = useState([]);           // 내가 저장해 둔 배송지 목록
  const [selectedId, setSelectedId] = useState(null);       // 지금 고른 저장 배송지
  const [request, setRequest] = useState("");             // 배송 요청사항
  const [shipError, setShipError] = useState("");         // 배송지 입력 오류 메시지
  const [couponOn, setCouponOn] = useState(true);         // 쿠폰 적용 (가상)
  const [pointOpen, setPointOpen] = useState(false);      // 적립 혜택 자세히 보기
  const [confirmOpen, setConfirmOpen] = useState(false);     // 결제 확인 대화상자
  const [paying, setPaying] = useState(false);               // 결제 처리 중 (중복 클릭 방지)
  const [payError, setPayError] = useState("");              // 결제 실패 메시지 (있으면 알림 대화상자)
  const [paid, setPaid] = useState(false);                   // 결제 성공 후 장바구니가 비어도 /cart 로 튕기지 않게 한다

  // 저장된 배송지 불러오기 : 기본 배송지가 있으면 입력칸을 미리 채운다
  useEffect(() => {
    if (!user) return;
    fetchAddresses()
      .then((list) => {
        setSavedList(list);
        if (list.length > 0) applySaved(list[0]);     // 목록의 첫 번째 = 기본 배송지
      })
      .catch(() => {});                                // 불러오지 못해도 직접 입력할 수 있다
  }, [user]);

  // 저장된 배송지를 입력칸에 채운다
  function applySaved(a) {
    setSelectedId(a.id);
    setReceiver(a.receiver_name);
    setPhone(a.receiver_phone);
    setZipcode(a.zipcode);
    setAddress(a.address);
    setAddressDetail(a.address_detail ?? "");
  }

  // 주소 검색 팝업 : 고르면 우편번호와 주소가 채워진다 (상세주소는 직접 입력)
  async function handleSearchAddress() {
    try {
      await openPostcode(({ zipcode: z, address: a }) => {
        setZipcode(z);
        setAddress(a);
        setSelectedId(null);                           // 직접 검색한 주소는 저장 배송지가 아니다
      });
    } catch (e) {
      setShipError(e.message);
    }
  }

  // 주문할 상품 목록
  //   바로 구매면 넘겨 받은 상품 1개, 장바구니에서 왔으면 지금도 담겨 있는 선택 상품(id 로 찾는다)
  let items = [];
  if (directItem) items = [directItem];
  else if (ids) items = cart.filter((item) => ids.includes(item.id));

  // 로그인 확인 중이면 잠시 기다리고, 로그인 전이면 로그인 화면으로 보낸다 (로그인 뒤 이 화면으로 되돌아온다)
  if (!ready) return null;
  if (!user && !paid) {
    return <Navigate to="/login" replace state={{ from: location.pathname, fromState: location.state }} />;
  }

  // 직접 주소를 입력해서 들어왔거나(선택 정보 없음) 상품이 모두 사라졌으면 장바구니로 돌려보낸다
  if (items.length === 0) {
    return paid ? null : <Navigate to="/cart" replace />;
  }

  // ── 계산값 : state 로 따로 만들지 않고 매번 계산한다 ──
  const lineAmount = (item) => item.price * item.quantity;                                    // 상품 1줄 금액
  const lineDiscount = (item) => (couponOn ? Math.floor(lineAmount(item) * COUPON_RATE) : 0); // 상품 1줄 쿠폰 할인

  const productAmount = items.reduce((sum, item) => sum + lineAmount(item), 0);
  const discountAmount = items.reduce((sum, item) => sum + lineDiscount(item), 0);
  const payAmount = productAmount - discountAmount + SHIPPING_FEE;

  // 가상 적립 : 최종 결제금액 기준
  const basicPoint = Math.floor(payAmount * POINT_RATE);
  const gradePoint = Math.floor(payAmount * GRADE_POINT_RATE);
  const totalPoint = basicPoint + gradePoint;

  // 배송지 입력값 (서버로 보내는 모양)
  const shipping = {
    receiver_name: (receiver ?? user?.name ?? "").trim(),
    receiver_phone: phone.trim(),
    zipcode,
    address: address.trim(),
    address_detail: addressDetail.trim() || null,
    request_memo: request || null,
    save_address: saveAddress,
  };

  // 결제하기 버튼 : 배송지를 확인하고, 이상이 없으면 최종 확인 대화상자를 연다
  function handlePayClick() {
    if (!shipping.receiver_name) return setShipError("받는 사람을 입력해 주세요.");
    if (!/^[0-9]{2,4}-?[0-9]{3,4}-?[0-9]{4}$/.test(shipping.receiver_phone)) {
      return setShipError("연락처를 올바르게 입력해 주세요. (예: 010-1234-5678)");
    }
    if (!/^[0-9]{5}$/.test(shipping.zipcode) || shipping.address.length < 5) {
      return setShipError("[주소 검색] 으로 주소를 찾아 주세요.");
    }
    setShipError("");
    setConfirmOpen(true);
  }

  // 결제하기 확정 : 서버에 구매 요청 (가격은 보내지 않는다)
  async function handlePay() {
    setPaying(true);
    try {
      const order = await createOrder(
        items.map((item) => ({ product_id: item.id, quantity: item.quantity })),
        shipping
      );
      setPaid(true);
      if (!directItem) removeItems(items.map((item) => item.id));   // 장바구니에서 온 경우만 구매한 상품을 뺀다
      navigate("/order-complete", { state: { order }, replace: true });
    } catch (e) {
      setConfirmOpen(false);
      if (e.status === 401) {
        logout();                 // 로그인이 만료되었으면 로그아웃 처리 → 로그인 화면으로 (이 화면으로 되돌아온다)
        return;
      }
      setPayError(e.message);     // 재고 부족 등 서버 메시지를 그대로 보여 준다
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="checkout-page">
      {/* 제목 + 단계 표시 */}
      <div className="checkout-head">
        <h2 className="checkout-title">주문결제</h2>
        <nav className="checkout-steps" aria-label="주문 단계">
          <Link to="/cart">장바구니</Link>
          <span aria-hidden="true">›</span>
          <strong aria-current="step">주문결제</strong>
          <span aria-hidden="true">›</span>
          <span>주문완료</span>
        </nav>
      </div>

      <div className="checkout-layout">
        {/* ───── 왼쪽 ───── */}
        <div className="checkout-main">
          {/* 배송지 : 회원이 직접 입력한다 (주문에 저장된다) */}
          <section className="checkout-card">
            <div className="ship-head">
              <h3 className="ship-title">
                <span className="ship-pin" aria-hidden="true">📍</span> 배송지
              </h3>
            </div>

            {savedList.length > 0 && (
              <div className="ship-saved" role="group" aria-label="저장된 배송지">
                {savedList.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className={a.id === selectedId ? "ship-chip on" : "ship-chip"}
                    onClick={() => applySaved(a)}
                  >
                    {a.receiver_name}
                    {a.is_default && <em>기본</em>}
                  </button>
                ))}
              </div>
            )}

            <div className="ship-form">
              <input
                value={receiver ?? user?.name ?? ""}
                onChange={(e) => setReceiver(e.target.value)}
                placeholder="받는 사람"
                maxLength={50}
                aria-label="받는 사람"
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="연락처 (예: 010-1234-5678)"
                inputMode="tel"
                maxLength={20}
                aria-label="연락처"
              />
              <div className="ship-zip">
                <input value={zipcode} placeholder="우편번호" readOnly aria-label="우편번호" />
                <button type="button" className="ship-search" onClick={handleSearchAddress}>
                  주소 검색
                </button>
              </div>
              <input
                value={address}
                placeholder="[주소 검색] 으로 찾아 주세요"
                readOnly
                onClick={handleSearchAddress}
                aria-label="주소"
              />
              <input
                value={addressDetail}
                onChange={(e) => setAddressDetail(e.target.value)}
                placeholder="상세주소 (동, 호수 등)"
                maxLength={100}
                aria-label="상세주소"
              />
            </div>

            <select
              className="ship-request"
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              aria-label="배송 요청사항"
            >
              {DELIVERY_REQUESTS.map((text) => (
                <option key={text} value={text}>
                  {text || "배송시 요청사항을 선택해 주세요."}
                </option>
              ))}
            </select>
            <label className="ship-save">
              <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} />
              이 배송지를 내 배송지로 저장
            </label>
            {shipError && <p className="ship-error" role="alert">{shipError}</p>}
          </section>

          {/* 주문상품 */}
          <section className="checkout-card">
            <h3 className="order-title">
              주문상품 <span className="order-count">{items.length} 개</span>
            </h3>

            {/* 쿠폰 켜고 끄기 (가상) */}
            <label className={couponOn ? "coupon-bar on" : "coupon-bar"}>
              <input
                type="checkbox"
                role="switch"
                className="coupon-switch"
                checked={couponOn}
                onChange={(e) => setCouponOn(e.target.checked)}
              />
              <span className="coupon-text">
                {couponOn ? "🎉 최대 할인 쿠폰 적용중" : "쿠폰을 적용하지 않았습니다"}
              </span>
            </label>

            <ul className="order-list">
              {items.map((item) => (
                <li key={item.id} className="order-item">
                  <div className="order-item-body">
                    <Link to={`/product/${item.id}`} className="order-item-image">
                      <img src={item.image_url} alt={item.name} />
                    </Link>

                    <div className="order-item-info">
                      <Link to={`/product/${item.id}`} className="order-item-name">
                        {item.name}
                      </Link>
                      <span className="order-item-meta">
                        단가 <i>|</i> {won(item.price)}
                      </span>
                      <span className="order-item-meta">
                        수량 <i>|</i> {item.quantity}개
                      </span>
                      {couponOn && <span className="coupon-badge">쿠폰적용</span>}
                    </div>

                    <div className="order-item-price">
                      {couponOn ? (
                        <>
                          <s>{won(lineAmount(item))}</s>
                          <strong className="discounted">{won(lineAmount(item) - lineDiscount(item))}</strong>
                        </>
                      ) : (
                        <strong>{won(lineAmount(item))}</strong>
                      )}
                    </div>
                  </div>

                  <div className="order-item-foot">
                    <span>음료 자판기</span>
                    <span>{SHIPPING_FEE === 0 ? "무료배송" : `배송비 | ${won(SHIPPING_FEE)}`}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* ───── 오른쪽 : 최종 결제금액 ───── */}
        <aside className="checkout-side">
          <div className="pay-box">
            <div className="pay-total">
              <span>최종 결제금액</span>
              <strong>{won(payAmount)}</strong>
            </div>

            <dl className="pay-rows">
              <div>
                <dt>상품금액</dt>
                <dd>{won(productAmount)}</dd>
              </div>
              <div>
                <dt>할인금액</dt>
                <dd className="discount">{discountAmount > 0 ? `-${won(discountAmount)}` : won(0)}</dd>
              </div>
              <div>
                <dt>배송비</dt>
                <dd>{won(SHIPPING_FEE)}</dd>
              </div>
            </dl>

            {/* 적립 혜택 (가상) */}
            <button
              type="button"
              className="point-row"
              aria-expanded={pointOpen}
              onClick={() => setPointOpen(!pointOpen)}
            >
              <span className="point-label">적립 혜택</span>
              <span className="point-value">
                최대 <strong>{totalPoint.toLocaleString()}</strong>원
                <span className={pointOpen ? "point-arrow open" : "point-arrow"} aria-hidden="true">▼</span>
              </span>
            </button>

            {pointOpen && (
              <dl className="point-detail">
                <div>
                  <dt>기본 적립 ({POINT_RATE * 100}%)</dt>
                  <dd>{won(basicPoint)}</dd>
                </div>
                <div>
                  <dt>{MOCK_MEMBER.grade} 회원 추가 적립 ({GRADE_POINT_RATE * 100}%)</dt>
                  <dd>{won(gradePoint)}</dd>
                </div>
                <p className="point-note">※ 가상으로 계산한 적립금입니다. 실제로 지급되지 않습니다.</p>
              </dl>
            )}

            {/* 결제하기 : 누르면 최종 확인 대화상자가 열린다 */}
            <button type="button" className="pay-button" onClick={handlePayClick}>
              결제하기
            </button>
          </div>

          {/* 안내 (접고 펼치기) */}
          <div className="notice-box">
            <details>
              <summary>개인정보 제3자 제공고지</summary>
              <p>
                주문 처리를 위해 판매자에게 수령인 이름, 연락처, 배송지 정보가 제공됩니다.
                (가상 안내 문구입니다)
              </p>
            </details>
            <details>
              <summary>전자상거래 구매안전 서비스 안내</summary>
              <p>
                결제 대금은 구매 확정 전까지 안전하게 보관되는 서비스입니다.
                (가상 안내 문구입니다)
              </p>
            </details>
          </div>
        </aside>
      </div>

      {/* 결제 최종 확인 */}
      <Dialog
        open={confirmOpen}
        title="결제하시겠습니까?"
        confirmText={paying ? "결제 중..." : "결제하기"}
        cancelText="취소"
        onConfirm={() => { if (!paying) handlePay(); }}
        onCancel={() => { if (!paying) setConfirmOpen(false); }}
      >
        {items.length === 1 ? items[0].name : `${items[0].name} 외 ${items.length - 1}건`}
        <br />
        <span className="dialog-sub">최종 결제금액 {won(payAmount)}</span>
      </Dialog>

      {/* 결제 실패 안내 (재고 부족 등) */}
      <Dialog open={payError !== ""} title="결제하지 못했습니다" onConfirm={() => setPayError("")}>
        {payError}
      </Dialog>
    </div>
  );
}

export default CheckoutPage;
