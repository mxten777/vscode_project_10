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
  rlOpengDt: string;       // 개찰일시 (getScsbidListSttusServc)
  prtcptCnum: number;      // 참여업체수
  bidwinnrNm: string;      // 낙찰자명
  bidwinnrBizno: string;   // 낙찰자 사업자번호
  sucsfbidAmt: number;     // 낙찰금액
  sucsfbidRate: number;    // 낙찰률
  dminsttCd: string;       // 발주기관 코드
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
  const awardKey = (process.env.NARA_AWARD_API_KEY || "").trim();
  const fallbackKey = (process.env.NARA_API_KEY || "").trim();
  const NARA_API_KEY = awardKey || fallbackKey;
  const keySource = awardKey ? "NARA_AWARD_API_KEY" : fallbackKey ? "NARA_API_KEY(fallback)" : "none";
  if (!NARA_API_KEY) {
    return NextResponse.json({ error: "NARA_AWARD_API_KEY not configured", keySource }, { status: 500 });
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
    let totalFetched = 0;
    let totalSkipped = 0;

    for (const batch of batches) {
      try {
        const { items, firstBodyDebug } = await fetchAwardBatch(NARA_API_KEY, batch.from, batch.to);
        totalFetched += items.length;
        if (items.length === 0 && batchErrors.length < 3) {
          batchErrors.push(`batch[${batch.from}]: fetched=0 body=${firstBodyDebug}`);
        }
        if (items.length > 0) {
          const { processed, skipped, errors, errMsg } = await bulkUpsertAwards(supabase, items);
          totalProcessed += processed;
          totalSkipped += skipped;
          totalErrors += errors;
          if (errMsg && batchErrors.length < 3) batchErrors.push(errMsg);
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
      fetched: totalFetched,
      processed: totalProcessed,
      skipped: totalSkipped,
      errors: totalErrors,
      keySource,
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
): Promise<{ items: NaraAwardItem[]; firstBodyDebug: string }> {
  const PAGE_SIZE = 100;
  const MAX_PAGES = 5; // 배치당 최대 500건 (60초 제한 대응)
  const results: NaraAwardItem[] = [];
  let firstBodyDebug = "";

  for (let page = 1; page <= MAX_PAGES; page++) {
    const rawUrl =
      `https://apis.data.go.kr/1230000/as/ScsbidInfoService/getScsbidListSttusServc` +
      `?serviceKey=${apiKey}` +
      `&numOfRows=${PAGE_SIZE}&pageNo=${page}&inqryDiv=1` +
      `&inqryBgnDt=${fromDate}&inqryEndDt=${toDate}&type=json`;

    const res = await fetch(rawUrl, { cache: "no-store" });
    const rawText = await res.text();
    let json: unknown;
    try {
      json = JSON.parse(rawText);
    } catch {
      throw new Error(`NARA API [HTTP ${res.status}] raw response: ${rawText.slice(0, 300)}`);
    }
    const body = (json as { response?: { body?: { items?: unknown; totalCount?: number } } })?.response?.body;
    if (page === 1) {
      firstBodyDebug = JSON.stringify({
        totalCount: body?.totalCount,
        itemsType: typeof body?.items,
        itemsValue: JSON.stringify(body?.items)?.slice(0, 100),
        httpStatus: res.status,
      });
    }
    // body.items may be an array directly OR wrapped as { item: [...] }
    const rawItems = Array.isArray(body?.items)
      ? body?.items
      : (body?.items as { item?: unknown } | undefined)?.item;

    if (!rawItems) break;
    const items: NaraAwardItem[] = Array.isArray(rawItems) ? rawItems : [rawItems];
    results.push(...items);

    const totalCount: number = Number(body?.totalCount ?? 0);
    if (results.length >= totalCount || items.length < PAGE_SIZE) break;
  }

  return { items: results, firstBodyDebug };
}

async function bulkUpsertAwards(
  supabase: ReturnType<typeof createServiceClient>,
  items: NaraAwardItem[]
): Promise<{ processed: number; skipped: number; errors: number; errMsg?: string }> {
  // 1. 유효한 항목만 필터 (낙찰률, 공고번호 필수)
  const validItems = items.filter(i => i.sucsfbidRate && i.bidNtceNo);
  if (validItems.length === 0) return { processed: 0, skipped: items.length, errors: 0 };

  // 2. bidNtceNo 목록으로 tenders 일괄 조회 (N개 SELECT → 1개 IN 쿼리)
  const noticeNos = [...new Set(validItems.map(i => i.bidNtceNo))];
  const { data: tenders, error: tErr } = await supabase
    .from("tenders")
    .select("id, source_tender_id")
    .in("source_tender_id", noticeNos);

  if (tErr) return { processed: 0, skipped: validItems.length, errors: 1, errMsg: `tender lookup: ${tErr.message}` };

  // 3. source_tender_id → tender.id 맵 구성
  const tenderMap = new Map<string, string>();
  for (const t of tenders ?? []) {
    if (t.source_tender_id) tenderMap.set(t.source_tender_id, t.id);
  }

  // 4. 매칭된 항목을 award 레코드 배열로 변환
  const rows = [];
  let skipped = items.length - validItems.length;
  for (const item of validItems) {
    const tenderId = tenderMap.get(item.bidNtceNo);
    if (!tenderId) { skipped++; continue; }
    const awardedAt = item.rlOpengDt ? parseNaraDate(item.rlOpengDt) : new Date().toISOString();
    rows.push({
      tender_id: tenderId,
      winner_company_name: item.bidwinnrNm || null,
      bidder_registration_no: item.bidwinnrBizno || null,
      bidder_company_name: item.bidwinnrNm || null,
      awarded_amount: item.sucsfbidAmt ? Number(item.sucsfbidAmt) : null,
      awarded_rate: Number(item.sucsfbidRate),
      opened_at: awardedAt,
      participant_count: item.prtcptCnum ? Number(item.prtcptCnum) : null,
      reserve_price: null,
      bid_notice_no: item.bidNtceNo,
      bid_notice_ord: item.bidNtceOrd || "00",
      result_status: "awarded" as const,
      sequence_no: 1,
      raw_json: item,
      updated_at: new Date().toISOString(),
    });
  }

  if (rows.length === 0) return { processed: 0, skipped: items.length, errors: 0 };

  // 5. 한 번의 bulk upsert
  const { error: uErr } = await supabase.from("awards").upsert(rows, {
    onConflict: "tender_id,bidder_registration_no,sequence_no",
    ignoreDuplicates: false,
  });

  if (uErr) return { processed: 0, skipped, errors: rows.length, errMsg: `bulk upsert: ${uErr.message}` };

  return { processed: rows.length, skipped, errors: 0 };
}

async function upsertAwardToTenders(
  supabase: ReturnType<typeof createServiceClient>,
  item: NaraAwardItem
): Promise<"ok" | "skipped"> {
  if (!item.sucsfbidRate || !item.bidNtceNo) return "skipped";

  const sourceBidNoticeId = `${item.bidNtceNo}-${item.bidNtceOrd || "00"}`;
  const awardedAt = item.rlOpengDt ? parseNaraDate(item.rlOpengDt) : new Date().toISOString();

  // tenders 매칭
  const { data: tender } = await supabase
    .from("tenders")
    .select("id")
    .or(`source_tender_id.eq.${item.bidNtceNo},source_tender_id.eq.${sourceBidNoticeId}`)
    .maybeSingle();

  if (!tender?.id) return "skipped"; // 공고 연결 불가 시 스킵

  await supabase.from("awards").upsert(
    {
      tender_id: tender.id,
      winner_company_name: item.bidwinnrNm || null,
      bidder_registration_no: item.bidwinnrBizno || null,
      awarded_amount: item.sucsfbidAmt ? Number(item.sucsfbidAmt) : null,
      awarded_rate: Number(item.sucsfbidRate),
      opened_at: awardedAt,
      participant_count: item.prtcptCnum ? Number(item.prtcptCnum) : null,
      reserve_price: null,
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
  return "ok";
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
