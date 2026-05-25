import { useRef, useEffect } from "react";

type LpPoint = {
  createdAt: string;
  lp: number | null;
  mr: number | null;
  result: "win" | "loss";
};

export function LpChart({ data, mode }: { data: LpPoint[]; mode: "lp" | "mr" }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Get container width for responsive sizing
    const container = canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    const width = container ? container.clientWidth : 300;
    const height = 200;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Filter valid points
    const points = data.filter(d => (mode === "lp" ? d.lp : d.mr) != null);
    if (points.length === 0) {
      ctx.fillStyle = "#8888aa";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("No data", width / 2, height / 2);
      return;
    }

    const values = points.map(p => (mode === "lp" ? p.lp! : p.mr!));
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;

    const padding = { top: 20, right: 16, bottom: 30, left: 50 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Get theme
    const isDark = document.documentElement.getAttribute("data-theme") !== "light";
    const textColor = isDark ? "#8888aa" : "#666688";
    const gridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
    const lineColor = "#e94560";

    // Y-axis labels and grid
    ctx.fillStyle = textColor;
    ctx.font = "11px sans-serif";
    ctx.textAlign = "right";
    const ySteps = 4;
    for (let i = 0; i <= ySteps; i++) {
      const val = minVal + (range * i) / ySteps;
      const y = padding.top + chartH - (chartH * i) / ySteps;
      ctx.fillText(Math.round(val).toString(), padding.left - 8, y + 4);
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    // X-axis labels (show first, middle, last dates)
    ctx.textAlign = "center";
    ctx.fillStyle = textColor;
    const dateIndices = [0, Math.floor(points.length / 2), points.length - 1];
    for (const idx of dateIndices) {
      if (idx >= 0 && idx < points.length) {
        const x = padding.left + (chartW * idx) / Math.max(points.length - 1, 1);
        const date = new Date(points[idx].createdAt);
        const label = `${date.getMonth() + 1}/${date.getDate()}`;
        ctx.fillText(label, x, height - 8);
      }
    }

    // Draw line
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.beginPath();
    points.forEach((p, i) => {
      const val = mode === "lp" ? p.lp! : p.mr!;
      const x = padding.left + (chartW * i) / Math.max(points.length - 1, 1);
      const y = padding.top + chartH - ((val - minVal) / range) * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw dots
    points.forEach((p, i) => {
      const val = mode === "lp" ? p.lp! : p.mr!;
      const x = padding.left + (chartW * i) / Math.max(points.length - 1, 1);
      const y = padding.top + chartH - ((val - minVal) / range) * chartH;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = p.result === "win" ? "#00c853" : "#e94560";
      ctx.fill();
    });

  }, [data, mode]);

  return <canvas ref={canvasRef} className="lp-chart-canvas" />;
}
