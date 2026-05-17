import { NextResponse } from "next/server";
import { getDashboardUser } from "@/lib/dashboard";
import { getLang } from "@/lib/i18n";
import { getLatestClientsAnalysis } from "@/app/dashboard/clients/clientsAnalysisAction";
import { renderToBuffer, Font, Document } from "@react-pdf/renderer";
import { createElement, type ReactElement } from "react";
import type { DocumentProps } from "@react-pdf/renderer";
import { AnalysisPdfDocument } from "@/lib/pdf/AnalysisPdfDocument";
import path from "path";
import fs from "fs";

let fontsRegistered = false;

function ensureFonts() {
  if (fontsRegistered) return;
  const dir = path.resolve(process.cwd(), "public/fonts");
  const regular = path.join(dir, "DejaVuSans.ttf");
  const bold = path.join(dir, "DejaVuSans-Bold.ttf");
  if (!fs.existsSync(regular) || !fs.existsSync(bold)) {
    throw new Error(`Font files not found in ${dir}`);
  }
  Font.register({
    family: "DejaVu",
    fonts: [
      { src: regular, fontWeight: 400 },
      { src: bold, fontWeight: 700 },
    ],
  });
  fontsRegistered = true;
}

export async function GET() {
  const user = await getDashboardUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isRu = getLang(user) === "ru";
  const { result: analysis, analyzedAt } = await getLatestClientsAnalysis();

  if (!analysis) {
    return NextResponse.json(
      { error: isRu ? "Анализ не найден" : "Tahlil topilmadi" },
      { status: 404 }
    );
  }

  ensureFonts();

  const el = createElement(AnalysisPdfDocument, { analysis, analyzedAt, isRu }) as unknown as ReactElement<DocumentProps, typeof Document>;
  const buffer = await renderToBuffer(el);

  const date = analyzedAt ? new Date(analyzedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  const filename = `clients-analysis-${date}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
