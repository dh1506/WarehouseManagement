import type { RefObject } from 'react';
import { toPng } from 'html-to-image';

export async function exportChartAsPNG(
  containerRef: RefObject<HTMLDivElement | null>,
  filename: string,
): Promise<void> {
  const el = containerRef.current;
  if (!el) return;
  try {
    const dataUrl = await toPng(el, {
      backgroundColor: '#ffffff',
      pixelRatio: 2,
      style: { borderRadius: '0' },
    });
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = dataUrl;
    link.click();
  } catch (err) {
    console.error('[ChartExport] PNG export failed:', err);
  }
}

export function exportAsCSV(
  rows: Record<string, string | number>[],
  filename: string,
): void {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map((r) =>
      headers.map((h) => JSON.stringify(r[h] ?? '')).join(','),
    ),
  ];
  const blob = new Blob(['﻿' + lines.join('\n')], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `${filename}.csv`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}
