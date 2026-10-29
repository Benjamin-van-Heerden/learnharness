"use client";

import { useEffect, useState } from "react";

/** FORK (UI rework): whole seconds since `running` last turned true, ticking
 *  once a second while it stays true; 0 otherwise. Live-only by design — a
 *  remount restarts it, so settled rows never show a duration. */
export function useElapsedSeconds(running: boolean): number {
	const [seconds, setSeconds] = useState(0);
	useEffect(() => {
		setSeconds(0);
		if (!running) return;
		const startedAt = Date.now();
		const timer = setInterval(() => setSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000);
		return () => clearInterval(timer);
	}, [running]);
	return seconds;
}
