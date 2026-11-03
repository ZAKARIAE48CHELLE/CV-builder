export async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfjs = await import("pdfjs-dist");

  if (typeof window !== "undefined" && !pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  }

  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const doc = await loadingTask.promise;
  const pageTexts: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const items = content.items as Array<any>;

    // Filter valid text items
    const textItems = items.filter((it) => it && (typeof it.str === "string" || it.hasEOL));
    if (textItems.length === 0) continue;

    // Detect two-column layout by examining X coordinates
    // In standard A4/Letter (width ~595-612pt), a two-column layout has items on the left (<240pt)
    // and items on the right (>240pt) on the same Y horizontal line.
    let pageLines: string[] = [];
    let currentLine = "";
    let lastY: number | null = null;
    let lastHeight: number = 10;

    for (const item of textItems) {
      const y = item.transform ? item.transform[5] : null;
      const h = item.height || (item.transform ? Math.abs(item.transform[0]) : 10);

      // Check vertical gap
      const isNewVerticalLine = lastY !== null && y !== null && Math.abs(lastY - y) > 3.5;

      if (isNewVerticalLine) {
        if (currentLine.trim()) {
          pageLines.push(currentLine.trim());
        }

        // If there was a larger vertical space between lines (> 1.6x line height), add empty line as item separator
        if (lastY !== null && y !== null && (lastY - y) > (h * 1.6)) {
          pageLines.push("");
        }

        currentLine = item.str || "";
      } else {
        if (currentLine && item.str && !currentLine.endsWith(" ") && !item.str.startsWith(" ")) {
          currentLine += " ";
        }
        currentLine += item.str || "";
      }

      if (item.hasEOL) {
        if (currentLine.trim()) {
          pageLines.push(currentLine.trim());
        }
        currentLine = "";
      }

      lastY = y;
      if (h) lastHeight = h;
    }

    if (currentLine.trim()) {
      pageLines.push(currentLine.trim());
    }

    pageTexts.push(pageLines.join("\n"));
  }

  return pageTexts.join("\n\n");
}

export async function extractTextFromDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

export async function extractTextFromFile(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "pdf") {
    return extractTextFromPdf(file);
  } else if (ext === "docx" || ext === "doc") {
    return extractTextFromDocx(file);
  } else {
    // txt or other
    return file.text();
  }
}
