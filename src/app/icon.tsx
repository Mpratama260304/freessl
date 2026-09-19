import { ImageResponse } from "next/og";
import { site } from "@/config/site";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<div style={{ display: "flex", width: "100%", height: "100%", background: "#087457", color: "white", borderRadius: 16, fontSize: 43, fontWeight: 700, alignItems: "center", justifyContent: "center" }}>{site.logo.monogram}</div>, size);
}