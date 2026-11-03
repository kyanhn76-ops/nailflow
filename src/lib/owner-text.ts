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
};

export type OwnerText = typeof en;

export const OWNER_TEXT: Record<Language, OwnerText> = { en, vi };