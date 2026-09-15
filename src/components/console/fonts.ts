import { Geist, Geist_Mono } from "next/font/google";

// خطوط لوحات الإدارة: Geist للحروف اللاتينية والأرقام، وGeist Mono للمعرّفات
// والعدّادات، ويبقى Cairo للعربية من خط الموقع. تُحمَّل في الصفحات التي تستعملها
// وحدها، لا في الموقع كله.
const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

/** يوضع على غلاف الصفحة. */
export const consoleFontClass = `${geist.variable} ${geistMono.variable} [font-family:var(--font-geist),var(--font-cairo),sans-serif]`;
