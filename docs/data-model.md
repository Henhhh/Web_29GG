# Database 29GG

Thiết kế đã chốt; chưa phải database đã triển khai. Dùng SQLite, module Python `sqlite3` và SQL trực tiếp. Tạo bảng bằng `schema.sql`, nhập dữ liệu mẫu bằng script seed.

## 1. Các bảng

| Bảng | Trường chính | Mục đích |
| --- | --- | --- |
| users | id, username, email, password_hash, full_name, phone | Tài khoản và hồ sơ |
| categories | id, name, slug | 6 danh mục sản phẩm |
| brands | id, name | Hãng sản phẩm |
| products | id, name, category_id, brand_id, price, original_price, image, stock, specs_json, screen_size, refresh_rate | Sản phẩm, thông số và tồn kho |
| product_connections | product_id, connection | Các kiểu kết nối để lọc |
| cart_items | user_id, product_id, quantity | Giỏ hàng theo tài khoản |
| pickup_stores | id, name, address, active | 4 điểm nhận hàng đã chốt |
| orders | id, reference, user_id, full_name, email, phone, delivery_method, province_code, province_name, ward_code, ward_name, street_address, pickup_store_id, pickup_address, shipping_method, subtotal, shipping_fee, total, status, created_at | Đơn hàng và bản chụp thông tin nhận hàng |
| order_items | id, order_id, product_id, product_name, unit_price, quantity | Chi tiết sản phẩm tại thời điểm mua |
| payments | id, order_id, method, amount, status, transaction_reference, paid_at | Phương thức và trạng thái thanh toán |

## 2. Quan hệ

- Một user có nhiều cart_items và orders.
- Một category hoặc brand có nhiều products.
- Một product có nhiều kiểu kết nối; mỗi dòng giỏ tham chiếu một product.
- Một order có nhiều order_items; mỗi dòng lưu tên và giá sản phẩm lúc mua.
- Order nhận tại cửa hàng tham chiếu một pickup_store. Payment tham chiếu order.
- Dùng khóa ngoại và bật `PRAGMA foreign_keys = ON` trên mỗi kết nối SQLite.

## 3. Quy tắc chung

- ID thông thường là INTEGER; mã tỉnh/phường là TEXT để giữ số 0 đầu. Ảnh lưu đường dẫn, không lưu file ảnh trong database.
- Email và username được trim, chuẩn hóa lowercase và có ràng buộc UNIQUE riêng. Đăng nhập bằng email; username để hiển thị.
- Password tối thiểu 6 ký tự, không trim; chỉ lưu hash bằng `generate_password_hash()`, kiểm tra bằng `check_password_hash()` của Werkzeug.
- JWT dùng cho xác thực, không cần bảng token/session trong phạm vi hiện tại. Không lưu password hoặc hash trong JWT.
- Tiền là INTEGER VNĐ; quantity là INTEGER > 0; stock >= 0. Mỗi cặp user_id/product_id chỉ có một dòng giỏ; mỗi cặp product_id/connection không trùng.
- specs_json phục vụ hiển thị; lọc dùng trường cấu trúc và product_connections, không phân tích chuỗi mô tả.
- Seed 60 sản phẩm hiện tại, danh mục, hãng và 4 điểm pickup đã chốt.
- Home Delivery yêu cầu tỉnh/thành, phường/xã thuộc tỉnh đó và địa chỉ đường; Store Pickup yêu cầu cửa hàng hợp lệ.
- Backend tự đọc giá, kiểm tra tồn kho và tính tổng tiền. Tạo đơn, lưu chi tiết, trừ kho và xóa giỏ trong cùng transaction; lỗi thì rollback toàn bộ.
- Đơn lưu giá, tên sản phẩm và thông tin nhận hàng lúc mua; sửa hồ sơ hoặc sản phẩm không làm đổi lịch sử đơn.
- Trạng thái đơn và thanh toán tách riêng; khi tạo đều là `pending`. Tạo đơn không có nghĩa đã thanh toán.
- Payment method: `card`, `banking`, `cash`. Card là demo, không lưu dữ liệu thẻ; QR Banking chưa xác nhận tự động; Cash chờ thu tiền.
- Chỉ đánh dấu `paid` sau xác minh thanh toán. Mã giao dịch thật phải duy nhất nếu có; thông báo lặp không được ghi nhận hai lần.
- Không xóa lịch sử đơn khi sản phẩm ngừng bán. Không commit file database thật, `.env` hoặc `.venv` lên Git.
