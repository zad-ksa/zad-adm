/**
 * شكلُ صفّ الطلب المالي كما يعبر إلى مكوّن العميل.
 *
 * وموضعُه هنا لا في ملف الإجراءات: `"use server"` لا يُصدِّر إلا دالّاتٍ
 * غير متزامنة، والصفحةُ والاستطلاعُ يحتاجان الشكلَ والتحويلَ معاً — فلو كُتبا
 * مرّتين لافترقا، وهو الافتراقُ نفسُه الذي من أجله جُمع `REQUEST_INCLUDE`.
 */

import type { Prisma } from "@prisma/client";
import { REQUEST_INCLUDE } from "./requestQuery";

/** شكلُ التحميل: مظروفُ الطلب كما في الاعتمادات، ومعه تفاصيلُه المالية. */
export const FINANCIAL_INCLUDE = {
  ...REQUEST_INCLUDE,
  financial: true,
} satisfies Prisma.RequestInclude;

/** ما يكفي `toString()` — `Decimal` من Prisma يصلح له. */
type DecimalLike = { toString(): string };

type RawFinancial = {
  id: string;
  typeId: string | null;
  typeLabel: string;
  amount: DecimalLike;
  isTaxable: boolean;
  taxRate: DecimalLike | null;
  bankName: string | null;
  iban: string | null;
  accountNumber: string | null;
  serial: number;
};

/** التفاصيل المالية بعد التحويل — بلا `Decimal`. */
export type FinancialDetail = {
  id: string;
  typeId: string | null;
  typeLabel: string;
  amount: string;
  isTaxable: boolean;
  taxRate: string | null;
  bankName: string | null;
  iban: string | null;
  accountNumber: string | null;
  serial: number;
};

export type WithFinancial<T> = Omit<T, "financial"> & { financial: FinancialDetail | null };

/**
 * `Decimal` لا يعبر حدَّ الخادم إلى العميل — يُحوَّل نصاً هنا.
 *
 * ونصّاً لا رقماً عائماً: المبلغ قد يبلغ اثنتي عشرة خانةً وهللتين، وتحويلُه
 * إلى `number` في الطريق يُقحم خطأَ التمثيل العائم في وثيقةٍ مالية. ودالّات
 * `financialRequest.ts` تقرأ النصّ كما تقرأ الرقم.
 */
export function serialiseFinancialRows<T extends { financial: RawFinancial | null }>(
  rows: T[]
): WithFinancial<T>[] {
  return rows.map((row) => {
    const { financial, ...rest } = row;
    return {
      ...(rest as Omit<T, "financial">),
      financial: financial
        ? {
            id: financial.id,
            typeId: financial.typeId,
            typeLabel: financial.typeLabel,
            amount: financial.amount.toString(),
            isTaxable: financial.isTaxable,
            taxRate: financial.taxRate ? financial.taxRate.toString() : null,
            bankName: financial.bankName,
            iban: financial.iban,
            accountNumber: financial.accountNumber,
            serial: financial.serial,
          }
        : null,
    };
  });
}
