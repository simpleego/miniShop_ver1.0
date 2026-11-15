-- =============================================================================
-- 이미지를 모두 jpg 로 교체 : 목록 이미지(products.image_url) + 상세 화면 이미지(product_images)
--
--   파일 위치 : backend/products/images/ (목록, 상품 이미지) , backend/products/images/detail/ (상세 이미지)
--
--   products.image_url        : /products/images/{이름}.jpg                 (목록 카드 이미지)
--   product_images GALLERY    : 상세 화면 대표 이미지 + 썸네일 (sort_order 1 = 대표)
--       콜라(1) 오렌지주스(6) 아메리카노(16) 녹차(20) : {이름}_thumb, _angle_1, _angle_2  (3장)
--       그 외 모든 상품                              : {이름}_thumb, _thumb_2             (2장)
--   product_images DETAIL     : /products/images/detail/{이름}_detail.jpg  (상세 보기)
--
--   {이름} : 콜라 cola / 사이다 cider(4) / 오렌지주스 orange(6) / 생수 water(12) / 아메리카노 coffee(16) / 녹차 greentea(20)
--            나머지 상품은 product_{id}
--   02_seed.sql 다음에 실행한다. 여러 번 실행해도 된다. (전체 상품의 product_images 를 지우고 다시 넣는다)
-- =============================================================================

UPDATE products SET image_url = '/products/images/cola.jpg' WHERE id = 1;
UPDATE products SET image_url = '/products/images/product_2.jpg' WHERE id = 2;
UPDATE products SET image_url = '/products/images/product_3.jpg' WHERE id = 3;
UPDATE products SET image_url = '/products/images/cider.jpg' WHERE id = 4;
UPDATE products SET image_url = '/products/images/product_5.jpg' WHERE id = 5;
UPDATE products SET image_url = '/products/images/orange.jpg' WHERE id = 6;
UPDATE products SET image_url = '/products/images/product_7.jpg' WHERE id = 7;
UPDATE products SET image_url = '/products/images/product_8.jpg' WHERE id = 8;
UPDATE products SET image_url = '/products/images/product_9.jpg' WHERE id = 9;
UPDATE products SET image_url = '/products/images/product_10.jpg' WHERE id = 10;
UPDATE products SET image_url = '/products/images/product_11.jpg' WHERE id = 11;
UPDATE products SET image_url = '/products/images/water.jpg' WHERE id = 12;
UPDATE products SET image_url = '/products/images/product_13.jpg' WHERE id = 13;
UPDATE products SET image_url = '/products/images/product_14.jpg' WHERE id = 14;
UPDATE products SET image_url = '/products/images/product_15.jpg' WHERE id = 15;
UPDATE products SET image_url = '/products/images/coffee.jpg' WHERE id = 16;
UPDATE products SET image_url = '/products/images/product_17.jpg' WHERE id = 17;
UPDATE products SET image_url = '/products/images/product_18.jpg' WHERE id = 18;
UPDATE products SET image_url = '/products/images/product_19.jpg' WHERE id = 19;
UPDATE products SET image_url = '/products/images/greentea.jpg' WHERE id = 20;
UPDATE products SET image_url = '/products/images/product_21.jpg' WHERE id = 21;
UPDATE products SET image_url = '/products/images/product_22.jpg' WHERE id = 22;
UPDATE products SET image_url = '/products/images/product_23.jpg' WHERE id = 23;
UPDATE products SET image_url = '/products/images/product_24.jpg' WHERE id = 24;
UPDATE products SET image_url = '/products/images/product_25.jpg' WHERE id = 25;
UPDATE products SET image_url = '/products/images/product_26.jpg' WHERE id = 26;
UPDATE products SET image_url = '/products/images/product_27.jpg' WHERE id = 27;
UPDATE products SET image_url = '/products/images/product_28.jpg' WHERE id = 28;
UPDATE products SET image_url = '/products/images/product_29.jpg' WHERE id = 29;
UPDATE products SET image_url = '/products/images/product_30.jpg' WHERE id = 30;
UPDATE products SET image_url = '/products/images/product_31.jpg' WHERE id = 31;
UPDATE products SET image_url = '/products/images/product_32.jpg' WHERE id = 32;
UPDATE products SET image_url = '/products/images/product_33.jpg' WHERE id = 33;
UPDATE products SET image_url = '/products/images/product_34.jpg' WHERE id = 34;
UPDATE products SET image_url = '/products/images/product_35.jpg' WHERE id = 35;

DELETE FROM product_images WHERE product_id BETWEEN 1 AND 35;

INSERT INTO product_images (product_id, image_type, image_url, sort_order) VALUES
  ( 1, 'GALLERY', '/products/images/cola_thumb.jpg', 1),
  ( 1, 'GALLERY', '/products/images/cola_angle_1.jpg', 2),
  ( 1, 'GALLERY', '/products/images/cola_angle_2.jpg', 3),
  ( 2, 'GALLERY', '/products/images/product_2_thumb.jpg', 1),
  ( 2, 'GALLERY', '/products/images/product_2_thumb_2.jpg', 2),
  ( 3, 'GALLERY', '/products/images/product_3_thumb.jpg', 1),
  ( 3, 'GALLERY', '/products/images/product_3_thumb_2.jpg', 2),
  ( 4, 'GALLERY', '/products/images/cider_thumb.jpg', 1),
  ( 4, 'GALLERY', '/products/images/cider_thumb_2.jpg', 2),
  ( 5, 'GALLERY', '/products/images/product_5_thumb.jpg', 1),
  ( 5, 'GALLERY', '/products/images/product_5_thumb_2.jpg', 2),
  ( 6, 'GALLERY', '/products/images/orange_thumb.jpg', 1),
  ( 6, 'GALLERY', '/products/images/orange_angle_1.jpg', 2),
  ( 6, 'GALLERY', '/products/images/orange_angle_2.jpg', 3),
  ( 7, 'GALLERY', '/products/images/product_7_thumb.jpg', 1),
  ( 7, 'GALLERY', '/products/images/product_7_thumb_2.jpg', 2),
  ( 8, 'GALLERY', '/products/images/product_8_thumb.jpg', 1),
  ( 8, 'GALLERY', '/products/images/product_8_thumb_2.jpg', 2),
  ( 9, 'GALLERY', '/products/images/product_9_thumb.jpg', 1),
  ( 9, 'GALLERY', '/products/images/product_9_thumb_2.jpg', 2),
  (10, 'GALLERY', '/products/images/product_10_thumb.jpg', 1),
  (10, 'GALLERY', '/products/images/product_10_thumb_2.jpg', 2),
  (11, 'GALLERY', '/products/images/product_11_thumb.jpg', 1),
  (11, 'GALLERY', '/products/images/product_11_thumb_2.jpg', 2),
  (12, 'GALLERY', '/products/images/water_thumb.jpg', 1),
  (12, 'GALLERY', '/products/images/water_thumb_2.jpg', 2),
  (13, 'GALLERY', '/products/images/product_13_thumb.jpg', 1),
  (13, 'GALLERY', '/products/images/product_13_thumb_2.jpg', 2),
  (14, 'GALLERY', '/products/images/product_14_thumb.jpg', 1),
  (14, 'GALLERY', '/products/images/product_14_thumb_2.jpg', 2),
  (15, 'GALLERY', '/products/images/product_15_thumb.jpg', 1),
  (15, 'GALLERY', '/products/images/product_15_thumb_2.jpg', 2),
  (16, 'GALLERY', '/products/images/coffee_thumb.jpg', 1),
  (16, 'GALLERY', '/products/images/coffee_angle_1.jpg', 2),
  (16, 'GALLERY', '/products/images/coffee_angle_2.jpg', 3),
  (17, 'GALLERY', '/products/images/product_17_thumb.jpg', 1),
  (17, 'GALLERY', '/products/images/product_17_thumb_2.jpg', 2),
  (18, 'GALLERY', '/products/images/product_18_thumb.jpg', 1),
  (18, 'GALLERY', '/products/images/product_18_thumb_2.jpg', 2),
  (19, 'GALLERY', '/products/images/product_19_thumb.jpg', 1),
  (19, 'GALLERY', '/products/images/product_19_thumb_2.jpg', 2),
  (20, 'GALLERY', '/products/images/greentea_thumb.jpg', 1),
  (20, 'GALLERY', '/products/images/greentea_angle_1.jpg', 2),
  (20, 'GALLERY', '/products/images/greentea_angle_2.jpg', 3),
  (21, 'GALLERY', '/products/images/product_21_thumb.jpg', 1),
  (21, 'GALLERY', '/products/images/product_21_thumb_2.jpg', 2),
  (22, 'GALLERY', '/products/images/product_22_thumb.jpg', 1),
  (22, 'GALLERY', '/products/images/product_22_thumb_2.jpg', 2),
  (23, 'GALLERY', '/products/images/product_23_thumb.jpg', 1),
  (23, 'GALLERY', '/products/images/product_23_thumb_2.jpg', 2),
  (24, 'GALLERY', '/products/images/product_24_thumb.jpg', 1),
  (24, 'GALLERY', '/products/images/product_24_thumb_2.jpg', 2),
  (25, 'GALLERY', '/products/images/product_25_thumb.jpg', 1),
  (25, 'GALLERY', '/products/images/product_25_thumb_2.jpg', 2),
  (26, 'GALLERY', '/products/images/product_26_thumb.jpg', 1),
  (26, 'GALLERY', '/products/images/product_26_thumb_2.jpg', 2),
  (27, 'GALLERY', '/products/images/product_27_thumb.jpg', 1),
  (27, 'GALLERY', '/products/images/product_27_thumb_2.jpg', 2),
  (28, 'GALLERY', '/products/images/product_28_thumb.jpg', 1),
  (28, 'GALLERY', '/products/images/product_28_thumb_2.jpg', 2),
  (29, 'GALLERY', '/products/images/product_29_thumb.jpg', 1),
  (29, 'GALLERY', '/products/images/product_29_thumb_2.jpg', 2),
  (30, 'GALLERY', '/products/images/product_30_thumb.jpg', 1),
  (30, 'GALLERY', '/products/images/product_30_thumb_2.jpg', 2),
  (31, 'GALLERY', '/products/images/product_31_thumb.jpg', 1),
  (31, 'GALLERY', '/products/images/product_31_thumb_2.jpg', 2),
  (32, 'GALLERY', '/products/images/product_32_thumb.jpg', 1),
  (32, 'GALLERY', '/products/images/product_32_thumb_2.jpg', 2),
  (33, 'GALLERY', '/products/images/product_33_thumb.jpg', 1),
  (33, 'GALLERY', '/products/images/product_33_thumb_2.jpg', 2),
  (34, 'GALLERY', '/products/images/product_34_thumb.jpg', 1),
  (34, 'GALLERY', '/products/images/product_34_thumb_2.jpg', 2),
  (35, 'GALLERY', '/products/images/product_35_thumb.jpg', 1),
  (35, 'GALLERY', '/products/images/product_35_thumb_2.jpg', 2),
  ( 1, 'DETAIL',  '/products/images/detail/cola_detail.jpg', 1),
  ( 2, 'DETAIL',  '/products/images/detail/product_2_detail.jpg', 1),
  ( 3, 'DETAIL',  '/products/images/detail/product_3_detail.jpg', 1),
  ( 4, 'DETAIL',  '/products/images/detail/cider_detail.jpg', 1),
  ( 5, 'DETAIL',  '/products/images/detail/product_5_detail.jpg', 1),
  ( 6, 'DETAIL',  '/products/images/detail/orange_detail.jpg', 1),
  ( 7, 'DETAIL',  '/products/images/detail/product_7_detail.jpg', 1),
  ( 8, 'DETAIL',  '/products/images/detail/product_8_detail.jpg', 1),
  ( 9, 'DETAIL',  '/products/images/detail/product_9_detail.jpg', 1),
  (10, 'DETAIL',  '/products/images/detail/product_10_detail.jpg', 1),
  (11, 'DETAIL',  '/products/images/detail/product_11_detail.jpg', 1),
  (12, 'DETAIL',  '/products/images/detail/water_detail.jpg', 1),
  (13, 'DETAIL',  '/products/images/detail/product_13_detail.jpg', 1),
  (14, 'DETAIL',  '/products/images/detail/product_14_detail.jpg', 1),
  (15, 'DETAIL',  '/products/images/detail/product_15_detail.jpg', 1),
  (16, 'DETAIL',  '/products/images/detail/coffee_detail.jpg', 1),
  (17, 'DETAIL',  '/products/images/detail/product_17_detail.jpg', 1),
  (18, 'DETAIL',  '/products/images/detail/product_18_detail.jpg', 1),
  (19, 'DETAIL',  '/products/images/detail/product_19_detail.jpg', 1),
  (20, 'DETAIL',  '/products/images/detail/greentea_detail.jpg', 1),
  (21, 'DETAIL',  '/products/images/detail/product_21_detail.jpg', 1),
  (22, 'DETAIL',  '/products/images/detail/product_22_detail.jpg', 1),
  (23, 'DETAIL',  '/products/images/detail/product_23_detail.jpg', 1),
  (24, 'DETAIL',  '/products/images/detail/product_24_detail.jpg', 1),
  (25, 'DETAIL',  '/products/images/detail/product_25_detail.jpg', 1),
  (26, 'DETAIL',  '/products/images/detail/product_26_detail.jpg', 1),
  (27, 'DETAIL',  '/products/images/detail/product_27_detail.jpg', 1),
  (28, 'DETAIL',  '/products/images/detail/product_28_detail.jpg', 1),
  (29, 'DETAIL',  '/products/images/detail/product_29_detail.jpg', 1),
  (30, 'DETAIL',  '/products/images/detail/product_30_detail.jpg', 1),
  (31, 'DETAIL',  '/products/images/detail/product_31_detail.jpg', 1),
  (32, 'DETAIL',  '/products/images/detail/product_32_detail.jpg', 1),
  (33, 'DETAIL',  '/products/images/detail/product_33_detail.jpg', 1),
  (34, 'DETAIL',  '/products/images/detail/product_34_detail.jpg', 1),
  (35, 'DETAIL',  '/products/images/detail/product_35_detail.jpg', 1);

-- 확인 1 : svg 경로가 남아 있으면 안 된다 (0 이 나와야 한다)
SELECT (SELECT COUNT(*) FROM products WHERE image_url NOT LIKE '%.jpg')
     + (SELECT COUNT(*) FROM product_images WHERE image_url NOT LIKE '%.jpg') AS non_jpg_cnt;

