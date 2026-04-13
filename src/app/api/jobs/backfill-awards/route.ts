/**
 * POST /api/jobs/backfill-awards
 * 과거 낙찰 데이터 백필 수집
 *
 * Query params:
 *   months=3|6|12  (기본값: 3)
 *
 * 사용: 수동 or 초기 배포 시 1회 실행
 */
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyCronSecret } from "@/lib/helpers";

export const preferredRegion = "icn1";
// Hobby 플랜 최대 60초 (Pro: 300초)
export const maxDuration = 60;

interface NaraAwardItem {
  bidNtceNo: string;
  bidNtceOrd: string;
  bidNtceNm: string;
  dminsttNm: string;
  opengDt: string;
  prtcptCnum: number;
  bsnmNm: string;
  bsnmRgstNo: string;
  scsbidAmt: number;
  scsbidRate: number;
  presmptPrce: number;
  [key: string]: unknown;
}

export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const months = parseInt(request.nextUrl.searchParams.get("months") || "3");
  if (![1, 3, 6, 12].includes(months)) {
    return NextResponse.json({ error: "months must be 1, 3, 6, or 12" }, { status: 400 });
  }

  const supabase = createServiceClient();
  // 낙찰정보서비스는 별도 키 사용 (NARA_AWARD_API_KEY), 없으면 NARA_API_KEY fallback
  const NARA_API_KEY = (process.env.NARA_AWARD_API_KEY || process.env.NARA_API_KEY || "").trim();
  if (!NARA_API_KEY) {
    return NextResponse.json({ error: "NARA_AWARD_API_KEY not configured" }, { status: 500 });
  }

  const { data: logRow } = await supabase
    .from("collection_logs")
    .insert({
      job_type: "backfill_awards",
      status: "running",
      started_at: new Date().toISOString(),
      metadata: { months },
    })
    .select("id")
    .single();
  const logId = logRow?.id ?? null;

  let totalProcessed = 0;
  let totalErrors = 0;

  try {
    // 날짜 범위: 오늘 ~ N개월 전
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const fmtFrom = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "") + "0000";
    const fmtTo   = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "") + "2359";

    // 월별로 분할 수집 (한 번에 너무 많은 API 호출 방지)
    const batches: Array<{ from: string; to: string }> = [];
    const cur = new Date(startDate);
    while (cur < endDate) {
      const batchEnd = new Date(cur);
      batchEnd.setDate(batchEnd.getDate() + 7); // 1주 단위 (NARA API 범위 제한 대응)
      if (batchEnd > endDate) batchEnd.setTime(endDate.getTime());
      batches.push({ from: fmtFrom(cur), to: fmtTo(batchEnd) });
      cur.setDate(cur.getDate() + 8);
    }

    const batchErrors: string[] = [];

    for (const batch of batches) {
      try {
        const items = await fetchAwardBatch(NARA_API_KEY, batch.from, batch.to);
        for (const item of items) {
          try {
            await upsertAwardToTenders(supabase, item);
            totalProcessed++;
          } catch (e) {
            totalErrors++;
            const msg = e instanceof Error ? e.message : String(e);
            if (batchErrors.length < 3) batchErrors.push(`upsert: ${msg}`);
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[backfill] batch ${batch.from}-${batch.to} failed:`, err);
        totalErrors++;
        if (batchErrors.length < 3) batchErrors.push(`${batch.from}-${batch.to}: ${msg}`);
      }
    }

    await supabase
      .from("collection_logs")
      .update({
        status: "completed",
        finished_at: new Date().toISOString(),
        records_collected: totalProcessed,
        metadata: { months, errors: totalErrors },
      })
      .eq("id", logId!);

    return NextResponse.json({
      success: true,
      months,
      processed: totalProcessed,
      errors: totalErrors,
      debug: batchErrors,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (logId) {
      await supabase
        .from("collection_logs")
        .update({
          status: "failed",
          finished_at: new Date().toISOString(),
          error_message: message,
          metadata: { months, processed: totalProcessed },
        })
        .eq("id", logId);
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

async function fetchAwardBatch(
  apiKey: string,
  fromDate: string,
  toDate: string
): Promise<NaraAwardItem[]> {
  const PAGE_SIZE = 100;
  const results: NaraAwardItem[] = [];

  for (let page = 1; page <= 20; page++) {
    const url = new URL(
      "https://apis.data.go.kr/1230000/ScsbidInfoService/getScsbidListInfoServc"
    );
    url.searchParams.set("serviceKey", apiKey);
    url.searchParams.set("numOfRows", String(PAGE_SIZE));
    url.searchParams.set("pageNo", String(page));
    url.searchParams.set("inqryDiv", "1");
    url.searchParams.set("inqryBgnDt", fromDate);
    url.searchParams.set("inqryEndDt", toDate);
    url.searchParams.set("type", "json");

    const res = await fetch(url.toString(), { cache: "no-store" });
    const rawText = await res.text();
    let json: unknown;
    try {
      json = JSON.parse(rawText);
    } catch {
      throw new Error(`NARA API [HTTP ${res.status}] raw response: ${rawText.slice(0, 300)}`);
    }
    const body = (json as { response?: { body?: { items?: { item?: unknown }; totalCount?: number } } })?.response?.body;
    const rawItems = body?.items?.item;

    if (!rawItems) break;
    const items: NaraAwardItem[] = Array.isArray(rawItems) ? rawItems : [rawItems];
    results.push(...items);

    const totalCount: number = Number(body?.totalCount ?? 0);
    if (results.length >= totalCount || items.length < PAGE_SIZE) break;
  }

  return results;
}

async function upsertAwardToTenders(
  supabase: ReturnType<typeof createServiceClient>,
  item: NaraAwardItem
) {
  if (!item.scsbidRate || !item.bidNtceNo) return;

  const sourceBidNoticeId = `${item.bidNtceNo}-${item.bidNtceOrd || "00"}`;
  const awardedAt = item.opengDt ? parseNaraDate(item.opengDt) : new Date().toISOString();

  // tenders 매칭
  const { data: tender } = await supabase
    .from("tenders")
    .select("id")
    .or(`source_tender_id.eq.${item.bidNtceNo},source_tender_id.eq.${sourceBidNoticeId}`)
    .maybeSingle();

  if (!tender?.id) return; // 공고 연결 불가 시 스킵

  await supabase.from("awards").upsert(
    {
      tender_id: tender.id,
      winner_company_name: item.bsnmNm || null,
      bidder_registration_no: item.bsnmRgstNo || null,
      awarded_amount: item.scsbidAmt ? Number(item.scsbidAmt) : null,
      awarded_rate: Number(item.scsbidRate),
      opened_at: awardedAt,
      participant_count: item.prtcptCnum ? Number(item.prtcptCnum) : null,
      reserve_price: item.presmptPrce ? Number(item.presmptPrce) : null,
      bid_notice_no: item.bidNtceNo,
      bid_notice_ord: item.bidNtceOrd || "00",
      result_status: "awarded",
      raw_json: item,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "tender_id,bidder_registration_no,sequence_no",
      ignoreDuplicates: false,
    }
  );
}

function parseNaraDate(dateStr: string): string {
  const cleaned = dateStr.replace(/[^0-9]/g, "");
  if (cleaned.length === 8) {
    return new Date(
      `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}T00:00:00+09:00`
    ).toISOString();
  }
  if (cleaned.length === 14) {
    return new Date(
      `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}` +
      `T${cleaned.slice(8, 10)}:${cleaned.slice(10, 12)}:${cleaned.slice(12, 14)}+09:00`
    ).toISOString();
  }
  return new Date().toISOString();
}
