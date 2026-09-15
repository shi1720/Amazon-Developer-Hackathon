#!/bin/zsh
set -euo pipefail
SOURCE_DIR="${0:A:h}"
WORKSPACE_DIR="${SOURCE_DIR:h}"
RUNTIME_ROOT='/Users/shivamgupta/.cache/codex-runtimes/codex-primary-runtime/dependencies'
RUNTIME_NODE="${RUNTIME_ROOT}/node/bin/node"
RUNTIME_PYTHON="${RUNTIME_ROOT}/python/bin/python3"
# Use the bundled LibreOffice wrapper only, never a desktop installation.
BUNDLED_SOFFICE="${RUNTIME_ROOT}/bin/override/soffice"
PDFTOPPM="${RUNTIME_ROOT}/bin/override/pdftoppm"
PDFINFO="${RUNTIME_ROOT}/bin/override/pdfinfo"
OUTPUT_DIR="${WORKSPACE_DIR}/deliverables"
RENDER_DIR="${WORKSPACE_DIR}/.build/rendered"
mkdir -p "${RENDER_DIR}"
"${BUNDLED_SOFFICE}" --headless '-env:UserInstallation=file:///tmp/kindhandoff-bundled-lo-profile' --convert-to pdf --outdir "${OUTPUT_DIR}" "${OUTPUT_DIR}/KindHandoff-Pitch.pptx"
"${PDFTOPPM}" -r 120 -png "${OUTPUT_DIR}/KindHandoff-Pitch.pdf" "${RENDER_DIR}/pitch"
"${PDFTOPPM}" -r 120 -png "${OUTPUT_DIR}/KindHandoff-Judge-Brief.pdf" "${RENDER_DIR}/brief"
"${PDFINFO}" "${OUTPUT_DIR}/KindHandoff-Pitch.pdf"
"${PDFINFO}" "${OUTPUT_DIR}/KindHandoff-Judge-Brief.pdf"
