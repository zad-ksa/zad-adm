"use client";

import { charityPermissionGroups } from "@/lib/charityPermissions";
import { cx } from "@/components/console/ui";

/**
 * مُنتقي وصولِ حسابِ جمعية: خدماتُه، ثمّ صلاحيّاتُ كلِّ خدمةٍ تحتها.
 *
 * **والترتيبُ هو المعنى**: الصلاحيّةُ تتبع خدمةً ولا تعمل إلا والخدمةُ مفوَّضة،
 * فعرضُها قبل اختيار خدمتها منحٌ لما لا يعمل. وكان المُنتقي كتالوجاً ثابتاً
 * يُعرض كلُّه لكلِّ جمعيةٍ — فتُمنح صلاحيّةُ حوكمةٍ لجمعيةٍ لا تشملها الخدمة.
 *
 * ومشتركٌ بين إنشاء الحساب وتعديل وصوله: نسختان تفترقان عند أوّل صلاحيّةٍ
 * تُضاف، فيُنشأ الحسابُ بما لا يُعدَّل.
 */
export default function AccessPicker({
  charityServices,
  services,
  permissions,
  onServices,
  onPermissions,
  disabled,
}: {
  /** خدماتُ زادٍ المقدَّمةُ لهذه الجمعية. */
  charityServices: string[];
  services: string[];
  permissions: string[];
  onServices: (next: string[]) => void;
  onPermissions: (next: string[]) => void;
  disabled?: boolean;
}) {
  const groups = charityPermissionGroups(services);

  const toggleService = (name: string) => {
    const next = services.includes(name) ? services.filter((s) => s !== name) : [...services, name];
    // وتُنقّى الصلاحيّاتُ التي لا تبقى لها خدمة: قيمةٌ تَثبُت في الصفِّ ولا يظهر
    // لها مربَّعٌ يُلغيها أسوأُ من قيمةٍ لا تُمنح.
    const allowed = new Set(charityPermissionGroups(next).flatMap((g) => g.permissions.map((p) => p.id)));
    onServices(next);
    onPermissions(permissions.filter((id) => allowed.has(id)));
  };

  const togglePermission = (id: string) => {
    onPermissions(permissions.includes(id) ? permissions.filter((p) => p !== id) : [...permissions, id]);
  };

  const chip = (active: boolean) =>
    cx(
      "flex items-start gap-2 rounded-xl border p-2.5 text-start text-caption font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
      disabled && "opacity-50",
      active
        ? "border-primary/40 bg-primary/[0.06] text-primary dark:text-teal-400"
        : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
    );

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1.5 text-caption font-semibold text-slate-700 dark:text-slate-300">
          خدمات زاد المفوَّض بها
        </p>
        {charityServices.length === 0 ? (
          <p className="text-caption text-slate-400">لا خدماتٍ مسجَّلةً لهذه الجمعية.</p>
        ) : (
          <div className="grid gap-1.5 sm:grid-cols-2">
            {charityServices.map((name) => (
              <button
                key={name}
                type="button"
                disabled={disabled}
                onClick={() => toggleService(name)}
                aria-pressed={services.includes(name)}
                className={chip(services.includes(name))}
              >
                <span>{name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="mb-1.5 text-caption font-semibold text-slate-700 dark:text-slate-300">
          الصلاحيات داخل الجمعية
        </p>
        {groups.length === 0 ? (
          <p className="text-caption text-slate-400">اختر خدمةً أعلاه لتظهر صلاحيّاتُها.</p>
        ) : (
          <div className="space-y-3">
            {groups.map((group) => (
              <div key={group.title}>
                <p className="mb-1.5 text-caption font-semibold text-slate-400 dark:text-slate-500">
                  {group.title}
                </p>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {group.permissions.map((permission) => (
                    <button
                      key={permission.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => togglePermission(permission.id)}
                      aria-pressed={permissions.includes(permission.id)}
                      className={chip(permissions.includes(permission.id))}
                    >
                      <span className="block">
                        <span className="block">{permission.label}</span>
                        {permission.hint && (
                          <span className="mt-0.5 block text-caption font-normal text-slate-400">
                            {permission.hint}
                          </span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
