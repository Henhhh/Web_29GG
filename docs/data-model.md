# Database 29GG

Thiết kế chung dùng SQLite, module Python `sqlite3` và SQL trực tiếp. Auth, schema sản phẩm/giỏ/đơn/thanh toán/pickup và seed sản phẩm/pickup đã triển khai. API sản phẩm, giỏ và đơn chưa triển khai. Tạo bảng bằng `schema.sql`, nhập dữ liệu mẫu bằng script seed.

## Thiết kế chi tiết cặp 3 — giỏ, đơn, thanh toán, pickup

Đã viết SQL và seed 4 pickup; chưa viết API cho phần này. Tất cả tiền là INTEGER VNĐ; số lượng là INTEGER > 0 (API phải từ chối boolean trước khi ghi SQLite). Thời gian do backend tạo, API trả ISO 8601 UTC. Chạy `flask --app backend/app.py seed-pickup` bằng Python trong virtual environment để tạo bảng còn thiếu và seed cửa hàng.

SQL kiểm tra khóa ngoại, tính duy nhất, số lượng, tổng tiền và các trường bắt buộc theo ship/pickup. Các kiểm tra liên bảng (subtotal bằng tổng chi tiết, payment.amount bằng orders.total), tồn kho, cửa hàng đang hoạt động và xác minh thanh toán thuộc transaction/API sẽ triển khai sau.

### cart_items

| Trường | Kiểu | Quy tắc |
| --- | --- | --- |
| user_id | INTEGER | Khóa ngoại users.id, bắt buộc |
| product_id | INTEGER | Khóa ngoại products.id, bắt buộc |
| quantity | INTEGER | Bắt buộc, > 0 |

Khóa chính ghép (user_id, product_id). Không lưu giá vào giỏ; mỗi lần đọc lấy giá và stock mới nhất từ products. POST cộng số lượng, PATCH đặt số lượng mới, DELETE xóa. Thêm giỏ không giữ/trừ kho. Khi cập nhật phải kiểm tra tổng số lượng <= stock; giỏ cũ có thể vượt stock sau khi người khác mua nên checkout phải kiểm tra lại. Logout không xóa giỏ trong DB.

### pickup_stores

| Trường | Kiểu | Quy tắc |
| --- | --- | --- |
| id | TEXT | Khóa chính, giữ ID FE hiện tại |
| name | TEXT | Bắt buộc, không rỗng |
| address | TEXT | Bắt buộc, không rỗng |
| active | INTEGER | 0 hoặc 1, mặc định 1 |

| id | name | address |
| --- | --- | --- |
| yen-lang | 29GG — Yên Lãng | 120 Yên Lãng, phường Đống Đa, Hà Nội |
| kim-ma | 29GG — Kim Mã | 300 Kim Mã, phường Giảng Võ, Hà Nội |
| nguyen-thai-hoc | 29GG — Nguyễn Thái Học | 155 Nguyễn Thái Học, phường Tam Thắng, Hồ Chí Minh City |
| hoang-van-thu | 29GG — Hoàng Văn Thụ | 318 Hoàng Văn Thụ, phường Tân Sơn Nhất, Hồ Chí Minh City |

Seed riêng pickup không thay đổi seed sản phẩm hoặc tài khoản; chạy lại không nhân đôi hoặc tự bật lại cửa hàng đã tắt. Cửa hàng đã có đơn không xóa vật lý, chỉ đặt active=0.

### orders

| Trường | Kiểu | Quy tắc |
| --- | --- | --- |
| id | INTEGER | Khóa chính |
| reference | TEXT | UNIQUE, bắt buộc; backend sinh mã đơn |
| user_id | INTEGER | FK users.id; lấy từ JWT |
| full_name, email, phone | TEXT | Bắt buộc; bản chụp thông tin người nhận |
| delivery_method | TEXT | ship hoặc pickup |
| province_code, province_name, ward_code, ward_name, street_address | TEXT hoặc NULL | Bắt buộc khi ship; NULL khi pickup |
| pickup_store_id | TEXT hoặc NULL | FK pickup_stores.id; bắt buộc khi pickup |
| pickup_name, pickup_address | TEXT hoặc NULL | Bản chụp tên/địa chỉ cửa hàng; bắt buộc khi pickup |
| shipping_method | TEXT hoặc NULL | standard/express/overnight khi ship, NULL khi pickup |
| subtotal, shipping_fee, total | INTEGER | >= 0; total = subtotal + shipping_fee |
| status | TEXT | Giai đoạn hiện tại chỉ tạo pending |
| created_at | TEXT | Thời gian UTC do backend tạo |

Thông tin người nhận có thể khác hồ sơ, không tự cập nhật users khi checkout. Backend kiểm tra tên 1–100 ký tự, email hợp lệ tối đa 254 ký tự, phone theo quy tắc hồ sơ, street_address 1–300 ký tự. Backend dùng bản sao dữ liệu địa phương đang có ở frontend để xác minh phường thuộc tỉnh và lấy tên; không tin tên do FE gửi. Không đổi dữ liệu địa phương trong bước này.

### order_items

| Trường | Kiểu | Quy tắc |
| --- | --- | --- |
| id | INTEGER | Khóa chính |
| order_id | INTEGER | FK orders.id, bắt buộc |
| product_id | INTEGER | FK products.id, bắt buộc |
| product_name, product_image | TEXT | Bản chụp tên và đường dẫn ảnh khi mua |
| unit_price | INTEGER | > 0, giá lúc mua |
| quantity | INTEGER | > 0 |

UNIQUE(order_id, product_id). line_total tính bằng unit_price * quantity, không cần cột riêng. Không xóa sản phẩm/đơn/tài khoản khiến mất lịch sử; dùng ON DELETE RESTRICT cho các khóa ngoại lịch sử. Sửa sản phẩm sau này không đổi tên/giá đã lưu trong đơn. product_image lưu đường dẫn, chưa sao lưu nội dung file ảnh.

### payments

| Trường | Kiểu | Quy tắc |
| --- | --- | --- |
| id | INTEGER | Khóa chính |
| order_id | INTEGER | FK orders.id, UNIQUE: một payment/đơn trong phiên bản này |
| method | TEXT | card/banking/cash |
| amount | INTEGER | Bằng orders.total lúc tạo |
| status | TEXT | pending hoặc paid; API khách hiện chỉ tạo pending |
| transaction_reference | TEXT hoặc NULL | UNIQUE nếu có giao dịch thật |
| paid_at | TEXT hoặc NULL | NULL khi pending; thời gian UTC khi paid |

Card chỉ demo, QR chưa có xác minh và Cash chưa thu tiền: tất cả bắt đầu pending. Không nhận/lưu PAN, CVV, hạn thẻ; không trả paid vì FE bấm xác nhận. Chưa có API quản trị thanh toán, webhook, hủy đơn, hoàn tiền hoặc tự chuyển trạng thái vận chuyển. Các trạng thái nâng cao phải được thiết kế cùng thao tác cập nhật và hoàn kho trước khi thêm.

### Giá, phí và transaction checkout

Giữ cấu hình hiện tại: standard 0 đ (5–7 ngày làm việc), express 249750 đ (2–3 ngày), overnight 624750 đ (ngày làm việc tiếp theo). Pickup luôn 0 đ. Đây là cấu hình project, không phải báo giá hãng vận chuyển. Backend là nguồn tính phí chính thức; không thêm quy tắc miễn phí khác trong giai đoạn này.

1. Xác minh JWT và validate body; chỉ lấy các trường cho phép.
2. BEGIN IMMEDIATE; đọc giỏ theo user_id và lấy giá, tồn kho hiện tại.
3. Giỏ trống hoặc thiếu hàng: rollback, không thay đổi giỏ/kho.
4. Tính subtotal/phí/total, tạo orders, order_items và payments pending.
5. Trừ kho có điều kiện stock >= quantity và kiểm tra số dòng cập nhật; xóa giỏ của user sau khi ghi thành công.
6. Commit rồi mới trả thành công. Bất kỳ bước ghi nào lỗi: rollback toàn bộ.

Lần checkout thứ hai sau khi giỏ đã bị xóa trả empty_cart, không tạo thêm đơn. FE khóa nút khi gửi, không tự retry POST; nếu mất response thì tra danh sách đơn. Chưa hỗ trợ Idempotency-Key. Giữ transaction ngắn, không gọi dịch vụ ngoài trong transaction. Hết thời gian chờ khóa DB trả 503 service_unavailable, không báo thành công giả.

## 1. Các bảng

| Bảng | Trường chính | Mục đích |
| --- | --- | --- |
| users | id, username, email, password_hash, full_name, phone | Tài khoản và hồ sơ |
| categories | id, name, slug | 6 danh mục sản phẩm |
| brands | id, name | Hãng sản phẩm |
| products | id, name, category_id, brand_id, price, original_price, image, stock, specs_json, screen_size, refresh_rate, badge | Sản phẩm, thông số và tồn kho |
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

## 4. Thiết kế chi tiết sản phẩm — cặp 2

Phần này đã có schema SQL và seed. Nguồn dữ liệu: `frontend/src/features/products/data/productCatalog.ts`, được chụp lại ở `backend/data/products.json`, gồm 60 sản phẩm, 10 sản phẩm mỗi danh mục.

### categories — danh mục

| Trường | Kiểu SQLite | Quy tắc |
| --- | --- | --- |
| id | INTEGER | Khóa chính |
| name | TEXT | Bắt buộc, không rỗng sau trim; tên hiển thị |
| slug | TEXT | Bắt buộc, duy nhất, chữ thường; dùng trong API |

| slug | name |
| --- | --- |
| mouse | Mouse |
| keyboard | Keyboards |
| headphone | Headphones |
| monitor | Monitors |
| mic | Microphones |
| mousepad | Pads |

`All` chỉ là lựa chọn trên FE, không tạo một dòng trong database.

### brands — hãng

| Trường | Kiểu SQLite | Quy tắc |
| --- | --- | --- |
| id | INTEGER | Khóa chính |
| name | TEXT | Bắt buộc, trim, không rỗng; UNIQUE không phân biệt hoa/thường |

Giữ cách viết tên hãng theo catalog. Nhiều sản phẩm cùng hãng dùng chung brand_id; một hãng có thể có sản phẩm thuộc nhiều danh mục.

### products — sản phẩm

| Trường | Kiểu SQLite | Quy tắc / ý nghĩa |
| --- | --- | --- |
| id | INTEGER | Khóa chính; giữ ID catalog khi seed để không đổi tham chiếu |
| name | TEXT | Bắt buộc, không rỗng; không dùng tên làm ID |
| category_id | INTEGER | Bắt buộc; khóa ngoại tới categories.id |
| brand_id | INTEGER | Bắt buộc; khóa ngoại tới brands.id |
| price | INTEGER | Bắt buộc, > 0; số nguyên VNĐ |
| original_price | INTEGER hoặc NULL | Nếu có: >= price; NULL khi không có giá gốc |
| image | TEXT | Bắt buộc; giữ đường dẫn ảnh catalog, không lưu nhị phân ảnh |
| stock | INTEGER | Bắt buộc, >= 0; 0 là hết hàng |
| specs_json | TEXT | Bắt buộc; JSON hợp lệ chứa mảng chuỗi thông số, giữ thứ tự hiển thị |
| screen_size | REAL hoặc NULL | Kích thước màn hình theo inch, > 0 nếu có |
| refresh_rate | INTEGER hoặc NULL | Tần số quét theo Hz, > 0 nếu có |
| badge | TEXT hoặc NULL | Nhãn card; NULL nếu không sử dụng |

Không áp dụng thông số màn hình cho danh mục khác; dùng NULL thay vì số 0. Không tự đổi giá/ảnh/thông số catalog. Stock NULL từ nguồn phải được xử lý rõ trước khi seed, không tự coi là kho vô hạn.

### product_connections — kiểu kết nối

| Trường | Kiểu SQLite | Quy tắc |
| --- | --- | --- |
| product_id | INTEGER | Khóa ngoại tới products.id |
| connection | TEXT | Bắt buộc; giá trị chuẩn dùng cho bộ lọc |

Khóa chính ghép `(product_id, connection)`. Một sản phẩm nhiều kết nối có nhiều dòng; không có kết nối thì không tạo dòng. Giá trị hiện tại: `Có dây`, `USB`, `USB-C`, `2.4GHz`, `Bluetooth`, `XLR`. FE hiển thị `Có dây` thành `Wired` nhưng gửi giá trị lọc gốc.

### Quan hệ và chuyển dữ liệu

- categories và brands quan hệ một-nhiều với products; products một-nhiều với product_connections.
- Không xóa danh mục/hãng còn sản phẩm tham chiếu; không xóa sản phẩm làm mất lịch sử đơn. Nhóm chưa triển khai API xóa sản phẩm.
- `category` trong catalog → tra slug để lấy category_id; `brand` → tra tên lấy brand_id.
- `specs` → mã hóa thành specs_json; `connections` → các dòng kết nối không trùng.
- `size: '23.8"'` → screen_size 23.8; `refreshRate: '144Hz'` → refresh_rate 144.
- `originalPrice` → original_price; các trường tùy chọn thiếu → NULL. API giải mã specs_json thành mảng specs, không trả chuỗi JSON cho FE tự giải mã.
- Seed phải kiểm tra 60 ID duy nhất, 6 danh mục và khóa ngoại hợp lệ. Chạy lại không nhân đôi; không tự ghi đè tồn kho đã thay đổi bởi đơn hàng. Đây là yêu cầu cho bước viết seed sau.
- Thông số hiển thị và trường lọc phải cùng giá trị. Lọc dùng cột số và bảng kết nối, không phân tích chuỗi mô tả để suy ra hãng/kết nối.
