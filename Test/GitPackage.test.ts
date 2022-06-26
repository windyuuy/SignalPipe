
import { GitLocalRepo, GitRemoteRepo } from "../Src/GitPackage"

test("fetchTags", async () => {
	var gp = new GitRemoteRepo()
	gp.url = "https://github.com/deathcap/shellasync.git"
	var tags = await gp.fetchTags()
	console.log(tags.result[0].commitId);
})

test("cloneBranch", async () => {
	var gp = new GitRemoteRepo()
	gp.url = "https://github.com/deathcap/shellasync.git"
	var t = await gp.cloneBranch("v2.0.0", "../Temp/")
	console.log(t.isOk);
})

test("fetchLatestTag", async () => {
	var gp = new GitRemoteRepo()
	gp.url = "https://github.com/deathcap/shellasync.git"
	var result = await gp.fetchLatestTag()
	console.log(result.result.tag);
}, 999999)

test("checkNewTag", async () => {
	var gp = new GitRemoteRepo()
	gp.url = "https://github.com/deathcap/shellasync.git"
	var result = await gp.checkNewTag("2.0.0")
	console.log(result.result.latestTag);
}, 999999)

test("loadLocalRepo", async () => {
	var gp = await GitLocalRepo.fromLocalRepo("../Temp")
	expect(gp.isOk).toBe(true)
	expect(gp.result.fetchUrl).toBe("https://github.com/deathcap/shellasync.git")
	expect(gp.result.pushUrl).toBe("https://github.com/deathcap/shellasync.git")
})

test("loadRemoteRepo", async () => {
	var gp = await GitLocalRepo.fromRemoteRepo("https://github.com/deathcap/shellasync.git", "v2.1.0", "../Temp")
	expect(gp.isOk).toBe(true)
	expect(gp.result.fetchUrl).toBe("https://github.com/deathcap/shellasync.git")
	expect(gp.result.pushUrl).toBe("https://github.com/deathcap/shellasync.git")
})

test("switchBranch", async () => {
	var gp = (await GitLocalRepo.fromLocalRepo("../Temp")).result
	var t = await gp.switchBranch("v2.1.0")
	console.log(t.isOk);
})

test("checkoutBranch", async () => {
	var gp = (await GitLocalRepo.fromLocalRepo("../Temp")).result
	var t = await gp.checkoutBranch("v2.0.0")
	console.log(t.isOk);
})

test("deleteFolder", async () => {
	var gp = (await GitLocalRepo.fromLocalRepo("../Temp")).result
	var t = await gp.destroy()
	console.log(t.isOk);
})
