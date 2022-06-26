
import { FSConn } from "../Src/FSConn"

test("FSConn_connectDirectory", async () => {
	var fsConn = new FSConn()
	var info = fsConn.connectDirectory("E:/DOWN/Download/temp", "E:/DOWN/Download/temp2")
	await new Promise<void>((resolve, reject) => {
		// setTimeout(() => {
		// 	fsConn.disconnectDirectory(info.key)
		// }, 10000);
		setTimeout(() => {
			resolve()
		}, 100000);
	})
}, 100000)
