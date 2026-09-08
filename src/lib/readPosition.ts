/**
 * One GPS fix, or a message that says what to do about the failure.
 *
 * Shared by both attendance screens rather than copied into each. The wording
 * of these errors is the whole value: "تعذّر تحديد موقعك" alone leaves someone
 * standing outside their office with nothing to try.
 *
 * `enableHighAccuracy` asks for the GPS rather than a coarse network fix, and
 * the long timeout is deliberate — a cold GPS start indoors genuinely takes
 * that long, and a short timeout just turns a slow fix into a false failure.
 */
export function readPosition(): Promise<{
  latitude: number;
  longitude: number;
  accuracy: number;
}> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("متصفحك لا يدعم تحديد الموقع"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }),
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new Error("تم رفض إذن الموقع. فعّل الإذن من إعدادات المتصفح ثم أعد المحاولة"));
        } else if (error.code === error.TIMEOUT) {
          reject(new Error("استغرق تحديد الموقع وقتاً طويلاً. تأكد من تفعيل GPS وحاول مرة أخرى"));
        } else {
          reject(new Error("تعذّر تحديد موقعك. تأكد من تفعيل خدمة الموقع وحاول مرة أخرى"));
        }
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  });
}
