"use client";

import { useCallback, useState } from "react";

interface ExportPdfOptions {
  /** 캡처할 DOM 요소의 id */
  elementId: string;
  /** 저장될 파일명 (확장자 제외) */
  filename: string;
  /** 캡처 배율 (기본 2 = Retina 품질) */
  scale?: number;
}

/**
 * 지정한 DOM 요소를 A4 PDF로 내보내는 훅.
 * jsPDF + html2canvas를 동적 import하여 번들 용량 최소화.
 */
export function useExportPdf() {
  const [isExporting, setIsExporting] = useState(false);

  const exportPdf = useCallback(async ({ elementId, filename, scale = 2 }: ExportPdfOptions) => {
    const element = document.getElementById(elementId);
    if (!element) {
      console.error(`[useExportPdf] 요소를 찾을 수 없음: #${elementId}`);
      return;
    }

    setIsExporting(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      // 캡처 전 스크롤 위치를 0으로 고정 (잘린 캡처 방지)
      const originalScroll = window.scrollY;
      window.scrollTo(0, 0);

      const canvas = await html2canvas(element, {
        scale,
        useCORS: true,
        logging: false,
        backgroundColor: null, // CSS 배경색 유지
        windowWidth: document.documentElement.scrollWidth,
        windowHeight: element.scrollHeight,
      });

      window.scrollTo(0, originalScroll);

      const imgData = canvas.toDataURL("image/png");

      // A4 (210mm × 297mm) 기준으로 페이지 분할
      const PDF_WIDTH  = 210;
      const PDF_HEIGHT = 297;
      const imgWidth   = PDF_WIDTH;
      const imgHeight  = (canvas.height * PDF_WIDTH) / canvas.width;

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      let posY = 0;
      let pageCount = 0;

      while (posY < imgHeight) {
        if (pageCount > 0) pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, -posY, imgWidth, imgHeight);
        posY      += PDF_HEIGHT;
        pageCount += 1;
      }

      pdf.save(`${filename}-${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setIsExporting(false);
    }
  }, []);

  return { exportPdf, isExporting };
}
