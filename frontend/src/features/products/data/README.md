# Dữ liệu sản phẩm

- Nguồn: `ProductCardData.xlsx` do nhóm cung cấp; 6 danh mục, mỗi danh mục 10 sản phẩm.
- Giá lấy trực tiếp từ Excel bằng VND, không quy đổi lại.
- Ô gộp trong Excel được áp dụng cho mọi dòng thuộc vùng gộp; không tự điền thông số ngoài vùng gộp.
- Brand chuẩn hóa từ tiền tố tên sản phẩm (ASUS → Asus, AKKO → Akko); ATK VXE thuộc ATK.
- Ảnh gốc giữ tại `design/product`, bản phục vụ web tại `frontend/public/products`.
- Đã có ảnh GIGABYTE GO27Q24. AKKO 5098B Santorini V3 dùng ảnh có hậu tố Piano Pro do người dùng cung cấp.
- Excel không có tồn kho: theo yêu cầu, frontend đặt tồn kho mẫu từ 10 đến 50 cho mỗi sản phẩm. API phải thay bằng tồn kho thực khi tích hợp.
- Pads có 3 thông số trong Excel; không thêm thông số thứ tư không có nguồn.
- Thông số được giữ theo Excel, chưa đối chiếu thông số kỹ thuật của nhà sản xuất.

Nhập lại từ thư mục project:

```powershell
python frontend/scripts/import_catalog.py "D:\Another Games\ProductCardData.xlsx"
```

Lệnh ghi lại catalog và chép ảnh cùng tên; chỉnh Excel trước khi nhập lại nếu cần sửa dữ liệu.
