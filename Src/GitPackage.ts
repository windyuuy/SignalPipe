
import * as fs from "fs"
import * as fse from "fs-extra"
import { shell, ShellResult } from "./ShellJs";
import semver from "semver"

export class FetchTagResult {
	commitId: string
	fullTagName: string
	tag: string
}

export class FetchNewTagResult {
	latestTag: FetchTagResult
	existNewTag: boolean = false
}

export class CloneRepoResult {
	url: string
	localPath: string

	asGitLocalRepo() {
		var localRepo = new GitLocalRepo()
		localRepo.fetchUrl = this.url
		localRepo.pushUrl = this.url
		localRepo.localPath = this.localPath
		return localRepo
	}
}

export class FetchCmdResult<T>{
	constructor(
		public isOk: boolean = false,
		public result: T,
		public error: any = null,
	) {

	}

	public static fromFailedShellTask<T>(result: ShellResult): FetchCmdResult<T> {
		var ret = new FetchCmdResult(result.code == 0, null, result.error)
		return ret;
	}

	adapt<T>() {
		return this as any as T
	}
}

export type AsyncFetchCmdResult<T> = Promise<FetchCmdResult<T>>

export class GitRemoteRepo {

	private _url: string;
	public get url(): string {
		return this._url;
	}
	public set url(value: string) {
		this._url = value;
	}

	public async checkNewTag(curTag: string): AsyncFetchCmdResult<FetchNewTagResult> {
		var result = await this.fetchLatestTag()
		if (result.isOk) {
			var newResult = new FetchNewTagResult()
			newResult.latestTag = result.result
			if (semver.gt(result.result.tag, curTag)) {
				newResult.existNewTag = true
				return new FetchCmdResult(true, newResult)
			} else {
				newResult.existNewTag = false
				return new FetchCmdResult(false, newResult, new Error("no newer tag"))
			}
		} else {
			// return new FetchCmdResult(false, null, result.error)
			return result.adapt()
		}
	}
	public async fetchLatestTag(): AsyncFetchCmdResult<FetchTagResult> {
		var result = await this.fetchTags()
		if (result.isOk) {
			var tags = result.result
			if (tags.length > 0) {
				var latestTag: FetchTagResult = tags[tags.length - 1]
				for (var i = tags.length - 1; i >= 0; i--) {
					var tag = tags[i]
					if (semver.valid(tag.tag)) {
						latestTag = tag
						i--
						break
					}
				}
				for (; i >= 0; i--) {
					var tag = tags[i]
					if (semver.valid(tag.tag)) {
						if (semver.gt(tag.tag, latestTag.tag)) {
							latestTag = tag
						}
					}
				}
				if (latestTag != null) {
					return new FetchCmdResult(true, latestTag)
				} else {
					return new FetchCmdResult(false, null, new Error("no valid tag"))
				}
			} else {
				return new FetchCmdResult(false, null, new Error("no tag to filter"))
			}
		} else {
			// return new FetchCmdResult(false, null, result.error)
			return result.adapt()
		}
	}

	/**
	 * 获取tags
	 */
	public async fetchTags(): AsyncFetchCmdResult<FetchTagResult[]> {
		var cmd = `git ls-remote -t ${this._url}`
		var ret = await shell.exec(cmd).task
		if (ret.error) {
			return FetchCmdResult.fromFailedShellTask(ret)
		}
		var lines = ret.stdout.split("\n");
		var tagResults = lines.map(line => {
			var parts = /(\w+)\s+(.+)/.exec(line)
			if (parts != null) {
				var tagInfo = new FetchTagResult()
				tagInfo.commitId = parts[1]
				tagInfo.fullTagName = parts[2]
				var tagPrefix = "refs/tags/"
				if (tagInfo.fullTagName.startsWith(tagPrefix)) {
					tagInfo.tag = tagInfo.fullTagName.substring(tagPrefix.length)
				}
				return tagInfo
			}
			return null
		}).filter(r => r != null)
		return new FetchCmdResult(true, tagResults)
	}

	public async cloneBranch(branch: string, dest: string): AsyncFetchCmdResult<CloneRepoResult> {
		var cmd = `git clone -b ${branch} ${this.url} ${dest}`
		var ret = await shell.exec(cmd).task
		if (ret.error) {
			return FetchCmdResult.fromFailedShellTask(ret)
		}
		var result = new CloneRepoResult()
		result.url = this.url
		result.localPath = dest
		return new FetchCmdResult(true, result)
	}

	public async cloneDefaultBranch(dest: string): AsyncFetchCmdResult<CloneRepoResult> {
		var cmd = `git clone ${this.url} ${dest}`
		var ret = await shell.exec(cmd).task
		if (ret.error) {
			return FetchCmdResult.fromFailedShellTask(ret)
		}
		var result = new CloneRepoResult()
		result.url = this.url
		result.localPath = dest
		return new FetchCmdResult(true, result)
	}

}

export class GitLocalRepo {
	public localPath: string
	public fetchUrl: string
	public pushUrl: string

	public static async fromRemoteRepo(fetchUrl: string, branch: string, localPath: string): AsyncFetchCmdResult<GitLocalRepo> {
		var remoteRepo = new GitRemoteRepo()
		remoteRepo.url = fetchUrl
		var result: FetchCmdResult<CloneRepoResult>
		if (branch == null) {
			result = await remoteRepo.cloneDefaultBranch(localPath)
		} else {
			result = await remoteRepo.cloneBranch(branch, localPath)
		}
		if (!result.isOk) {
			// return new FetchCmdResult(false, null, result.error)
			return result.adapt()
		}
		var localRepo = result.result.asGitLocalRepo()
		return new FetchCmdResult(true, localRepo)
	}
	public static async fromLocalRepo(localPath: string): AsyncFetchCmdResult<GitLocalRepo> {
		var localRepo = new GitLocalRepo()
		localRepo.localPath = localPath
		var result = await localRepo.updateRemoteUrls()
		if (!result.isOk) {
			// return new FetchCmdResult(false, null, result.error)
			return result.adapt()
		}
		return new FetchCmdResult(true, localRepo)
	}

	public async updateRemoteUrls(): AsyncFetchCmdResult<boolean> {
		var dest: string = this.localPath
		var cmd = `git -C ${dest} remote -v`
		var ret = await shell.exec(cmd).task
		if (ret.error) {
			return FetchCmdResult.fromFailedShellTask(ret)
		}
		var lines = ret.stdout.split("\n")
		var ms = lines.map(l => {
			var m = /(\w+)\s+([^\s]+)\s+\((\w+)\)/.exec(l)
			return m
		}).filter(m => m != null)
		for (var m of ms) {
			var urlType = m[3]
			var url = m[2]
			if (urlType == "fetch") {
				this.fetchUrl = url
			} else if (urlType == "push") {
				this.pushUrl = url
			}
		}
		return new FetchCmdResult(true, true)
	}

	public async switchBranch(branch: string): AsyncFetchCmdResult<boolean> {
		var dest: string = this.localPath
		var cmd = `git -C ${dest} switch --detach ${branch}`
		var ret = await shell.exec(cmd).task
		if (ret.error) {
			return FetchCmdResult.fromFailedShellTask(ret)
		}
		return new FetchCmdResult(true, true)
	}

	public async checkoutBranch(branch: string, newBranch: string = branch): AsyncFetchCmdResult<boolean> {
		var dest: string = this.localPath
		var cmd: string
		if (branch == newBranch) {
			cmd = `git -C ${dest} checkout --detach ${branch}`
		} else {
			cmd = `git -C ${dest} checkout --detach -b ${newBranch} ${branch}`
		}
		var ret = await shell.exec(cmd).task
		if (ret.error) {
			return FetchCmdResult.fromFailedShellTask(ret)
		}
		return new FetchCmdResult(true, true)
	}

	public async destroy() {
		return await this.deleteFolder()
	}
	public async deleteFolder(): AsyncFetchCmdResult<boolean> {
		var dest: string = this.localPath
		return GitLocalRepo.deleteFolder(dest)
	}
	/**
	 * 删除目录
	 * @param dest 
	 * @returns 如果删除成功或者目录已经不存在, 那么返回成功
	 */
	public static async deleteFolder(dest: string): AsyncFetchCmdResult<boolean> {
		try {
			await fse.remove(dest)
			return new FetchCmdResult(true, true)
		} catch (err) {
			if (typeof (err) == "object" && (err as any)["code"] == 'EBUSY') {
				try {
					await shell.exec("taskkill /f /t /im git.exe").task
					await fse.remove(dest)
					return new FetchCmdResult(true, true)
				} catch {
					return new FetchCmdResult(false, false, err)
				}
			} else {
				return new FetchCmdResult(false, false, err)
			}
		}
	}

}
