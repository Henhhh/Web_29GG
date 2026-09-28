# API 29GG

Hợp đồng giữa React và Flask; chưa phải API đã triển khai. Base path `/api`, JSON dùng `snake_case`, tiền là số nguyên VNĐ. Frontend ánh xạ sang model TypeScript khi cần.

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
