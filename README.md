# URL to Booklet PDF Converter

Convert any web page to a beautifully formatted booklet PDF, ready for double-sided printing, folding, and stapling. Integrates seamlessly with Safari's share sheet.

## Features

- **Reader Mode Extraction**: Uses Mozilla's Readability algorithm to extract clean article content
- **Professional Typography**: Print-optimized CSS with readable fonts and proper page breaks
- **2-Up Landscape Booklets**: Automatically creates landscape pages with 2 pages side by side
- **Multi-Signature Support**: Automatically splits longer documents into multiple signatures for easier binding
- **Safari Integration**: Works directly from Safari's share sheet
- **Automatic Page Ordering**: Pages arranged for proper booklet assembly after printing
- **Smart Padding**: Automatically adds blank pages to ensure proper booklet folding

## How It Works

1. **Extract**: Fetches and extracts readable content from the URL
2. **Render**: Generates a beautifully formatted PDF with print-optimized styling
3. **Bookletize**: Arranges pages in 2-up landscape format for booklet printing
4. **Open**: Automatically opens the finished booklet PDF

## Example Output

**Short Documents (≤ 32 pages):**
Input: 22-page article → Output: 1 booklet PDF with 12 landscape sheets (2-up)

**Long Documents (> 32 pages):**
Input: 100-page article → Output: 4 signature PDFs (32 pages each)
- signature-1.pdf: 16 landscape sheets
- signature-2.pdf: 16 landscape sheets
- signature-3.pdf: 16 landscape sheets
- signature-4.pdf: 4 landscape sheets

When printed double-sided, folded in half, and bound together, you get a professional multi-signature booklet!

## Requirements

### macOS System

- macOS 10.15 (Catalina) or later
- Homebrew package manager

### Dependencies

- **Node.js** (v14 or later)
- **Python 3** (v3.8 or later)
- **pdftk-java** (for PDF manipulation)
- **npm packages**: @mozilla/readability, puppeteer, jsdom
- **Python packages**: pypdf

## Installation

### Quick Install

```bash
# Clone this repository
git clone <your-repo-url>
cd url2booklet

# Run the installer
./install.sh
```

### Manual Installation

#### 1. Install System Dependencies

```bash
# Install Homebrew (if not already installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install pdftk-java
brew install pdftk-java
```

#### 2. Install Node.js Dependencies

```bash
# Install Node.js packages globally
npm install -g @mozilla/readability puppeteer jsdom

# Install Chromium for Puppeteer
npx puppeteer browsers install chrome
```

#### 3. Install Python Dependencies

```bash
# Install pypdf
pip3 install pypdf --break-system-packages
```

#### 4. Copy Scripts to ~/.local/bin

```bash
# Create directories
mkdir -p ~/.local/bin/url2booklet-lib

# Copy files
cp bin/url2booklet ~/.local/bin/
cp lib/* ~/.local/bin/url2booklet-lib/

# Make executable
chmod +x ~/.local/bin/url2booklet
chmod +x ~/.local/bin/url2booklet-lib/*.{js,py,sh}
```

#### 5. Update PATH (if needed)

Add to your `~/.zshrc` or `~/.bash_profile`:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

Then reload:

```bash
source ~/.zshrc  # or source ~/.bash_profile
```

#### 6. Create Output Directory

```bash
mkdir -p ~/Downloads/booklets
```

## Usage

### Command Line

**Basic usage:**
```bash
url2booklet "https://example.com/article"
```

The booklet PDF(s) will be created in `~/Downloads/booklets/` and automatically opened.

**Multi-signature mode (default):**
```bash
# Uses 32 pages per signature (8 sheets each)
url2booklet "https://example.com/long-article"
```

**Custom signature size:**
```bash
# Use 16 pages per signature (4 sheets each)
url2booklet -s 16 "https://example.com/article"

# Use 64 pages per signature (16 sheets each)
url2booklet --signature-size 64 "https://example.com/article"
```

**Single continuous booklet (legacy mode):**
```bash
# Create one large booklet regardless of length
url2booklet --single-booklet "https://example.com/article"
```

**View help:**
```bash
url2booklet --help
```

### Safari Integration

#### Setup Shortcut

1. **Open Shortcuts app** (⌘+Space → "Shortcuts")

2. **Create New Shortcut** (click + button)

3. **Add "Run Shell Script" action**:
   - Shell: `/bin/bash`
   - Pass Input: `as arguments`
   - Script:
   ```bash
   export PATH="$HOME/.local/bin:$PATH"
   $HOME/.local/bin/url2booklet "$1"
   ```

4. **Configure Shortcut**:
   - Click the (i) info button
   - Check "Show in Share Sheet"
   - Under "Accepts", select "URLs" from "Safari" and "Anywhere"
   - Name: "Save as Booklet" (or your preference)

5. **Save and Test**:
   - Open Safari to any article
   - Click Share button
   - Select "Save as Booklet"

## Printing Instructions

### Single Booklet (Short Documents)

Once your booklet PDF is created:

1. **Print Settings**:
   - Print double-sided
   - Flip on **short edge** (important!)
   - Orientation: Landscape
   - Paper size: Letter (8.5" × 11")

2. **Assembly**:
   - Stack all printed sheets in order
   - Fold the stack in half
   - Staple along the spine (center fold)

3. **Result**:
   - A professional-looking booklet with pages in correct order
   - Ready to read!

### Multi-Signature Booklets (Long Documents)

When multiple signature files are created:

1. **Print Each Signature**:
   - Print each `-sig1.pdf`, `-sig2.pdf`, etc. separately
   - Use same settings: double-sided, flip on short edge, landscape

2. **Fold Each Signature**:
   - Take all sheets for signature 1, fold in half
   - Repeat for signature 2, 3, etc.
   - Each signature becomes a separate folded booklet

3. **Bind Signatures Together**:
   - **Option A**: Saddle-stitch each signature separately, then glue/tape the spines together
   - **Option B**: Nest all signatures together and bind as one (perfect binding or sewn binding)
   - **Option C**: Use binder clips or rubber bands to hold signatures together

4. **Result**:
   - A professional multi-signature book
   - Much easier to fold and bind than one thick booklet
   - Pages in correct reading order across all signatures

## Configuration

### Environment Variables

Customize behavior by setting these environment variables in your `~/.zshrc`:

```bash
# Signature size (default: 32 pages = 8 sheets)
export URL2BOOKLET_SIGNATURE_SIZE="32"  # or "16", "64", "0" for single booklet

# Paper size (default: letter)
export URL2BOOKLET_PAPER_SIZE="letter"  # or "a4paper"

# Output directory (default: ~/Downloads/booklets)
export URL2BOOKLET_OUTPUT_DIR="$HOME/Documents/Booklets"

# Auto-open PDF (default: true)
export URL2BOOKLET_AUTO_OPEN="true"  # or "false"

# Margin size (default: 0.5in)
export URL2BOOKLET_MARGIN="0.5in"

# Font size (default: 11pt)
export URL2BOOKLET_FONT_SIZE="11pt"
```

### Signature Size Guide

Choose the right signature size based on your binding method:

| Signature Size | Sheets per Signature | Best For |
|---|---|---|
| 16 pages | 4 sheets | Thin paper, compact booklets |
| **32 pages** | **8 sheets** | **Standard (recommended)** |
| 64 pages | 16 sheets | Maximum for saddle-stitch |
| 0 (disabled) | All pages | Single continuous booklet (legacy mode) |

**Why use signatures?**
- **Easier folding**: 8 sheets fold much easier than 30+ sheets
- **Better binding**: Professional bookbinding uses signatures
- **Practical**: Each signature can be saddle-stitched separately
- **Industry standard**: Most printed books use 32-page signatures

## Project Structure

```
url2booklet/
├── README.md                   # This file
├── install.sh                  # Automated installation script
├── bin/
│   └── url2booklet             # Main entry point script
└── lib/
    ├── extract-content.js      # Reader mode content extraction
    ├── render-pdf.js           # PDF generation with Puppeteer
    ├── print-styles.css        # Print-optimized CSS styling
    ├── bookletize.py           # 2-up booklet creation (Python)
    └── bookletize.sh           # Bookletize wrapper script
```

## How Bookletization Works

The bookletization process arranges pages so they read correctly when folded:

**Example: 8-page document becomes 2 landscape sheets**

- **Sheet 1 (front)**: [Page 8, Page 1]
- **Sheet 1 (back)**: [Page 2, Page 7]
- **Sheet 2 (front)**: [Page 6, Page 3]
- **Sheet 2 (back)**: [Page 4, Page 5]

When printed double-sided, folded, and stapled, pages 1-8 read in order!

### Multi-Signature Example

**100-page document with 32-page signatures:**

1. **Signature 1** (pages 1-32): 8 landscape sheets → folded booklet
2. **Signature 2** (pages 33-64): 8 landscape sheets → folded booklet
3. **Signature 3** (pages 65-96): 8 landscape sheets → folded booklet
4. **Signature 4** (pages 97-100 + 28 blank pages): 8 landscape sheets → folded booklet

Each signature is independently bookletized. When stacked in order (sig1, sig2, sig3, sig4), the pages read sequentially from 1-100.

## Troubleshooting

### "command not found: url2booklet"

**Solution**: Ensure `~/.local/bin` is in your PATH:

```bash
echo $PATH | grep ".local/bin"
```

If not found, add to `~/.zshrc`:

```bash
export PATH="$HOME/.local/bin:$PATH"
source ~/.zshrc
```

### "Cannot find module '@mozilla/readability'"

**Solution**: Install Node.js packages globally and ensure NODE_PATH is set:

```bash
npm install -g @mozilla/readability puppeteer jsdom
```

### "Failed to extract content from URL"

**Possible causes**:
- URL is behind a paywall or requires authentication
- Site has anti-scraping measures
- Not an HTML page (e.g., PDF, image)
- Site is unreachable

**Solution**: Try a different article or use Safari's Print to PDF instead.

### Puppeteer "Degraded performance warning"

This warning appears when running x64 Node on Apple Silicon. Performance is still acceptable. To fix:

```bash
# Install ARM64 Node.js
arch -arm64 brew install node
```

### PDF opens but pages are in wrong order

**Solution**: Ensure you're printing **double-sided with flip on short edge**. If you flip on long edge, pages will be out of order.

### Script fails with "Permission denied"

**Solution**: Make scripts executable:

```bash
chmod +x ~/.local/bin/url2booklet
chmod +x ~/.local/bin/url2booklet-lib/*
```

## Advanced Usage

### Process Multiple URLs

```bash
# Loop through URLs
for url in \
  "https://example.com/article1" \
  "https://example.com/article2" \
  "https://example.com/article3"; do
  url2booklet "$url"
done
```

### Custom Output Location

```bash
URL2BOOKLET_OUTPUT_DIR="/tmp/my-booklets" url2booklet "https://example.com"
```

### Silent Mode (No Auto-Open)

```bash
URL2BOOKLET_AUTO_OPEN=false url2booklet "https://example.com"
```

### Custom Signature Size

```bash
# Use 16-page signatures
URL2BOOKLET_SIGNATURE_SIZE=16 url2booklet "https://example.com"

# Disable signatures (single booklet)
URL2BOOKLET_SIGNATURE_SIZE=0 url2booklet "https://example.com"
```

## Technical Details

### Content Extraction

Uses Mozilla's Readability algorithm (the same used in Firefox Reader View) to extract main content from web pages. This removes ads, navigation, footers, and other clutter.

### PDF Generation

Puppeteer (headless Chrome) renders the extracted content with custom CSS optimized for printing:
- Georgia serif font at 11pt
- 1.5 line height for readability
- Smart page breaks (avoid orphaned headings)
- URLs printed as footnotes
- Code blocks in monospace with no page breaks

### Booklet Creation

Python script using pypdf library:
1. Splits long documents into signatures (default: 32 pages each)
2. For each signature:
   - Pads to multiple of 4 pages
   - Creates landscape pages (2× original width)
   - Places two pages side by side
   - Reorders pages for proper booklet folding
3. Outputs separate PDF for each signature

## Credits

- **Mozilla Readability**: Article extraction algorithm
- **Puppeteer**: Headless Chrome automation
- **pypdf**: PDF manipulation library
- **pdftk-java**: PDF toolkit

## License

MIT License - feel free to use and modify!

## Contributing

Contributions welcome! Please open an issue or submit a pull request.

## Support

For issues, questions, or suggestions, please open an issue on GitHub.

---

**Made with ❤️ for people who love printed booklets**
