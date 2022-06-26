import * as gaze from "gaze";


export interface IGazeEmitter {
	on(key: "changed", call: (filepath: string) => void): void;
	on(key: "added", call: (filepath: string) => void): void;
	on(key: "deleted", call: (filepath: string) => void): void;
	on(key: "all", call: (obj?: string | Error) => void): void;
	on(key: "error", call: (err: Error) => void): void;
	on(key: "ready", call: (watcher: gaze.Gaze) => void): void;
	on(key: "end", call: () => void): void;
	on(key: "nomatch", call: () => void): void;
}
