#!/usr/bin/env python3

"""
bookletize.py
Converts a PDF to booklet format with 2-up landscape pages for folding and stapling
Supports multi-signature mode for longer documents
"""

import sys
import argparse
import os
from pypdf import PdfReader, PdfWriter, PageObject, Transformation

def create_booklet_from_pages(pages_list, output_pdf_path, signature_num=None):
    """
    Create a booklet with 2-up landscape pages from a list of pages.

    Pages are arranged so that when printed double-sided (flip on short edge),
    folded in half, and stapled, they form a proper booklet.
    """
    num_pages = len(pages_list)

    sig_label = f" (signature {signature_num})" if signature_num else ""
    print(f"Creating booklet{sig_label} with {num_pages} pages", file=sys.stderr)

    # Calculate pages needed (must be multiple of 4 for booklet)
    pages_needed = ((num_pages + 3) // 4) * 4
    blank_pages = pages_needed - num_pages

    if blank_pages > 0:
        print(f"Adding {blank_pages} blank pages to reach {pages_needed} pages", file=sys.stderr)

    # Create list of all pages (including blanks)
    all_pages = list(pages_list)

    # Add blank pages if needed
    if blank_pages > 0:
        # Get dimensions from first page
        first_page = pages_list[0]
        width = float(first_page.mediabox.width)
        height = float(first_page.mediabox.height)

        # Create blank pages
        for _ in range(blank_pages):
            blank = PageObject.create_blank_page(width=width, height=height)
            all_pages.append(blank)

    # Calculate booklet page ordering
    # For a booklet, pages are arranged in pairs on landscape sheets
    # Sheet order (for n pages, where n is multiple of 4):
    # Front of sheet 1: [n, 1]
    # Back of sheet 1: [2, n-1]
    # Front of sheet 2: [n-2, 3]
    # Back of sheet 2: [4, n-3]
    # etc.

    ordered_pages = []
    total_pages = pages_needed
    num_sheets = total_pages // 4

    for sheet in range(num_sheets):
        # Front of sheet (right to left when looking at front)
        back_left_page = total_pages - (sheet * 2) - 1  # Convert to 0-indexed
        front_right_page = (sheet * 2)  # 0-indexed
        ordered_pages.append((back_left_page, front_right_page))

        # Back of sheet (left to right when looking at back)
        front_left_page = (sheet * 2) + 1  # 0-indexed
        back_right_page = total_pages - (sheet * 2) - 2  # 0-indexed
        ordered_pages.append((front_left_page, back_right_page))

    # Create output PDF with landscape pages (2-up)
    writer = PdfWriter()

    # Get dimensions from first page
    first_page = all_pages[0]
    page_width = float(first_page.mediabox.width)
    page_height = float(first_page.mediabox.height)

    # Landscape page dimensions (2 pages side by side)
    landscape_width = page_width * 2
    landscape_height = page_height

    print(f"Creating {len(ordered_pages)} landscape sheets (2 pages per sheet)...", file=sys.stderr)

    for left_idx, right_idx in ordered_pages:
        # Create landscape page
        landscape_page = PageObject.create_blank_page(
            width=landscape_width,
            height=landscape_height
        )

        # Get the two pages for this sheet
        left_page = all_pages[left_idx]
        right_page = all_pages[right_idx]

        # Place left page on the left half
        landscape_page.merge_page(left_page)

        # Place right page on the right half (translate by page width)
        landscape_page.merge_transformed_page(
            right_page,
            Transformation().translate(tx=page_width, ty=0)
        )

        writer.add_page(landscape_page)

    # Write output
    with open(output_pdf_path, 'wb') as output_file:
        writer.write(output_file)

    print(f"Booklet created: {output_pdf_path}", file=sys.stderr)
    print(f"Total sheets: {len(ordered_pages)}", file=sys.stderr)
    print(f"Format: {len(ordered_pages)} landscape pages, 2-up", file=sys.stderr)

def create_booklet(input_pdf_path, output_pdf_path, signature_size=None):
    """
    Create booklet(s) from input PDF.

    If signature_size is specified and document is longer, creates multiple
    signature booklets. Otherwise creates one continuous booklet.
    """
    # Read input PDF
    reader = PdfReader(input_pdf_path)
    num_pages = len(reader.pages)

    print(f"Input PDF has {num_pages} pages", file=sys.stderr)

    # If no signature size specified or document fits in one signature
    if signature_size is None or num_pages <= signature_size:
        all_pages = [reader.pages[i] for i in range(num_pages)]
        create_booklet_from_pages(all_pages, output_pdf_path)
        return

    # Multi-signature mode
    num_signatures = (num_pages + signature_size - 1) // signature_size
    print(f"Creating {num_signatures} signatures ({signature_size} pages each)", file=sys.stderr)

    # Prepare output filename template
    output_dir = os.path.dirname(output_pdf_path)
    output_base = os.path.basename(output_pdf_path)
    output_name, output_ext = os.path.splitext(output_base)

    created_files = []

    for sig_num in range(num_signatures):
        start_page = sig_num * signature_size
        end_page = min(start_page + signature_size, num_pages)

        # Get pages for this signature
        sig_pages = [reader.pages[i] for i in range(start_page, end_page)]

        # Create output filename
        sig_output = os.path.join(output_dir, f"{output_name}-sig{sig_num + 1}{output_ext}")

        # Create booklet for this signature
        create_booklet_from_pages(sig_pages, sig_output, signature_num=sig_num + 1)
        created_files.append(sig_output)

    print(f"\nCreated {num_signatures} signature booklets:", file=sys.stderr)
    for f in created_files:
        print(f"  - {f}", file=sys.stderr)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description='Convert PDF to booklet format with 2-up landscape pages',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Single booklet (traditional mode)
  bookletize.py input.pdf output.pdf

  # Multi-signature mode with 32 pages per signature
  bookletize.py input.pdf output.pdf --signature-size 32

  # Multi-signature mode with custom size
  bookletize.py input.pdf output.pdf -s 16
        """
    )

    parser.add_argument('input_pdf', help='Input PDF file')
    parser.add_argument('output_pdf', help='Output PDF file (or base name for multi-signature)')
    parser.add_argument('-s', '--signature-size', type=int, default=None,
                       help='Pages per signature (default: single booklet). Typical values: 16, 32')

    args = parser.parse_args()

    # Validate signature size
    if args.signature_size is not None:
        if args.signature_size < 4:
            print("Error: Signature size must be at least 4 pages", file=sys.stderr)
            sys.exit(1)
        if args.signature_size % 4 != 0:
            print("Error: Signature size must be a multiple of 4", file=sys.stderr)
            sys.exit(1)

    try:
        create_booklet(args.input_pdf, args.output_pdf, signature_size=args.signature_size)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
