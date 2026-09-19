#!/bin/sh
set -eu

if [ -s /etc/letsencrypt/live/certlane/fullchain.pem ] && [ -s /etc/letsencrypt/live/certlane/privkey.pem ]; then
    cp /opt/certlane/tls.conf /etc/nginx/conf.d/default.conf
else
    cp /opt/certlane/http.conf /etc/nginx/conf.d/default.conf
fi