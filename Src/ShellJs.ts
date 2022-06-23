
import * as shelljs from "shelljs"
import * as cp from "child_process"

export class ShellResult {
	stdout: string
	stderr?: string
	error?: Error
	code: number
}

export class ShellTask {
	result: ShellResult = new ShellResult();
	task: Promise<ShellResult>
}

export class ShellJS {
	exec(cmd: string) {
		var shellTask = new ShellTask();
		shellTask.task = new Promise((resolve, reject) => {
			var ret = new ShellResult()
			shellTask.result = ret

			var p = cp.exec(cmd, (err, stdout, stderr) => {
				ret.stdout = stdout
				ret.code = p.exitCode
				if (err != null) {
					ret.error = err
				}
				if (stderr != null) {
					ret.stderr = stderr
				}
				resolve(ret);
			})
		});
		return shellTask
	}
}

export const shell = new ShellJS()

