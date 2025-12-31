#!/bin/bash

#
# bookletize.sh
# Converts a PDF to booklet format with 2-up landscape pages
# for double-sided printing, folding, and stapling
#

set -euo pipefail

INPUT_PDF="$1"
OUTPUT_PDF="$2"

if [ ! -f "$INPUT_PDF" ]; then
    echo "Error: Input PDF not found: $INPUT_PDF" >&2
    exit 1
fi

# Get script directory to find bookletize.py
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Call Python bookletize script
python3 "$SCRIPT_DIR/bookletize.py" "$INPUT_PDF" "$OUTPUT_PDF"
