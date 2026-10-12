import type { Metadata } from "next";
import PaperLabClient from "./client";

export const metadata: Metadata = { title: "Paper lab — Paper Hours" };
export default function PaperLabPage() { return <PaperLabClient />; }
