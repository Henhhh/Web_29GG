# API 29GG

Hợp đồng giữa React và Flask. Base path `/api`, JSON dùng `snake_case`, tiền là số nguyên VNĐ. Frontend ánh xạ sang model TypeScript khi cần. Auth, catalog, giỏ, pickup và đơn hàng đã triển khai.

## 1. Xác thực và định dạng

- Đăng nhập bằng email/password. Thành công trả `{ "data": { "token": "...", "user": { "id": 1, "username": "player", "email": "player@example.com", "full_name": "", "phone": "" } } }`.
- API riêng tư nhận header `Authorization: Bearer <token>`. JWT phải có hạn dùng; backend xác minh chữ ký và hạn dùng. Thời lượng cụ thể sẽ cấu hình khi triển khai.
- Token thiếu, sai hoặc hết hạn trả 401. Frontend xóa token hết hạn và yêu cầu đăng nhập lại.
- Logout xóa token phía frontend, không có API logout ở phiên bản này; chưa thu hồi được token đã sao chép trước khi hết hạn.
- Backend lấy user_id từ JWT; không nhận danh tính người dùng từ body. Chỉ truy cập hồ sơ, giỏ và đơn của mình; đơn không thuộc tài khoản trả 404.
- Thành công trả `{ "data": ... }`; riêng 204 không có body. API tạo tài nguyên trả 201, kèm Location tới tài nguyên khi phù hợp.
- Lỗi luôn có cùng cấu trúc; `code` để FE xử lý, `message` để hiển thị, `details` để hiện lỗi theo ô nhập. Không trả password/hash.

```json
{
  "error": {
    "code": "validation_failed",
    "message": "Please check your information.",
    "details": {
      "email": "Please enter a valid email address.",
      "password": "Password must contain at least 6 characters."
    }
  }
}
```

## 2. Endpoint

Các URL dưới đây đều có tiền tố `/api`.

| Method | URL | Gửi gì | Trả gì | Cần đăng nhập? |
| --- | --- | --- | --- | --- |
| POST | /auth/register | username, email, password | 201, user; chuyển sang login | Không |
| POST | /auth/login | email, password | 200, token và user | Không |
| GET | /me | — | 200, user hiện tại | Có |
| PATCH | /me | full_name, phone cần sửa | 200, user cập nhật | Có |
| GET | /products | Query tìm kiếm/lọc bên dưới | 200, data: {items, total, page, page_size} | Không |
| GET | /products/{id} | ID trong URL | 200, sản phẩm | Không |
| GET | /categories | — | 200, danh mục | Không |
| GET | /brands | — | 200, hãng | Không |
| GET | /pickup-stores | — | 200, 4 điểm nhận hàng | Không |
| GET | /cart | — | 200, items và subtotal | Có |
| POST | /cart/items | product_id, quantity cần thêm | 200 nếu tăng dòng có sẵn; 201 nếu tạo dòng mới; trả giỏ cập nhật | Có |
| PATCH | /cart/items/{product_id} | quantity mới | 200, giỏ cập nhật | Có |
| DELETE | /cart/items/{product_id} | ID trong URL | 204 | Có |
| POST | /orders | Thông tin checkout bên dưới | 201, đơn và trạng thái thanh toán | Có |
| GET | /orders | page, page_size | 200, items, total, page, page_size | Có |
| GET | /orders/{id} | ID trong URL | 200, chi tiết đơn của mình | Có |

**Lọc sản phẩm:** `q`, `category`, `brand`, `connection`, `screen_size`, `refresh_rate`, `min_price`, `max_price`, `max_price_exclusive`, `page`, `page_size`. Nhiều giá trị cùng nhóm dùng query lặp và OR; khác nhóm dùng AND. Giá tự nhập bao gồm hai đầu mút; khoảng chọn sẵn dùng max_price_exclusive (không gồm đầu trên), không gửi cùng max_price. page mặc định 1, page_size mặc định 12, tối đa 100; sắp xếp ổn định theo id.

**Tạo đơn:** gửi `full_name`, `email`, `phone`, `delivery_method` (ship/pickup), `payment_method` (card/banking/cash). Ship thêm `province_code`, `ward_code`, `street_address`, `shipping_method`; pickup thêm `pickup_store_id`. Backend lấy sản phẩm từ giỏ và tự tính giá/phí, không tin tổng tiền từ FE. Response gồm reference, items, subtotal, shipping_fee, total, status, payment_status và thông tin nhận hàng. Không gửi dữ liệu thẻ demo.

### Hợp đồng sản phẩm chi tiết (đã triển khai)

GET /api/products/{id} trả object dưới đây trong `data`; GET /api/products trả cùng cấu trúc cho mỗi phần tử `data.items`:

```json
{
  "data": {
    "id": 101,
    "name": "Logitech G102 Lightsync",
    "category_id": 1,
    "category": "mouse",
    "brand_id": 1,
    "brand": "Logitech",
    "price": 399000,
    "original_price": null,
    "image": "/products/Mouse/Logitech%20G102%20LightSync.jpg",
    "stock": 20,
    "specs": ["Connection type: Wired", "DPI (max): 8000", "Weight (g): 85", "Dimensions (mm): 116.6 x 62.15 x 38.2"],
    "connections": ["Có dây"],
    "screen_size": null,
    "refresh_rate": null,
    "badge": null
  }
}
```

category_id/brand_id trong ví dụ là minh họa; seed quyết định ID thực. `category` là slug, `brand` là tên hãng. Các trường tùy chọn luôn trả NULL khi thiếu; connections luôn là mảng (có thể rỗng), specs là mảng chuỗi. stock là số nguyên, không NULL.

- GET /api/categories trả `data: [{id, name, slug}, ...]`; GET /api/brands trả `data: [{id, name}, ...]`. Sắp xếp theo id để kết quả ổn định.
- q tìm trong tên sản phẩm, tên danh mục, tên hãng và thông số; trim, không phân biệt hoa/thường. Không hứa tìm không dấu ở phiên bản này.
- category nhận slug; brand nhận tên hãng; connection nhận giá trị gốc (ví dụ `Có dây`); screen_size nhận số inch (23.8), refresh_rate nhận số Hz (144), không kèm đơn vị.
- FE dùng URLSearchParams để mã hóa tên hãng/kết nối. Nhiều lựa chọn dùng query lặp, ví dụ `brand=Logitech&brand=Razer`.
- page/page_size là số nguyên dương; page_size <= 100. Giá là số nguyên >= 0; screen_size là số dương, refresh_rate là số nguyên dương. Sai kiểu/phạm vi, min > max hoặc gửi cả hai kiểu max trả 422 validation_failed với details theo tên tham số.
- Không tìm thấy kết quả lọc: 200, items rỗng, total 0. Page vượt cuối: items rỗng nhưng total vẫn là tổng số sản phẩm khớp trước phân trang. Chi tiết ID không tồn tại: 404 not_found.
- Truy vấn kết nối nhiều giá trị không được nhân đôi sản phẩm hoặc làm sai total; tính total trước LIMIT/OFFSET.
- FE ánh xạ category slug sang nhãn hiện tại; original_price → originalPrice, screen_size → size có dấu inch, refresh_rate → refreshRate có Hz. NULL → undefined cho các trường tùy chọn của model FE.
- Các API trên công khai, không yêu cầu JWT. Chưa bổ sung API quản trị sản phẩm trong phạm vi này.

### Hợp đồng cặp 3 — đã triển khai

GET /api/cart và POST/PATCH giỏ trả cùng dạng dưới đây. Giỏ trống trả items=[], subtotal=0. Tất cả API giỏ/đơn dùng auth: true; pickup công khai.

```json
{
  "data": {
    "items": [{"product_id": 101, "name": "Logitech G102 Lightsync", "image": "/products/Mouse/Logitech%20G102%20LightSync.jpg", "unit_price": 399000, "quantity": 2, "stock": 20, "line_total": 798000}],
    "subtotal": 798000
  }
}
```

- POST /cart/items nhận {product_id, quantity}; product_id và quantity là số nguyên dương. Cộng quantity vào dòng hiện có; tạo mới trả 201 và Location `/api/cart/items/{product_id}`, cộng dòng cũ trả 200.
- PATCH /cart/items/{product_id} nhận {quantity}, thay số lượng. Không dùng quantity=0 để xóa; số lượng 0 trả 422 validation_failed.
- DELETE /cart/items/{product_id}: 204 không body. Dòng không có trong giỏ user hiện tại: 404 not_found (kể cả sản phẩm có trong giỏ user khác).
- Sản phẩm không tồn tại: 404; tổng số lượng yêu cầu vượt stock: 409 out_of_stock, không sửa dòng giỏ. Lỗi thiếu kho có details dạng map chuỗi, ví dụ {"product_101":"Only 1 item is available."}.
- GET giỏ không tự giảm/xóa số lượng nếu stock thay đổi; trả stock mới nhất để FE hiển thị và chặn checkout. Giá trên giỏ là giá hiện tại, không khóa giá khi thêm.
- GET /pickup-stores trả data là mảng {id, name, address}, chỉ active=1, theo thứ tự seed. id là chuỗi yen-lang/kim-ma/nguyen-thai-hoc/hoang-van-thu.

**POST /orders — ví dụ giao tận nhà:**

```json
{
  "full_name": "Nguyen Van A",
  "email": "player@example.com",
  "phone": "0977205458",
  "delivery_method": "ship",
  "province_code": "<ma tinh trong du lieu dia phuong>",
  "ward_code": "<ma phuong thuoc tinh da chon>",
  "street_address": "120 Yen Lang",
  "shipping_method": "standard",
  "payment_method": "banking"
}
```

Mã trong ví dụ là placeholder, phải thay bằng mã thật từ dữ liệu địa phương. Với pickup, bỏ các trường ship và gửi delivery_method=pickup, pickup_store_id=yen-lang. Backend bỏ qua trường của phương thức giao hàng không được chọn và lưu NULL; không tin user_id, items, total, status hoặc payment_status do client thêm vào. Không gửi thông tin thẻ.

Tạo thành công: 201, Location `/api/orders/{id}`. `data` gồm:

| Trường | Kiểu / ý nghĩa |
| --- | --- |
| id, reference, created_at | ID số, mã đơn chuỗi, thời gian ISO 8601 UTC |
| full_name, email, phone | Thông tin liên hệ đã lưu |
| delivery_method | ship/pickup |
| province_code, province_name, ward_code, ward_name, street_address, shipping_method | Chuỗi khi ship, null khi pickup |
| pickup_store_id, pickup_name, pickup_address | Chuỗi khi pickup, null khi ship |
| items | Mảng {product_id, product_name, product_image, unit_price, quantity, line_total} |
| subtotal, shipping_fee, total | Số nguyên VNĐ do backend tính |
| status | pending |
| payment_method, payment_status | card/banking/cash và pending |

GET /orders/{id} trả cùng cấu trúc, lấy snapshot đã lưu thay vì giá/tên hiện tại. Đơn không tồn tại hoặc không thuộc user: cùng 404 not_found.

GET /orders?page=1&page_size=12 trả data: {items, total, page, page_size}. Mỗi item là tóm tắt {id, reference, created_at, total, status, payment_method, payment_status, delivery_method, item_count}; item_count là tổng số lượng. Chỉ lấy đơn của user, sắp id giảm dần. page/page_size dùng quy tắc phân trang sản phẩm; vượt cuối trả items rỗng. FE My Orders có thể bổ sung sau, backend vẫn lưu đủ dữ liệu và cung cấp API đọc.

**Validation và kiểm thử bàn giao:**

- Liên hệ sai/quantity sai: 422 validation_failed, details theo tên trường. Giỏ trống: 422 empty_cart. Tỉnh/phường không khớp, địa chỉ thiếu, shipping_method sai hoặc cửa hàng không active: 422 invalid_delivery. payment_method sai: 422 validation_failed.
- Phí giữ cấu hình checkout hiện tại: standard=0, express=249750, overnight=624750 VNĐ; pickup=0. Giá do backend đọc tại checkout. FE hiển thị lại total từ response, không coi tổng đang hiển thị là giá đã khóa.
- Khóa nút khi gửi, không tự retry POST đặt hàng. Mất response cần xem GET /orders trước khi thử lại. Chưa có cơ chế idempotency key.
- Hết thời gian chờ khóa SQLite: 503 service_unavailable với lỗi JSON chung; không để lộ SQL/stack trace.
- Test: giỏ riêng từng user; POST cộng/PATCH thay; 204 không JSON; vượt tồn kho; ship/pickup hợp lệ/sai; giả mạo giá/user_id/trạng thái; rollback khi ghi lỗi; đặt hàng đồng thời không âm kho; seed pickup lặp; lịch sử giá giữ nguyên; mọi payment mới pending; order ID của user khác trả 404.
- Phụ trách: cặp 3 viết routes/cart.py, routes/orders.py, test và FE cartApi/ordersApi; ghép schema/seed qua người tích hợp. Dùng require_user, g.user, get_db và apiRequest sẵn có.

## 3. Lỗi và kiểm tra

| Tình huống | HTTP | code | Thông báo |
| --- | --- | --- | --- |
| Body không phải JSON object hợp lệ | 400 | bad_json | Invalid JSON body. |
| Thiếu trường, sai kiểu, email sai định dạng, password dưới 6 ký tự | 422 | validation_failed | Please check your information. (details chứa các trường sai) |
| Email chưa đăng ký hoặc password không khớp | 401 | invalid_credentials | Email or password is incorrect. |
| JWT thiếu, sai hoặc hết hạn | 401 | unauthenticated | Please log in again. |
| Đăng ký trùng email | 409 | email_already_registered | An account with this email already exists. |
| Đăng ký trùng username | 409 | username_taken | This username is already taken. |
| Không tìm thấy tài nguyên được phép truy cập | 404 | not_found | Resource not found. |
| Không đủ tồn kho | 409 | out_of_stock | Not enough stock. |
| Giỏ trống | 422 | empty_cart | Your cart is empty. |
| Địa chỉ hoặc pickup không hợp lệ | 422 | invalid_delivery | Please check your delivery information. |
| Quá nhiều lần thử đăng nhập | 429 | too_many_requests | Please try again later. |

- Kiểm tra định dạng/độ dài trước khi đối chiếu tài khoản. Hai trường hợp thông tin đăng nhập không khớp trả cùng code, message và details rỗng.
- Đăng ký trùng email bị từ chối dù password giống hay khác; nếu trùng cả email và username, ưu tiên lỗi email.
- Dùng pytest + Flask test_client: kiểm tra thành công, lỗi trong bảng, token hết hạn, truy cập dữ liệu người khác và thiếu kho; mỗi test dùng database riêng.
- SQL dùng tham số `?`; chỉ nhận các trường cho phép. Secret từ biến môi trường, không hardcode. Chạy test trên push/PR; production dùng HTTPS và tắt debug.

## Auth implementation notes

JWT TTL: 7200 seconds (2 hours). Frontend keeps the token in memory only; reload requires login.
Password length: 6-128 characters. Username: 1-80 characters.
Login limit: 10 valid-format attempts per email and client IP per 15 minutes, stored in SQLite login_limits.
Implemented: /api/auth/register, /api/auth/login, GET/PATCH /api/me, GET /api/health.
Product catalog endpoints are implemented and covered by `backend/tests/test_products_api.py`.
Cart, pickup, checkout and order history endpoints are implemented. See backend/README.md for setup.

## Shared frontend client

Use frontend/src/services/apiClient.ts: apiRequest(path, options) returns data directly; 204 returns undefined.
Set auth: true only for private endpoints. Public login 401 does not clear an existing token.
ApiError exposes message, details, status and code. Token is managed by tokenStore.ts in memory.
Auth endpoint wrappers are in features/auth/authApi.ts; useAuth manages React user state.
