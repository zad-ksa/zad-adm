import { splitHashtags } from "@/lib/hashtags";
import { cx } from "./ui";

/**
 * نص يعرض كما كتب، وهاشتاقاته بالازرق.
 *
 * فالهاشتاق يكتب ضمن نص المنشور ولا حقل له، وهو ما ينسخه مسؤول الاعلام ليلصقه
 * في المنصة — فتمييزه بالعين يختصر قراءة النص كله بحثا عنه.
 *
 * والازرق هنا لون معنى لا لون زينة: هو لون الهاشتاق في منصات النشر كلها، فيقرأ
 * في المنصة كما قرئ في الخطة.
 *
 * ولا `dangerouslySetInnerHTML`: النص يكتبه موظف او عضو جمعية، ويعرض على
 * الاخر — فيبنى عنصرا عنصرا، ولا يفسر منه شيء.
 */
export default function HashtagText({
  text,
  className,
}: {
  text: string | null | undefined;
  className?: string;
}) {
  const pieces = splitHashtags(text);
  if (pieces.length === 0) return null;

  return (
    <span className={cx("whitespace-pre-wrap", className)}>
      {pieces.map((piece, index) =>
        piece.tag ? (
          <span key={index} className="font-medium text-sky-600 dark:text-sky-400">
            {piece.text}
          </span>
        ) : (
          <span key={index}>{piece.text}</span>
        )
      )}
    </span>
  );
}
