
export interface IPromise<T> {
	resolve: (value: T) => void;
	reject: (reason: any) => void;
}

export enum SignalState {
	IsPending = 0,
	IsHandling = 1,
	IsSucceed = 2,
	IsCrashed = 4,
}

export interface IProgress {
	total: number
	count: number
	progress: number
	notifyProgress(total: number, count: number): void
}

export class ProgressInfo implements IProgress {
	public total: number = 1;
	public count: number = 0;
	public get progress(): number {
		if (this.total == 0) {
			return 0;
		}
		return this.count / this.total;
	}

	public set progress(value: number) {
		this.count = this.total * value;
	}

	notifyProgress(total: number, count: number): void {
		this.total = total;
		this.count = count;
	}
}

export interface IPausable {
	isPaused: boolean
}

export interface IRecoverable {
	isRecoverable: boolean
	abort(): void
	recover(): void
}

// 迭代模式
// export interface Iterable<T, F> {
// 	/**
// 	 * 初始调用
// 	 */
// 	handle: (arg: T) => F
// 	/**
// 	 * 迭代调用
// 	 */
// 	tick: () => 0 | 1 | 2
// }