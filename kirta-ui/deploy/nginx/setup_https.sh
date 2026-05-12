#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${DOMAIN:-example.com}"
EMAIL="${EMAIL:-admin@example.com}"
NGINX_CONF_NAME="${DOMAIN}.conf"
NGINX_AVAILABLE="/etc/nginx/sites-available/${NGINX_CONF_NAME}"
NGINX_ENABLED="/etc/nginx/sites-enabled/${NGINX_CONF_NAME}"
WEBROOT="/var/www/kirta-ui/dist"
ACME_ROOT="/var/www/certbot"
PUBLIC_IP="$(curl -4 -fsS https://api.ipify.org || true)"

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    echo "This script must be run as root (use sudo)." >&2
    exit 1
  fi
}

check_dns() {
  echo "[1/7] Checking DNS for ${DOMAIN}..."
  local dns_ips
  dns_ips="$(dig +short A "${DOMAIN}"; dig +short AAAA "${DOMAIN}" || true)"
  if [[ -z "${dns_ips}" ]]; then
    echo "DNS check failed: no A/AAAA records found for ${DOMAIN}." >&2
    exit 1
  fi

  echo "Resolved ${DOMAIN} to:"
  echo "${dns_ips}"

  if [[ -n "${PUBLIC_IP}" ]] && ! grep -q "${PUBLIC_IP}" <<<"${dns_ips}"; then
    echo "Warning: current server IPv4 (${PUBLIC_IP}) not found in domain DNS records."
    echo "Let's Encrypt challenge may fail until DNS points to this server."
  fi
}

install_packages() {
  echo "[2/7] Installing nginx/certbot packages..."
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y nginx certbot python3-certbot-nginx curl dnsutils
}

prepare_paths() {
  echo "[3/7] Preparing web roots..."
  mkdir -p "${WEBROOT}" "${ACME_ROOT}" "/etc/letsencrypt"
}

write_http_config() {
  echo "[4/7] Writing HTTP nginx config..."
  cat >"${NGINX_AVAILABLE}" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    location /.well-known/acme-challenge/ {
        root ${ACME_ROOT};
        try_files \$uri =404;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}
EOF

  ln -sf "${NGINX_AVAILABLE}" "${NGINX_ENABLED}"
  rm -f /etc/nginx/sites-enabled/default
}

reload_nginx() {
  echo "[5/7] Validating and reloading nginx..."
  nginx -t
  systemctl enable nginx
  systemctl reload nginx || systemctl restart nginx
}

issue_cert() {
  echo "[6/7] Issuing Let's Encrypt certificate..."
  certbot --nginx \
    -d "${DOMAIN}" \
    -m "${EMAIL}" \
    --agree-tos \
    --no-eff-email \
    --redirect \
    --non-interactive
}

final_checks() {
  echo "[7/7] Running final checks..."
  nginx -t
  systemctl status nginx --no-pager -l
  certbot renew --dry-run
}

main() {
  require_root
  check_dns
  install_packages
  prepare_paths
  write_http_config
  reload_nginx
  issue_cert
  final_checks

  cat <<EOF

HTTPS setup completed.
Next step:
1) Replace /etc/nginx/sites-available/${NGINX_CONF_NAME} with your final TLS+proxy config.
2) Ensure nginx container/host can resolve backend:8090 in the same Docker network.
EOF
}

main "$@"
