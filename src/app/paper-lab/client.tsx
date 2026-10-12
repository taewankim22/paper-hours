"use client";
import dynamic from "next/dynamic";
const PaperLab = dynamic(() => import("../../paper-lab/PaperLab"), { ssr: false });
export default function PaperLabClient() { return <PaperLab />; }
