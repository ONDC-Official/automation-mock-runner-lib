// UTF-8 safe base64 shared by every config version. Uses TextEncoder/TextDecoder
// rather than Buffer so it works in both browser and Node.

export function encode(input: string): string {
	const bytes = new TextEncoder().encode(input);
	const CHUNK = 0x8000;
	let binary = "";
	for (let i = 0; i < bytes.length; i += CHUNK) {
		binary += String.fromCharCode.apply(
			null,
			bytes.subarray(i, i + CHUNK) as unknown as number[],
		);
	}
	return btoa(binary);
}

export function decode(encoded: string): string {
	const binaryString = atob(encoded);
	const bytes = new Uint8Array(binaryString.length);
	for (let i = 0; i < binaryString.length; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}
	return new TextDecoder().decode(bytes);
}
