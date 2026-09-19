import { ImageResponse } from "next/og";
import { site } from "@/config/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Free SSL certificates through Let's Encrypt. No account required.";

export default function OpenGraphImage() {
  return new ImageResponse(<div style={{ display: "flex", flexDirection: "column", background: "#f3f8f5", width: "100%", height: "100%", padding: 80, color: "#162b24", justifyContent: "space-between" }}><div style={{ display: "flex", fontSize: 36, color: "#087457" }}>{site.name}.</div><div style={{ display: "flex", flexDirection: "column" }}><div style={{ fontSize: 76, fontWeight: 700 }}>Free SSL certificates.</div><div style={{ fontSize: 52, color: "#087457" }}>Zero unnecessary steps.</div></div><div style={{ display: "flex", fontSize: 26 }}>Let&apos;s Encrypt | No account required | DNS + HTTP validation</div></div>, size);
}