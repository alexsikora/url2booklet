#!/usr/bin/env python3

"""
bookletize.py
Converts a PDF to booklet format with 2-up landscape pages for folding and stapling
"""

import sys
from pypdf import PdfReader, PdfWriter, PageObject, Transformation

def create_booklet(input_pdf_path, output_pdf_path):
    """
    Create a booklet with 2-up landscape pages.

    Pages are arranged so that when printed double-sided (flip on short edge),
    folded in half, and stapled, they form a proper booklet.
    """

    # Read input PDF
    reader = PdfReader(input_pdf_path)
    num_pages = len(reader.pages)

    print(f"Input PDF has {num_pages} pages", file=sys.stderr)

    # Calculate pages needed (must be multiple of 4 for booklet)
    pages_needed = ((num_pages + 3) // 4) * 4
    blank_pages = pages_needed - num_pages

    print(f"Booklet requires {pages_needed} pages (adding {blank_pages} blank pages)", file=sys.stderr)

    # Create list of all pages (including blanks)
    all_pages = []
    for i in range(num_pages):
        all_pages.append(reader.pages[i])

    # Add blank pages if needed
    if blank_pages > 0:
        # Get dimensions from first page
        first_page = reader.pages[0]
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

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print("Usage: bookletize.py <input.pdf> <output.pdf>", file=sys.stderr)
        sys.exit(1)

    input_pdf = sys.argv[1]
    output_pdf = sys.argv[2]

    try:
        create_booklet(input_pdf, output_pdf)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
