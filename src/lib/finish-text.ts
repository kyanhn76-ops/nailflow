import type { Language } from "./i18n";

const en = {
  title: "Confirm price",
  fixedPrice: "fixed price",
  fromPrice: (price: string) => `from ${price}`,
  finalPrice: "Final price (£)",
  extraCharge: "Extra charge (£, optional)",
  reason: "Reason",
  chooseReason: "Choose a reason...",
  reasons: {
    long_nails: "Long nails",
    complex_design: "Complex design",
    repair: "Nail repair",
    other: "Other",
  },
  note: "Note (optional)",
  total: "TOTAL",
  payment: "Payment",
  cash: "Cash",
  card: "Card",
  split: "Split",
  cashAmount: "Cash amount (£)",
  cardRemaining: (price: string) => `Card: ${price}`,
  confirm: "Confirm & finish",
  saving: "Saving...",
  cancel: "Cancel",
  loading: "Loading...",
  loadFailed: "Could not load the services. Please try again.",
  customerSees: "The customer will see this receipt on their phone.",
  errors: {
    "Please enter the final price for every service": "Please enter the final price for every service.",
    "Final price cannot be lower than the starting price": "The final price cannot be lower than the starting price.",
    "Final price is too high": "The final price looks too high. Please check it.",
    "Please choose a reason for the extra charge": "Please choose a reason for the extra charge.",
    "Cash and card must add up to the total": "Cash and card must add up to the total.",
    "You can only finish your own customer": "You can only finish your own customer.",
    "This customer is not being served": "This customer is not being served.",
    "Session expired": "You have been signed out. Please enter your PIN again.",
  } as Record<string, string>,
  actionFailed: "Something went wrong. Please try again.",
};

const vi: typeof en = {
  title: "Chốt giá",
  fixedPrice: "giá cố định",
  fromPrice: (price: string) => `từ ${price}`,
  finalPrice: "Giá thật (£)",
  extraCharge: "Phụ thu (£, không bắt buộc)",
  reason: "Lý do",
  chooseReason: "Chọn lý do...",
  reasons: {
    long_nails: "Móng dài",
    complex_design: "Mẫu phức tạp",
    repair: "Sửa móng gãy",
    other: "Khác",
  },
  note: "Ghi chú (không bắt buộc)",
  total: "TỔNG",
  payment: "Thanh toán",
  cash: "Tiền mặt",
  card: "Thẻ",
  split: "Chia đôi",
  cashAmount: "Số tiền mặt (£)",
  cardRemaining: (price: string) => `Thẻ: ${price}`,
  confirm: "Xác nhận XONG",
  saving: "Đang lưu...",
  cancel: "Huỷ",
  loading: "Đang tải...",
  loadFailed: "Không tải được dịch vụ. Vui lòng thử lại.",
  customerSees: "Khách sẽ thấy hoá đơn này trên điện thoại.",
  errors: {
    "Please enter the final price for every service": "Vui lòng nhập giá thật cho tất cả dịch vụ.",
    "Final price cannot be lower than the starting price": "Giá thật không được thấp hơn giá khởi điểm.",
    "Final price is too high": "Giá có vẻ quá cao. Vui lòng kiểm tra lại.",
    "Please choose a reason for the extra charge": "Vui lòng chọn lý do phụ thu.",
    "Cash and card must add up to the total": "Tiền mặt và thẻ cộng lại phải bằng tổng tiền.",
    "You can only finish your own customer": "Bạn chỉ bấm XONG được cho khách của mình.",
    "This customer is not being served": "Khách này hiện không có ai đang làm.",
    "Session expired": "Bạn đã bị đăng xuất. Vui lòng nhập lại mã PIN.",
  },
  actionFailed: "Có lỗi xảy ra, vui lòng thử lại.",
};

export type FinishText = typeof en;

export const FINISH_TEXT: Record<Language, FinishText> = { en, vi };

export function translateFinishError(message: string, t: FinishText) {
  const key = Object.keys(t.errors).find((k) => message.includes(k));
  return key ? t.errors[key] : t.actionFailed;
}