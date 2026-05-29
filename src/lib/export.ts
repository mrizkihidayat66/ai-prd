import { jsPDF } from 'jspdf';
import { marked } from 'marked';

export type ExportFormat = 'md' | 'html' | 'pdf' | 'json';

export interface ExportOptions {
  content: string;
  projectName: string;
  format: ExportFormat;
  metadata?: {
    version?: number;
    createdAt?: string;
    updatedAt?: string;
  };
}

/**
 * Export PRD content to markdown file
 */
export function exportToMarkdown(content: string, projectName: string): void {
  const safeName = sanitizeFilename(projectName);
  const blob = new Blob([content], { type: 'text/markdown' });
  downloadBlob(blob, `${safeName}-PRD.md`);
}

/**
 * Export PRD content to HTML file
 */
export async function exportToHtml(content: string, projectName: string): Promise<void> {
  const safeName = sanitizeFilename(projectName);
  
  // Convert markdown to HTML
  const htmlContent = await marked.parse(content);
  
  // Create full HTML document with styling
  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName} - PRD</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      max-width: 900px;
      margin: 0 auto;
      padding: 2rem;
      color: #333;
      background: #fff;
    }
    h1 { color: #1a1a1a; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.5rem; }
    h2 { color: #374151; margin-top: 2rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.3rem; }
    h3 { color: #4b5563; margin-top: 1.5rem; }
    code {
      background: #f3f4f6;
      padding: 0.2rem 0.4rem;
      border-radius: 0.25rem;
      font-size: 0.9em;
      font-family: 'Courier New', monospace;
    }
    pre {
      background: #1f2937;
      color: #f9fafb;
      padding: 1rem;
      border-radius: 0.5rem;
      overflow-x: auto;
    }
    pre code {
      background: transparent;
      color: inherit;
      padding: 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
    }
    th, td {
      border: 1px solid #e5e7eb;
      padding: 0.5rem;
      text-align: left;
    }
    th {
      background: #f9fafb;
      font-weight: 600;
    }
    blockquote {
      border-left: 4px solid #6366f1;
      margin: 1rem 0;
      padding-left: 1rem;
      color: #6b7280;
    }
    a {
      color: #6366f1;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    @media print {
      body { padding: 1rem; }
    }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>`;

  const blob = new Blob([fullHtml], { type: 'text/html' });
  downloadBlob(blob, `${safeName}-PRD.html`);
}

/**
 * Export PRD content to PDF file
 */
export async function exportToPdf(content: string, projectName: string): Promise<void> {
  const safeName = sanitizeFilename(projectName);
  
  // Convert markdown to HTML first
  const htmlContent = await marked.parse(content);
  
  // Create a temporary container
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.width = '210mm'; // A4 width
  container.style.padding = '20mm';
  container.style.fontFamily = 'Arial, sans-serif';
  container.style.fontSize = '12pt';
  container.style.lineHeight = '1.6';
  container.style.color = '#000';
  container.style.background = '#fff';
  container.innerHTML = htmlContent;
  document.body.appendChild(container);

  try {
    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Add title
    pdf.setFontSize(20);
    pdf.text(projectName, 20, 20);
    pdf.setFontSize(10);
    pdf.text('Product Requirements Document', 20, 28);
    
    // Add content (simplified - just text extraction)
    const textContent = container.innerText;
    const lines = pdf.splitTextToSize(textContent, 170);
    
    let y = 40;
    const pageHeight = 297; // A4 height in mm
    const lineHeight = 7;
    
    lines.forEach((line: string) => {
      if (y > pageHeight - 20) {
        pdf.addPage();
        y = 20;
      }
      pdf.text(line, 20, y);
      y += lineHeight;
    });

    // Save PDF
    pdf.save(`${safeName}-PRD.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}

/**
 * Export PRD content to JSON file
 */
export function exportToJson(
  content: string,
  projectName: string,
  metadata?: ExportOptions['metadata']
): void {
  const safeName = sanitizeFilename(projectName);
  
  const jsonData = {
    projectName,
    content,
    metadata: {
      version: metadata?.version || 1,
      exportedAt: new Date().toISOString(),
      createdAt: metadata?.createdAt,
      updatedAt: metadata?.updatedAt,
    },
    format: 'prd-json-v1',
  };

  const blob = new Blob([JSON.stringify(jsonData, null, 2)], {
    type: 'application/json',
  });
  downloadBlob(blob, `${safeName}-PRD.json`);
}

/**
 * Main export function that routes to appropriate handler
 */
export async function exportPrd(options: ExportOptions): Promise<void> {
  const { content, projectName, format, metadata } = options;

  switch (format) {
    case 'md':
      exportToMarkdown(content, projectName);
      break;
    case 'html':
      await exportToHtml(content, projectName);
      break;
    case 'pdf':
      await exportToPdf(content, projectName);
      break;
    case 'json':
      exportToJson(content, projectName, metadata);
      break;
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

/**
 * Sanitize filename by removing invalid characters
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9-_\s]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase();
}

/**
 * Download blob as file
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
