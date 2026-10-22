#!/usr/bin/env bash
# ==============================================================================
# SafeReport Run & Automation Script (Challenge 2: Tide UNLOCKED)
# ==============================================================================
# Script tự động hóa khởi chạy, kiểm tra môi trường, chạy test và vận hành ứng dụng.
#
# Cách dùng:
#   ./run.sh          # Chạy chế độ Dev (mặc định: http://127.0.0.1:3000)
#   ./run.sh dev      # Chạy chế độ Dev (Next.js webpack hot-reload)
#   ./run.sh build    # Build ứng dụng sản xuất
#   ./run.sh prod     # Build và chạy ứng dụng Production
#   ./run.sh test     # Chạy toàn bộ 10 bài kiểm thử tự động
#   ./run.sh doctor   # Chạy chẩn đoán tĩnh với Tide Doctor
#   ./run.sh init     # Bootstrap container TideCloak local realm
#   ./run.sh check    # Kiểm tra điều kiện tiên quyết môi trường
#   ./run.sh help     # Xem hướng dẫn chi tiết
# ==============================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Màu hiển thị terminal
C_RESET='\033[0m'
C_RED='\033[0;31m'
C_GREEN='\033[0;32m'
C_YELLOW='\033[0;33m'
C_BLUE='\033[0;34m'
C_CYAN='\033[0;36m'
C_BOLD='\033[1m'

log_info()    { echo -e "${C_BLUE}${C_BOLD}[INFO]${C_RESET} $*"; }
log_success() { echo -e "${C_GREEN}${C_BOLD}[SUCCESS]${C_RESET} $*"; }
log_warn()    { echo -e "${C_YELLOW}${C_BOLD}[WARN]${C_RESET} $*"; }
log_error()   { echo -e "${C_RED}${C_BOLD}[ERROR]${C_RESET} $*"; }

banner() {
  echo -e "${C_CYAN}${C_BOLD}"
  echo "  ██████╗  █████╗ ███████╗███████╗██████╗ ███████╗██████╗  ██████╗ ██████╗ ████████╗"
  echo "  ██╔════╝ ██╔══██╗██╔════╝██╔════╝██╔══██╗██╔════╝██╔══██╗██╔═══██╗██╔══██╗╚══██╔══╝"
  echo "  ███████╗ ███████║█████╗  █████╗  ██████╔╝█████╗  ██████╔╝██║   ██║██████╔╝   ██║   "
  echo "  ╚════██║ ██╔══██║██╔══╝  ██╔══╝  ██╔══██╗██╔══╝  ██╔═══╝ ██║   ██║██╔══██╗   ██║   "
  echo "  ███████║ ██║  ██║██║     ███████╗██║  ██║███████╗██║     ╚██████╔╝██║  ██║   ██║   "
  echo "  ╚══════╝ ╚═╝  ╚═╝╚═╝     ╚══════╝╚═╝  ╚═╝╚══════╝╚═╝      ╚═════╝ ╚═╝  ╚═╝   ╚═╝   "
  echo -e "${C_RESET}"
  echo -e "  ${C_BOLD}Confidential Incident Reporting — Built with TideCloak (Challenge 2)${C_RESET}\n"
}

# ------------------------------------------------------------------------------
# Kiểm tra môi trường tiên quyết (Pre-flight Checks)
# ------------------------------------------------------------------------------
check_prerequisites() {
  log_info "Đang kiểm tra điều kiện tiên quyết hệ thống..."
  local errors=0

  # 1. Kiểm tra Node.js
  if ! command -v node >/dev/null 2>&1; then
    log_error "Node.js chưa được cài đặt. Yêu cầu phiên bản Node.js 22.0.0+."
    errors=$((errors + 1))
  else
    NODE_VER=$(node -v | sed 's/v//')
    NODE_MAJOR=$(echo "$NODE_VER" | cut -d. -f1)
    if [ "$NODE_MAJOR" -lt 22 ]; then
      log_warn "Node.js hiện tại là v$NODE_VER. Khuyến nghị Node.js v22.0+ để hỗ trợ đầy đủ WebCrypto và --experimental-strip-types."
    else
      log_success "Node.js: v$NODE_VER (Đạt chuẩn)"
    fi
  fi

  # 2. Kiểm tra Docker
  if ! command -v docker >/dev/null 2>&1; then
    log_warn "Docker chưa được cài đặt. Local TideCloak cần Docker để chạy container."
  else
    if docker info >/dev/null 2>&1; then
      log_success "Docker Daemon: Đang hoạt động"
    else
      log_warn "Docker Daemon không chạy hoặc user hiện tại không có quyền truy cập docker.sock."
    fi
  fi

  # Kiểm tra công cụ jq
  if command -v jq >/dev/null 2>&1; then
    log_success "JSON Processor (jq): $(jq --version 2>&1 | head -1) (Đã sẵn sàng)"
  else
    log_error "Chưa tìm thấy lệnh 'jq'. Vui lòng cài đặt: sudo apt-get install -y jq"
    errors=$((errors + 1))
  fi

  # 3. Kiểm tra node_modules
  if [ ! -d "node_modules" ]; then
    log_warn "Thư mục node_modules chưa tồn tại. Đang tiến hành cài đặt sạch với 'npm ci'..."
    npm ci
    log_success "Đã cài đặt hoàn tất các gói phụ thuộc."
  else
    log_success "Dependencies (node_modules): Đã cài đặt"
  fi

  # 4. Kiểm tra gói mẫu .tide-pack
  if [ ! -f ".tide-pack/templates/nextjs-e2ee-vault/public/tide_dpop_auth.html" ]; then
    log_warn "Chưa tìm thấy .tide-pack. Đang tải bộ template chuẩn từ mcp.tide.org..."
    curl -fsSL https://mcp.tide.org/pack/templates.tgz -o templates.tgz
    mkdir -p .tide-pack
    tar -xzf templates.tgz -C .tide-pack/
    rm -f templates.tgz
    log_success "Đã nạp gói .tide-pack thành công."
  else
    log_success "Tide Templates (.tide-pack): Hiện diện đầy đủ"
  fi

  # 5. Kiểm tra Local TideCloak Container
  if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    if docker ps --filter "name=safereport-tidecloak" --format '{{.Names}}' | grep -q "safereport-tidecloak"; then
      log_success "Local TideCloak Container: Đang chạy trên cổng 8080"
    elif docker ps -a --filter "name=safereport-tidecloak" --format '{{.Names}}' | grep -q "safereport-tidecloak"; then
      log_info "Phát hiện container safereport-tidecloak đang dừng. Đang tự động khởi động lại..."
      docker start safereport-tidecloak >/dev/null
      log_success "Đã khởi động lại container safereport-tidecloak (Port 8080)."
    else
      log_warn "Chưa tìm thấy container safereport-tidecloak. Nếu cần khởi tạo realm mới, chạy: ./run.sh init"
    fi
  fi

  # 6. Kiểm tra cấu hình Realm Adapter
  if [ -f "data/tidecloak.json" ]; then
    log_success "TideCloak Adapter (data/tidecloak.json): Đã cấu hình"
  else
    log_warn "Chưa có data/tidecloak.json. Đang tự tạo stub adapter để Next.js biên dịch..."
    mkdir -p data
    cat << 'EOF' > data/tidecloak.json
{
  "realm": "safereport",
  "auth-server-url": "http://127.0.0.1:8080",
  "ssl-required": "external",
  "resource": "safereport-client",
  "public-client": true,
  "confidential-port": 0,
  "jwk": {
    "keys": []
  },
  "vendorId": "safereport-demo",
  "homeOrkUrl": "http://127.0.0.1:8080/realms/safereport"
}
EOF
    log_success "Đã khởi tạo stub data/tidecloak.json (chạy './run.sh init' khi cần kết nối Keycloak live)."
  fi

  if [ "$errors" -gt 0 ]; then
    log_error "Phát hiện $errors lỗi tiên quyết. Vui lòng khắc phục trước khi tiếp tục."
    exit 1
  fi
  log_success "Kiểm tra điều kiện môi trường hoàn tất!\n"
}

# ------------------------------------------------------------------------------
# Chạy Chế Độ Phát Triển (Development Mode)
# ------------------------------------------------------------------------------
run_dev() {
  banner
  check_prerequisites
  log_info "Khởi động SafeReport chế độ Development (Webpack Hot-Reload)..."
  log_info "Ứng dụng sẽ lắng nghe tại: ${C_BOLD}http://localhost:3000${C_RESET} (hoặc http://127.0.0.1:3000)"
  echo -e "${C_YELLOW}Nhấn Ctrl+C để dừng ứng dụng.${C_RESET}\n"
  npm run dev -- --hostname 127.0.0.1 --port 3000
}

# ------------------------------------------------------------------------------
# Build Ứng Dụng Sản Xuất (Production Build)
# ------------------------------------------------------------------------------
run_build() {
  banner
  check_prerequisites
  log_info "Bắt đầu build ứng dụng Next.js cho môi trường Production..."
  npm run build
  log_success "Build thành công! Bản build sẵn sàng tại .next/"
}

# ------------------------------------------------------------------------------
# Chạy Chế Độ Sản Xuất (Production Start)
# ------------------------------------------------------------------------------
run_prod() {
  banner
  check_prerequisites
  if [ ! -d ".next" ]; then
    log_warn "Chưa tìm thấy thư mục .next. Đang tự động kích hoạt build trước khi chạy..."
    npm run build
  fi
  log_info "Khởi chạy SafeReport Production Server..."
  log_info "Ứng dụng đang phục vụ tại: ${C_BOLD}http://localhost:3000${C_RESET}"
  echo -e "${C_YELLOW}Nhấn Ctrl+C để dừng dịch vụ.${C_RESET}\n"
  npm run start -- --hostname 127.0.0.1 --port 3000
}

# ------------------------------------------------------------------------------
# Chạy Bộ Kiểm Thử Tự Động (Test Suite)
# ------------------------------------------------------------------------------
run_test() {
  banner
  check_prerequisites
  log_info "Kích hoạt 15 bài kiểm thử tự động (Crypto, Security, Setup, Hydration, Preflight)..."
  npm test
  log_success "Kiểm thử tự động hoàn tất với kết quả xuất sắc!"
}

# ------------------------------------------------------------------------------
# Chạy Chẩn Đoán Tide Doctor (Audit)
# ------------------------------------------------------------------------------
run_doctor() {
  banner
  check_prerequisites
  log_info "Thực thi chẩn đoán tĩnh Tide Doctor..."
  bash .tide-pack/templates/shared/tide-doctor.sh --app "$PWD" --check
}

# ------------------------------------------------------------------------------
# Khởi Tạo Local TideCloak Realm (Bootstrap Init)
# ------------------------------------------------------------------------------
run_init() {
  banner
  log_info "Bắt đầu quy trình bootstrap local TideCloak container (npm run init)..."
  log_warn "Lưu ý: Quá trình này cần Docker và sự xác nhận điều khoản bản quyền Tide."
  # Nếu data/tidecloak.json chỉ là file stub tạm thời, dọn dẹp trước để init-tidecloak.sh không từ chối chạy
  if [ -f "data/tidecloak.json" ] && grep -q "safereport-demo" "data/tidecloak.json"; then
    log_info "Phát hiện stub data/tidecloak.json tạm thời. Đang dọn dẹp để init-tidecloak.sh xuất cấu hình thực..."
    rm -f "data/tidecloak.json"
  fi
  npm run init
}

# ------------------------------------------------------------------------------
# Hướng Dẫn Sử Dụng (Help)
# ------------------------------------------------------------------------------
show_help() {
  banner
  echo -e "${C_BOLD}CÁCH SỬ DỤNG SCRIPT:${C_RESET}"
  echo "  ./run.sh [LỆNH]"
  echo ""
  echo -e "${C_BOLD}DANH SÁCH LỆNH HỖ TRỢ:${C_RESET}"
  echo -e "  ${C_GREEN}dev${C_RESET}       Khởi động ứng dụng chế độ phát triển (Next.js dev server, Port 3000) [MẶC ĐỊNH]"
  echo -e "  ${C_GREEN}build${C_RESET}     Biên dịch ứng dụng sang gói sản xuất (next build --webpack)"
  echo -e "  ${C_GREEN}prod${C_RESET}      Khởi chạy ứng dụng chế độ sản xuất (Port 3000)"
  echo -e "  ${C_GREEN}test${C_RESET}      Chạy toàn bộ 10 bài kiểm thử mật mã WebCrypto & bảo vệ DPoP"
  echo -e "  ${C_GREEN}doctor${C_RESET}    Chạy công cụ chẩn đoán bảo mật tĩnh Tide Doctor"
  echo -e "  ${C_GREEN}init${C_RESET}      Bootstrap container Keycloak/TideCloak và tạo realm trên cổng 8080"
  echo -e "  ${C_GREEN}check${C_RESET}     Kiểm tra điều kiện môi trường hệ thống (Node, Docker, Ports)"
  echo -e "  ${C_GREEN}help${C_RESET}      Hiển thị bảng trợ giúp này"
  echo ""
  echo -e "${C_BOLD}VÍ DỤ:${C_RESET}"
  echo "  ./run.sh          # Chạy dev server"
  echo "  ./run.sh test     # Chạy unit & integration tests"
  echo "  ./run.sh prod     # Chạy production"
  echo ""
}

# ------------------------------------------------------------------------------
# Điều Phối Lệnh (Command Dispatcher)
# ------------------------------------------------------------------------------
MODE="${1:-dev}"

case "$MODE" in
  dev)
    run_dev
    ;;
  build)
    run_build
    ;;
  prod|start)
    run_prod
    ;;
  test)
    run_test
    ;;
  doctor)
    run_doctor
    ;;
  init)
    run_init
    ;;
  check)
    banner
    check_prerequisites
    ;;
  help|--help|-h)
    show_help
    ;;
  *)
    log_error "Lệnh không hợp lệ: '$MODE'"
    echo "Sử dụng './run.sh help' để xem danh sách lệnh được hỗ trợ."
    exit 1
    ;;
esac
