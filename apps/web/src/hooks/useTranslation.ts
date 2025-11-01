"use client";

export type Language = "vi";

export const translations = {
  vi: {
    // Header
    tools: "Công cụ",
    pricing: "Bảng giá",
    login: "Đăng nhập",
    signup: "Dùng thử miễn phí",
    logout: "Đăng xuất",
    dashboard: "Dashboard",
    backToDashboard: "Về Dashboard",
    
    // Dashboard
    credits: "credits",
    welcome: "Chào mừng trở lại",
    quickActions: "Thao tác nhanh",
    uploadFiles: "Tải file lên",
    viewHistory: "Lịch sử",
    manageWallet: "Ví tiền",
    settings: "Cài đặt",
    
    // Tools Categories
    aiAudioTools: "Công cụ AI Audio",
    basicAudioTools: "Công cụ Audio cơ bản",
    videoTools: "Công cụ Video",
    
    // Tool Names
    stemSplitter: "Tách nhạc (Stem Splitter)",
    audioEnhance: "Nâng cao chất lượng",
    deReverb: "Khử reverb",
    autoSubtitle: "Tự động phụ đề",
    textToSpeech: "Text to Speech",
    cutJoin: "Cắt/Ghép Audio",
    pitchTempo: "Pitch & Tempo",
    volumeNormalize: "Volume & Normalize",
    onlineRecorder: "Ghi âm Online",
    videoDownloader: "Tải Video",
    
    // Tool Descriptions
    stemSplitterDesc: "Tách vocals, drums, bass, other từ bài hát",
    audioEnhanceDesc: "Nâng cao chất lượng âm thanh với AI",
    deReverbDesc: "Loại bỏ tiếng vang không mong muốn",
    autoSubtitleDesc: "Tự động tạo phụ đề từ video",
    textToSpeechDesc: "Chuyển văn bản thành giọng nói tự nhiên",
    cutJoinDesc: "Cắt, ghép, merge audio files",
    pitchTempoDesc: "Thay đổi cao độ và tốc độ",
    volumeNormalizeDesc: "Điều chỉnh âm lượng và chuẩn hóa",
    onlineRecorderDesc: "Ghi âm trực tiếp từ microphone",
    videoDownloaderDesc: "Tải video từ YouTube, TikTok, etc",
    
    // Admin
    admin: "Admin",
    backToAdmin: "Về Admin",
    systemSettings: "Cài đặt hệ thống",
    maintenanceMode: "Chế độ bảo trì",
    maintenanceMessage: "Thông báo bảo trì",
    toolsEnabled: "Bật/tắt công cụ",
    registrationEnabled: "Cho phép đăng ký",
    saveChanges: "Lưu thay đổi",
    enabled: "Bật",
    disabled: "Tắt",
    
    // Common
    upload: "Tải lên",
    download: "Tải xuống",
    process: "Xử lý",
    cancel: "Hủy",
    save: "Lưu",
    delete: "Xóa",
    edit: "Sửa",
    view: "Xem",
    search: "Tìm kiếm",
    filter: "Lọc",
    export: "Xuất",
    import: "Nhập",
  },
};

export function useTranslation() {
  const t = (key: keyof typeof translations.vi): string => {
    return translations["vi"][key] || key;
  };

  return { t, lang: "vi" as const };
}

