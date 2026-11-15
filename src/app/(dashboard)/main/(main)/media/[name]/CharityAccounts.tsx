"use client";

import { useState, useTransition } from "react";
import { AtSign, Pencil } from "lucide-react";
import { btn, cx, field } from "@/components/console/ui";
import { Sheet, FooterStatus } from "@/components/console/overlays";
import { notify } from "@/components/console/toastBus";
import { PlatformMark, type PlatformLike } from "@/components/console/PlatformMark";
import { saveCharityMediaAccounts } from "@/app/actions/mediaPlan";

/**
 * حساباتُ الجمعية في المنصّات: أيقونةٌ لكلِّ منصّةٍ لها رابط، تفتحه في تبويبٍ
 * جديد بنقرة — وزرٌّ صغيرٌ يفتح لوحةَ الروابط لتعديلها.
 */

type Platform = PlatformLike & { id: string; isActive: boolean };
type Account = { platformKey: string; url: string };

export default function CharityAccounts({
  charityId,
  charityName,
  platforms,
  initialAccounts,
}: {
  charityId: string;
  charityName: string;
  platforms: Platform[];
  initialAccounts: Account[];
}) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [editing, setEditing] = useState(false);

  const urlOf = new Map(accounts.map((a) => [a.platformKey, a.url]));
  // بترتيب المنصّات لا بترتيب الإدخال، ومنصّةٌ معطَّلةٌ يبقى رابطُها ظاهراً.
  const linked = platforms.filter((p) => urlOf.has(p.key));

  return (
    <div className="flex flex-wrap items-center gap-1">
      {linked.map((platform) => (
        <a
          key={platform.key}
          href={urlOf.get(platform.key)}
          target="_blank"
          rel="noopener noreferrer"
          title={`${platform.name} — ${charityName}`}
          aria-label={`حساب ${charityName} في ${platform.name}`}
          className="grid size-9 place-items-center rounded-lg border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <PlatformMark platform={platform} size={18} />
        </a>
      ))}
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={cx(btn.ghost, linked.length ? "size-9 justify-center p-0" : "h-9")}
        title="روابط حسابات الجمعية"
        aria-label="تعديل روابط حسابات الجمعية"
      >
        {linked.length ? (
          <Pencil className="size-3.5" />
        ) : (
          <>
            <AtSign className="size-4" />
            حسابات الجمعية
          </>
        )}
      </button>

      {editing && (
        <AccountsSheet
          charityId={charityId}
          charityName={charityName}
          platforms={platforms.filter((p) => p.isActive || urlOf.has(p.key))}
          accounts={urlOf}
          onClose={() => setEditing(false)}
          onSaved={(next) => {
            setAccounts(next);
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}

function AccountsSheet({
  charityId,
  charityName,
  platforms,
  accounts,
  onClose,
  onSaved,
}: {
  charityId: string;
  charityName: string;
  platforms: Platform[];
  accounts: Map<string, string>;
  onClose: () => void;
  onSaved: (next: Account[]) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(platforms.map((p) => [p.key, accounts.get(p.key) ?? ""]))
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const save = () => {
    setError(null);
    start(async () => {
      const result = await saveCharityMediaAccounts(charityId, values);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      notify("ok", "حُفظت روابط الحسابات");
      onSaved(result.accounts ?? []);
    });
  };

  return (
    <Sheet
      title="حسابات الجمعية"
      subtitle={`روابط ${charityName} في المنصّات — الفارغُ لا يظهر`}
      leading={<AtSign className="size-4 text-primary" />}
      onClose={onClose}
      busy={pending}
      footer={
        <FooterStatus error={error}>
          <button type="button" onClick={onClose} className={btn.ghost}>
            إلغاء
          </button>
          <button type="button" onClick={save} className={btn.primary} disabled={pending}>
            حفظ
          </button>
        </FooterStatus>
      }
    >
      <ul className="space-y-2">
        {platforms.map((platform) => (
          <li key={platform.key} className="flex items-center gap-2.5">
            <span className="flex w-28 shrink-0 items-center gap-2">
              <PlatformMark platform={platform} size={18} />
              <span className="truncate text-meta font-medium">{platform.name}</span>
            </span>
            <input
              value={values[platform.key] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [platform.key]: e.target.value }))}
              placeholder="https://..."
              dir="ltr"
              inputMode="url"
              aria-label={`رابط الحساب في ${platform.name}`}
              className={cx(field, "min-w-0 flex-1 text-left")}
            />
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
