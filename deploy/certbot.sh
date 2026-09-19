#!/bin/sh
set -eu

if [ "${ACME_TERMS_AGREED:-false}" != true ]; then
    printf '%s\n' "Set ACME_TERMS_AGREED=true after reviewing Let's Encrypt's terms." >&2
    exit 1
fi

if [ "${1:-}" = renew ]; then
    exec certbot renew --non-interactive --quiet
fi

case "${SITE_URL:-}" in
    https://*) domain=${SITE_URL#https://}; domain=${domain%/} ;;
    *) printf '%s\n' 'TLS setup requires an https:// SITE_URL.' >&2; exit 1 ;;
esac

if ! printf '%s' "$domain" | grep -Eq '^[A-Za-z0-9][A-Za-z0-9.-]*\.[A-Za-z]{2,63}$'; then
    printf '%s\n' 'SITE_URL must contain only the public site hostname, without a port or path.' >&2
    exit 1
fi

case "${TLS_ACME_ENVIRONMENT:-staging}" in
    staging) directory=https://acme-staging-v02.api.letsencrypt.org/directory ;;
    production) directory=https://acme-v02.api.letsencrypt.org/directory ;;
    *) printf '%s\n' 'TLS_ACME_ENVIRONMENT must be staging or production.' >&2; exit 1 ;;
esac

exec certbot certonly --non-interactive --agree-tos --keep-until-expiring \
    --webroot -w /var/www/acme --cert-name certlane --server "$directory" \
    --email "${ACME_ACCOUNT_EMAIL:?Set ACME_ACCOUNT_EMAIL}" -d "$domain"