# Địa chỉ Việt Nam

Nguồn: https://provinces.open-api.vn/api/v2/?depth=2
Tài liệu: https://provinces.open-api.vn/api/v2/redoc

Bản tải ngày 27/09/2026 gồm 34 tỉnh/thành và 3.321 đơn vị cấp xã. API v2 sử dụng cấu trúc sau sáp nhập tháng 07/2025; không sử dụng quận/huyện cũ. Đây là snapshot từ nguồn cộng đồng, cần cập nhật khi danh mục hành chính thay đổi.

`vietnamDivisions.ts` giữ mã, tên tỉnh/thành và các phường/xã/đặc khu trực thuộc cho form. Backend có snapshot tương ứng tại `backend/data/vietnam_divisions.json` để tự xác thực mã và lưu tên địa chỉ khi tạo đơn; frontend chỉ gửi mã tỉnh/phường cùng địa chỉ đường phố.

Form lưu `city` = mã tỉnh/thành, `district` = mã phường/xã/đặc khu. Tên District giữ theo yêu cầu giao diện, không chỉ cấp huyện. Đổi tỉnh/thành luôn xóa district; validation và backend đều kiểm tra quan hệ trực thuộc.
