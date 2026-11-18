"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { btn, cx, field } from "@/components/console/ui";
import { Sheet } from "@/components/console/overlays";
import { confirmAction } from "@/components/console/confirmBus";
import { deletePortalDonorAccount, savePortalDonorAccount } from "@/app/actions/charityFundraising";

export type AccountTarget = {
  id: string;
  name: string;
  username: string | null;
  password: string | null;
};

/**
 * لوحةُ حساب الجمعية عند جهةٍ مانحة — واحدةٌ لجدول الجهات ولملفِّ الجهة.
 *
 * **ولمَ مشتركة**: كان تعديلُ الحساب من ملفِّ الجهة يُعيد صاحبَه إلى الجدول
 * ليجده هناك — رحلةُ صفحتين لتصحيح كلمةِ مرور. والنسختان كانتا ستفترقان عند
 * أوّل تعديلٍ في إحداهما.
 *
 * وكلمةُ المرور تُعرض نصّاً في الحقل لا نقاطاً: من يفتح هذه اللوحة يُحرِّرها،
 * ومن حرَّر سرّاً لا يراه كتبه مرّتين.
 */
export default function AccountSheet({
  charityId,
  donor,
  busy,
  onClose,
  onRun,
}: {
  charityId: string;
  donor: AccountTarget;
  busy: boolean;
  onClose: () => void;
  onRun: (fn: () => Promise<{ ok: boolean; error?: string }>) => void;
}) {
  const [username, setUsername] = useState(donor.username ?? "");
  const [password, setPassword] = useState(donor.password ?? "");

  return (
    <Sheet
      title={donor.name}
      subtitle="حساب الجمعية عند هذه الجهة — يحفظ مشفرا، ويراه فريق زاد كما تكتبينه هنا."
      onClose={onClose}
      busy={busy}
      onSubmit={() => onRun(() => savePortalDonorAccount(charityId, donor.id, username, password))}
      footer={
        <>
          <div>
            {donor.username && (
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  if (
                    await confirmAction({
                      title: "حذف الحساب؟",
                      message: "يحذف اسم المستخدم وكلمة المرور من الموقع. والحساب عند الجهة يبقى كما هو.",
                      confirmLabel: "حذف",
                      tone: "danger",
                    })
                  ) {
                    onRun(() => deletePortalDonorAccount(charityId, donor.id));
                  }
                }}
                className={cx(btn.secondary, "text-rose-600 dark:text-rose-400")}
              >
                <Trash2 className="size-4" /> حذف الحساب
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} disabled={busy} className={btn.secondary}>
              إلغاء
            </button>
            <button type="submit" disabled={busy || !username.trim() || !password.trim()} className={btn.primary}>
              حفظ
            </button>
          </div>
        </>
      }
    >
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-caption font-semibold text-slate-500 dark:text-slate-400">
            اسم المستخدم
          </span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} className={field} dir="ltr" />
        </label>
        <label className="block">
          <span className="mb-1 block text-caption font-semibold text-slate-500 dark:text-slate-400">
            كلمة المرور
          </span>
          <input value={password} onChange={(e) => setPassword(e.target.value)} className={field} dir="ltr" />
        </label>
      </div>
    </Sheet>
  );
}
