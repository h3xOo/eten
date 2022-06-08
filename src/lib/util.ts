import crypto from "crypto";


export function sha256(message: string) {
	return crypto.createHash("SHA256").update(message).digest("hex");
}
