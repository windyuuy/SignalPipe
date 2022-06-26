
import * as fse from "fs-extra"
import * as fs from "fs"
import * as path from "path"

export class FSListenTask {
	key: string
	fromDir: string
	toDir: string
	fsWatcher: fse.FSWatcher
	cleanId: () => void
	task: Promise<void>
}

export class FSConn {
	changeRoute: Map<string, FSListenTask> = new Map()
	changeSignals: Map<string, Promise<void>[]> = new Map()
	getChanges(url: string): Promise<void>[] {
		if (this.changeSignals.has(url)) {
			return this.changeSignals.get(url)
		} else {
			var info: Promise<void>[] = []
			this.changeSignals.set(url, info)
			return info
		}
	}
	async handleChanges(key: string, sourceDir: string, destDir: string, filepath: string, evt: fse.WatchEventType) {
		let lastPromise: Promise<void>
		let changeSignals = this.getChanges(key)
		if (changeSignals.length > 0) {
			lastPromise = changeSignals[changeSignals.length - 1]
		} else {
			lastPromise = Promise.resolve()
		}
		var resolve1: () => void
		var reject1: (err: Error) => void
		var p = new Promise<void>((resolve, reject) => {
			resolve1 = resolve
			reject1 = reject
		})
		changeSignals.push(p)
		var _handleChange = () => {
			var from = path.join(sourceDir, filepath)
			var dest = path.join(destDir, filepath)
			if (evt == "change") {
				fs.copyFile(from, dest, (err) => {
					if (err != null) {
						reject1(err);
					} else {
						resolve1()
					}
				})
			} else if (evt == "rename") {
				fs.access(from, (err) => {
					if (err != null) {
						if (err.code == "ENOENT") {
							fs.access(dest, (err) => {
								if (err != null) {
									if (err.code == "ENOENT") {
										resolve1()
									} else {
										reject1(err)
									}
								} else {
									fs.rm(dest, (err) => {
										if (err != null) {
											if (err.code == "ENOENT") {
												resolve1()
											} else {
												reject1(err)
											}
										} else {
											resolve1()
										}
									})
								}
							})
						} else {
							reject1(err)
						}
					} else {
						fs.copyFile(from, dest, (err) => {
							if (err != null) {
								reject1(err)
							} else {
								resolve1()
							}
						})
					}
				})
			} else {
				reject1(Error(`unkonwn WatchEventType: ${evt}`))
			}
			return p
		}
		var handleChange = () => {
			var p = _handleChange()
			p.then(() => {
				this.changeSignals.delete(key)
			})
			return p
		}
		lastPromise.then(() => {
			return handleChange()
		}, (reason) => {
			console.error("apply route failed", reason)
			return handleChange()
		})

	}

	syncDirectory(fromDir: string, toDir: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			fs.cp(fromDir, toDir, {
				recursive: true,
				// force: true,
			}, (err) => {
				if (err != null) {
					reject(err)
				} else {
					resolve()
				}
			})
		})
	}

	toKey(fromDir: string, toDir: string) {
		var key = `${fromDir}#${toDir}`
		return key
	}
	connectDirectory(fromDir: string, toDir: string): FSListenTask {
		var key = this.toKey(fromDir, toDir)
		if (this.changeRoute.has(key)) {
			return this.changeRoute.get(key)
		}

		var info = new FSListenTask()
		info.key = key
		info.fromDir = fromDir
		info.toDir = toDir
		var task = new Promise<void>(async (resolve, reject) => {
			await this.syncDirectory(fromDir, toDir)
			var fsWatcher = fs.watch(fromDir, null, (evt, filepath: string) => {
				this.handleChanges(key, fromDir, toDir, filepath, evt)
			})
			info.cleanId = async () => {
				info.cleanId = null
				fsWatcher.close()
				if (this.changeSignals.has(key)) {
					var changeSignals = this.changeSignals.get(key)
					this.changeSignals.delete(key)
					await Promise.all(changeSignals)
				}
				this.changeRoute.delete(key)
				resolve()
			}
			this.changeRoute.set(key, info)
		})
		info.task = task
		return info
	}

	disconnectDirectory(key: string): void
	disconnectDirectory(fromDir: string, toDir: string): void
	disconnectDirectory(fromDir: string, toDir?: string) {
		var key = fromDir
		if (toDir != null) {
			key = this.toKey(fromDir, toDir)
		}
		if (this.changeRoute.has(key)) {
			let info = this.changeRoute.get(key)
			if (typeof (info.cleanId) == "function") {
				info.cleanId()
			}
		}
	}
}
