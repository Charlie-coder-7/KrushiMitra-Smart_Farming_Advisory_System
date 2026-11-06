#!/bin/bash
set -euo pipefail

cd /home/ec2-user/KrushiMitra-Smart_Farming_Advisory_System

for attempt in $(seq 1 30); do
  if curl --fail --silent http://127.0.0.1:8080/api/status; then
    exit 0
  fi
  sleep 2
done

docker compose logs --tail=100
exit 1
