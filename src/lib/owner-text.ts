import type { Language } from "./i18n";

const en = {
  appTitle: "NailFlow for owners",
  signInTitle: "Sign in",
  email: "Email",
  password: "Password",
  signIn: "Sign in",
  signingIn: "Signing in...",
  signInFailed: "Wrong email or password.",
  loading: "Loading...",
  signOut: "Sign out",
  noSalon: "This account is not linked to any salon yet. Please contact NailFlow support.",
  loadFailed: "Could not load your salons. Please try again.",
  chooseSalon: "Choose a salon",
  back: "← Back",
  open: "Open",
  roles: {
    owner: "Owner",
    manager: "Manager",
  } as Record<string, string>,
  comingSoon: "Coming soon",
  sections: {
    today: {
      title: "Today",
      description: "Live queue, technicians at work, restore no-shows, activity log",
    },
    technicians: {
      title: "Technicians",
      description: "Add technicians, lock access, change PINs",
    },
    services: {
      title: "Services & prices",
      description: "Edit services, prices and times",
    },
    reports: {
      title: "Reports",
      description: "Customers, revenue and top technicians",
    },
  },

  technicians: {
    addTitle: "Add a technician",
    name: "Name",
    level: "Level",
    levels: {
      lead: "Lead (can do all services)",
      assistant: "Assistant (gel polish and foot care only)",
    },
    levelShort: {
      lead: "Lead",
      assistant: "Assistant",
    },
    pin: "PIN (6 digits)",
    pinHint: "The technician signs in with this PIN. Each technician needs a different PIN.",
    add: "Add technician",
    adding: "Adding...",
    added: (name: string) => `${name} has been added.`,
    statusBusy: "Serving a customer",
    statusFree: "Free",
    statusLocked: "Locked",
    noPin: "No PIN yet",
    edit: "Edit",
    save: "Save",
    saving: "Saving...",
    cancel: "Cancel",
    changePin: "Change PIN",
    newPin: "New PIN (6 digits)",
    pinChangeNote: "They will be signed out on every device and must use the new PIN.",
    lock: "Lock",
    unlock: "Unlock",
    confirmLock: (name: string) =>
      `Lock ${name}? They will be signed out straight away. If they are serving a customer, that customer goes back to the queue.`,
    confirmUnlock: (name: string) => `Unlock ${name}? They can sign in again with their PIN.`,
    managerReadOnly: "Only the owner can change technicians.",
    empty: "No technicians yet.",
    loadFailed: "Could not load technicians. Please try again.",
    errors: {
      "PIN must be exactly 6 digits": "The PIN must be exactly 6 digits.",
      "Another technician in this salon already uses this PIN":
        "Another technician already uses this PIN. Please choose a different one.",
      "Name is required": "Please enter a name.",
      "Not allowed": "You do not have permission to do this.",
    } as Record<string, string>,
    actionFailed: "Something went wrong. Please try again.",
  },
};

const vi: typeof en = {
  appTitle: "NailFlow cho chủ tiệm",
  signInTitle: "Đăng nhập",
  email: "Email",
  password: "Mật khẩu",
  signIn: "Đăng nhập",
  signingIn: "Đang đăng nhập...",
  signInFailed: "Sai email hoặc mật khẩu.",
  loading: "Đang tải...",
  signOut: "Đăng xuất",
  noSalon: "Tài khoản này chưa được gắn với tiệm nào. Vui lòng liên hệ NailFlow.",
  loadFailed: "Không tải được danh sách tiệm. Vui lòng thử lại.",
  chooseSalon: "Chọn tiệm",
  back: "← Quay lại",
  open: "Mở",
  roles: {
    owner: "Chủ tiệm",
    manager: "Quản lý",
  },
  comingSoon: "Sắp có",
  sections: {
    today: {
      title: "Hôm nay",
      description: "Hàng chờ trực tiếp, thợ đang làm, khôi phục khách bỏ về, nhật ký",
    },
    technicians: {
      title: "Thợ",
      description: "Thêm thợ, khoá quyền vào, đổi mã PIN",
    },
    services: {
      title: "Dịch vụ & giá",
      description: "Sửa dịch vụ, giá và thời gian làm",
    },
    reports: {
      title: "Báo cáo",
      description: "Số khách, doanh thu và thợ làm nhiều nhất",
    },
  },

  technicians: {
    addTitle: "Thêm thợ",
    name: "Tên",
    level: "Cấp độ",
    levels: {
      lead: "Thợ chính (làm được tất cả dịch vụ)",
      assistant: "Thợ phụ (chỉ sơn gel và chăm sóc chân)",
    },
    levelShort: {
      lead: "Thợ chính",
      assistant: "Thợ phụ",
    },
    pin: "Mã PIN (6 số)",
    pinHint: "Thợ dùng mã PIN này để đăng nhập. Mỗi thợ phải có một mã PIN khác nhau.",
    add: "Thêm thợ",
    adding: "Đang thêm...",
    added: (name: string) => `Đã thêm ${name}.`,
    statusBusy: "Đang làm khách",
    statusFree: "Đang rảnh",
    statusLocked: "Đã khoá",
    noPin: "Chưa có PIN",
    edit: "Sửa",
    save: "Lưu",
    saving: "Đang lưu...",
    cancel: "Huỷ",
    changePin: "Đổi PIN",
    newPin: "Mã PIN mới (6 số)",
    pinChangeNote: "Thợ sẽ bị đăng xuất khỏi mọi máy và phải dùng mã PIN mới.",
    lock: "Khoá",
    unlock: "Mở khoá",
    confirmLock: (name: string) =>
      `Khoá ${name}? Thợ sẽ bị đăng xuất ngay lập tức. Nếu đang làm cho khách, khách đó sẽ được đưa về hàng chờ.`,
    confirmUnlock: (name: string) => `Mở khoá ${name}? Thợ có thể đăng nhập lại bằng mã PIN của mình.`,
    managerReadOnly: "Chỉ chủ tiệm mới thay đổi được thông tin thợ.",
    empty: "Chưa có thợ nào.",
    loadFailed: "Không tải được danh sách thợ. Vui lòng thử lại.",
    errors: {
      "PIN must be exactly 6 digits": "Mã PIN phải có đúng 6 số.",
      "Another technician in this salon already uses this PIN":
        "Mã PIN này đã có thợ khác dùng. Vui lòng chọn mã khác.",
      "Name is required": "Vui lòng nhập tên.",
      "Not allowed": "Bạn không có quyền làm việc này.",
    },
    actionFailed: "Có lỗi xảy ra, vui lòng thử lại.",
  },
};

export type OwnerText = typeof en;

export const OWNER_TEXT: Record<Language, OwnerText> = { en, vi };