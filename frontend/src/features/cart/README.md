# Frontend giỏ hàng và checkout

Các màn hình demo riêng đã được bỏ. `src/App.tsx` ghép Header, Hero, danh sách sản phẩm, tài khoản, giỏ hàng và checkout thành trang shop.

- `models/cartModel.ts`: kiểu dữ liệu, thêm sản phẩm, số lượng và tổng tiền.
- `components/`: CartDrawer, CartItem, CartSummary, EmptyCart.
- `../checkout/models/checkoutModel.ts`: form, phí vận chuyển, validation, tổng tiền và biên nhận.
- `../checkout/components/`: từng phần form; CheckoutModal giữ form, gọi onComplete sau khi tạo biên nhận.
- `../../components/ui/Overlay.tsx` và `commerce.css`: lớp phủ, khóa cuộn, bàn phím và CSS chung.
- Product cards receive catalog entries from `../products/productsApi.ts`; cart state is still a frontend demo and is not persisted to the backend.

## Kiểm tra

Chạy `npm run dev` tại frontend. Thử tìm sản phẩm, đổi danh mục và bộ lọc. Nhấn + Cart khi chưa đăng nhập: mở Login; đăng nhập thành công tự thêm sản phẩm đã chọn. Giỏ trong Header dùng cùng state với ProductGrid.

Mở giỏ: đổi số lượng, xóa sản phẩm, Checkout. Tên/email lấy từ tài khoản. Standard miễn phí; Express 249.750 ₫; Overnight 624.750 ₫; pickup miễn phí. Cash cho phép thử nhanh; thẻ chỉ dùng số thử 4242 4242 4242 4242, hạn tương lai và CVV 123. Tạo đơn xong giỏ trống, biên nhận vẫn giữ đúng tổng tiền.

## Trạng thái tích hợp

Tài khoản và catalog đã gọi API Flask. Giỏ vẫn lưu trong bộ nhớ (reload sẽ xóa), checkout chưa ghi đơn vào database, gửi email hay thu tiền. Không lưu thông tin thẻ. Khi cặp 3 hoàn thiện API, chỉ xóa giỏ sau khi server xác nhận; server phải kiểm tra lại giá và tồn kho. Nội dung chính sách/footer chưa được cung cấp. Ảnh và font đang tải từ nguồn ngoài như source Figma.

Giá sản phẩm, phí vận chuyển và tổng tiền dùng VND (số nguyên đồng). Dữ liệu mẫu được quy đổi cố định 1 USD = 25.000 VND, không phải tỷ giá trực tiếp. API sau này cần trả giá bằng VND, không quy đổi thêm ở frontend.
