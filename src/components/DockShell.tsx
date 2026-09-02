// The shell the reading column and the panel share.
//
// Two numbers drive everything: --dock-w, how much of the viewport the panel
// takes, and --col-content, how wide a line of the article ends up. The second
// is published because the figures size themselves from it: the course's box
// diagrams are drawn at one scale for the whole course, calibrated so the
// widest of them fills the column exactly, and that calibration used to be a
// literal that assumed a column of one fixed width.
//
// The dock opens at a width that leaves the column exactly as wide as it is
// with the panel closed, so opening it never moves the prose. Dragging past
// that narrows the column, down to COLUMN_FLOOR, and the figures follow: past
// the point where the measure still fits, the prose reflows narrower and the
// box diagrams pan inside their wrappers, the same way they do on a phone.

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { loadUiNumber, saveUi } from "../state/ui";
import { DOCK_MIN_VIEWPORT, TABS_FOLD, dockBounds, type DockState } from "./WorkbenchProvider";

const WIDTH_KEY = "dock-w";

/** The widest box diagram in the course, in its own units: Module 4's ripple
 * log. --fig-scale is what makes it exactly fill the column. */
const WIDEST_FIGURE_UNITS = 817;

/** Below this the box family stops shrinking and pans instead. */
const FIG_SCALE_MIN = 0.7589;

/** The on-this-page nav needs this much clear to the right of the column:
 * 190px of nav, a 28px gap, and 14px of margin. */
const TOC_GUTTER = 232;

export function DockShell({ dockState, children }: { dockState: DockState; children: ReactNode }) {
	const shellRef = useRef<HTMLDivElement>(null);
	const appRef = useRef<HTMLDivElement>(null);
	const [width, setWidth] = useState(() => loadUiNumber(WIDTH_KEY, 0));
	const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
	const [dragging, setDragging] = useState(false);
	const [tocMode, setTocMode] = useState<"gutter" | "bar">("gutter");

	const open = dockState === "dock";

	// Clamp whatever is stored to what this viewport can actually give, and
	// default to the width that leaves the column exactly where it is.
	const resolveWidth = useCallback(
		(stored: number, viewport = viewportWidth) => {
			const bounds = dockBounds(viewport);
			if (!stored) return bounds.preferred;
			return Math.max(bounds.min, Math.min(stored, bounds.max));
		},
		[viewportWidth],
	);

	const applied = open ? resolveWidth(width) : 0;

	// Publish both numbers on the root, where the stylesheet reads them.
	useEffect(() => {
		const root = document.documentElement;
		root.style.setProperty("--dock-w", `${applied}px`);
		const measure = () => {
			setViewportWidth(window.innerWidth);
			const app = appRef.current;
			const box = app?.getBoundingClientRect();
			// The content box, read rather than assumed: .app's padding is in rem
			// against a 19px root, so subtracting a constant leaves the figure
			// scale half a pixel out and every diagram very slightly small.
			const style = app ? getComputedStyle(app) : null;
			const gutters = style ? parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) : 0;
			const content = Math.max(320, (box?.width ?? window.innerWidth) - gutters);
			root.style.setProperty("--col-content", `${content}px`);
			const scale = Math.max(FIG_SCALE_MIN, content / WIDEST_FIGURE_UNITS);
			root.style.setProperty("--fig-scale", `${scale.toFixed(4)}px`);
			// The gutter nav is position: fixed, so its 100% is the viewport: with
			// the panel open it would paint underneath the panel and disappear.
			const spare = window.innerWidth - applied - (box?.right ?? 0);
			setTocMode(spare >= TOC_GUTTER && window.innerWidth - applied >= 1400 ? "gutter" : "bar");
		};
		measure();
		window.addEventListener("resize", measure);
		return () => window.removeEventListener("resize", measure);
	}, [applied]);

	const startDrag = useCallback((start: React.PointerEvent) => {
		start.preventDefault();
		setDragging(true);
		const bounds = dockBounds(window.innerWidth);
		const move = (e: PointerEvent) => {
			const next = Math.max(bounds.min, Math.min(window.innerWidth - e.clientX, bounds.max));
			setWidth(next);
		};
		const up = () => {
			window.removeEventListener("pointermove", move);
			window.removeEventListener("pointerup", up);
			setDragging(false);
			setWidth((w) => {
				saveUi(WIDTH_KEY, String(Math.round(w)));
				return w;
			});
		};
		window.addEventListener("pointermove", move);
		window.addEventListener("pointerup", up);
	}, []);

	const nudge = useCallback(
		(delta: number) => {
			const bounds = dockBounds(window.innerWidth);
			setWidth((w) => {
				const next = Math.max(bounds.min, Math.min(resolveWidth(w) + delta, bounds.max));
				saveUi(WIDTH_KEY, String(Math.round(next)));
				return next;
			});
		},
		[resolveWidth],
	);

	const columnWidth = viewportWidth - applied;
	const bounds = dockBounds(viewportWidth);

	return (
		<div
			className="shell"
			ref={shellRef}
			// The sheet covers the page and locks its scroll, so the page behind it
			// has to be genuinely out of reach: without this a screen reader swipes
			// straight past the panel into the module underneath, and Tab walks the
			// whole course. The dock is deliberately not inert, which is the point
			// of a dock.
			inert={dockState === "sheet" ? true : undefined}
			data-dock={dockState}
			data-toc={tocMode}
			data-narrow={open && columnWidth < TABS_FOLD ? "1" : undefined}
		>
			<div className="app" ref={appRef}>
				{children}
			</div>
			{open && (
				<div
					className={dragging ? "wb-grip wb-grip-dragging" : "wb-grip"}
					role="separator"
					aria-orientation="vertical"
					aria-label="How much room the workbench takes"
					aria-valuenow={Math.round(applied)}
					aria-valuemin={bounds.min}
					aria-valuemax={bounds.max}
					tabIndex={0}
					onPointerDown={startDrag}
					onKeyDown={(e) => {
						const step = e.key === "ArrowLeft" ? 32 : e.key === "ArrowRight" ? -32 : 0;
						if (!step) return;
						e.preventDefault();
						nudge(step);
					}}
				/>
			)}
		</div>
	);
}

/** The tab on the right edge that opens the panel when it is shut. Only where
 * the panel can dock: below that width the exercise cards are the way in, so
 * an edge tab would open a full-screen sheet from nowhere. */
export function DockHandle({ onOpen }: { onOpen(): void }) {
	const [wide, setWide] = useState(() => typeof window !== "undefined" && window.innerWidth >= DOCK_MIN_VIEWPORT);
	useEffect(() => {
		const onResize = () => setWide(window.innerWidth >= DOCK_MIN_VIEWPORT);
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, []);
	if (!wide) return null;
	return (
		<button className="wb-handle" onClick={onOpen}>
			Workbench
		</button>
	);
}
