import type { Language } from "./i18n";

const en = {
  staffTitle: "Staff",
  enterPin: "Enter the salon PIN",
  continue: "Continue",
  wrongPin: "Wrong PIN. Please try again.",
  loadFailed: "Could not load the queue. Retrying...",
  loading: "Loading...",
  loadingQueue: "Loading queue...",
  whoAreYou: "Who are you?",
  logOut: "Log out",
  loggedInAs: "Logged in as",
  switchTechnician: "Switch technician",

  currentCustomer: "Your current customer",
  nextCustomer: "Your next customer",
  noCustomersForYou: "No customers waiting for you right now.",
  startBig: "START",
  start: "Start",
  doneBig: "DONE",
  handOverButton: "Hand over to another technician",
  waitingCount: (count: number) => `Waiting (${count})`,
  nobodyWaiting: "Nobody is waiting.",
  changeTechnician: "Change technician",
  noShow: "No-show",
  confirmNoShow: (ticket: number, name: string) => `Mark #${ticket} ${name} as no-show?`,
  otherTechnicians: "Other technicians",
  free: "Free",
  liveUpdates: "Updates automatically",

  waitingMinutes: (minutes: number) => `Waiting ${minutes} min`,
  startedMinutesAgo: (minutes: number) => `Started ${minutes} min ago`,
  aboutMinutes: (minutes: number) => `About ${minutes} min`,
  noServices: "No services",
  askedFor: (name: string) => `Asked for ${name}`,
  note: "Note",
  any: "Any",
  unknown: "Unknown",

  handOverTitle: (ticket: number, name: string) => `Hand over #${ticket} ${name}`,
  noFreeTechnician: "No other technician is free for these services right now.",
  toTechnician: "To technician",
  choose: "Choose...",
  reason: "Reason",
  reasons: {
    customer_request: "Customer asked to change",
    technician_unavailable: "I need to leave / take a break",
    other: "Other reason",
  },
  noteOptional: "Note (optional)",
  confirmHandOver: "Confirm hand over",
  cancel: "Cancel",

  customerWants: "Customer wants",
  firstAvailable: "First available",
  keepsPlace: "The customer keeps their place in the queue.",
  save: "Save",

  errors: {
    "Please finish your current customer first": "Please press DONE for your current customer first.",
    "This customer is no longer waiting": "This customer is no longer waiting.",
    "This customer asked for another technician": "This customer asked for another technician.",
    "This technician cannot do these services": "This technician cannot do these services.",
    "This customer is not being served": "This customer is not being served.",
    "Please choose a different technician": "Please choose a different technician.",
    "This technician is busy with another customer": "This technician is busy with another customer.",
  } as Record<string, string>,
  actionFailed: "Something went wrong. Please try again.",
};

const vi: typeof en = {
  staffTitle: "Nhân viên",
  enterPin: "Nhập mã PIN của tiệm",
  continue: "Tiếp tục",
  wrongPin: "Sai mã PIN. Vui lòng thử lại.",
  loadFailed: "Không tải được hàng chờ. Đang thử lại...",
  loading: "Đang tải...",
  loadingQueue: "Đang tải hàng chờ...",
  whoAreYou: "Bạn là ai?",
  logOut: "Đăng xuất",
  loggedInAs: "Đang đăng nhập",
  switchTechnician: "Đổi người",

  currentCustomer: "Khách bạn đang làm",
  nextCustomer: "Khách tiếp theo của bạn",
  noCustomersForYou: "Hiện chưa có khách nào chờ bạn.",
  startBig: "BẮT ĐẦU",
  start: "Bắt đầu",
  doneBig: "XONG",
  handOverButton: "Chuyển khách cho thợ khác",
  waitingCount: (count: number) => `Đang chờ (${count})`,
  nobodyWaiting: "Không có ai đang chờ.",
  changeTechnician: "Đổi thợ",
  noShow: "Khách bỏ về",
  confirmNoShow: (ticket: number, name: string) =>
    `Xác nhận khách #${ticket} ${name} đã bỏ về?`,
  otherTechnicians: "Các thợ khác",
  free: "Đang rảnh",
  liveUpdates: "Tự động cập nhật",

  waitingMinutes: (minutes: number) => `Đã chờ ${minutes} phút`,
  startedMinutesAgo: (minutes: number) => `Bắt đầu ${minutes} phút trước`,
  aboutMinutes: (minutes: number) => `Khoảng ${minutes} phút`,
  noServices: "Không có dịch vụ",
  askedFor: (name: string) => `Khách chọn thợ ${name}`,
  note: "Ghi chú",
  any: "Bất kỳ",
  unknown: "Không rõ",

  handOverTitle: (ticket: number, name: string) => `Chuyển khách #${ticket} ${name}`,
  noFreeTechnician: "Hiện không có thợ nào khác đang rảnh để làm dịch vụ này.",
  toTechnician: "Chuyển cho thợ",
  choose: "Chọn...",
  reason: "Lý do",
  reasons: {
    customer_request: "Khách muốn đổi thợ",
    technician_unavailable: "Tôi có việc / cần nghỉ",
    other: "Lý do khác",
  },
  noteOptional: "Ghi chú (không bắt buộc)",
  confirmHandOver: "Xác nhận chuyển",
  cancel: "Huỷ",

  customerWants: "Khách muốn",
  firstAvailable: "Ai rảnh trước",
  keepsPlace: "Khách vẫn giữ nguyên số thứ tự.",
  save: "Lưu",

  errors: {
    "Please finish your current customer first": "Bạn cần bấm XONG khách hiện tại trước.",
    "This customer is no longer waiting": "Khách này không còn trong hàng chờ.",
    "This customer asked for another technician": "Khách này đã chọn thợ khác.",
    "This technician cannot do these services": "Thợ này không làm được dịch vụ của khách.",
    "This customer is not being served": "Khách này hiện không có ai đang làm.",
    "Please choose a different technician": "Vui lòng chọn thợ khác.",
    "This technician is busy with another customer": "Thợ này đang bận làm khách khác.",
  },
  actionFailed: "Có lỗi xảy ra, vui lòng thử lại.",
};

export type StaffText = typeof en;

export const STAFF_TEXT: Record<Language, StaffText> = { en, vi };

// Turns an English error from the database into the chosen language
export function translateStaffError(message: string, t: StaffText) {
  const key = Object.keys(t.errors).find((k) => message.includes(k));
  return key ? t.errors[key] : t.actionFailed;
}