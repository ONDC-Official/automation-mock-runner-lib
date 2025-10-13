/**
 * Performance monitoring utilities for MockRunner
 */

export interface PerformanceMetric {
	operationType: "generate" | "validate" | "requirements";
	actionId: string;
	executionTime: number;
	timestamp: string;
	success: boolean;
	memoryUsage?: NodeJS.MemoryUsage;
	codeComplexity?: number;
}

export class PerformanceMonitor {
	private static instance: PerformanceMonitor;
	private metrics: PerformanceMetric[] = [];
	private readonly maxMetrics = 1000;

	private constructor() {}

	static getInstance(): PerformanceMonitor {
		if (!PerformanceMonitor.instance) {
			PerformanceMonitor.instance = new PerformanceMonitor();
		}
		return PerformanceMonitor.instance;
	}

	recordMetric(metric: PerformanceMetric): void {
		this.metrics.push({
			...metric,
			memoryUsage: process.memoryUsage(),
			timestamp: new Date().toISOString(),
		});

		// Keep only recent metrics
		if (this.metrics.length > this.maxMetrics) {
			this.metrics = this.metrics.slice(-this.maxMetrics);
		}
	}

	getMetrics(
		operationType?: PerformanceMetric["operationType"],
	): PerformanceMetric[] {
		if (operationType) {
			return this.metrics.filter((m) => m.operationType === operationType);
		}
		return [...this.metrics];
	}

	getAverageExecutionTime(
		operationType: PerformanceMetric["operationType"],
	): number {
		const relevantMetrics = this.getMetrics(operationType);
		if (relevantMetrics.length === 0) return 0;

		const total = relevantMetrics.reduce(
			(sum, metric) => sum + metric.executionTime,
			0,
		);
		return total / relevantMetrics.length;
	}

	getSlowOperations(thresholdMs: number = 1000): PerformanceMetric[] {
		return this.metrics.filter((metric) => metric.executionTime > thresholdMs);
	}

	getSummary(): {
		totalOperations: number;
		averageExecutionTime: number;
		slowOperations: number;
		successRate: number;
		memoryTrend: "increasing" | "decreasing" | "stable";
	} {
		const totalOps = this.metrics.length;
		const avgTime =
			totalOps > 0
				? this.metrics.reduce((sum, m) => sum + m.executionTime, 0) / totalOps
				: 0;
		const slowOps = this.getSlowOperations().length;
		const successfulOps = this.metrics.filter((m) => m.success).length;
		const successRate = totalOps > 0 ? (successfulOps / totalOps) * 100 : 0;

		// Simple memory trend analysis
		let memoryTrend: "increasing" | "decreasing" | "stable" = "stable";
		if (this.metrics.length > 10) {
			const recentMetrics = this.metrics.slice(-10);
			const firstMemory = recentMetrics[0]?.memoryUsage?.heapUsed || 0;
			const lastMemory =
				recentMetrics[recentMetrics.length - 1]?.memoryUsage?.heapUsed || 0;
			const diff = lastMemory - firstMemory;
			const threshold = firstMemory * 0.1; // 10% threshold

			if (diff > threshold) {
				memoryTrend = "increasing";
			} else if (diff < -threshold) {
				memoryTrend = "decreasing";
			}
		}

		return {
			totalOperations: totalOps,
			averageExecutionTime: Math.round(avgTime * 100) / 100,
			slowOperations: slowOps,
			successRate: Math.round(successRate * 100) / 100,
			memoryTrend,
		};
	}

	clearMetrics(): void {
		this.metrics = [];
	}

	// Helper method to create performance timer
	createTimer(
		operationType: PerformanceMetric["operationType"],
		actionId: string,
	) {
		const startTime = Date.now();

		return {
			finish: (success: boolean, codeComplexity?: number) => {
				const executionTime = Date.now() - startTime;
				this.recordMetric({
					operationType,
					actionId,
					executionTime,
					success,
					codeComplexity,
					timestamp: new Date().toISOString(),
				});
				return executionTime;
			},
		};
	}
}
